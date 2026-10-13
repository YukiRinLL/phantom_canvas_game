(function (root) {
  "use strict";

  var COLOR_NAMES = ["Yellow", "White", "Pink", "Blue", "Green", "Black", "Gold", "Brown"];

  function createState() {
    return {
      visible: false,
      phase: "selection",
      selectedIndex: 0,
      previewTimer: 0,
      readyTimer: 0,
      countdown: 0,
      countdownShown: 3,
      started: false,
      elapsed: 0,
      finished: false,
      winner: -1,
      tracers: [],
      cameraX: 0,
      worldLength: 1700,
      finishWorldX: 1280,
      ranking: [],
      playerIndex: -1,
      firstFinishTime: null,
      finishGracePeriod: 5.5,
      eventTimer: 0,
      nextEventAt: 4.5,
      activeEvent: null,
      commentary: "The race is underway!",
      commentaryTimer: 3,
      cameraPunch: 0,
      crowdPulse: 0,
      lastLeader: -1,
      raceTransition: { active: false, progress: 0, duration: 1.05, mode: "selection" },
      resultsTimer: 0
    };
  }

  function createConfirmState() {
    return { visible: false, selected: 0 };
  }

  function scatteredValues(minimum, maximum, spacing) {
    var values = [];
    for (var index = 0; index < 8; index++) {
      var base = minimum + (maximum - minimum) * index / 7;
      values.push(Math.max(minimum, Math.min(maximum, base + (Math.random() - 0.5) * spacing)));
    }
    for (var current = values.length - 1; current > 0; current--) {
      var swap = Math.floor(Math.random() * (current + 1));
      var temporary = values[current];
      values[current] = values[swap];
      values[swap] = temporary;
    }
    return values;
  }

  function resetForNewRace(state) {
    var speeds = scatteredValues(0.052, 0.078, 0.003);
    var extraDistances = scatteredValues(0.035, 0.115, 0.009);
    state.visible = true;
    state.phase = "selection";
    state.selectedIndex = 0;
    state.previewTimer = 1.5;
    state.readyTimer = 0;
    state.countdown = 0;
    state.started = false;
    state.elapsed = 0;
    state.finished = false;
    state.winner = -1;
    state.cameraX = 0;
    state.ranking = [];
    state.playerIndex = -1;
    state.firstFinishTime = null;
    state.eventTimer = 0;
    state.nextEventAt = 4.5 + Math.random() * 2;
    state.activeEvent = null;
    state.commentary = "The race is underway!";
    state.commentaryTimer = 3;
    state.cameraPunch = 0;
    state.crowdPulse = 0;
    state.lastLeader = -1;
    state.raceTransition = { active: true, progress: 0, duration: 1.05, mode: "selection" };
    state.resultsTimer = 0;
    state.tracers = speeds.map(function (speed, index) {
      return {
        progress: 0,
        speed: speed,
        frame: 0,
        finished: false,
        status: "running",
        celebrateTime: 0,
        celebrateDistance: extraDistances[index],
        finishTarget: 1 + extraDistances[index],
        finishTime: null,
        staminaPhase: "steady",
        staminaTimer: 0,
        staminaOffset: Math.random() * Math.PI * 2,
        dustSeed: Math.random() * 100,
        playerAdvantage: false,
        eventTimer: 0,
        eventMultiplier: 1
      };
    });
  }

  root.PhantomChocoboRace = {
    colorNames: COLOR_NAMES,
    createState: createState,
    createConfirmState: createConfirmState,
    resetForNewRace: resetForNewRace,
    scatteredValues: scatteredValues
  };
}(window));
