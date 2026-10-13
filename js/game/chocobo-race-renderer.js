(function (root) {
  "use strict";

  function panel(env, x, y, width, height, fill, stroke) {
    env.drawRoundedPanel(x, y, width, height, fill, stroke);
  }

  function readable(env, text, x, y, align) {
    var ctx = env.ctx;
    ctx.save();
    ctx.textAlign = align || "left";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(20, 14, 15, 0.88)";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = env.theme.text;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function staminaEffect(env, racer, x, y) {
    if (racer.status !== "running") return;
    var ctx = env.ctx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (racer.staminaPhase === "surge") {
      ctx.fillStyle = "rgba(255, 232, 135, 0.85)";
      ctx.fillRect(x - 9, y + 13, 6, 2);
      ctx.fillRect(x - 15, y + 20, 9, 2);
      ctx.fillRect(x - 7, y + 27, 5, 2);
      ctx.fillStyle = "rgba(242, 196, 109, 0.85)";
      ctx.fillRect(x - 4, y + 35, 4, 3);
      ctx.fillRect(x + 5, y + 37, 5, 3);
    } else if (racer.staminaPhase === "tired") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.fillRect(x + 39, y - 3, 3, 3);
      ctx.fillRect(x + 45, y - 8, 4, 4);
      ctx.fillStyle = "rgba(92, 68, 48, 0.55)";
      ctx.fillRect(x + 3, y + 39, 5, 3);
      ctx.fillRect(x + 13, y + 37, 3, 2);
    }
    ctx.restore();
  }

  function footer(env, text, x) {
    var width = 120;
    var left = x == null ? env.canvas.width - width - 12 : x;
    var y = env.canvas.height - 31;
    panel(env, left, y, width, 20, "rgba(25, 18, 14, 0.9)", "rgba(242, 196, 109, 0.72)");
    env.ctx.fillStyle = env.theme.muted;
    env.ctx.font = "10px " + env.theme.font;
    env.ctx.textAlign = "center";
    env.ctx.textBaseline = "middle";
    env.ctx.fillText(text, left + width / 2, y + 10);
  }

  function farPrompt(env) {
    var width = 300;
    var x = (env.canvas.width - width) / 2;
    var y = (env.canvas.height - 48) / 2;
    panel(env, x, y, width, 48, "rgba(25, 18, 14, 0.94)", env.theme.border);
    env.ctx.textAlign = "center";
    env.ctx.textBaseline = "middle";
    env.ctx.fillStyle = env.theme.accent;
    env.ctx.font = "bold 13px " + env.theme.font;
    env.ctx.fillText("按 F 参加陆行鸟竞赛", env.canvas.width / 2, y + 16);
    env.ctx.fillStyle = env.theme.muted;
    env.ctx.font = "9px " + env.theme.font;
    env.ctx.fillText("……咕哎？咕、咕、咕哎——咕哎哎，咕呜……", env.canvas.width / 2, y + 35);
  }

  function confirm(env, selected) {
    var width = 300;
    var height = 86;
    var x = (env.canvas.width - width) / 2;
    var y = (env.canvas.height - height) / 2;
    panel(env, x, y, width, height, "rgba(25, 18, 14, 0.96)", env.theme.border);
    env.ctx.textAlign = "center";
    env.ctx.textBaseline = "middle";
    env.ctx.fillStyle = env.theme.text;
    env.ctx.font = "bold 13px " + env.theme.font;
    env.ctx.fillText("参加陆行鸟竞赛？", env.canvas.width / 2, y + 22);
    env.ctx.font = "bold 12px " + env.theme.font;
    env.ctx.fillStyle = selected === 0 ? env.theme.accent : env.theme.muted;
    env.ctx.fillText("YES", x + 105, y + 66);
    env.ctx.fillStyle = selected === 1 ? env.theme.accent : env.theme.muted;
    env.ctx.fillText("NO", x + 195, y + 66);
  }

  function commentary(env, text) {
    var width = Math.min(270, env.canvas.width - 24);
    var x = (env.canvas.width - width) / 2;
    var y = 69;
    panel(env, x, y, width, 22, "rgba(25, 18, 14, 0.9)", "rgba(242, 196, 109, 0.72)");
    env.ctx.fillStyle = env.theme.text;
    env.ctx.font = "10px " + env.theme.font;
    env.ctx.textAlign = "center";
    env.ctx.textBaseline = "middle";
    env.ctx.fillText(text, env.canvas.width / 2, y + 11);
  }

  function transition(env, state) {
    var transitionState = state.raceTransition;
    if (!transitionState || !transitionState.active) return;
    var halfDuration = transitionState.duration / 2;
    var diagonalProgress;
    if (transitionState.mode === "close") {
      diagonalProgress = Math.min(1, transitionState.progress / halfDuration) * (env.canvas.width + env.canvas.height);
    } else if (transitionState.mode === "close-reveal") {
      diagonalProgress = Math.max(0, 1 - (transitionState.progress - halfDuration) / halfDuration) * (env.canvas.width + env.canvas.height);
    } else {
      diagonalProgress = Math.max(0, 1 - transitionState.progress / transitionState.duration) * (env.canvas.width + env.canvas.height);
    }
    var tileSize = 16;
    var ctx = env.ctx;
    ctx.save();
    ctx.fillStyle = "#17121b";
    for (var row = 0; row < Math.ceil(env.canvas.height / tileSize); row++) {
      for (var column = 0; column < Math.ceil(env.canvas.width / tileSize); column++) {
        var diagonal = column * tileSize + row * tileSize;
        if (diagonal <= diagonalProgress) ctx.fillRect(column * tileSize, row * tileSize, tileSize, tileSize);
      }
    }
    ctx.restore();
  }

  root.PhantomChocoboRaceRenderer = {
    staminaEffect: staminaEffect,
    footer: footer,
    farPrompt: farPrompt,
    confirm: confirm,
    commentary: commentary,
    transition: transition,
    readable: readable
  };
}(window));
