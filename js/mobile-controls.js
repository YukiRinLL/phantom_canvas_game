(function () {
  "use strict";
  var activeKeys = Object.create(null);

  function sendKey(type, code) {
    var event = new Event(type, { bubbles: true });
    Object.defineProperty(event, "keyCode", { value: code });
    Object.defineProperty(event, "which", { value: code });
    window.dispatchEvent(event);
  }
  function press(button) {
    var code = Number(button.getAttribute("data-key"));
    if (activeKeys[code]) return;
    activeKeys[code] = true;
    button.classList.add("is-pressed");
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(code >= 37 && code <= 40 ? 28 : [36, 24, 42]);
    }
    sendKey("keydown", code);
  }
  function release(button) {
    var code = Number(button.getAttribute("data-key"));
    if (!activeKeys[code]) return;
    delete activeKeys[code];
    button.classList.remove("is-pressed");
    sendKey("keyup", code);
  }
  document.querySelectorAll("[data-key]").forEach(function (button) {
    button.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      press(button);
    });
    button.addEventListener("pointerup", function (event) { event.preventDefault(); release(button); });
    button.addEventListener("pointercancel", function () { release(button); });
    button.addEventListener("lostpointercapture", function () { release(button); });
  });
  window.addEventListener("blur", function () { document.querySelectorAll("[data-key]").forEach(release); });
}());
