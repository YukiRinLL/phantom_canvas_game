(function (root) {
  "use strict";

  var keys = Object.create(null);
  var InputSystem = {
    keys: keys,
    init: function (target) {
      target.addEventListener("keydown", function (event) {
        keys[event.keyCode] = true;
      });
      target.addEventListener("keyup", function (event) {
        delete keys[event.keyCode];
      });
      target.addEventListener("blur", function () {
        Object.keys(keys).forEach(function (key) { delete keys[key]; });
      });
    },
    isDown: function (code) { return !!keys[code]; },
    consume: function (code) { var down = !!keys[code]; delete keys[code]; return down; }
  };
  root.PhantomInputSystem = InputSystem;
}(window));
