(function (root) {
  "use strict";

  function SceneManager(initial) {
    this.current = initial || "close";
    this.previous = null;
    this.listeners = [];
  }
  SceneManager.prototype.set = function (scene) {
    if (scene === this.current) return;
    this.previous = this.current;
    this.current = scene;
    this.listeners.forEach(function (listener) { listener(scene, this.previous); }, this);
  };
  SceneManager.prototype.onChange = function (listener) { this.listeners.push(listener); return listener; };
  root.PhantomSceneManager = new SceneManager("close");
}(window));
