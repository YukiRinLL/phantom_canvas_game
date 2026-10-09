(function (root, exportTarget) {
  "use strict";

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function distance(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function normalizeMessage(value) {
    var text = String(value == null ? "" : value)
      .replace(/^\{type=text, data=\{text=/, "")
      .replace(/\s*}\s*}$/, "")
      .replace(/\r?\n/g, " ")
      .trim();
    return text;
  }
  function withTimeout(promise, timeoutMs, message) {
    var timer;
    var timeout = new Promise(function (_, reject) {
      timer = setTimeout(function () { reject(new Error(message || "Request timed out")); }, timeoutMs);
    });
    return Promise.race([promise, timeout]).then(function (value) {
      clearTimeout(timer);
      return value;
    }, function (error) {
      clearTimeout(timer);
      throw error;
    });
  }

  var api = { clamp: clamp, distance: distance, normalizeMessage: normalizeMessage, withTimeout: withTimeout };
  root.PhantomEngine = api;
  if (exportTarget) exportTarget.exports = api;
}(typeof window === "undefined" ? globalThis : window, typeof module === "undefined" ? null : module));
