package com.example.backend.payload.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class WalletTopUpRequest {
    @NotNull
    @Min(1000)
    private Long amount;

    public Long getAmount() {
        return amount;
    }

    public void setAmount(Long amount) {
        this.amount = amount;
    }
}
