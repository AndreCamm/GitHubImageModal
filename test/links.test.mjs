import { readFileSync } from "node:fs";
import vm from "node:vm";

const sandbox = {
  URL,
  decodeURIComponent,
};
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL("../lib/links.js", import.meta.url), "utf8"), sandbox);
const api = sandbox.__glance;

let passed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
  passed += 1;
}

const before =
  "https://raw.githubusercontent.com/rafaelcg/pqp/cursor/music-player-desync-25a2/docs/pr-screenshots/1159/before.png";

assert(api.screenshotUrl(before) === before, "raw screenshot url");
assert(
  api.screenshotUrl(`${before}?cache=1`) === `${before}?cache=1`,
  "raw screenshot keeps query"
);
assert(
  api.screenshotUrl(before.replace(".png", ".PNG")) === before.replace(".png", ".PNG"),
  "uppercase extension"
);
assert(api.screenshotUrl(before.replace(".png", ".md")) === null, "raw markdown file");
assert(api.screenshotUrl(before.replace(".png", "")) === null, "raw path without extension");
assert(api.screenshotUrl(before.replace("https://", "http://")) === null, "http image");
assert(api.screenshotUrl("https://github.com/rafaelcg/pqp/pull/1159") === null, "pull request page");
assert(
  api.screenshotUrl("https://github.com/rafaelcg/pqp/blob/main/docs/shot.png") === null,
  "blob page is html"
);
assert(
  api.screenshotUrl("https://github.com/rafaelcg/pqp/raw/main/docs/shot.png") !== null,
  "github raw path"
);
assert(
  api.screenshotUrl("https://github.com/user-attachments/assets/8f0c0c0c-1111-2222-3333-444444444444") !==
    null,
  "user attachment"
);
assert(api.screenshotUrl("https://cursor.com/assets/images/open-in-web-dark.png") === null, "other site");
assert(api.screenshotUrl("javascript:alert(1)") === null, "javascript url");
assert(api.screenshotUrl("") === null, "empty");
assert(api.screenshotUrl(null) === null, "null");
assert(
  api.screenshotUrl("https://user-images.githubusercontent.com/1/2.png") !== null,
  "user images host"
);
assert(
  api.screenshotUrl("https://private-user-images.githubusercontent.com/1/2.png?jwt=abc") !== null,
  "private user images"
);
assert(
  api.screenshotUrl("https://camo.githubusercontent.com/abcdef/687474.png") !== null,
  "camo image"
);
assert(
  api.screenshotUrl("https://raw.githubusercontent.com.evil.example/file.png") === null,
  "lookalike host"
);
assert(
  api.screenshotUrl("//raw.githubusercontent.com/org/repo/main/shot.webp", "https://github.com/org/repo") !==
    null,
  "protocol relative raw url"
);

assert(api.isPlainLeftClick({ button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }), "plain click");
assert(!api.isPlainLeftClick({ button: 0, metaKey: true, ctrlKey: false, shiftKey: false, altKey: false }), "command click");
assert(!api.isPlainLeftClick({ button: 1, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }), "middle click");
assert(api.wrapIndex(0, -1, 3) === 2, "wrap backward");
assert(api.wrapIndex(2, 1, 3) === 0, "wrap forward");
assert(api.wrapIndex(1, 1, 3) === 2, "step forward");
assert(api.wrapIndex(0, -4, 3) === 2, "wrap several steps back");

console.log(`passed ${passed}`);
