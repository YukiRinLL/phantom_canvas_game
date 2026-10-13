(function (root) {
  "use strict";

  function colorName(index, names) { return names[index] || "A Chocobo"; }

  function updateTransition(state, modifier, onClose) {
    var transition = state.raceTransition;
    if (!transition || !transition.active) return;
    transition.progress += modifier;
    if (transition.mode === "close" && transition.progress >= transition.duration / 2 && state.visible) {
      state.visible = false;
      state.started = false;
      state.finished = false;
      transition.mode = "close-reveal";
      if (onClose) onClose();
    }
    if (transition.progress >= transition.duration / 2 && transition.mode === "race" && state.phase === "ready") {
      transition.mode = "race-ready";
    }
    if (transition.progress >= transition.duration) transition.active = false;
  }

  function updatePresentation(state, modifier, names) {
    state.commentaryTimer = Math.max(0, state.commentaryTimer - modifier);
    state.cameraPunch = Math.max(0, state.cameraPunch - modifier * 2.5);
    state.crowdPulse = Math.max(0, state.crowdPulse - modifier * 2);
    state.eventTimer += modifier;
    if (state.eventTimer >= state.nextEventAt && !state.finished) {
      var active = state.tracers.map(function (racer, index) { return { racer: racer, index: index }; }).filter(function (entry) {
        return entry.racer.status === "running";
      });
      if (active.length) {
        var target = active[Math.floor(Math.random() * active.length)];
        var gust = Math.random() < 0.52;
        target.racer.eventTimer = gust ? 2.1 : 1.7;
        target.racer.eventMultiplier = gust ? 1.14 : 0.86;
        state.activeEvent = { type: gust ? "gust" : "mud", racer: target.index, timer: target.racer.eventTimer };
        state.commentary = gust ? "A tailwind gives " + colorName(target.index, names) + " a boost!" : colorName(target.index, names) + " hit a muddy patch!";
        state.commentaryTimer = 2.4;
        state.cameraPunch = 0.45;
        state.crowdPulse = 1;
      }
      state.eventTimer = 0;
      state.nextEventAt = 5 + Math.random() * 4;
    }
    var leader = -1;
    state.tracers.forEach(function (racer, index) {
      if (leader < 0 || racer.progress > state.tracers[leader].progress) leader = index;
    });
    if (leader >= 0 && leader !== state.lastLeader && state.lastLeader >= 0) {
      state.commentary = colorName(leader, names) + " takes the lead!";
      state.commentaryTimer = 1.8;
      state.crowdPulse = 0.7;
    }
    state.lastLeader = leader;
  }

  function update(state, modifier, names, onClose, viewportWidth) {
    updateTransition(state, modifier, onClose);
    if (state.finished) state.resultsTimer += modifier;
    if (state.phase === "selection") {
      state.elapsed += modifier;
      state.previewTimer = Math.max(0, state.previewTimer - modifier);
      return;
    }
    if (state.phase === "ready") {
      state.readyTimer += modifier;
      if (state.readyTimer < 0.8) state.tracers[state.selectedIndex].frame = Math.floor(state.readyTimer * 10) % 3;
      state.countdown -= modifier;
      if (state.countdown <= 0) { state.phase = "race"; state.started = true; }
      return;
    }
    if (!state.started || state.finished) return;
    state.elapsed += modifier;
    updatePresentation(state, modifier, names);
    state.tracers.forEach(function (racer, index) {
      if (racer.status === "stopped") return;
      if (racer.status === "celebrating") {
        racer.celebrateTime += modifier;
        racer.frame = Math.floor(state.elapsed * 8 + index) % 3;
        if (racer.celebrateTime >= 2.5) { racer.status = "stopped"; racer.frame = 1; }
        return;
      }
      var wobble = Math.sin(state.elapsed * (2.2 + index * 0.13) + index) * 0.004;
      racer.staminaTimer += modifier;
      var staminaWave = Math.sin(racer.staminaTimer * 0.22 + racer.staminaOffset);
      var previous = racer.staminaPhase;
      racer.staminaPhase = staminaWave > 0.72 ? "surge" : (staminaWave < -0.72 ? "tired" : "steady");
      if (previous !== racer.staminaPhase) racer.dustSeed += 17;
      var stamina = racer.staminaPhase === "surge" ? 1.18 : (racer.staminaPhase === "tired" ? 0.78 : 1);
      if (racer.playerAdvantage) stamina *= racer.staminaPhase === "tired" ? 1.08 : 1.035;
      if (racer.eventTimer > 0) { racer.eventTimer = Math.max(0, racer.eventTimer - modifier); if (!racer.eventTimer) racer.eventMultiplier = 1; }
      var leaderProgress = state.tracers.reduce(function (max, candidate) { return Math.max(max, candidate.progress); }, 0);
      var catchUp = Math.min(0.42, Math.max(0, leaderProgress - racer.progress) * 1.45);
      if (state.firstFinishTime != null) catchUp = Math.max(catchUp, 0.28);
      racer.progress = Math.min(racer.finishTarget, racer.progress + (racer.speed * stamina * (1 + catchUp) * (racer.eventMultiplier || 1) + wobble) * modifier);
      racer.frame = Math.floor(state.elapsed * 10 + index) % 3;
      if (racer.progress >= 1 && state.ranking.indexOf(index) < 0) {
        state.ranking.push(index); racer.finishTime = state.elapsed;
        if (state.firstFinishTime == null) state.firstFinishTime = state.elapsed;
        state.commentary = colorName(index, names) + " crosses the finish line!";
        state.commentaryTimer = 2.2; state.crowdPulse = 1; state.cameraPunch = 0.3;
      }
      if (racer.progress >= racer.finishTarget && racer.status === "running") { racer.status = "celebrating"; racer.celebrateTime = 0; }
    });
    if (state.firstFinishTime != null && state.elapsed - state.firstFinishTime > state.finishGracePeriod) {
      state.tracers.forEach(function (racer, index) {
        if (racer.status !== "running") return;
        racer.progress = Math.max(racer.progress, 1);
        if (state.ranking.indexOf(index) < 0) { state.ranking.push(index); racer.finishTime = state.elapsed; }
        racer.status = "celebrating"; racer.celebrateTime = 0;
      });
    }
    if (state.tracers.every(function (racer) { return racer.status === "stopped"; })) {
      state.winner = state.ranking[0]; state.finished = true; state.started = false; state.resultsTimer = 0;
    }
    if (state.elapsed > 1.2 && !state.finished) {
      var leader = state.tracers.reduce(function (best, racer) { return racer.progress > best.progress ? racer : best; }, state.tracers[0]);
      var width = viewportWidth || 512;
      state.cameraX = Math.max(0, Math.min(state.worldLength - width, leader.progress * state.finishWorldX - 300));
    }
  }

  root.PhantomChocoboRaceController = { update: update, updateTransition: updateTransition };
}(window));
