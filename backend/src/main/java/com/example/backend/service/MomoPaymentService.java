package com.example.backend.service;

import java.util.Date;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import com.example.backend.config.AppProperties;
import com.example.backend.config.MomoProperties;
import com.example.backend.model.Transaction;
import com.example.backend.model.User;
import com.example.backend.payload.response.MomoOrderResponse;
import com.example.backend.payload.response.PaymentStatusResponse;
import com.example.backend.repository.TransactionRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.services.UserDetailsImpl;
import com.mservice.config.Environment;
import com.mservice.enums.RequestType;
import com.mservice.models.PaymentResponse;
import com.mservice.models.QueryStatusTransactionResponse;
import com.mservice.processor.CreateOrderMoMo;
import com.mservice.processor.QueryTransactionStatus;
import com.mservice.shared.utils.LogUtils;

@Service
public class MomoPaymentService {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AppProperties appProperties;

    @Autowired
    private MomoProperties momoProperties;

    public MomoOrderResponse createTopUpOrder(UserDetailsImpl currentUser, long amount) throws Exception {
        LogUtils.init();

        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new RuntimeException("User not found."));

        String orderId = "MOMO-TOPUP-" + System.currentTimeMillis();
        String requestId = orderId;
        String orderInfo = "Nap tien vi cho " + user.getUsername();
        String returnUrl = buildFrontendReturnUrl();
        String notifyUrl = buildIpnUrl();

        Transaction transaction = new Transaction(
                user.getId(),
                amount,
                "DEPOSIT",
                orderInfo,
                "PENDING");
        transaction.setProvider("MOMO");
        transaction.setExternalTransactionId(orderId);
        transaction.setCreatedAt(new Date());
        transactionRepository.save(transaction);

        Environment environment = Environment.selectEnv(momoProperties.getTarget());
        PaymentResponse paymentResponse = CreateOrderMoMo.process(
                environment,
                orderId,
                requestId,
                Long.toString(amount),
                orderInfo,
                returnUrl,
                notifyUrl,
                user.getId(),
                RequestType.CAPTURE_WALLET,
                Boolean.TRUE);

        if (paymentResponse == null || paymentResponse.getPayUrl() == null || paymentResponse.getResultCode() == null) {
            transaction.setStatus("FAILED");
            transaction.setProcessedAt(new Date());
            transactionRepository.save(transaction);
            throw new IllegalStateException("Khong tao duoc lenh thanh toan MoMo.");
        }

        if (paymentResponse.getResultCode() != 0) {
            transaction.setStatus("FAILED");
            transaction.setProcessedAt(new Date());
            transactionRepository.save(transaction);
            throw new IllegalStateException(paymentResponse.getMessage() != null
                    ? paymentResponse.getMessage()
                    : "MoMo tu choi tao giao dich.");
        }

        transaction.setPayUrl(paymentResponse.getPayUrl());
        transactionRepository.save(transaction);

        MomoOrderResponse response = new MomoOrderResponse();
        response.setOrderId(orderId);
        response.setPayUrl(paymentResponse.getPayUrl());
        response.setDeeplink(paymentResponse.getDeeplink());
        response.setQrCodeUrl(paymentResponse.getQrCodeUrl());
        response.setMessage(paymentResponse.getMessage());
        return response;
    }

    public PaymentStatusResponse confirmTopUpStatus(String orderId, String expectedUserId) throws Exception {
        LogUtils.init();

        Transaction transaction = transactionRepository.findByExternalTransactionId(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay giao dich MoMo."));

        if (expectedUserId != null && !expectedUserId.equals(transaction.getUserId())) {
            throw new IllegalArgumentException("Ban khong co quyen xem giao dich nay.");
        }

        PaymentStatusResponse response = new PaymentStatusResponse();
        response.setOrderId(orderId);
        response.setAmount(safeAmount(transaction.getAmount()));

        User user = userRepository.findById(transaction.getUserId()).orElse(null);
        if ("SUCCESS".equals(transaction.getStatus())) {
            response.setStatus("SUCCESS");
            response.setMessage("Nap tien thanh cong.");
            response.setWalletBalance(user != null ? safeAmount(user.getWalletBalance()) : 0L);
            return response;
        }

        if ("FAILED".equals(transaction.getStatus())) {
            response.setStatus("FAILED");
            response.setMessage(transaction.getDescription());
            response.setWalletBalance(user != null ? safeAmount(user.getWalletBalance()) : 0L);
            return response;
        }

        Environment environment = Environment.selectEnv(momoProperties.getTarget());
        QueryStatusTransactionResponse queryResponse = QueryTransactionStatus.process(environment, orderId, orderId);

        if (queryResponse == null) {
            response.setStatus("PENDING");
            response.setMessage("Chua xac minh duoc trang thai giao dich voi MoMo.");
            response.setWalletBalance(user != null ? safeAmount(user.getWalletBalance()) : 0L);
            return response;
        }

        applyMomoResult(transaction, queryResponse.getResultCode(), queryResponse.getMessage(), queryResponse.getAmount());
        user = userRepository.findById(transaction.getUserId()).orElse(null);
        response.setStatus(transaction.getStatus());
        response.setMessage(transaction.getDescription());
        response.setWalletBalance(user != null ? safeAmount(user.getWalletBalance()) : 0L);
        return response;
    }

    public void handleIpn(Map<String, Object> payload) {
        LogUtils.init();

        Object orderIdValue = payload.get("orderId");
        Object resultCodeValue = payload.get("resultCode");
        if (orderIdValue == null || resultCodeValue == null) {
            return;
        }

        String orderId = String.valueOf(orderIdValue);
        int resultCode = parseResultCode(resultCodeValue);
        String message = payload.get("message") != null ? String.valueOf(payload.get("message")) : null;
        Long amount = parseLong(payload.get("amount"));

        transactionRepository.findByExternalTransactionId(orderId)
                .ifPresent(transaction -> applyMomoResult(transaction, resultCode, message, amount));
    }

    private void applyMomoResult(Transaction transaction, Integer resultCode, String message, Long amount) {
        if (transaction == null || !"PENDING".equals(transaction.getStatus())) {
            return;
        }

        if (resultCode != null && resultCode == 0) {
            User user = userRepository.findById(transaction.getUserId()).orElse(null);
            if (user != null) {
                user.setWalletBalance(safeAmount(user.getWalletBalance()) + safeAmount(amount != null ? amount : transaction.getAmount()));
                userRepository.save(user);
            }
            transaction.setStatus("SUCCESS");
            transaction.setDescription(message == null || message.isBlank() ? "Nap tien thanh cong qua MoMo." : message);
        } else {
            transaction.setStatus("FAILED");
            transaction.setDescription(message == null || message.isBlank() ? "Giao dich MoMo that bai." : message);
        }

        transaction.setProcessedAt(new Date());
        transactionRepository.save(transaction);
    }

    private String buildFrontendReturnUrl() {
        return UriComponentsBuilder.fromUriString(appProperties.getFrontendUrl())
                .path("/payment/momo-return")
                .build()
                .toUriString();
    }

    private String buildIpnUrl() {
        return UriComponentsBuilder.fromUriString(appProperties.getBackendUrl())
                .path("/api/payments/momo/ipn")
                .build()
                .toUriString();
    }

    private int parseResultCode(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (Exception ignored) {
            return -1;
        }
    }

    private Long parseLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (Exception ignored) {
            return null;
        }
    }

    private long safeAmount(Long amount) {
        return amount == null ? 0L : Math.max(0L, amount);
    }
}
