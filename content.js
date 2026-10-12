"use strict";

const api = globalThis.__zenGithubImageModal;
if (!api) {
  console.error("GitHub Image Modal: link helper missing");
}
const { screenshotUrl, isPlainLeftClick, wrapIndex } = api || {};

if (api && !globalThis.__zenGithubImageModalInstalled) {
  globalThis.__zenGithubImageModalInstalled = true;
  document.addEventListener("click", onClick, true);
}

let viewer = null;

function onClick(event) {
  if (!isPlainLeftClick(event)) return;
  const hit = screenshotFrom(event);
  if (!hit) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  const anchor = hit.anchor;
  const image = hit.image;
  const href = hit.href;
  setTimeout(() => {
    try {
      openViewer({ anchor, image, href });
    } catch (error) {
      console.error("GitHub Image Modal", error);
    }
  }, 0);
}

function screenshotFrom(event) {
  let anchor = null;
  let image = null;

  for (const node of event.composedPath()) {
    if (!(node instanceof Element)) continue;
    if (!image && node.tagName === "IMG") image = node;
    if (node.tagName === "A" && node.href) {
      anchor = node;
      break;
    }
  }

  if (!anchor) return null;
  if (!image) image = anchor.querySelector("img");
  if (!image) return null;

  const href = screenshotUrl(anchor.href);
  if (!href) return null;
  return { anchor, image, href };
}

function galleryFor(anchor) {
  const root =
    anchor.closest(".markdown-body, .js-comment-body, .comment-body") || anchor.parentElement || anchor;
  const items = [];

  for (const link of root.querySelectorAll("a[href]")) {
    const image = link.querySelector("img");
    if (!image) continue;
    const href = screenshotUrl(link.href);
    if (!href) continue;
    items.push({
      href,
      src: image.currentSrc || image.getAttribute("src") || href,
      alt: (image.getAttribute("alt") || "").trim(),
    });
  }

  return items;
}

function openViewer(hit) {
  const items = galleryFor(hit.anchor);
  const href = hit.href;
  let index = items.findIndex((item) => item.href === href);
  if (index < 0) {
    items.unshift({
      href,
      src: hit.image.currentSrc || hit.image.getAttribute("src") || href,
      alt: (hit.image.getAttribute("alt") || "").trim(),
    });
    index = 0;
  }

  if (viewer) viewer.close();

  const dialog = document.createElement("div");
  dialog.id = "ghim-modal";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  for (const [property, value] of [
    ["position", "fixed"],
    ["inset", "0"],
    ["z-index", "2147483646"],
    ["width", "100%"],
    ["height", "100%"],
    ["max-width", "none"],
    ["max-height", "none"],
    ["margin", "0"],
    ["padding", "0"],
    ["border", "none"],
    ["background", "transparent"],
    ["overflow", "hidden"],
    ["color-scheme", "dark"],
    ["display", "block"],
  ]) {
    dialog.style.setProperty(property, value, "important");
  }

  const shadow = dialog.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = VIEWER_CSS;

  const shell = document.createElement("div");
  shell.className = "shell";
  shell.part = "shell";

  const closeButton = iconButton("Close", CLOSE_PATH, "close");
  const prevButton = iconButton("Previous screenshot", PREV_PATH, "prev");
  const nextButton = iconButton("Next screenshot", NEXT_PATH, "next");

  const stage = document.createElement("div");
  stage.className = "stage";
  const image = document.createElement("img");
  image.alt = "";
  image.draggable = false;
  stage.append(image);

  const meta = document.createElement("div");
  meta.className = "meta";
  const caption = document.createElement("p");
  caption.className = "caption";
  const row = document.createElement("p");
  row.className = "row";
  const count = document.createElement("span");
  count.className = "count";
  const openLink = document.createElement("a");
  openLink.textContent = "Open in new tab";
  openLink.target = "_blank";
  openLink.rel = "noopener noreferrer";
  row.append(count, openLink);
  meta.append(caption, row);

  shell.append(closeButton, prevButton, nextButton, stage, meta);
  shadow.append(style, shell);

  const previousFocus = document.activeElement;
  const scrollY = window.scrollY;
  const htmlOverflow = document.documentElement.style.overflow;
  const bodyOverflow = document.body ? document.body.style.overflow : "";

  function closeViewer() {
    if (!dialog.isConnected) return;
    window.removeEventListener("keydown", onKey, true);
    dialog.remove();
    document.documentElement.style.overflow = htmlOverflow;
    if (document.body) document.body.style.overflow = bodyOverflow;
    window.scrollTo(0, scrollY);
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
    if (viewer === state) viewer = null;
  }

  const state = {
    dialog,
    items,
    index,
    request: 0,
    close: closeViewer,
  };
  viewer = state;

  function show(nextIndex) {
    state.index = wrapIndex(nextIndex, 0, items.length);
    state.request += 1;
    const request = state.request;
    const item = items[state.index];
    const several = items.length > 1;

    image.classList.remove("can-zoom");
    stage.classList.remove("is-zoomed");
    image.dataset.request = String(request);
    image.src = item.src;
    image.alt = item.alt;
    caption.textContent = item.alt;
    caption.hidden = item.alt.length === 0;
    count.textContent = `${state.index + 1} of ${items.length}`;
    count.hidden = !several;
    prevButton.hidden = !several;
    nextButton.hidden = !several;
    openLink.href = item.href;
    dialog.setAttribute("aria-label", item.alt || "Screenshot");
    preload(items, state.index);
  }

  function step(delta) {
    if (items.length < 2) return;
    show(state.index + delta);
  }

  function imageOverflows() {
    if (image.clientWidth < 2 || image.clientHeight < 2) return false;
    return image.naturalWidth > image.clientWidth + 1 || image.naturalHeight > image.clientHeight + 1;
  }

  function markZoom() {
    if (viewer !== state) return;
    if (image.dataset.request !== String(state.request)) return;
    if (!image.complete || !image.naturalWidth) return;
    image.classList.toggle("can-zoom", imageOverflows() && !stage.classList.contains("is-zoomed"));
  }

  function toggleZoom() {
    if (stage.classList.contains("is-zoomed")) {
      stage.classList.remove("is-zoomed");
      image.classList.toggle("can-zoom", imageOverflows());
      return;
    }
    if (!image.classList.contains("can-zoom")) return;
    stage.classList.add("is-zoomed");
    image.classList.remove("can-zoom");
  }

  closeButton.addEventListener("click", () => closeViewer());
  prevButton.addEventListener("click", () => step(-1));
  nextButton.addEventListener("click", () => step(1));
  image.addEventListener("click", toggleZoom);
  image.addEventListener("load", () => {
    requestAnimationFrame(markZoom);
  });
  image.addEventListener("error", () => {
    if (image.dataset.request !== String(state.request)) return;
    caption.hidden = false;
    caption.textContent = itemLoadError(items[state.index].alt);
  });

  shell.addEventListener("click", (event) => {
    if (event.target === shell) closeViewer();
  });

  function onKey(event) {
    if (viewer !== state) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeViewer();
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    event.stopPropagation();
    step(event.key === "ArrowLeft" ? -1 : 1);
  }

  window.addEventListener("keydown", onKey, true);

  document.documentElement.style.overflow = "hidden";
  if (document.body) document.body.style.overflow = "hidden";
  document.documentElement.append(dialog);
  show(index);
  closeButton.focus();
  requestAnimationFrame(markZoom);
}

function itemLoadError(alt) {
  return alt ? `${alt}. This image did not load.` : "This image did not load.";
}

function preload(items, index) {
  for (const delta of [-1, 1]) {
    const item = items[wrapIndex(index, delta, items.length)];
    if (!item || item.src === items[index].src) continue;
    const next = new Image();
    next.src = item.src;
  }
}

function iconButton(label, path, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.append(svgIcon(path));
  return button;
}

function svgIcon(pathData) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "22");
  svg.setAttribute("height", "22");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  return svg;
}

const CLOSE_PATH = "M6 6 L18 18 M18 6 L6 18";
const PREV_PATH = "M14 5 L7 12 L14 19";
const NEXT_PATH = "M10 5 L17 12 L10 19";

const VIEWER_CSS = `
:host {
  color-scheme: dark;
}
.shell {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  box-sizing: border-box;
  padding: 64px 84px 36px;
  background: rgba(8, 9, 12, 0.92);
  color: #f5f5f4;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
}
.stage {
  width: fit-content;
  min-width: 0;
  min-height: 0;
  max-width: 100%;
  max-height: calc(100vh - 150px);
  overflow: auto;
}
.stage img {
  display: block;
  max-width: min(1440px, 100%);
  max-height: calc(100vh - 150px);
  width: auto;
  height: auto;
  border-radius: 8px;
  background: #111;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.45);
  user-select: none;
  -webkit-user-drag: none;
}
.stage img.can-zoom {
  cursor: zoom-in;
}
.stage.is-zoomed {
  max-height: calc(100vh - 150px);
  cursor: zoom-out;
}
.stage.is-zoomed img {
  max-width: none;
  max-height: none;
  cursor: zoom-out;
}
button {
  position: absolute;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: white;
  cursor: pointer;
}
button:hover {
  background: rgba(255, 255, 255, 0.24);
}
button:focus-visible {
  outline: 2px solid white;
  outline-offset: 2px;
}
button[hidden] {
  display: none;
}
.close {
  top: 16px;
  right: 16px;
}
.prev,
.next {
  top: 50%;
  transform: translateY(-50%);
}
.prev {
  left: 18px;
}
.next {
  right: 18px;
}
.meta {
  max-width: min(760px, 100%);
  text-align: center;
}
.caption,
.row {
  margin: 0;
}
.caption {
  font-size: 14px;
  line-height: 1.4;
}
.caption[hidden] {
  display: none;
}
.row {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.4;
}
.count {
  color: rgba(245, 245, 244, 0.72);
}
.count[hidden] {
  display: none;
}
.row a {
  color: #d6defa;
}
@media (max-width: 720px) {
  .shell {
    padding: 60px 16px 72px;
  }
  .prev,
  .next {
    top: auto;
    bottom: 16px;
    transform: none;
  }
}
@media (prefers-reduced-motion: no-preference) {
  .shell {
    animation: ghim-in 120ms ease-out;
  }
}
@keyframes ghim-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
`;
