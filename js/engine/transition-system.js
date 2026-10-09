(function (root) {
  "use strict";

  function TransitionSystem(definitions) { this.definitions = definitions || []; }
  TransitionSystem.prototype.forScene = function (scene) {
    return this.definitions.filter(function (transition) { return transition.from === scene; });
  };
  TransitionSystem.prototype.find = function (scene, actor) {
    return this.forScene(scene).find(function (transition) {
      var rect = transition.rect;
      return actor.x < rect.right && actor.x + actor.width > rect.left &&
        actor.y < rect.bottom && actor.y + actor.height > rect.top;
    }) || null;
  };
  root.PhantomTransitionSystem = TransitionSystem;
}(window));
