package com.example.backend.controller;

import java.util.Date;
import java.util.Map;
import java.util.Optional;

import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.model.Chapter;
import com.example.backend.model.ChapterPurchase;
import com.example.backend.model.Story;
import com.example.backend.model.Transaction;
import com.example.backend.model.User;
import com.example.backend.payload.request.WalletTopUpRequest;
import com.example.backend.payload.response.MessageResponse;
import com.example.backend.payload.response.MomoOrderResponse;
import com.example.backend.payload.response.PaymentStatusResponse;
import com.example.backend.payload.response.WalletResponse;
import com.example.backend.repository.ChapterPurchaseRepository;
import com.example.backend.repository.ChapterRepository;
import com.example.backend.repository.StoryRepository;
import com.example.backend.repository.TransactionRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.services.UserDetailsImpl;
import com.example.backend.service.MomoPaymentService;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChapterRepository chapterRepository;

    @Autowired
    private StoryRepository storyRepository;

    @Autowired
    private ChapterPurchaseRepository chapterPurchaseRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private MomoPaymentService momoPaymentService;

    @GetMapping("/wallet")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> getWallet() {
        User user = getCurrentDbUser();
        return ResponseEntity.ok(new WalletResponse(safeBalance(user.getWalletBalance())));
    }

    @PostMapping("/wallet/top-up")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> createMomoTopUp(@Valid @RequestBody WalletTopUpRequest request) {
        try {
            UserDetailsImpl currentUser = requireCurrentUser();
            MomoOrderResponse response = momoPaymentService.createTopUpOrder(currentUser, safeAmount(request.getAmount()));
            return ResponseEntity.ok(response);
        } catch (Exception exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new MessageResponse(exception.getMessage()));
        }
    }

    @GetMapping("/wallet/top-up/status")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> getTopUpStatus(@RequestParam String orderId) {
        try {
            UserDetailsImpl currentUser = requireCurrentUser();
            PaymentStatusResponse response = momoPaymentService.confirmTopUpStatus(orderId, currentUser.getId());
            return ResponseEntity.ok(response);
        } catch (Exception exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new MessageResponse(exception.getMessage()));
        }
    }

    @PostMapping("/momo/ipn")
    public ResponseEntity<?> handleMomoIpn(@RequestBody Map<String, Object> payload) {
        momoPaymentService.handleIpn(payload);
        return ResponseEntity.ok(Map.of("message", "IPN received"));
    }

    @PostMapping("/chapters/{chapterId}/purchase")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> purchaseChapter(@PathVariable String chapterId) {
        User user = getCurrentDbUser();

        Optional<Chapter> chapterOpt = chapterRepository.findById(chapterId);
        if (chapterOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Chapter not found!"));
        }

        Chapter chapter = chapterOpt.get();
        Optional<Story> storyOpt = storyRepository.findById(chapter.getStoryId());
        if (storyOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Story not found!"));
        }

        Story story = storyOpt.get();
        if (canAccessWithoutPurchase(chapter, story, user)) {
            return ResponseEntity.ok(Map.of(
                    "message", "Chuong nay da san sang de doc.",
                    "walletBalance", safeBalance(user.getWalletBalance()),
                    "purchased", true));
        }

        if (chapterPurchaseRepository.existsByUserIdAndChapterId(user.getId(), chapterId)) {
            return ResponseEntity.ok(Map.of(
                    "message", "Ban da mua chuong nay roi.",
                    "walletBalance", safeBalance(user.getWalletBalance()),
                    "purchased", true));
        }

        long price = safeAmount(chapter.getPrice());
        long currentBalance = safeBalance(user.getWalletBalance());
        if (price <= 0) {
            return ResponseEntity.ok(Map.of(
                    "message", "Chuong nay hien dang mien phi.",
                    "walletBalance", currentBalance,
                    "purchased", true));
        }

        if (currentBalance < price) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message", "So du khong du de mua chuong nay.",
                    "walletBalance", currentBalance,
                    "required", price));
        }

        user.setWalletBalance(currentBalance - price);
        userRepository.save(user);

        ChapterPurchase purchase = new ChapterPurchase(user.getId(), chapter.getId(), chapter.getStoryId(), price);
        purchase.setPurchasedAt(new Date());
        chapterPurchaseRepository.save(purchase);

        Transaction transaction = new Transaction(
                user.getId(),
                price,
                "PURCHASE",
                "Mua chuong " + chapter.getChapterNumber() + " - " + chapter.getTitle(),
                "SUCCESS");
        transaction.setExternalTransactionId("PURCHASE-" + System.currentTimeMillis());
        transaction.setCreatedAt(new Date());
        transactionRepository.save(transaction);

        return ResponseEntity.ok(Map.of(
                "message", "Mua chuong thanh cong.",
                "walletBalance", user.getWalletBalance(),
                "purchased", true));
    }

    private boolean canAccessWithoutPurchase(Chapter chapter, Story story, User user) {
        if (!Boolean.TRUE.equals(chapter.getIsPaid()) || safeAmount(chapter.getPrice()) <= 0) {
            return true;
        }

        return user.getId().equals(chapter.getUploaderId())
                || user.getId().equals(story.getUploaderId())
                || hasAdminRole();
    }

    private User getCurrentDbUser() {
        UserDetailsImpl userDetails = requireCurrentUser();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("Authenticated user not found."));
    }

    private UserDetailsImpl requireCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserDetailsImpl userDetails)) {
            throw new RuntimeException("Authenticated user not found.");
        }
        return userDetails;
    }

    private boolean hasAdminRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserDetailsImpl userDetails)) {
            return false;
        }

        return userDetails.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }

    private long safeBalance(Long amount) {
        return amount == null ? 0L : Math.max(0L, amount);
    }

    private long safeAmount(Long amount) {
        return amount == null ? 0L : Math.max(0L, amount);
    }
}
