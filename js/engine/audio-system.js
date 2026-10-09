(function (root) {
  "use strict";

  function AudioSystem() {
    this.context = null;
    this.master = null;
    this.timer = null;
    this.playing = false;
    this.step = 0;
    this.volume = 0.12;
    this.notes = [261.63, 329.63, 392, 523.25, 392, 329.63, 293.66, 349.23];
    this.track = null;
    this.lyrics = [];
    this.lyricsLoaded = false;
  }
  AudioSystem.prototype.ensureContext = function () {
    if (this.context) return;
    var Context = root.AudioContext || root.webkitAudioContext;
    if (!Context) throw new Error("当前浏览器不支持 Web Audio");
    this.context = new Context();
    this.master = this.context.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.context.destination);
  };
  AudioSystem.prototype.playNote = function () {
    var oscillator = this.context.createOscillator();
    var gain = this.context.createGain();
    var now = this.context.currentTime;
    oscillator.type = "triangle";
    oscillator.frequency.value = this.notes[this.step++ % this.notes.length];
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.85);
  };
  AudioSystem.prototype.toggle = function () {
	if (this.configuredSource) return this.toggleTrack();
    this.ensureContext();
    if (this.context.state === "suspended") this.context.resume();
    this.playing = !this.playing;
    if (this.playing) {
      this.playNote();
      this.timer = setInterval(this.playNote.bind(this), 900);
    } else {
      clearInterval(this.timer);
      this.timer = null;
    }
    return this.playing;
  };
  AudioSystem.prototype.configure = function (source, title) {
    this.configuredSource = source;
    this.title = title || "BGM";
    this.track = new Audio(source);
    this.track.loop = true;
    this.track.volume = this.volume;
  };
  AudioSystem.prototype.loadLyrics = function (source) {
    if (!source) return Promise.resolve([]);
    return fetch(source).then(function (response) { return response.text(); }).then(function (text) {
      this.lyrics = text.split(/\r?\n/).map(function (line) {
        var match = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
        if (!match) return null;
        var lyricText = match[3].trim();
        var translationMatch = lyricText.match(/^(.*?)(?:\s+)([\u3400-\u9fff].*)$/);
        return {
          time: Number(match[1]) * 60 + Number(match[2]),
          english: translationMatch ? translationMatch[1].trim() : lyricText,
          chinese: translationMatch ? translationMatch[2].trim() : ""
        };
      }).filter(Boolean).sort(function (a, b) { return a.time - b.time; });
      this.lyricsLoaded = true;
      return this.lyrics;
    }.bind(this)).catch(function () { this.lyrics = []; return this.lyrics; }.bind(this));
  };
  AudioSystem.prototype.getCurrentLyricIndex = function () {
    var time = this.track ? this.track.currentTime : 0;
    var index = -1;
    this.lyrics.forEach(function (line, lineIndex) { if (line.time <= time) index = lineIndex; });
    return index;
  };
  AudioSystem.prototype.toggleTrack = function () {
    if (this.track.paused) {
      return this.track.play().then(function () { this.playing = true; return true; }.bind(this));
    }
    this.track.pause();
    this.playing = false;
    return Promise.resolve(false);
  };
  AudioSystem.prototype.stop = function () {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    this.timer = null;
  };
  AudioSystem.prototype.setVolume = function (value) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master) this.master.gain.value = this.volume;
    if (this.track) this.track.volume = this.volume;
  };
  AudioSystem.prototype.getState = function () {
    return {
      playing: this.playing,
      title: this.title || "BGM",
      currentTime: this.track ? this.track.currentTime : 0,
      duration: this.track && isFinite(this.track.duration) ? this.track.duration : 0
    };
  };
  root.PhantomAudioSystem = new AudioSystem();
}(window));
