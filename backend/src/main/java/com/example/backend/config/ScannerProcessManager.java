package com.example.backend.config;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.scanner.auto-start", havingValue = "true", matchIfMissing = true)
public class ScannerProcessManager implements DisposableBean {

    private static final Logger logger = LoggerFactory.getLogger(ScannerProcessManager.class);
    private static final int HEALTH_CHECK_INTERVAL_MS = 500;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(2))
            .build();

    @Value("${app.scanner.base-url:http://127.0.0.1:3456}")
    private String scannerBaseUrl;

    @Value("${app.scanner.shared-secret:}")
    private String scannerSharedSecret;

    @Value("${app.scanner.node-command:node}")
    private String scannerNodeCommand;

    @Value("${app.scanner.script-path:}")
    private String scannerScriptPath;

    @Value("${app.scanner.startup-timeout-ms:15000}")
    private long startupTimeoutMs;

    @Value("${app.scanner.health-timeout-ms:2000}")
    private long healthTimeoutMs;

    private Process managedScannerProcess;

    @EventListener(ApplicationReadyEvent.class)
    public synchronized void ensureScannerRunning() {
        if (isScannerHealthy()) {
            logger.info("Scanner service already running at {}", normalizeScannerBaseUrl());
            return;
        }

        Optional<Path> scannerScript = resolveScannerScript();
        if (scannerScript.isEmpty()) {
            logger.warn("Scanner script not found. Expected server.js near {} or configure app.scanner.script-path.",
                    Paths.get("").toAbsolutePath().normalize());
            return;
        }

        Path scriptPath = scannerScript.get();
        try {
            URI scannerUri = URI.create(normalizeScannerBaseUrl());
            ProcessBuilder processBuilder = new ProcessBuilder(scannerNodeCommand, scriptPath.getFileName().toString());
            processBuilder.directory(scriptPath.getParent().toFile());
            processBuilder.inheritIO();

            if (scannerUri.getHost() != null && !scannerUri.getHost().isBlank()) {
                processBuilder.environment().put("HOST", scannerUri.getHost());
            }
            if (scannerUri.getPort() > 0) {
                processBuilder.environment().put("PORT", Integer.toString(scannerUri.getPort()));
            }
            if (scannerSharedSecret != null && !scannerSharedSecret.isBlank()) {
                processBuilder.environment().put("SCANNER_SHARED_SECRET", scannerSharedSecret);
            }

            logger.info("Starting scanner service with command \"{} {}\" in {}",
                    scannerNodeCommand,
                    scriptPath.getFileName(),
                    scriptPath.getParent().toAbsolutePath().normalize());

            managedScannerProcess = processBuilder.start();

            if (waitForScannerHealth()) {
                logger.info("Scanner service is ready at {}", normalizeScannerBaseUrl());
                return;
            }

            if (managedScannerProcess != null && !managedScannerProcess.isAlive()) {
                logger.warn("Scanner process exited before becoming healthy. Exit code: {}",
                        managedScannerProcess.exitValue());
                managedScannerProcess = null;
                return;
            }

            logger.warn("Scanner process started but health check did not pass at {} within {} ms.",
                    normalizeScannerBaseUrl(),
                    startupTimeoutMs);
        } catch (Exception exception) {
            managedScannerProcess = null;
            logger.warn("Could not auto-start scanner service: {}", sanitizeMessage(exception.getMessage()));
        }
    }

    private Optional<Path> resolveScannerScript() {
        if (scannerScriptPath != null && !scannerScriptPath.isBlank()) {
            Path configuredPath = Paths.get(scannerScriptPath.trim());
            Path resolvedPath = configuredPath.isAbsolute()
                    ? configuredPath.normalize()
                    : Paths.get("").toAbsolutePath().normalize().resolve(configuredPath).normalize();
            return Files.isRegularFile(resolvedPath) ? Optional.of(resolvedPath) : Optional.empty();
        }

        Path current = Paths.get("").toAbsolutePath().normalize();
        for (int depth = 0; depth < 6 && current != null; depth += 1) {
            Path candidate = current.resolve("server.js");
            if (Files.isRegularFile(candidate)) {
                return Optional.of(candidate);
            }
            current = current.getParent();
        }
        return Optional.empty();
    }

    private boolean waitForScannerHealth() {
        Instant deadline = Instant.now().plusMillis(Math.max(startupTimeoutMs, HEALTH_CHECK_INTERVAL_MS));
        while (Instant.now().isBefore(deadline)) {
            if (isScannerHealthy()) {
                return true;
            }

            if (managedScannerProcess != null && !managedScannerProcess.isAlive()) {
                return false;
            }

            try {
                Thread.sleep(HEALTH_CHECK_INTERVAL_MS);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                return false;
            }
        }

        return isScannerHealthy();
    }

    private boolean isScannerHealthy() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(normalizeScannerBaseUrl() + "/health"))
                    .timeout(Duration.ofMillis(Math.max(healthTimeoutMs, 500)))
                    .GET()
                    .build();

            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            return response.statusCode() >= 200 && response.statusCode() < 300;
        } catch (Exception ignored) {
            return false;
        }
    }

    private String normalizeScannerBaseUrl() {
        return scannerBaseUrl.replaceAll("/+$", "");
    }

    private String sanitizeMessage(String message) {
        if (message == null || message.isBlank()) {
            return "Unknown error.";
        }
        return message.replace('\n', ' ').replace('\r', ' ').trim();
    }

    @Override
    public synchronized void destroy() throws IOException {
        if (managedScannerProcess == null) {
            return;
        }

        logger.info("Stopping auto-started scanner service.");
        managedScannerProcess.destroy();
        try {
            if (!managedScannerProcess.waitFor(5, java.util.concurrent.TimeUnit.SECONDS)) {
                managedScannerProcess.destroyForcibly();
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            managedScannerProcess.destroyForcibly();
        } finally {
            managedScannerProcess = null;
        }
    }
}
