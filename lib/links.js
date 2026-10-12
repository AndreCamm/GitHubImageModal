"use strict";

(function () {
  const IMAGE_EXT = /\.(apng|avif|bmp|gif|jpe?g|png|svg|webp)$/i;

  const EXTENSION_HOSTS = new Set([
    "raw.githubusercontent.com",
    "gist.githubusercontent.com",
    "media.githubusercontent.com",
    "objects.githubusercontent.com",
  ]);

  function screenshotUrl(href, base) {
    if (typeof href !== "string") return null;
    const trimmed = href.trim();
    if (!trimmed || trimmed.startsWith("#")) return null;

    let url;
    try {
      url = new URL(trimmed, base || "https://github.com");
    } catch {
      return null;
    }

    if (url.protocol !== "https:") return null;

    const host = url.hostname.toLowerCase();
    const path = decodePath(url.pathname);

    if (host === "github.com") {
      if (path.startsWith("/user-attachments/")) return url.href;
      if (path.includes("/raw/") && IMAGE_EXT.test(path)) return url.href;
      return null;
    }

    if (
      host === "user-images.githubusercontent.com" ||
      host === "private-user-images.githubusercontent.com" ||
      host === "camo.githubusercontent.com"
    ) {
      return url.href;
    }

    if (EXTENSION_HOSTS.has(host) && IMAGE_EXT.test(path)) return url.href;
    return null;
  }

  function decodePath(path) {
    try {
      return decodeURIComponent(path);
    } catch {
      return path;
    }
  }

  function isPlainLeftClick(event) {
    return (
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    );
  }

  function wrapIndex(index, delta, count) {
    if (count <= 0) return 0;
    return (((index + delta) % count) + count) % count;
  }

  globalThis.__zenGithubImageModal = {
    screenshotUrl,
    isPlainLeftClick,
    wrapIndex,
  };
})();
