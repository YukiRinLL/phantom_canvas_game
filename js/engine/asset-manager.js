(function (root) {
  "use strict";

  function AssetManager() { this.assets = {}; }
  AssetManager.prototype.load = function (name, source) {
    var self = this;
    return new Promise(function (resolve) {
      var image = new Image();
      image.onload = function () { self.assets[name] = image; resolve({ name: name, image: image, ready: true }); };
      image.onerror = function () { resolve({ name: name, image: image, ready: false }); };
      image.src = source;
    });
  };
  AssetManager.prototype.get = function (name) { return this.assets[name] || null; };
  AssetManager.prototype.has = function (name) { return !!this.assets[name]; };
  root.PhantomAssetManager = new AssetManager();
}(window));
