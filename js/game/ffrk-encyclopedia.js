(function (root) {
  "use strict";

  function createStatus() {
    return { loaded: false, loading: false, error: "", progress: 0, promise: null };
  }

  var state = {
    visible: false,
    tab: "bosses",
    level: "categories",
    series: "FF1",
    query: "",
    selected: 0,
    variant: 0,
    variantMenu: false,
    actionScroll: 0,
    records: { bosses: [], monsters: [], characters: [] },
    tabStatus: { bosses: createStatus(), monsters: createStatus(), characters: createStatus() },
    imageMapStatus: createStatus(),
    imageMap: Object.create(null),
    normImageIndex: {},
    images: Object.create(null)
  };
  var tabs = ["characters", "bosses", "monsters"];
  var seriesOptions = ["FF1", "FF2", "FF3", "FF4", "FF5", "FF6", "FF7", "FF8", "FF9", "FF10", "FF11", "FF12", "FF13", "FF14", "FF15", "FFT", "外伝", "零式", "KH", "その他"];
  var characterSeriesOptions = ["FF1", "FF2", "FF3", "FF4", "FF5", "FF6", "FF7", "FF8", "FF9", "FF10", "FF11", "FF12", "FF13", "FF14", "FF15", "FF16", "FFT", "KH"];
  var tabLabels = { bosses: "BOSS", monsters: "MONSTER", characters: "CHARACTER" };
  var fileMap = {
    bosses: "ffrk/bosses.csv",
    monsters: "ffrk/monsters.csv",
    characters: "ffrk/characters_detail.csv"
  };

  function parseLine(line) {
    var fields = [], field = "", quoted = false;
    for (var i = 0; i < line.length; i++) {
      var character = line[i];
      if (character === '"') {
        if (quoted && line[i + 1] === '"') { field += '"'; i++; }
        else quoted = !quoted;
      } else if (character === "," && !quoted) {
        fields.push(field); field = "";
      } else field += character;
    }
    fields.push(field);
    return fields;
  }

  function parseCsv(text) {
    var lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
    var headers = parseLine(lines.shift() || "");
    return lines.map(function (line) {
      var values = parseLine(line), record = {};
      headers.forEach(function (header, index) { record[header] = values[index] || ""; });
      return record;
    });
  }

  function categoryFolder(category) {
    var match = category.match(/(FF\d+|FFT|KH|Other|Spinoffs|Type_Zero)$/);
    var series = match ? match[1] : "Other";
    if (category.indexOf("ボス_") === 0) return "Boss_" + series;
    if (category.indexOf("モンスター_") === 0) return "Monster_" + series;
    if (category.indexOf("キャラクター(ジョブ別)_") === 0) {
      var jobs = { "シーフ": "Thief", "シューター": "Shooter", "ナイト": "Knight", "モンク": "Monk", "侍": "Samurai", "召喚士": "Summoner", "忍者": "Ninja", "戦士I": "Warrior_I", "戦士II": "Warrior_II", "機工士": "Machinist", "竜騎士": "Dragoon", "魔女": "Witch", "魔法剣士": "Spellblade", "魔道士I": "Mage_I", "魔道士II": "Mage_II" };
      return "Character_Job_" + (jobs[category.slice(13)] || "Knight");
    }
    return "Character_Jobs";
  }

  function loadImage(record) {
    if (!record || !record.imageFile || state.images[record.imageFile]) return;
    var image = new Image();
    state.images[record.imageFile] = image;
    image.src = record.imageFile;
  }

  // Secondary lookup: series + normalized base name -> image, so multi-phase
  // variants (e.g. "(1段階)"/"(2段階)") can share the artwork of the base boss
  // when the source pack only ships one image for the whole family.
  function buildNormalizedImageIndex(imageMap) {
    var index = {};
    Object.keys(imageMap).forEach(function (key) {
      var first = key.indexOf("|"), second = key.indexOf("|", first + 1);
      if (first < 0 || second < 0) return;
      var type = key.slice(0, first);
      var series = key.slice(first + 1, second);
      var name = key.slice(second + 1);
      var bucketKey = type + "|" + series;
      var bucket = index[bucketKey] || (index[bucketKey] = {});
      var norm = normalizeEntityName(name);
      if (!bucket[norm]) bucket[norm] = imageMap[key];
    });
    return index;
  }

  function attachImagesFor(type, imageMap) {
    state.records[type].forEach(function (record) {
      var exact = imageMap[type + "|" + record.series + "|" + record.name];
      var shared = null;
      if (!exact) {
        var seriesBucket = state.normImageIndex[type + "|" + record.series];
        if (seriesBucket) shared = seriesBucket[normalizeEntityName(record.name)] || null;
      }
      record.imageFile = exact || shared || "";
    });
  }

  // Streams the response so the ~23 MB bosses.csv can report download progress.
  // Falls back to response.text() when streaming is unavailable.
  function readResponseWithProgress(response, onProgress) {
    var total = Number(response.headers.get("content-length")) || 0;
    if (!response.body || typeof response.body.getReader !== "function" ||
        typeof Blob !== "function" || !total) {
      return response.text();
    }
    var reader = response.body.getReader();
    var received = 0;
    var chunks = [];
    function pump() {
      return reader.read().then(function (result) {
        if (result.done) return new Blob(chunks).text();
        chunks.push(result.value);
        received += result.value.length;
        onProgress(Math.min(99, Math.round((received / total) * 100)));
        return pump();
      });
    }
    return pump();
  }

  function ensureImageMap() {
    var status = state.imageMapStatus;
    if (status.loaded) return Promise.resolve(state.imageMap);
    if (status.loading) return status.promise;
    status.loading = true;
    status.promise = fetch("ffrk/entity-image-map.json")
      .then(function (response) {
        if (!response.ok) throw new Error("ffrk/entity-image-map.json (" + response.status + ")");
        return response.json();
      })
      .then(function (imageMap) {
        state.imageMap = imageMap;
        state.normImageIndex = buildNormalizedImageIndex(imageMap);
        tabs.forEach(function (type) {
          if (state.tabStatus[type].loaded) attachImagesFor(type, imageMap);
        });
        status.loaded = true;
        status.loading = false;
        return imageMap;
      })
      .catch(function (error) {
        // Missing images are non-fatal; data tabs remain usable without the map.
        status.loading = false;
        status.promise = null;
        return Object.create(null);
      });
    return status.promise;
  }

  // Loads a single tab's CSV on demand; safe to call repeatedly.
  function ensureData(type) {
    var status = state.tabStatus[type];
    if (status.loaded) return Promise.resolve(state.records[type]);
    if (status.loading) return status.promise;
    status.loading = true;
    status.error = "";
    status.progress = 0;
    status.promise = fetch(fileMap[type])
      .then(function (response) {
        if (!response.ok) throw new Error(fileMap[type] + " (" + response.status + ")");
        return readResponseWithProgress(response, function (percent) { status.progress = percent; });
      })
      .then(function (text) {
        state.records[type] = parseCsv(text);
        if (state.imageMapStatus.loaded) {
          attachImagesFor(type, state.imageMap);
        } else if (!state.imageMapStatus.loading) {
          // Best-effort (re)try; success attaches images to every loaded tab.
          ensureImageMap();
        }
        status.loaded = true;
        status.loading = false;
        status.progress = 100;
        return state.records[type];
      })
      .catch(function (error) {
        status.loading = false;
        status.error = "数据加载失败: " + error.message + "（点击或按 Enter 重试）";
        status.promise = null;
        throw error;
      });
    return status.promise;
  }

  // Startup entry point: never blocks the game. Small datasets are prefetched
  // during browser idle time; the large bosses.csv is scheduled last. If the
  // user opens a tab earlier, ensureData() takes over immediately.
  function scheduleBackgroundPrefetch() {
    var schedule = root.requestIdleCallback || function (callback) {
      return setTimeout(function () { callback({ didTimeout: false }); }, 1500);
    };
    schedule(function () {
      ensureImageMap()
        .then(function () { return Promise.all([ensureData("characters"), ensureData("monsters")]).catch(function () {}); })
        .then(function () { return ensureData("bosses").catch(function () {}); });
    });
  }

  function activeRecords() {
    var records = state.records[state.tab] || [];
    records = records.filter(function (record) { return record.series === state.series; });
    var query = state.query.trim().toLowerCase();
    if (query) records = records.filter(function (record) {
      return Object.keys(record).some(function (key) { return String(record[key]).toLowerCase().indexOf(query) >= 0; });
    });
    if (state.tab !== "bosses" && state.tab !== "monsters") return records.map(function (record) { return { name: record.name, records: [record] }; });
    var groups = [], byName = Object.create(null);
    records.forEach(function (record) {
      var name = normalizeEntityName(record.name);
      if (!byName[name]) { byName[name] = { name: name, records: [] }; groups.push(byName[name]); }
      byName[name].records.push(record);
    });
    return groups;
  }

  function normalizeEntityName(value) {
    var source = String(value || ""), result = "", stack = [];
    var opening = { "【": "】", "(": ")", "（": "）", "[": "]", "［": "］" };
    var closing = { "】": "【", ")": "(", "）": "（", "]": "[", "］": "［" };
    for (var index = 0; index < source.length; index++) {
      var character = source[index];
      if (opening[character]) { stack.push(character); continue; }
      if (closing[character] && stack[stack.length - 1] === closing[character]) { stack.pop(); continue; }
      if (!stack.length) result += character;
    }
    return result.replace(/[\s　]+/g, "").trim() || source.trim();
  }

  function open() {
    state.visible = true; state.level = "categories"; state.selected = 0; state.variantMenu = false;
    // The categories menu needs no data; a tab's CSV is fetched only when entered.
    // Warm the small image map ahead of time so images appear without extra wait.
    ensureImageMap();
  }
  function close() { state.visible = false; }
  function toggle() { state.visible ? close() : open(); }

  function selectSeries(index) {
    state.series = seriesOptions[(index + seriesOptions.length) % seriesOptions.length];
    state.selected = 0;
    state.variant = 0;
    state.variantMenu = false;
    state.actionScroll = 0;
  }

  function currentSeriesOptions() {
    return state.tab === "characters" ? characterSeriesOptions : seriesOptions;
  }

  function supportsVariants() {
    return state.tab === "bosses" || state.tab === "monsters";
  }

  function enterTab(type) {
    state.tab = type;
    if (state.tab === "characters" && characterSeriesOptions.indexOf(state.series) < 0) state.series = characterSeriesOptions[0];
    state.level = "records";
    state.selected = 0;
    state.variant = 0;
    state.variantMenu = false;
    ensureData(type).catch(function () {});
    ensureImageMap();
  }

  function handleClick(x, y) {
    if (!state.visible) return false;
    var panelX = state.level === "records" ? 8 : 18;
    var panelY = state.level === "records" ? 8 : 18;
    if (state.level === "categories") {
      var categoryX = 136, categoryY = 118;
      for (var categoryIndex = 0; categoryIndex < tabs.length; categoryIndex++) {
        var categoryTop = categoryY + categoryIndex * 34;
        if (x >= categoryX && x <= categoryX + 168 && y >= categoryTop && y <= categoryTop + 26) {
          enterTab(tabs[categoryIndex]);
          return true;
        }
      }
      return false;
    }
    var tabStatus = state.tabStatus[state.tab];
    if (tabStatus.error) {
      // Any click while an error is shown retries the request.
      ensureData(state.tab).catch(function () {});
      return true;
    }
    var tabY = panelY + 30;
    var detailX = panelX + 212;
    var detailY = panelY + 46;
    var detailHeight = 480 - panelY - 8 - detailY;
    var variantButtonY = detailY + detailHeight - 28;
    if (supportsVariants() && x >= detailX + 12 && x <= detailX + 202 && y >= variantButtonY && y <= variantButtonY + 18) {
      var groups = activeRecords();
      var group = groups[state.selected];
      if (group && group.records.length > 1) {
        state.variantMenu = !state.variantMenu;
        return true;
      }
    }
    if (state.variantMenu) {
      var menuGroups = activeRecords();
      var menuGroup = menuGroups[state.selected];
      if (menuGroup) {
        var menuX = detailX + 12;
        var visibleVariants = Math.min(7, menuGroup.records.length);
        var menuStart = Math.max(0, Math.min(state.variant - 3, menuGroup.records.length - visibleVariants));
        var menuY = variantButtonY - visibleVariants * 18 - 4;
        if (x >= menuX && x <= menuX + 190 && y >= menuY && y <= menuY + visibleVariants * 18) {
          var clickedVariant = menuStart + Math.floor((y - menuY) / 18);
          if (clickedVariant < menuGroup.records.length) {
            state.variant = clickedVariant;
            state.variantMenu = false;
          }
          return true;
        }
      }
    }
    return false;
  }

  function update(input) {
    if (input.consume(84)) { toggle(); return state.visible; }
    if (!state.visible) return false;
    if (input.consume(27)) {
      if (state.variantMenu) { state.variantMenu = false; return true; }
      if (state.level === "records") { state.level = "categories"; state.selected = 0; return true; }
      close(); return true;
    }
    if (state.level === "categories") {
      if (input.consume(38)) state.selected = (state.selected + tabs.length - 1) % tabs.length;
      if (input.consume(40)) state.selected = (state.selected + 1) % tabs.length;
      if (input.consume(13) || input.consume(32)) { enterTab(tabs[state.selected]); }
      return true;
    }
    var activeStatus = state.tabStatus[state.tab];
    if (activeStatus.error && (input.consume(13) || input.consume(32))) {
      ensureData(state.tab).catch(function () {});
      return true;
    }
    if (activeStatus.loading || activeStatus.error) return true;
    var records = activeRecords();
    var selectableSeries = currentSeriesOptions();
    var seriesIndex = selectableSeries.indexOf(state.series);
    if (input.consume(37)) { state.series = selectableSeries[(seriesIndex + selectableSeries.length - 1) % selectableSeries.length]; state.selected = 0; state.variant = 0; }
    if (input.consume(39)) { state.series = selectableSeries[(seriesIndex + 1) % selectableSeries.length]; state.selected = 0; state.variant = 0; }
    if (input.consume(219)) {
      state.series = seriesOptions[(seriesOptions.indexOf(state.series) + seriesOptions.length - 1) % seriesOptions.length];
      state.selected = 0;
    }
    if (input.consume(221)) {
      state.series = seriesOptions[(seriesOptions.indexOf(state.series) + 1) % seriesOptions.length];
      state.selected = 0;
    }
    if (state.variantMenu && supportsVariants() && records[state.selected]) {
      if (input.consume(38)) state.variant = Math.max(0, state.variant - 1);
      if (input.consume(40)) state.variant = Math.min(records[state.selected].records.length - 1, state.variant + 1);
      if (input.consume(13)) state.variantMenu = false;
    } else {
      if (input.consume(33)) state.actionScroll = Math.max(0, state.actionScroll - 4);
      if (input.consume(34)) state.actionScroll += 4;
      if (input.consume(38)) { state.selected = Math.max(0, state.selected - 1); state.variant = 0; state.variantMenu = false; state.actionScroll = 0; }
      if (input.consume(40)) { state.selected = Math.min(Math.max(0, records.length - 1), state.selected + 1); state.variant = 0; state.variantMenu = false; state.actionScroll = 0; }
      if (input.consume(13) && supportsVariants() && records[state.selected]) state.variantMenu = records[state.selected].records.length > 1;
    }
    return true;
  }

  function onKey(event) {
    if (!state.visible) return;
    if (event.key === "Backspace") { state.query = state.query.slice(0, -1); state.selected = 0; event.preventDefault(); return; }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== "t" && event.key !== "T" && event.key !== "[" && event.key !== "]") {
      state.query += event.key; state.selected = 0; event.preventDefault();
    }
  }

  function wrap(ctx, text, width) {
    var result = [], line = "";
    String(text || "").split(" ").forEach(function (word) {
      var candidate = line ? line + " " + word : word;
      if (ctx.measureText(candidate).width <= width) { line = candidate; return; }
      if (line) { result.push(line); line = ""; }
      for (var characterIndex = 0; characterIndex < word.length; characterIndex++) {
        var character = word[characterIndex];
        if (ctx.measureText(line + character).width > width && line) { result.push(line); line = ""; }
        line += character;
      }
    });
    if (line) result.push(line);
    return result.length ? result : [""];
  }

  function text(ctx, value, x, y, width, lineHeight, maxLines) {
    var lines = wrap(ctx, value, width).slice(0, maxLines || 99);
    lines.forEach(function (line, index) { ctx.fillText(line, x, y + index * lineHeight); });
    return lines.length * lineHeight;
  }

  function drawContainedImage(ctx, image, x, y, width, height) {
    var sourceWidth = image.naturalWidth || image.width;
    var sourceHeight = image.naturalHeight || image.height;
    if (!sourceWidth || !sourceHeight) return;
    var scale = Math.min(width / sourceWidth, height / sourceHeight);
    var drawWidth = sourceWidth * scale;
    var drawHeight = sourceHeight * scale;
    ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function drawNativeImage(ctx, image, x, y, maxWidth, maxHeight) {
    var sourceWidth = image.naturalWidth || image.width;
    var sourceHeight = image.naturalHeight || image.height;
    if (!sourceWidth || !sourceHeight) return { width: 0, height: 0 };
    var scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
    var drawWidth = sourceWidth * scale;
    var drawHeight = sourceHeight * scale;
    ctx.drawImage(image, x + (maxWidth - drawWidth) / 2, y, drawWidth, drawHeight);
    return { width: drawWidth, height: drawHeight };
  }

  function draw(env) {
    if (!state.visible) return;
    var ctx = env.ctx, width = env.canvas.width, height = env.canvas.height;
    ctx.fillStyle = "rgba(10, 8, 18, 0.88)"; ctx.fillRect(0, 0, width, height);
    var panelX = state.level === "records" ? 8 : 18;
    var panelY = state.level === "records" ? 8 : 18;
    var panelW = width - panelX * 2, panelH = height - panelY * 2;
    if (state.level === "categories") {
      ctx.fillStyle = "rgba(10, 8, 18, 0.35)"; ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = "#201b32"; ctx.fillRect(panelX + 4, panelY + 5, panelW, panelH);
      ctx.fillStyle = "#342747"; ctx.fillRect(panelX, panelY, panelW, panelH);
      ctx.strokeStyle = "#d5a65b"; ctx.lineWidth = 2; ctx.strokeRect(panelX, panelY, panelW, panelH);
    }
    ctx.textBaseline = "top"; ctx.textAlign = "left";
    ctx.fillStyle = "#f5d68d"; ctx.font = "bold 15px " + env.font; ctx.fillText("FF ARCHIVE", panelX + 14, panelY + 8);
    ctx.fillStyle = "#b9a9d0"; ctx.font = "9px " + env.font; ctx.fillText("DATA FROM FFRK", panelX + 112, panelY + 11);
    if (state.level === "categories") {
      var menuX = 136, menuY = 118, menuW = 240;
      var menuPanelX = 104, menuPanelY = 54, menuPanelW = 304, menuPanelH = 220;
      ctx.fillStyle = "#201b32"; ctx.fillRect(menuPanelX + 5, menuPanelY + 6, menuPanelW, menuPanelH);
      ctx.fillStyle = "#342747"; ctx.fillRect(menuPanelX, menuPanelY, menuPanelW, menuPanelH);
      ctx.strokeStyle = "#d5a65b"; ctx.lineWidth = 2; ctx.strokeRect(menuPanelX, menuPanelY, menuPanelW, menuPanelH);
      ctx.strokeStyle = "rgba(213,166,91,0.55)"; ctx.lineWidth = 1; ctx.strokeRect(menuPanelX + 7, menuPanelY + 7, menuPanelW - 14, menuPanelH - 14);
      ctx.fillStyle = "#b9a9d0"; ctx.font = "9px " + env.font; ctx.textAlign = "center";
      ctx.fillStyle = "#b9a9d0"; ctx.font = "9px " + env.font;
      ctx.fillText("ARCHIVE INDEX", width / 2, menuPanelY + 14);
      ctx.fillStyle = "#f5d68d"; ctx.font = "bold 9px Arial"; ctx.textAlign = "right";
      ctx.fillText("T / ESC 关闭", menuPanelX + menuPanelW - 16, menuPanelY + 16);
      ctx.strokeStyle = "rgba(213,166,91,0.45)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(menuX - 18, menuPanelY + 30); ctx.lineTo(menuX + menuW + 18, menuPanelY + 30); ctx.stroke();
      ctx.fillStyle = "#d5a65b";
      ctx.fillRect(menuPanelX + 28, menuPanelY + 60, menuPanelW - 56, 3);
      tabs.forEach(function (tab, index) {
        var cardX = menuX, cardY = menuY + index * 34;
        var active = index === state.selected;
        ctx.fillStyle = active ? "#d5a65b" : "#5b4b73";
        ctx.fillRect(cardX, cardY, menuW, 26);
        ctx.fillStyle = active ? "#f5d68d" : "#8f7fa3";
        ctx.fillRect(cardX + menuW - 10, cardY + 5, 3, 16);
        ctx.fillStyle = active ? "#24192e" : "#eadcf6";
        ctx.font = "bold 11px Arial";
        ctx.textAlign = "left";
        ctx.fillText(tabLabels[tab], cardX + 14, cardY + 7);
        if (active) {
          ctx.fillStyle = "#f5d68d";
          ctx.fillText("◆", cardX - 16, cardY + 7);
        }
      });
      ctx.fillStyle = "#eadcf6"; ctx.font = "10px Arial"; ctx.textAlign = "center";
      ctx.fillText("↑  ↓", width / 2 - 72, menuY + 121);
      ctx.fillText("ENTER", width / 2, menuY + 121);
      ctx.fillText("ESC", width / 2 + 72, menuY + 121);
      ctx.fillStyle = "#9f8bb8"; ctx.font = "8px " + env.font;
      ctx.fillText("选择", width / 2 - 72, menuY + 134);
      ctx.fillText("进入", width / 2, menuY + 134);
      ctx.fillText("退出", width / 2 + 72, menuY + 134);
      return;
    }
    ctx.textAlign = "left"; ctx.fillStyle = "#d5c8e5"; ctx.font = "10px " + env.font;
    ctx.fillStyle = "#d5a65b"; ctx.font = "bold 11px Arial"; ctx.fillText(tabLabels[state.tab], panelX + 14, panelY + 34);
    ctx.fillStyle = "#d5c8e5"; ctx.font = "10px " + env.font; ctx.fillText("筛选: " + (state.query || "全部"), panelX + 102, panelY + 34);
    ctx.textAlign = "right";
    ctx.fillStyle = "#7c6b98"; ctx.font = "8px " + env.font; ctx.fillText("↑↓ 条目　ESC 返回", panelX + panelW - 118, panelY + 34);
    ctx.textAlign = "right";
    ctx.fillStyle = "#f5d68d"; ctx.font = "bold 18px Arial"; ctx.fillText(state.series, panelX + panelW - 14, panelY + 9);
    ctx.fillStyle = "#d5a65b"; ctx.font = "9px " + env.font; ctx.fillText("◀  ▶  切换作品", panelX + panelW - 14, panelY + 30);
    ctx.textAlign = "left";
    var activeStatus = state.tabStatus[state.tab];
    if (activeStatus.loading) {
      ctx.fillStyle = "#f4e7ca"; ctx.font = "14px " + env.font;
      ctx.fillText("正在读取 " + tabLabels[state.tab] + " 资料...", panelX + 24, panelY + 60);
      if (activeStatus.progress > 0) {
        var barX = panelX + 24, barY = panelY + 86, barW = 240;
        ctx.fillStyle = "#171324"; ctx.fillRect(barX, barY, barW, 12);
        ctx.fillStyle = "#d5a65b"; ctx.fillRect(barX, barY, Math.round(barW * activeStatus.progress / 100), 12);
        ctx.strokeStyle = "#8f7fa3"; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barW, 12);
        ctx.fillStyle = "#d6cbe2"; ctx.font = "10px " + env.font;
        ctx.fillText(activeStatus.progress + "%", barX + barW + 10, barY);
      }
      return;
    }
    if (activeStatus.error) {
      ctx.fillStyle = "#f28f8f"; ctx.font = "12px " + env.font;
      text(ctx, activeStatus.error, panelX + 24, panelY + 60, panelW - 48, 16, 4);
      return;
    }
    var records = activeRecords(); state.selected = Math.min(state.selected, Math.max(0, records.length - 1));
    var isLargeEntity = state.tab === "bosses" || state.tab === "monsters";
    var listX = panelX + 10, listY = panelY + (isLargeEntity ? 148 : 46), listW = 190, rowH = 22;
    var contentHeight = panelH - (isLargeEntity ? 168 : 58);
    ctx.fillStyle = "#171324"; ctx.fillRect(listX, listY, listW, contentHeight);
    var visibleRows = Math.max(1, Math.floor((contentHeight - 24) / rowH));
    var start = Math.max(0, Math.min(state.selected - Math.floor(visibleRows / 2), records.length - visibleRows));
    ctx.font = "10px " + env.font;
    ctx.save();
    ctx.beginPath();
    ctx.rect(listX + 4, listY, listW - 8, visibleRows * rowH);
    ctx.clip();
    for (var i = start; i < Math.min(records.length, start + visibleRows); i++) {
      var rowY = listY + (i - start) * rowH;
      if (i === state.selected) { ctx.fillStyle = "#70517c"; ctx.fillRect(listX + 2, rowY, listW - 4, rowH - 1); }
      ctx.fillStyle = i === state.selected ? "#fff0bd" : "#d6cbe2";
      var prefix = (i + 1) + ". ";
      var fullName = prefix + String(records[i].name || "Unnamed");
      var availableWidth = listW - 14;
      if (i === state.selected && ctx.measureText(fullName).width > availableWidth) {
        var textWidth = ctx.measureText(fullName).width;
        var cycleWidth = textWidth + 32;
        var offset = (Date.now() / 38) % cycleWidth;
        ctx.fillText(fullName, listX + 7 - offset, rowY + 6);
        ctx.fillText(fullName, listX + 7 - offset + cycleWidth, rowY + 6);
      } else {
        var displayName = fullName;
        while (ctx.measureText(displayName + "...").width > availableWidth && displayName.length > prefix.length) displayName = displayName.slice(0, -1);
        if (displayName !== fullName) displayName += "...";
        ctx.fillText(displayName, listX + 7, rowY + 6);
      }
    }
    ctx.restore();
    ctx.fillStyle = "#9c8caf"; ctx.fillText(records.length + " entries", listX + 7, listY + contentHeight - 15);
    var group = records[state.selected];
    if (!group) { ctx.fillStyle = "#d6cbe2"; ctx.fillText("没有匹配条目", panelX + 220, listY + 20); return; }
    state.variant = Math.min(state.variant, group.records.length - 1);
    if (isLargeEntity) {
      var activeRecord = group.records[state.variant];
      var listImage = activeRecord.imageFile && state.images[activeRecord.imageFile];
      if (activeRecord.imageFile) loadImage(activeRecord);
      ctx.fillStyle = "#0d0a14";
      ctx.fillRect(listX, panelY + 46, listW, 94);
      if (listImage && listImage.complete && listImage.naturalWidth) {
        drawNativeImage(ctx, listImage, listX + 4, panelY + 50, listW - 8, 86);
      } else if (!activeRecord.imageFile) {
        ctx.fillStyle = "#5d5170";
        ctx.font = "10px " + env.font;
        ctx.textAlign = "center";
        ctx.fillText("暂无图片", listX + listW / 2, panelY + 86);
        ctx.textAlign = "left";
      }
    }
    var detailY = panelY + 46;
    var detailHeight = panelH - 54;
    drawDetail(ctx, group, panelX + 212, detailY, panelW - 222, detailHeight, env);
  }

  function drawDetail(ctx, group, x, y, width, height, env) {
    var record = group.records[state.variant];
    ctx.fillStyle = "#171324"; ctx.fillRect(x, y, width, height);
    var image = record.imageFile && state.images[record.imageFile];
    if (record.imageFile) loadImage(record);
    var isLargeEntity = state.tab === "bosses" || state.tab === "monsters";
    var imageTop = 0;
    if (image && image.complete && image.naturalWidth) {
      ctx.fillStyle = "#0d0a14";
      if (isLargeEntity) {
        // BOSS/MONSTER images are rendered above the left record list.
      } else {
        imageTop = y + height - 96;
        ctx.fillRect(x + width - 96, imageTop, 88, 88);
        drawContainedImage(ctx, image, x + width - 92, imageTop + 4, 80, 80);
      }
    }
    var headerY = y;
    var hasVariants = supportsVariants() && group.records.length > 1;
    var variantButtonY = y + height - 28;
    if (hasVariants) {
      ctx.fillStyle = state.variantMenu ? "#d5a65b" : "#5b4b73";
      ctx.fillRect(x + 12, variantButtonY, Math.min(width - 24, 190), 18);
      ctx.fillStyle = state.variantMenu ? "#24192e" : "#eadcf6";
      ctx.font = "9px " + env.font;
      ctx.fillText("变体选择: " + (state.variant + 1) + "/" + group.records.length + "　Enter", x + 18, variantButtonY + 4);
    }
    var cursor = headerY + 12;
    ctx.fillStyle = "#e2d6ed"; ctx.font = "10px " + env.font;
    var attributeKeys = ["炎", "氷", "雷", "地", "風", "水", "聖", "闇", "毒"];
    if (supportsVariants()) {
      var attributeWidth = Math.min(width - 24, 234) / attributeKeys.length;
      ctx.fillStyle = "#8f7fa3"; ctx.font = "9px " + env.font; ctx.textAlign = "center";
      attributeKeys.forEach(function (key, index) {
        var attributeX = x + 12 + attributeWidth * index;
        var value = record[key] || "-";
        ctx.fillStyle = "#5b4b73";
        ctx.fillRect(attributeX, cursor, attributeWidth - 2, 24);
        ctx.fillStyle = "#d5a65b"; ctx.font = "9px " + env.font;
        ctx.fillText(key, attributeX + attributeWidth / 2 - 1, cursor + 3);
        ctx.fillStyle = "#eadcf6"; ctx.font = "9px " + env.font;
        ctx.fillText(String(value).slice(0, 5), attributeX + attributeWidth / 2 - 1, cursor + 14);
      });
      ctx.textAlign = "left";
      cursor += 29;
    }
    var actionViewportBottom = hasVariants ? variantButtonY - 6 : y + height - 8;
    var keys = Object.keys(record).filter(function (key) {
      return attributeKeys.indexOf(key) < 0 && key !== "name" && key !== "series" && key !== "imageCategory" && key !== "imageFile" && record[key];
    });
    keys.slice(0, 7).forEach(function (key) {
      if (cursor >= actionViewportBottom) return;
      ctx.fillStyle = "#ded3e6";
      var textWidth = imageTop && cursor + 12 >= imageTop ? width - 108 : width - 24;
      if (key === "actions") {
        ctx.fillStyle = "#d5a65b";
        ctx.fillText("actions:", x + 12, cursor);
        cursor += 10;
        ctx.fillStyle = "#ded3e6";
        var actionLines = wrap(ctx, String(record[key]).replace(/[\r\n]+/g, " ").replace(/\s*\|\s*/g, " | "), textWidth);
        var actionVisible = Math.max(1, Math.floor((actionViewportBottom - cursor) / 10));
        state.actionScroll = Math.min(state.actionScroll, Math.max(0, actionLines.length - actionVisible));
        ctx.save();
        ctx.beginPath(); ctx.rect(x + 12, cursor, textWidth, actionVisible * 10); ctx.clip();
        actionLines.slice(state.actionScroll, state.actionScroll + actionVisible).forEach(function (line, index) {
          ctx.fillText(line, x + 12, cursor + index * 10);
        });
        ctx.restore();
        cursor += actionVisible * 10;
      } else {
        ctx.fillStyle = "#d5a65b"; ctx.fillText(key + ":", x + 12, cursor); cursor += 12;
        cursor += text(ctx, record[key], x + 12, cursor, textWidth, 10, Math.max(1, Math.floor((actionViewportBottom - cursor) / 10)));
      }
      cursor += 2;
    });
    if (hasVariants && state.variantMenu) {
      var visibleVariants = Math.min(7, group.records.length);
      var menuStart = Math.max(0, Math.min(state.variant - 3, group.records.length - visibleVariants));
      var menuTop = variantButtonY - visibleVariants * 18 - 4;
      ctx.fillStyle = "#241c36";
      ctx.fillRect(x + 12, menuTop, Math.min(width - 24, 190), visibleVariants * 18);
      ctx.font = "9px " + env.font;
      group.records.slice(menuStart, menuStart + visibleVariants).forEach(function (variant, index) {
        var variantIndex = menuStart + index;
        ctx.fillStyle = variantIndex === state.variant ? "#d5a65b" : "#eadcf6";
        ctx.fillText((variantIndex + 1) + ". " + String(variant.name).slice(0, 22), x + 18, menuTop + index * 18 + 4);
      });
    }
  }

  root.PhantomFfrkEncyclopedia = {
    state: state,
    load: scheduleBackgroundPrefetch,
    ensureData: ensureData,
    update: update,
    draw: draw,
    onKey: onKey,
    handleClick: handleClick,
    toggle: toggle
  };
  addEventListener("keydown", onKey, false);
}(window));
