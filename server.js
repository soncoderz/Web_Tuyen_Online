"use strict";

const axios = require("axios");
const cheerio = require("cheerio");
const express = require("express");

const HOST = (process.env.HOST || "127.0.0.1").trim() || "127.0.0.1";
const PORT = parsePositiveInteger(process.env.PORT, 3456);
const SCANNER_TIMEOUT_MS = parsePositiveInteger(process.env.SCANNER_TIMEOUT_MS, 45000);
const SCANNER_SHARED_SECRET = (process.env.SCANNER_SHARED_SECRET || "").trim();

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const ACCEPT_LANGUAGE = "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7";
const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".bmp",
  ".svg",
]);
const CANDIDATE_ATTRIBUTES = [
  "src",
  "data-src",
  "data-lazy-src",
  "data-original",
  "data-url",
  "data-image",
  "data-echo",
  "data-srcset",
  "srcset",
];
const AXIOS_CONFIG = {
  headers: {
    "User-Agent": USER_AGENT,
    "Accept-Language": ACCEPT_LANGUAGE,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    Referer: "https://www.google.com/",
  },
  maxRedirects: 5,
  responseType: "text",
  timeout: SCANNER_TIMEOUT_MS,
  validateStatus: () => true,
};

let puppeteerPromise = null;

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

function parsePositiveInteger(rawValue, fallback) {
  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }
  return parsedValue;
}

function normalizeHttpUrl(rawValue) {
  let parsedUrl;

  try {
    parsedUrl = new URL(String(rawValue || "").trim());
  } catch (error) {
    throw new HttpError(400, "URL nguon khong hop le.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new HttpError(400, "URL nguon phai bat dau bang http:// hoac https://.");
  }

  return parsedUrl.toString();
}

function createServerError(error) {
  if (error instanceof HttpError) {
    return error;
  }

  if (error?.code === "ECONNABORTED") {
    return new HttpError(504, "Het thoi gian tai trang nguon.");
  }

  return new HttpError(500, sanitizeMessage(error?.message, "Scanner service gap loi noi bo."));
}

function sanitizeMessage(message, fallback = "Unknown error.") {
  if (!message || !String(message).trim()) {
    return fallback;
  }

  return String(message).replace(/\s+/g, " ").trim();
}

function ensureSecret(req, res, next) {
  if (!SCANNER_SHARED_SECRET) {
    next();
    return;
  }

  if (req.get("X-Scanner-Secret") !== SCANNER_SHARED_SECRET) {
    res.status(403).json({ message: "Scanner secret khong hop le." });
    return;
  }

  next();
}

async function getPuppeteer() {
  if (!puppeteerPromise) {
    puppeteerPromise = import("puppeteer")
      .then((module) => module.default || module)
      .catch(() => null);
  }

  return puppeteerPromise;
}

async function hasPuppeteer() {
  return Boolean(await getPuppeteer());
}

function readResponseUrl(response, fallbackUrl) {
  return response?.request?.res?.responseUrl || fallbackUrl;
}

function resolveUrl(candidate, baseUrl) {
  const trimmed = String(candidate || "").trim().replace(/^["']|["']$/g, "");
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("javascript:")) {
    return "";
  }

  try {
    return new URL(trimmed, baseUrl).toString();
  } catch (error) {
    return "";
  }
}

function extractUrlsFromSrcset(rawValue, baseUrl) {
  return String(rawValue || "")
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .map((candidate) => resolveUrl(candidate, baseUrl))
    .filter(Boolean);
}

function shouldKeepImageUrl(imageUrl) {
  try {
    const parsedUrl = new URL(imageUrl);
    const pathname = parsedUrl.pathname.toLowerCase();
    if (IMAGE_EXTENSIONS.has(pathname.slice(pathname.lastIndexOf(".")))) {
      return true;
    }

    if (pathname.includes("/image") || pathname.includes("/img") || pathname.includes("/media")) {
      return true;
    }

    const search = parsedUrl.search.toLowerCase();
    return search.includes("image") || search.includes("img") || search.includes("format=");
  } catch (error) {
    return false;
  }
}

function addUniqueImage(seen, images, imageUrl) {
  if (!imageUrl || seen.has(imageUrl) || !shouldKeepImageUrl(imageUrl)) {
    return;
  }

  seen.add(imageUrl);
  images.push(imageUrl);
}

function collectImagesFromHtml(html, pageUrl) {
  const $ = cheerio.load(html);
  const images = [];
  const seen = new Set();

  $("img, source").each((_, element) => {
    const node = $(element);
    CANDIDATE_ATTRIBUTES.forEach((attributeName) => {
      const rawValue = node.attr(attributeName);
      if (!rawValue) {
        return;
      }

      const candidates = attributeName.includes("srcset")
        ? extractUrlsFromSrcset(rawValue, pageUrl)
        : [resolveUrl(rawValue, pageUrl)];

      candidates.forEach((candidateUrl) => addUniqueImage(seen, images, candidateUrl));
    });
  });

  $("[style*='background-image']").each((_, element) => {
    const styleValue = $(element).attr("style") || "";
    const matches = styleValue.match(/url\(([^)]+)\)/gi) || [];
    matches.forEach((match) => {
      const innerValue = match.replace(/^url\(/i, "").replace(/\)$/i, "");
      addUniqueImage(seen, images, resolveUrl(innerValue, pageUrl));
    });
  });

  return {
    title:
      $("meta[property='og:title']").attr("content")?.trim() ||
      $("title").first().text().trim() ||
      "manga-chapter",
    images,
  };
}

async function scanWithHttp(url) {
  const response = await axios.get(url, AXIOS_CONFIG);
  if (response.status < 200 || response.status >= 300) {
    throw new HttpError(502, `Tai trang nguon that bai, HTTP ${response.status}.`);
  }

  return collectImagesFromHtml(String(response.data || ""), readResponseUrl(response, url));
}

async function scanWithPuppeteer(url) {
  const puppeteer = await getPuppeteer();
  if (!puppeteer) {
    throw new HttpError(
      503,
      "Puppeteer chua duoc cai dat. Chay npm install o thu muc goc hoac tat tuy chon Puppeteer.",
    );
  }

  const launchOptions = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH?.trim()) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH.trim();
  }

  const browser = await puppeteer.launch(launchOptions);

  try {
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.setExtraHTTPHeaders({
      "Accept-Language": ACCEPT_LANGUAGE,
    });
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: SCANNER_TIMEOUT_MS,
    });
    await page.evaluate(async () => {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      window.scrollTo(0, 0);
    });

    const html = await page.content();
    return collectImagesFromHtml(html, page.url());
  } catch (error) {
    if (String(error?.message || "").includes("Timeout")) {
      throw new HttpError(504, "Puppeteer het thoi gian tai trang nguon.");
    }
    throw error;
  } finally {
    await browser.close().catch(() => undefined);
  }
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  res.json({
    ok: true,
    host: HOST,
    port: PORT,
    puppeteerAvailable: await hasPuppeteer(),
  });
});

app.post("/api/scan", ensureSecret, async (req, res) => {
  try {
    const url = normalizeHttpUrl(req.body?.url);
    const usePuppeteer = Boolean(req.body?.usePuppeteer);
    const scanResult = usePuppeteer ? await scanWithPuppeteer(url) : await scanWithHttp(url);

    res.json({
      title: scanResult.title,
      totalImages: scanResult.images.length,
      images: scanResult.images,
      puppeteerAvailable: await hasPuppeteer(),
    });
  } catch (error) {
    const serverError = createServerError(error);
    res.status(serverError.statusCode || 500).json({
      message: sanitizeMessage(serverError.message, "Scanner service gap loi."),
      puppeteerAvailable: await hasPuppeteer(),
    });
  }
});

app.listen(PORT, HOST, () => {
  console.log(
    `[scanner] listening on http://${HOST}:${PORT} ` +
      `(timeout=${SCANNER_TIMEOUT_MS}ms, secret=${SCANNER_SHARED_SECRET ? "on" : "off"})`,
  );
});
