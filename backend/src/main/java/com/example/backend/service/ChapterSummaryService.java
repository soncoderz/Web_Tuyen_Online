package com.example.backend.service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.example.backend.model.Chapter;
import com.example.backend.model.EStoryType;
import com.example.backend.model.Story;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class ChapterSummaryService {

    private static final Logger logger = LoggerFactory.getLogger(ChapterSummaryService.class);
    private static final int SUMMARY_REGEX_FLAGS = Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE;
    private static final String GEMINI_SUMMARY_PROMPT =
            """
            Ban la bien tap vien cho mot nen tang doc truyen.
            Hay viet tom tat bang tieng Viet cho dung mot chuong duoc cung cap.
            Yeu cau:
            - Gom 2 den 4 cau, uu tien ngan gon, toi da 420 ky tu.
            - Tap trung vao dien bien chinh cua rieng chuong nay.
            - Khong dung markdown, khong gach dau dong, khong them tieu de.
            - Khong mo dau bang cac cau dan nhap nhu "Duoi day la noi dung van ban..." hay "Chapter Summary".
            - Neu du lieu den tu hinh anh, khong trich xuat OCR va khong nhac den hinh anh, chi tra ve doan tom tat cuoi cung.
            - Khong bia them tinh tiet ngoai du lieu duoc cung cap.
            """;
    private static final List<Pattern> SUMMARY_PREFIX_PATTERNS = List.of(
            Pattern.compile("^tom\\s+tat\\s*:?\\s*", SUMMARY_REGEX_FLAGS),
            Pattern.compile("^chapter\\s+summary\\s*:?\\s*", SUMMARY_REGEX_FLAGS),
            Pattern.compile("^(?:duoi|sau)\\s+day\\s+la\\s+(?:noi\\s+dung|phan\\s+noi\\s+dung|van\\s+ban)(?:\\s+van\\s+ban)?(?:\\s+duoc\\s+trich\\s+xuat)?\\s+tu\\s+hinh\\s+anh\\s+ban\\s+da\\s+gui\\s*:?\\s*", SUMMARY_REGEX_FLAGS),
            Pattern.compile("^(?:dưới|sau)\\s+đây\\s+là\\s+(?:nội\\s+dung|phần\\s+nội\\s+dung|văn\\s+bản)(?:\\s+văn\\s+bản)?(?:\\s+được\\s+trích\\s+xuất)?\\s+từ\\s+hình\\s+ảnh\\s+bạn\\s+đã\\s+gửi\\s*:?\\s*", SUMMARY_REGEX_FLAGS),
            Pattern.compile("^(?:day|đây)\\s+là\\s+(?:noi\\s+dung|nội\\s+dung|van\\s+ban|văn\\s+bản)(?:\\s+duoc\\s+trich\\s+xuat|\\s+được\\s+trích\\s+xuất)?\\s+(?:tu|từ)\\s+hinh\\s+anh\\s+ban\\s+da\\s+gui\\s*:?\\s*", SUMMARY_REGEX_FLAGS),
            Pattern.compile("^(?:ocr|transcription|image\\s+transcription)\\s*:?\\s*", SUMMARY_REGEX_FLAGS));

    @Value("${app.ai.summary.enabled:false}")
    private boolean aiEnabled;

    @Value("${app.ai.summary.api-key:}")
    private String apiKey;

    @Value("${app.ai.summary.base-url:https://generativelanguage.googleapis.com/v1beta}")
    private String baseUrl;

    @Value("${app.ai.summary.model:gemini-3.1-pro-preview}")
    private String model;

    @Value("${app.ai.summary.timeout-seconds:40}")
    private long timeoutSeconds;

    @Value("${app.ai.summary.max-content-chars:12000}")
    private int maxContentChars;

    @Value("${app.ai.summary.max-image-samples:4}")
    private int maxImageSamples;

    @Value("${app.ai.summary.max-output-chars:420}")
    private int maxOutputChars;

    @Value("${app.ai.summary.max-image-bytes:2097152}")
    private int maxImageBytes;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public String generateSummary(Story story, Chapter chapter) {
        String generatedSummary = tryGenerateAiSummary(story, chapter);
        if (generatedSummary != null && !generatedSummary.isBlank()) {
            return generatedSummary;
        }
        return buildFallbackSummary(story, chapter);
    }

    public String buildDisplaySummary(Story story, Chapter chapter) {
        String storedSummary = normalizeSummary(chapter.getSummary());
        if (storedSummary != null) {
            return storedSummary;
        }
        return generateSummary(story, chapter);
    }

    private String tryGenerateAiSummary(Story story, Chapter chapter) {
        if (!aiEnabled || apiKey == null || apiKey.isBlank()) {
            return null;
        }

        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("system_instruction", Map.of(
                    "parts", List.of(Map.of("text", GEMINI_SUMMARY_PROMPT.trim()))));
            payload.put("contents", List.of(Map.of(
                    "role", "user",
                    "parts", buildUserParts(story, chapter))));
            payload.put("generationConfig", Map.of(
                    "temperature", 1.0,
                    "maxOutputTokens", 220,
                    "responseMimeType", "text/plain"));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(normalizeBaseUrl() + "/models/" + model + ":generateContent"))
                    .timeout(Duration.ofSeconds(Math.max(timeoutSeconds, 5)))
                    .header("x-goog-api-key", apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                logger.warn("Gemini summary API returned status {}: {}", response.statusCode(),
                        extractRemoteError(response.body()));
                return null;
            }

            JsonNode root = objectMapper.readTree(response.body());
            String summary = extractGeminiText(root.path("candidates"));
            if (summary == null || summary.isBlank()) {
                logger.warn("Gemini summary API returned an empty summary.");
                return null;
            }

            return normalizeSummary(summary);
        } catch (IOException exception) {
            logger.warn("Unable to parse Gemini summary response: {}", exception.getMessage());
            return null;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            logger.warn("Gemini summary request was interrupted.");
            return null;
        } catch (Exception exception) {
            logger.warn("Unable to generate chapter summary with Gemini: {}", exception.getMessage());
            return null;
        }
    }

    private List<Map<String, Object>> buildUserParts(Story story, Chapter chapter) {
        List<Map<String, Object>> parts = new ArrayList<>();

        if (story.getType() == EStoryType.MANGA) {
            for (String imageUrl : sampleImageUrls(chapter.getPages())) {
                InlineImagePart imagePart = buildInlineImagePart(imageUrl);
                if (imagePart != null) {
                    parts.add(Map.of("inline_data", Map.of(
                            "mime_type", imagePart.mimeType(),
                            "data", imagePart.base64Data())));
                }
            }
        }

        parts.add(Map.of("text", buildContextPrompt(story, chapter)));
        return parts;
    }

    private InlineImagePart buildInlineImagePart(String imageUrl) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(imageUrl))
                    .timeout(Duration.ofSeconds(Math.min(Math.max(timeoutSeconds, 5), 20)))
                    .header("User-Agent", "WebTuyenOnline/1.0")
                    .header("Accept", "image/avif,image/webp,image/apng,image/*,*/*;q=0.8")
                    .GET()
                    .build();

            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                logger.warn("Skipping manga image {} because download returned HTTP {}.", imageUrl, response.statusCode());
                return null;
            }

            byte[] bytes = response.body();
            if (bytes == null || bytes.length == 0) {
                logger.warn("Skipping manga image {} because the file was empty.", imageUrl);
                return null;
            }

            if (bytes.length > maxImageBytes) {
                logger.warn("Skipping manga image {} because it exceeded {} bytes.", imageUrl, maxImageBytes);
                return null;
            }

            String contentType = resolveImageMimeType(
                    response.headers().firstValue("content-type").orElse(""),
                    imageUrl);
            return new InlineImagePart(Base64.getEncoder().encodeToString(bytes), contentType);
        } catch (Exception exception) {
            logger.warn("Unable to load manga image {} for Gemini summary: {}", imageUrl, exception.getMessage());
            return null;
        }
    }

    private String buildContextPrompt(Story story, Chapter chapter) {
        StringBuilder builder = new StringBuilder();
        builder.append("Ten truyen: ").append(defaultText(story.getTitle(), "Chua ro")).append('\n');
        builder.append("Loai: ").append(story.getType() == EStoryType.MANGA ? "Manga" : "Light Novel").append('\n');
        builder.append("Chuong: ").append(chapter.getChapterNumber()).append('\n');
        builder.append("Tieu de chuong: ").append(defaultText(chapter.getTitle(), "Khong co")).append('\n');

        if (story.getDescription() != null && !story.getDescription().isBlank()) {
            builder.append("Mo ta truyen: ")
                    .append(truncate(normalizeWhitespace(story.getDescription()), 320))
                    .append('\n');
        }

        if (story.getType() == EStoryType.MANGA) {
            builder.append("So trang: ").append(chapter.getPages() == null ? 0 : chapter.getPages().size()).append('\n');
            builder.append("Dua vao cac trang manga o tren, hay tom tat dien bien chinh cua chuong nay. ");
            builder.append("Khong chep lai van ban trong anh, khong mo dau bang loi gioi thieu, ");
            builder.append("chi tra ve doan tom tat cuoi cung.");
            return builder.toString();
        }

        builder.append("Noi dung chuong (rut gon): ")
                .append(truncate(normalizeWhitespace(chapter.getContent()), maxContentChars));
        return builder.toString();
    }

    private String buildFallbackSummary(Story story, Chapter chapter) {
        if (story.getType() == EStoryType.MANGA) {
            return buildMangaFallback(story, chapter);
        }
        return buildNovelFallback(story, chapter);
    }

    private String buildNovelFallback(Story story, Chapter chapter) {
        String content = normalizeWhitespace(chapter.getContent());
        if (content.isBlank()) {
            return truncate("Chuong " + chapter.getChapterNumber() + " tap trung vao dien bien moi cua "
                    + defaultText(story.getTitle(), "truyen") + ".", maxOutputChars);
        }

        List<String> paragraphs = extractParagraphs(chapter.getContent());
        String joinedParagraphs = String.join(" ", paragraphs.stream().limit(2).toList());
        String summary = normalizeWhitespace(joinedParagraphs.isBlank() ? content : joinedParagraphs);
        return truncate(summary, maxOutputChars);
    }

    private String buildMangaFallback(Story story, Chapter chapter) {
        int totalPages = chapter.getPages() == null ? 0 : chapter.getPages().size();
        String storyTitle = defaultText(story.getTitle(), "truyen");
        String chapterTitle = defaultText(chapter.getTitle(), "Khong co tieu de");
        String storyHint = truncate(normalizeWhitespace(story.getDescription()), 180);

        StringBuilder summary = new StringBuilder();
        summary.append("Chuong manga \"").append(chapterTitle).append("\" cua ").append(storyTitle)
                .append(" gom ").append(totalPages).append(" trang.");

        if (!storyHint.isBlank()) {
            summary.append(' ').append(storyHint);
        }

        return truncate(normalizeWhitespace(summary.toString()), maxOutputChars);
    }

    private List<String> sampleImageUrls(List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            return List.of();
        }

        if (imageUrls.size() <= maxImageSamples) {
            return imageUrls.stream().filter(url -> url != null && !url.isBlank()).toList();
        }

        LinkedHashSet<String> sampled = new LinkedHashSet<>();
        int lastIndex = imageUrls.size() - 1;
        for (int index = 0; index < maxImageSamples; index++) {
            int sampleIndex = (int) Math.round((double) index * lastIndex / (maxImageSamples - 1));
            String url = imageUrls.get(sampleIndex);
            if (url != null && !url.isBlank()) {
                sampled.add(url);
            }
        }
        return new ArrayList<>(sampled);
    }

    private List<String> extractParagraphs(String content) {
        if (content == null || content.isBlank()) {
            return List.of();
        }

        String normalized = content.replace("\r\n", "\n").trim();
        List<String> paragraphs = Arrays.stream(normalized.split("\\n\\s*\\n"))
                .map(this::normalizeWhitespace)
                .filter(text -> !text.isBlank())
                .toList();

        if (!paragraphs.isEmpty()) {
            return paragraphs;
        }

        return Arrays.stream(normalized.split("\\n"))
                .map(this::normalizeWhitespace)
                .filter(text -> !text.isBlank())
                .toList();
    }

    private String extractGeminiText(JsonNode candidatesNode) {
        if (candidatesNode == null || !candidatesNode.isArray() || candidatesNode.size() == 0) {
            return null;
        }

        StringBuilder builder = new StringBuilder();
        JsonNode partsNode = candidatesNode.get(0).path("content").path("parts");
        if (!partsNode.isArray()) {
            return null;
        }

        for (JsonNode partNode : partsNode) {
            String text = partNode.path("text").asText("").trim();
            if (!text.isBlank()) {
                if (builder.length() > 0) {
                    builder.append(' ');
                }
                builder.append(text);
            }
        }

        return builder.toString();
    }

    private String extractRemoteError(String body) {
        if (body == null || body.isBlank()) {
            return "Unknown error.";
        }

        try {
            JsonNode json = objectMapper.readTree(body);
            String message = json.path("error").path("message").asText("");
            if (!message.isBlank()) {
                return message;
            }
            message = json.path("message").asText("");
            if (!message.isBlank()) {
                return message;
            }
        } catch (Exception ignored) {
            // Ignore parsing issues and fall back to the raw body.
        }

        return truncate(body.replace('\n', ' ').replace('\r', ' ').trim(), 240);
    }

    private String normalizeSummary(String rawSummary) {
        if (rawSummary == null) {
            return null;
        }

        String normalized = rawSummary
                .replace('\r', ' ')
                .replace('\n', ' ')
                .replaceAll("\\s+", " ")
                .trim();

        normalized = stripSummaryPrefixes(normalized);
        normalized = normalized.replaceFirst("^[\\s\\-:;,.]+", "").trim();

        if (normalized.isBlank()) {
            return null;
        }

        if (normalized.startsWith("\"") && normalized.endsWith("\"") && normalized.length() > 1) {
            normalized = normalized.substring(1, normalized.length() - 1).trim();
        }

        return truncate(normalized, maxOutputChars);
    }

    private String stripSummaryPrefixes(String value) {
        String cleaned = value == null ? "" : value.trim();
        boolean updated;

        do {
            updated = false;
            for (Pattern pattern : SUMMARY_PREFIX_PATTERNS) {
                String nextValue = pattern.matcher(cleaned).replaceFirst("").trim();
                if (!nextValue.equals(cleaned)) {
                    cleaned = nextValue;
                    updated = true;
                }
            }
        } while (updated && !cleaned.isBlank());

        return cleaned;
    }

    private String resolveImageMimeType(String contentType, String imageUrl) {
        String normalizedContentType = contentType == null ? "" : contentType.trim().toLowerCase();
        if (normalizedContentType.startsWith("image/")) {
            int separatorIndex = normalizedContentType.indexOf(';');
            return separatorIndex >= 0
                    ? normalizedContentType.substring(0, separatorIndex).trim()
                    : normalizedContentType;
        }

        String lowerUrl = imageUrl == null ? "" : imageUrl.toLowerCase();
        if (lowerUrl.endsWith(".png")) {
            return "image/png";
        }
        if (lowerUrl.endsWith(".webp")) {
            return "image/webp";
        }
        if (lowerUrl.endsWith(".gif")) {
            return "image/gif";
        }
        if (lowerUrl.endsWith(".bmp")) {
            return "image/bmp";
        }
        if (lowerUrl.endsWith(".avif")) {
            return "image/avif";
        }
        return "image/jpeg";
    }

    private String normalizeWhitespace(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("\\s+", " ").trim();
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return "";
        }

        String normalized = value.trim();
        if (normalized.length() <= maxLength) {
            return normalized;
        }

        return normalized.substring(0, Math.max(maxLength - 3, 1)).trim() + "...";
    }

    private String defaultText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String normalizeBaseUrl() {
        return baseUrl.replaceAll("/+$", "");
    }

    private record InlineImagePart(String base64Data, String mimeType) {
    }
}
