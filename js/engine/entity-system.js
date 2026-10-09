(function (root) {
  "use strict";

  function EntitySystem() { this.items = {}; }
  EntitySystem.prototype.add = function (id, entity) { this.items[id] = entity; return entity; };
  EntitySystem.prototype.get = function (id) { return this.items[id] || null; };
  EntitySystem.prototype.remove = function (id) { delete this.items[id]; };
  EntitySystem.prototype.each = function (callback) {
    Object.keys(this.items).forEach(function (id) { callback(this.items[id], id); }, this);
  };
  EntitySystem.prototype.values = function () { return Object.keys(this.items).map(function (id) { return this.items[id]; }, this); };
  root.PhantomEntitySystem = new EntitySystem();
}(window));
