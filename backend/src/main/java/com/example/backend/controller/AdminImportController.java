package com.example.backend.controller;

import java.io.IOException;
import java.net.ConnectException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.example.backend.payload.request.AdminImportMangaPagesRequest;
import com.example.backend.payload.request.AdminImportScanRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.validation.Valid;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/admin/import")
public class AdminImportController {

    private static final String SCANNER_SECRET_HEADER = "X-Scanner-Secret";
    private static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    + "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
    private static final String IMAGE_FOLDER = "truyen_online/chapters";
    private static final Duration SCANNER_TIMEOUT = Duration.ofSeconds(90);
    private static final Duration IMAGE_TIMEOUT = Duration.ofSeconds(60);

    @Autowired
    private Cloudinary cloudinary;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.scanner.base-url:http://127.0.0.1:3456}")
    private String scannerBaseUrl;

    @Value("${app.scanner.shared-secret:}")
    private String scannerSharedSecret;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    @PostMapping("/scan")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> scanImages(@Valid @RequestBody AdminImportScanRequest request) {
        try {
            Map<String, Object> scannerPayload = new LinkedHashMap<>();
            scannerPayload.put("url", request.getUrl().trim());
            scannerPayload.put("usePuppeteer", Boolean.TRUE.equals(request.getUsePuppeteer()));

            HttpRequest.Builder httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(normalizeScannerBaseUrl() + "/api/scan"))
                    .timeout(SCANNER_TIMEOUT)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(scannerPayload)));

            addScannerSecret(httpRequest);

            HttpResponse<String> response = httpClient.send(httpRequest.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return badGateway(extractRemoteError(
                        response.body(),
                        "Scanner service responded with status " + response.statusCode() + "."));
            }

            JsonNode data = objectMapper.readTree(response.body());
            List<String> images = new ArrayList<>();
            if (data.path("images").isArray()) {
                data.path("images").forEach(node -> {
                    String imageUrl = node.asText("").trim();
                    if (!imageUrl.isEmpty()) {
                        images.add(imageUrl);
                    }
                });
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("title", readText(data, "title", "manga-chapter"));
            result.put("totalImages", images.size());
            result.put("images", images);
            result.put("puppeteerAvailable", data.path("puppeteerAvailable").asBoolean(false));
            return ResponseEntity.ok(result);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return badGateway(buildScannerConnectionMessage(exception));
        } catch (IOException exception) {
            return badGateway(buildScannerConnectionMessage(exception));
        } catch (Exception exception) {
            return badGateway("Khong the quet anh: " + sanitizeMessage(exception.getMessage()));
        }
    }

    @PostMapping("/manga-pages")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> importMangaPages(@Valid @RequestBody AdminImportMangaPagesRequest request) {
        List<String> uploadedUrls = new ArrayList<>();
        List<Map<String, Object>> failures = new ArrayList<>();

        List<String> imageUrls = Optional.ofNullable(request.getImageUrls()).orElse(List.of());
        for (int index = 0; index < imageUrls.size(); index++) {
            String imageUrl = imageUrls.get(index);
            try {
                DownloadedImage downloadedImage = downloadRemoteImage(imageUrl, request.getSourceUrl());
                @SuppressWarnings("rawtypes")
                Map uploadResult = cloudinary.uploader().upload(
                        downloadedImage.data(),
                        ObjectUtils.asMap(
                                "folder", IMAGE_FOLDER,
                                "resource_type", "image",
                                "use_filename", true,
                                "unique_filename", true,
                                "filename_override", buildFilename(index, imageUrl, downloadedImage.contentType())));

                Object secureUrl = uploadResult.get("secure_url");
                if (secureUrl instanceof String url && !url.isBlank()) {
                    uploadedUrls.add(url);
                    continue;
                }

                failures.add(buildFailure(index, imageUrl, "Cloudinary khong tra ve secure_url."));
            } catch (Exception exception) {
                failures.add(buildFailure(index, imageUrl, sanitizeMessage(exception.getMessage())));
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("urls", uploadedUrls);
        result.put("failures", failures);
        return ResponseEntity.ok(result);
    }

    private DownloadedImage downloadRemoteImage(String imageUrl, String sourceUrl)
            throws IOException, InterruptedException {
        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(imageUrl))
                .timeout(IMAGE_TIMEOUT)
                .header("User-Agent", USER_AGENT)
                .header("Accept",
                        "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8")
                .header("Accept-Language", "en-US,en;q=0.9,vi;q=0.8")
                .GET();

        if (sourceUrl != null && !sourceUrl.isBlank()) {
            requestBuilder.header("Referer", sourceUrl.trim());
        }

        HttpResponse<byte[]> response = httpClient.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("Tai anh that bai, HTTP " + response.statusCode() + ".");
        }

        byte[] bytes = response.body();
        if (bytes == null || bytes.length == 0) {
            throw new IOException("File anh rong.");
        }

        String contentType = response.headers().firstValue("content-type").orElse("");
        return new DownloadedImage(bytes, contentType);
    }

    private void addScannerSecret(HttpRequest.Builder requestBuilder) {
        if (scannerSharedSecret != null && !scannerSharedSecret.isBlank()) {
            requestBuilder.header(SCANNER_SECRET_HEADER, scannerSharedSecret);
        }
    }

    private ResponseEntity<Map<String, String>> badGateway(String message) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(Map.of("message", sanitizeMessage(message)));
    }

    private String buildScannerConnectionMessage(Exception exception) {
        if (hasCause(exception, ConnectException.class)) {
            return "Khong the ket noi scanner service tai " + normalizeScannerBaseUrl()
                    + ". Hay chay \"npm install\" va \"npm run scanner\" o thu muc goc.";
        }

        if (hasCause(exception, HttpTimeoutException.class)) {
            return "Scanner service tai " + normalizeScannerBaseUrl() + " phan hoi qua cham.";
        }

        String message = sanitizeMessage(exception.getMessage());
        if ("Unknown error.".equals(message)) {
            return "Khong the ket noi scanner service tai " + normalizeScannerBaseUrl()
                    + ". Hay chay \"npm install\" va \"npm run scanner\" o thu muc goc.";
        }

        return "Khong the ket noi scanner service: " + message;
    }

    private String normalizeScannerBaseUrl() {
        return scannerBaseUrl.replaceAll("/+$", "");
    }

    private boolean hasCause(Throwable throwable, Class<? extends Throwable> type) {
        Throwable current = throwable;
        while (current != null) {
            if (type.isInstance(current)) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private String extractRemoteError(String body, String fallback) {
        if (body == null || body.isBlank()) {
            return fallback;
        }

        try {
            JsonNode json = objectMapper.readTree(body);
            String message = readText(json, "message", "");
            if (!message.isBlank()) {
                return message;
            }
            String error = readText(json, "error", "");
            if (!error.isBlank()) {
                return error;
            }
        } catch (Exception ignored) {
            // Ignore JSON parsing issues and fall back to raw message.
        }

        return body.length() > 200 ? fallback : body;
    }

    private String readText(JsonNode json, String fieldName, String fallback) {
        String value = json.path(fieldName).asText("").trim();
        return value.isEmpty() ? fallback : value;
    }

    private Map<String, Object> buildFailure(int index, String url, String message) {
        Map<String, Object> failure = new LinkedHashMap<>();
        failure.put("index", index);
        failure.put("url", url);
        failure.put("message", sanitizeMessage(message));
        return failure;
    }

    private String buildFilename(int index, String imageUrl, String contentType) {
        return "imported_page_" + String.format("%03d", index + 1) + "." + getImageExtension(imageUrl, contentType);
    }

    private String getImageExtension(String imageUrl, String contentType) {
        if (contentType != null && contentType.startsWith("image/")) {
            String extension = contentType.substring("image/".length()).trim().toLowerCase();
            int separatorIndex = extension.indexOf(';');
            if (separatorIndex >= 0) {
                extension = extension.substring(0, separatorIndex).trim();
            }
            if ("jpeg".equals(extension)) {
                return "jpg";
            }
            if (List.of("jpg", "png", "gif", "webp", "avif", "bmp").contains(extension)) {
                return extension;
            }
        }

        try {
            String path = new URI(imageUrl).getPath();
            int lastDotIndex = path.lastIndexOf('.');
            if (lastDotIndex >= 0 && lastDotIndex < path.length() - 1) {
                String extension = path.substring(lastDotIndex + 1).toLowerCase();
                if ("jpeg".equals(extension)) {
                    return "jpg";
                }
                if (List.of("jpg", "png", "gif", "webp", "avif", "bmp").contains(extension)) {
                    return extension;
                }
            }
        } catch (URISyntaxException ignored) {
            // Ignore malformed URLs and use the default extension below.
        }

        return "jpg";
    }

    private String sanitizeMessage(String message) {
        if (message == null || message.isBlank()) {
            return "Unknown error.";
        }
        return message.replace('\n', ' ').replace('\r', ' ').trim();
    }

    private record DownloadedImage(byte[] data, String contentType) {
    }
}
