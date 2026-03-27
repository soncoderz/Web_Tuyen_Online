package com.example.backend.payload.response;

public class WalletResponse {
    private Long walletBalance;

    public WalletResponse() {
    }

    public WalletResponse(Long walletBalance) {
        this.walletBalance = walletBalance;
    }

    public Long getWalletBalance() {
        return walletBalance;
    }

    public void setWalletBalance(Long walletBalance) {
        this.walletBalance = walletBalance;
    }
}
