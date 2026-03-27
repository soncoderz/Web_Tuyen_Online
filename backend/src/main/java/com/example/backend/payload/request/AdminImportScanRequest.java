package com.example.backend.payload.request;

import jakarta.validation.constraints.NotBlank;

public class AdminImportScanRequest {

    @NotBlank
    private String url;

    private Boolean usePuppeteer = Boolean.FALSE;

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public Boolean getUsePuppeteer() {
        return usePuppeteer;
    }

    public void setUsePuppeteer(Boolean usePuppeteer) {
        this.usePuppeteer = usePuppeteer;
    }
}
