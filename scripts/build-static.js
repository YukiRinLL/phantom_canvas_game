"use strict";

// Assembles the static site into ./build so static-hosting platforms
// (which expect npm run build to produce a build/ output directory) can deploy it.
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "build");

function copyDir(src, dest, filter) {
  fs.cpSync(src, dest, {
    recursive: true,
    filter: filter
      ? (source) => {
          const relative = path.relative(src, source);
          return relative === "" || filter(relative);
        }
      : undefined
  });
}

// Start from a clean output directory.
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

// Runtime entry and asset directories.
fs.copyFileSync(path.join(root, "index.html"), path.join(outDir, "index.html"));
for (const dir of ["css", "images", "audio"]) {
  const src = path.join(root, dir);
  if (fs.existsSync(src)) {
    copyDir(src, path.join(outDir, dir));
  }
}

// Copy all runtime JS except local-only files: config.local.js may hold
// local credentials and is never committed; the .example file is not loaded.
copyDir(path.join(root, "js"), path.join(outDir, "js"), (relative) => {
  return relative !== "config.local.js" && relative !== "config.local.example.js";
});

// index.html always loads config.local.js; provide an empty placeholder so
// there is no 404 when no local override exists (the normal deployment case).
fs.writeFileSync(
  path.join(outDir, "js", "config.local.js"),
  "/* Placeholder: no local config override. */\n",
  "utf8"
);

if (!fs.existsSync(path.join(outDir, "js", "config.runtime.js"))) {
  console.warn(
    "Warning: js/config.runtime.js was not generated before packaging; " +
      "run `npm run config` first."
  );
}

console.log("Static site packaged into " + path.relative(process.cwd(), outDir));
