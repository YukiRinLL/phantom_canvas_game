// The host page owns the canvas so the renderer remains embeddable and responsive.
var canvas = document.getElementById("game-canvas") || document.createElement("canvas");
var ctx = canvas.getContext("2d");
var appConfig = window.APP_CONFIG;
var gameConfig = appConfig.GAME;
var renderer = new PhantomRenderer(ctx);
PhantomInputSystem.init(window);
PhantomAudioSystem.configure(gameConfig.bgm.source, gameConfig.bgm.title);
canvas.width = gameConfig.canvas.width;
canvas.height = gameConfig.canvas.height;
var runtimeStatus = document.getElementById("runtime-status");
if (runtimeStatus) runtimeStatus.hidden = true;
var UI_THEME = {
	panel: "rgba(30, 24, 20, 0.96)",
	panelSoft: "rgba(42, 33, 27, 0.94)",
	border: "#f2c46d",
	accent: "#f2c46d",
	text: "#fff3d1",
	muted: "#b9a995",
	danger: "#ff9a8f",
	font: "system-ui, -apple-system, Segoe UI, sans-serif"
};
var NOTICE_TABS = ["activity", "domestic", "global", "globalTopics"];
var systemNotice = {
	visible: false,
	button: { x: 464, y: 5, width: 42, height: 24 },
	scroll: 0,
	selectedIndex: 0,
	tab: "activity",
	items: { activity: [], domestic: [], global: [], globalTopics: [] },
	loaded: { activity: false, domestic: false, global: false, globalTopics: false },
	loading: { activity: false, domestic: false, global: false, globalTopics: false },
	errors: { activity: null, domestic: null, global: null, globalTopics: null }
};
var musicPlayer = { visible: false, cover: null };
var mogWindow = { visible: false, frame: 0 };
var chocoboRace = {
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
	firstFinishTime: null,
	finishGracePeriod: 5.5,
	eventTimer: 0,
	nextEventAt: 4.5,
	activeEvent: null,
	commentary: "The race is underway!",
	commentaryTimer: 3,
	cameraPunch: 0,
	crowdPulse: 0,
	lastLeader: -1
	,raceTransition: { active: false, progress: 0, duration: 1.05, mode: "selection" }
};

canvas.addEventListener("click", function (event) {
	var bounds = canvas.getBoundingClientRect();
	var scaleX = canvas.width / bounds.width;
	var scaleY = canvas.height / bounds.height;
	var x = (event.clientX - bounds.left) * scaleX;
	var y = (event.clientY - bounds.top) * scaleY;
	var button = systemNotice.button;
	if (x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height) {
		toggleSystemNotice();
		return;
	}
	if (systemNotice.visible && isPointInSystemNoticeTab(x, y)) {
		selectSystemNoticeTab(systemNotice.tabIndexAtPoint(x));
		return;
	}
	if (mogWindow.visible && isPointInMogWindow(x, y)) {
		mogWindow.visible = false;
		return;
	}
	if (chocoboRace.visible && isPointInChocoboRaceClose(x, y)) {
		closeChocoboRace();
		return;
	}
	if (systemNotice.visible && isPointInSystemNoticeItem(x, y)) {
		openSystemNoticeItem(systemNotice.itemIndexAtPoint(y));
		return;
	}
	if (currentScene === "indoor" && isPointInInteractionHint(x, y) &&
		(interactiveElements.lectern.interactable || interactiveElements.organ.interactable)) {
		// Use the same input path as the keyboard F key so every interaction stays consistent.
		keysDown[70] = true;
		return;
	}
	if (currentScene === "far" && interactiveElements.mog.interactable && isPointInMogHint(x, y)) {
		keysDown[70] = true;
		return;
	}
	if (messageBook && messageBook.visible && !messageBook.detailVisible) {
		openMessageDetailAtPoint(x, y);
	}
	if (musicPlayer.visible && isPointInMusicPlayer(x, y)) {
		try {
			PhantomAudioSystem.toggle().then(function () {});
		} catch (error) { reportStatus("音乐播放器不可用：" + error.message, true); }
	}
});

function reportStatus(message, isError) {
	if (runtimeStatus && debugMode) {
		runtimeStatus.textContent = message || "";
		runtimeStatus.style.color = isError ? "#ff8a8a" : "#ffd166";
		runtimeStatus.hidden = !message;
	}
	if (isError) console.warn("[Phantom] " + message);
}

function toggleSystemNotice() {
	if (messageBook && messageBook.visible) return;
	systemNotice.visible = !systemNotice.visible;
	systemNotice.scroll = 0;
	if (systemNotice.visible) loadSystemNoticeTab(systemNotice.tab);
}

function systemNoticeTabIndex() { return NOTICE_TABS.indexOf(systemNotice.tab); }
function selectSystemNoticeTab(index) {
	var tabs = NOTICE_TABS;
	if (index < 0 || index >= tabs.length) return;
	systemNotice.tab = tabs[index];
	systemNotice.scroll = 0;
	systemNotice.selectedIndex = 0;
	loadSystemNoticeTab(systemNotice.tab);
}
function isPointInSystemNoticeTab(x, y) {
	return systemNotice.visible && x >= 52 && x <= canvas.width - 52 && y >= 84 && y <= 109;
}
systemNotice.tabIndexAtPoint = function (x) {
	return Math.max(0, Math.min(NOTICE_TABS.length - 1, Math.floor((x - 52) / ((canvas.width - 104) / NOTICE_TABS.length))));
};
systemNotice.itemIndexAtPoint = function (y) {
	return systemNotice.scroll + Math.floor((y - 119) / 25);
};
function isPointInSystemNoticeItem(x, y) {
	return x >= 56 && x <= canvas.width - 56 && y >= 119 && y <= 216;
}
function openSystemNoticeItem(index) {
	var item = (systemNotice.items[systemNotice.tab] || [])[index];
	if (item && item.linkUrl) window.open(item.linkUrl, "_blank", "noopener,noreferrer");
}
function keepSystemNoticeSelectionVisible() {
	var items = systemNotice.items[systemNotice.tab] || [];
	var visibleCount = 4;
	if (systemNotice.selectedIndex < systemNotice.scroll) systemNotice.scroll = systemNotice.selectedIndex;
	if (systemNotice.selectedIndex >= systemNotice.scroll + visibleCount) systemNotice.scroll = systemNotice.selectedIndex - visibleCount + 1;
	systemNotice.scroll = Math.max(0, Math.min(systemNotice.scroll, Math.max(0, items.length - visibleCount)));
}
function loadSystemNoticeTab(tab) {
	if (systemNotice.loaded[tab] || systemNotice.loading[tab]) return;
	systemNotice.loading[tab] = true;
	systemNotice.errors[tab] = null;
	fetchSystemNoticeItems(tab)
		.then(function (items) {
			systemNotice.items[tab] = items;
			systemNotice.loaded[tab] = true;
		})
		.catch(function (error) {
			systemNotice.errors[tab] = (error && error.message) || "新闻加载失败";
			console.warn("[Phantom] news tab '" + tab + "' failed", error);
		})
		.finally(function () { systemNotice.loading[tab] = false; });
}

// Lodestone JSON mirror with permissive CORS (Access-Control-Allow-Origin: *).
var LODESTONE_NEWS_BASE = "https://lodestonenews.com/news";
// CN official news API (Shanda). Category codes follow the backend FF14NewsUtils mapping:
// 8324 维护通知 / 8325 维护完成 / 8326 综合 / 8327 热修复 / 5309 心享俱乐部 /
// 5310 新闻 / 5311 线上活动 / 5312 周边线下 / 5313 第三方平台活动.
var SDO_NEWS_BASE = "https://cqnews.web.sdo.com/api/news/newsList?gameCode=ff";
var DOMESTIC_CATEGORY_CODES = "8324,8325,8326,8327,5309,5310,5311,5312,5313";
var ACTIVITY_CATEGORY_CODES = "5311";
// Public CORS relays used only for endpoints that omit browser CORS headers (e.g. the CN news API).
// Ordered by observed reliability; each failure falls through to the next one.
var CORS_PROXIES = [
	function (url) { return "https://api.allorigins.win/raw?url=" + encodeURIComponent(url); },
	function (url) { return "https://api.codetabs.com/v1/proxy/?quest=" + encodeURIComponent(url); },
	function (url) { return "https://api.cors.lol/?url=" + encodeURIComponent(url); }
];

function fetchSystemNoticeItems(tab) {
	// "活动" = 国服线上活动公告.
	if (tab === "activity") return fetchSdoNews(ACTIVITY_CATEGORY_CODES);
	// "新闻" = 国服全部分类新闻, same scope as backend FF14NewsUtils.
	if (tab === "domestic") return fetchSdoNews(DOMESTIC_CATEGORY_CODES);
	// "topics" mirrors backend TOPICS_RSS_URL (topics.xml).
	if (tab === "globalTopics") {
		return fetchNewsJson(LODESTONE_NEWS_BASE + "/topics")
			.then(function (items) {
				if (!Array.isArray(items) || items.length === 0) throw new Error("topics 获取失败");
				return items.slice(0, 10).map(normalizeLodestoneItem);
			});
	}
	// "news" mirrors backend NEWS_RSS_URL (news.xml): notices + updates + maintenance.
	return Promise.all([
		fetchNewsJson(LODESTONE_NEWS_BASE + "/notices").catch(function () { return null; }),
		fetchNewsJson(LODESTONE_NEWS_BASE + "/updates").catch(function () { return null; }),
		fetchNewsJson(LODESTONE_NEWS_BASE + "/maintenance").catch(function () { return null; })
	]).then(function (groups) {
		var merged = Array.prototype.concat.apply([], groups.filter(Array.isArray));
		if (merged.length === 0) throw new Error("news 获取失败");
		return merged
			.filter(function (item) { return item && item.title; })
			.sort(function (a, b) { return String(b.time || "").localeCompare(String(a.time || "")); })
			.slice(0, 10)
			.map(normalizeLodestoneItem);
	});
}

function normalizeLodestoneItem(item) {
	return {
		title: item.title || "",
		description: item.description || "",
		date: String(item.time || "").slice(0, 10),
		linkUrl: item.url || ""
	};
}

function mapSdoNewsItem(item) {
	var id = item.Id || "";
	return {
		title: item.Title || "",
		description: item.Summary || "",
		date: String(item.PublishDate || "").slice(0, 10),
		linkUrl: item.OutLink || "https://ff.web.sdo.com/web8/index.html#/newstab/newscont/" + id
	};
}

function buildSdoNewsUrl(categoryCodes) {
	return SDO_NEWS_BASE + "&CategoryCode=" + encodeURIComponent(categoryCodes) + "&pageIndex=0&pageSize=10";
}

function fetchSdoNews(categoryCodes) {
	var url = buildSdoNewsUrl(categoryCodes);
	// The CN news API has no browser CORS headers but supports JSONP; prefer it (fast, domestic)
	// and only fall back to public CORS relays when the script injection fails.
	return fetchJsonp(url, "callback")
		.then(function (payload) { return (Array.isArray(payload.Data) ? payload.Data : []).map(mapSdoNewsItem); })
		.catch(function (jsonpError) {
			return fetchJsonViaCorsProxies(url)
				.then(function (payload) { return (Array.isArray(payload.Data) ? payload.Data : []).map(mapSdoNewsItem); })
				.catch(function () { throw jsonpError; });
		});
}

// Minimal JSONP loader: the server wraps its JSON in `callbackName({...})`, so no CORS is required.
function fetchJsonp(url, callbackParam) {
	var timeoutMs = (gameConfig && gameConfig.requestTimeoutMs) || 8000;
	return new Promise(function (resolve, reject) {
		var callbackName = "phantomNewsCb_" + Date.now() + "_" + Math.floor(Math.random() * 1e6);
		var script = document.createElement("script");
		var settled = false;
		var timer = setTimeout(function () { finish(new Error("官方新闻请求超时")); }, timeoutMs);
		function finish(error, data) {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
			if (script.parentNode) script.parentNode.removeChild(script);
			if (error) reject(error); else resolve(data);
		}
		window[callbackName] = function (data) { finish(null, data); };
		script.onerror = function () { finish(new Error("官方新闻请求失败")); };
		var separator = url.indexOf("?") >= 0 ? "&" : "?";
		script.src = url + separator + (callbackParam || "callback") + "=" + encodeURIComponent(callbackName);
		document.body.appendChild(script);
	});
}

function fetchNewsJson(url) {
	// One immediate retry covers transient connection resets, then fall back to a CORS relay.
	return fetchExternalText(url).then(parseJsonText)
		.catch(function (firstError) {
			return fetchExternalText(url).then(parseJsonText)
				.catch(function () { return fetchJsonViaCorsProxies(url).catch(function () { throw firstError; }); });
		});
}

function parseJsonText(text) { return JSON.parse(text); }

function fetchJsonViaCorsProxies(url) {
	var lastError = null;
	function attempt(index) {
		if (index >= CORS_PROXIES.length) {
			return Promise.reject(lastError || new Error("新闻代理暂时不可用"));
		}
		return fetchExternalText(CORS_PROXIES[index](url))
			.then(function (text) {
				var parsed = JSON.parse(text);
				// Proxies sometimes answer with an HTML error page carrying HTTP 200; treat it as failure.
				if (!parsed || typeof parsed !== "object") throw new Error("代理返回内容异常");
				return parsed;
			})
			.catch(function (error) {
				lastError = error;
				return attempt(index + 1);
			});
	}
	return attempt(0);
}

function fetchExternalText(url) {
	var controller = new AbortController();
	var timeoutMs = (gameConfig && gameConfig.requestTimeoutMs) || 8000;
	var timer = setTimeout(function () { controller.abort(); }, timeoutMs);
	return fetch(url, { signal: controller.signal })
		.then(function (response) {
			if (!response.ok) throw new Error("外部新闻请求失败 (" + response.status + ")");
			return response.text();
		})
		.finally(function () { clearTimeout(timer); });
}

// Debug mode keyboard toggle (F12 key)
addEventListener("keydown", function (e) {
	if (e.keyCode === 123) { // F12 key
		e.preventDefault(); // Prevent default browser action (dev tools)
		debugMode = !debugMode;
		console.log("Debug mode " + (debugMode ? "enabled" : "disabled"));
		// Show debug mode status on screen briefly
		if (debugMode) {
			reportStatus("Debug Mode: ON", false);
		} else if (runtimeStatus) {
			runtimeStatus.textContent = "";
			runtimeStatus.hidden = true;
		}
	}
}, false);

// Function to show debug status message
function showDebugStatus(message) {
	reportStatus(message, false);
	return;
/*
	// Create temporary status element
	var statusElement = document.createElement("div");
	statusElement.innerHTML = message;
	statusElement.style.position = "absolute";
	statusElement.style.top = "10px";
	statusElement.style.left = "10px";
	statusElement.style.padding = "5px 10px";
	statusElement.style.fontSize = "12px";
	statusElement.style.backgroundColor = "#333";
	statusElement.style.color = "white";
	statusElement.style.border = "1px solid #666";
	statusElement.style.borderRadius = "3px";
	statusElement.style.zIndex = "1000";
	document.body.appendChild(statusElement);
	
	// Remove element after 2 seconds
	setTimeout(function() {
		if (statusElement.parentNode) {
			statusElement.parentNode.removeChild(statusElement);
		}
	}, 2000);*/
}

// Resource loading management
var resources = {
	// Images that need to be loaded
	images: {
		bgImage: {
			ready: false,
			image: null,
			paths: ["images/church-close.png", "https://dlink.host/wx3.sinaimg.cn/large/006fhRoTly8i9ykaj3dcsj30u00u00xc.jpg"],
			currentPathIndex: 0,
			name: "close background"
		},
		bgFarImage: {
			ready: false,
			image: null,
			paths: ["images/church-far.png", "https://dlink.host/wx1.sinaimg.cn/large/006fhRoTly8i9ykaqhl08j30u00u0n2m.jpg"],
			currentPathIndex: 0,
			name: "far background"
		},
		bgFarBlockImage: {
			ready: false,
			image: null,
			paths: ["images/church-far-block.png"],
			currentPathIndex: 0,
			name: "far block"
		},
		bgIndoorImage: {
			ready: false,
			image: null,
			paths: ["images/church-indoor.png", "https://dlink.host/wx4.sinaimg.cn/large/006fhRoTly8i9ykaqhl08j30u00u0n2m.jpg"],
			currentPathIndex: 0,
			name: "indoor scene"
		},
		bgIndoorBlockImage: {
			ready: false,
			image: null,
			paths: ["images/church-indoor-block.png"],
			currentPathIndex: 0,
			name: "indoor block"
		},
		heroImage: {
			ready: false,
			image: null,
			paths: [gameConfig.hero.asset],
			currentPathIndex: 0,
			name: "hero"
		},
		musicCover: {
			ready: false,
			image: null,
			paths: ["audio/sonnet-phantom-cover.png"],
			currentPathIndex: 0,
			name: "music cover"
		},
		mogSprite: {
			ready: false,
			image: null,
			paths: ["images/mog-sprite-sheet.png"],
			currentPathIndex: 0,
			name: "mog sprite sheet"
		},
		moogle8bit: {
			ready: false,
			image: null,
			paths: ["images/moogle-8bit.png"],
			currentPathIndex: 0,
			name: "8-bit moogle"
		},
		chocoboPixel: {
			ready: false,
			image: null,
			paths: ["images/chocobo-pixel.png"],
			currentPathIndex: 0,
			name: "pixel chocobo"
		},
		chocoboRaceSheet: {
			ready: false,
			image: null,
			paths: ["images/chocobo-race-sprite-sheet.png"],
			currentPathIndex: 0,
			name: "chocobo race sprite sheet"
		}
	},
	
	// Character images (loaded later)
	characterImages: {
		ready: false,
		count: 0,
		total: 0,
		failed: false
	},
	
	// Loading status
	loading: true,
	loadCount: 0,
	totalToLoad: 0,
	loadLog: [],
	fatalError: "",
	
	// Initialize resource loading
	init: function() {
		// Calculate total resources to load
		this.totalToLoad = Object.keys(this.images).length + 2;
		
		// Start loading images
		for (var key in this.images) {
			this.loadImage(key);
		}
		PhantomAudioSystem.preloadAssets(gameConfig.bgm.lyrics).then(function () {
			resources.loadCount += 2;
			resources.addLog("Loaded BGM and lyrics");
			resources.checkLoadingComplete();
		}).catch(function (error) {
			resources.fatalError = error.message;
			resources.addLog("✗ " + error.message);
		});
	},
	
	// Load an image with fallback paths
	loadImage: function(key) {
		var resource = this.images[key];
		var currentPath = resource.paths[resource.currentPathIndex];
		
		console.log("Loading " + resource.name + " from: " + currentPath);
		this.addLog("Loading " + resource.name + " from: " + currentPath);
		
		resource.image = new Image();
		
		resource.image.onload = function() {
			resource.ready = true;
			resources.loadCount++;
			var successMsg = "✓ Loaded " + resource.name;
			console.log(successMsg);
			resources.addLog(successMsg);
			resources.checkLoadingComplete();
		}.bind(this);
		
				resource.image.onerror = function() {
			var errorMsg = "✗ Failed to load " + resource.name + " from: " + currentPath;
			console.log(errorMsg);
			resources.addLog(errorMsg);
			
			// Try next path if available
			resource.currentPathIndex++;
			if (resource.currentPathIndex < resource.paths.length) {
				resources.loadImage(key);
			} else {
				// No more paths to try, but continue loading other resources
				resources.loadCount++;
				resources.checkLoadingComplete();
			}
		}.bind(this);
		
		resource.image.src = currentPath;
	},
	
	// Add log message
	addLog: function(message) {
		this.loadLog.push(message);
		if (this.loadLog.length > 20) {
			this.loadLog.shift(); // Keep log size manageable
		}
	},
	
	// Check if all resources are loaded
	checkLoadingComplete: function() {
		// Check if all loading attempts are complete
		var allAttemptsComplete = (this.loadCount >= this.totalToLoad);
		
		// Check if character images are loaded
		var characterImagesLoaded = this.characterImages.ready;
		
		// Only proceed if all loading attempts are complete and character images are loaded
		if (allAttemptsComplete && characterImagesLoaded) {
			// Check if all images are loaded successfully
			var allImagesLoaded = true;
			for (var key in this.images) {
				if (!this.images[key].ready) {
					allImagesLoaded = false;
					break;
				}
			}
			
			if (allImagesLoaded && !this.characterImages.failed) {
				// All resources loaded successfully
				this.loading = false;
				var completeMsg = "All resources loaded! Starting game...";
				console.log(completeMsg);
				this.addLog(completeMsg);
				
				// Start the game after a short delay to show the complete message
				setTimeout(function() {
					startGame();
				}, 1000);
			} else {
				// Some resources failed to load, retry loading
				var retryMsg = "Some resources failed to load. Continuing with fallbacks.";
				console.log(retryMsg);
				this.addLog(retryMsg);
				
				/* Reset loading state
				this.loadCount = 0;
				for (var key in this.images) {
					var resource = this.images[key];
					resource.ready = false;
					resource.currentPathIndex = 0; // Reset to first path
				}
				
				// Reset character images loading state
				this.characterImages.ready = false;
				
				// Retry loading after a short delay
				setTimeout(function() {
					for (var key in resources.images) {
						resources.loadImage(key);
					}
					// Re-load character images
					loadCharacterImages();
				}, 2000); */
				this.fatalError = "必需资源加载失败，请检查网络或资源文件。";
			}
		}
	},
	
	// Mark character images as loaded
	markCharacterImagesLoaded: function() {
		this.characterImages.ready = true;
		this.checkLoadingComplete();
	},
	
	// Get load progress
	getProgress: function() {
		var total = this.totalToLoad + 1; // +1 for character images
		var loaded = this.loadCount + (this.characterImages.ready ? 1 : 0);
		return Math.floor((loaded / total) * 100);
	}
};

// Draw loading screen
function drawLoadingScreen() {
	// Clear canvas
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	// Draw background
	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	// Draw title
	ctx.fillStyle = "#fff";
	ctx.font = "24px Arial";
	ctx.textAlign = "center";
	ctx.fillText("Loading...", canvas.width / 2, 100);
	
	// Draw progress bar
	var progress = resources.getProgress();
	var barWidth = 300;
	var barHeight = 20;
	var barX = (canvas.width - barWidth) / 2;
	var barY = 150;
	
	// Background of progress bar
	ctx.fillStyle = "#333";
	ctx.fillRect(barX, barY, barWidth, barHeight);
	
	// Progress
	ctx.fillStyle = "#4CAF50";
	ctx.fillRect(barX, barY, (barWidth * progress) / 100, barHeight);
	
	// Progress text
	ctx.fillStyle = "#fff";
	ctx.font = "14px Arial";
	ctx.fillText(progress + "%", canvas.width / 2, barY + barHeight + 20);
	
	// Draw load log
	ctx.fillStyle = "#ccc";
	ctx.font = "12px Arial";
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	
	var logY = 220;
	var logX = 50;
	var maxLogLines = 10;
	var startIndex = Math.max(0, resources.loadLog.length - maxLogLines);
	
	for (var i = startIndex; i < resources.loadLog.length; i++) {
		ctx.fillText(resources.loadLog[i], logX, logY);
		logY += 20;
	}
	
	// Draw instructions
	ctx.fillStyle = "#999";
	ctx.font = "12px Arial";
	ctx.textAlign = "center";
	ctx.fillText("请稍候，游戏正在加载资源...", canvas.width / 2, canvas.height - 50);
	if (resources.fatalError) {
		ctx.fillStyle = "#ff9a8f";
		ctx.fillText(resources.fatalError, canvas.width / 2, canvas.height - 28);
	}
}

// Start the game after loading
function startGame() {
	if (window.__phantomStarted) return;
	window.__phantomStarted = true;
	// Initialize game state
	currentScene = "close";
	
	// Fetch chat messages initially
	fetchChatMessages();
	// Set up periodic fetching of chat messages
	setInterval(fetchChatMessages, gameConfig.pollIntervalMs || 5000);
	
	// Pre-fetch messages for the message book
	fetchMessages();
	
	// Start the main game loop
	var then = (window.performance && window.performance.now) ? window.performance.now() : Date.now();
	main(then);
}

// Background image
var bgReady = false;
var bgImage = null;

// Far background image
var bgFarReady = false;
var bgFarImage = null;

// Far foreground image (blocks)
var bgFarBlockReady = false;
var bgFarBlockImage = null;

// Indoor scene image
var bgIndoorReady = false;
var bgIndoorImage = null;

// Indoor foreground image (blocks)
var bgIndoorBlockReady = false;
var bgIndoorBlockImage = null;

// Initialize resource loading
resources.init();

// Start temporary loading loop
function loadingLoop() {
	drawLoadingScreen();
	if (resources.loading) {
		requestAnimationFrame(loadingLoop);
	}
}

// Start the loading loop
loadingLoop();

// Scene management
var currentScene = "close"; // "close", "far", or "indoor"
var sceneTransitioning = false; // Prevent multiple transitions at once
var sceneTransition = { active: false, progress: 0, duration: 0.45, callback: null };
var sceneBoundaries = {
	close: {
		bottom: 380, // When hero reaches y > 380 in close scene, switch to far
		top: {
			top: 0,
			bottom: 100, // Top area for indoor transition
			left: 200, // Center-left boundary
			right: 300 // Center-right boundary
		}
	},
	far: {
		top: 250,
		bottom: 280,
		left: 210,
		right: 280
	},
	indoor: {
		bottom: 850, // Bottom area to return to close scene
		left: 170,
		right: 280,
		// Indoor scene dimensions (for scrolling)
		width: 512,  // Original image width
		height: 960  // Original image height (assuming it's twice the canvas height)
	}
};

var transitionSystem = new PhantomTransitionSystem([
	{ id: "close-to-far", from: "close", to: "far", label: "前往远景", rect: { left: 0, top: canvas.height - 32, right: canvas.width, bottom: canvas.height }, spawn: { x: canvas.width / 2 - 26, y: 300 } },
	{ id: "close-to-indoor", from: "close", to: "indoor", label: "进入教堂", rect: { left: 200, top: 0, right: 300, bottom: 100 }, spawn: { x: sceneBoundaries.indoor.width / 2 - 26, y: 760 } },
	{ id: "far-to-close", from: "far", to: "close", label: "返回广场", rect: { left: 210, top: 250, right: 280, bottom: 280 }, spawn: { x: canvas.width / 2 - 26, y: 350 } },
	{ id: "indoor-to-close", from: "indoor", to: "close", label: "离开教堂", rect: { left: 170, top: 850, right: 280, bottom: 960 }, spawn: { x: 224, y: 110 } }
]);

function validateTransitionSpawns() {
	var actor = { width: 52, height: 60 };
	transitionSystem.definitions.forEach(function (transition) {
		if (!transitionSystem.isSpawnSafe(transition.to, transition.spawn, actor)) {
			console.warn("Unsafe transition spawn:", transition.id, transition.to, transition.spawn);
		}
	});
}

validateTransitionSpawns();

function beginSceneTransition(transition) {
	sceneTransitioning = true;
	sceneTransition.active = true;
	sceneTransition.progress = 0;
	sceneTransition.callback = function () {
		currentScene = transition.to;
		hero.x = transition.spawn.x;
		hero.y = transition.spawn.y;
		updateNPCPositionsForScene();
		if (currentScene === "indoor") updateCameraBounds();
	};
}

// Camera/viewport management for scrolling scene
var camera = {
	x: 0,
	y: 0,
	// Camera bounds based on scene
	bounds: {
		left: 0,
		right: 0,
		top: 0,
		bottom: 0
	}
};

// Zoom level for indoor scene (can be adjusted manually)
var indoorZoom = 1.6;

// Debug mode
var debugMode = false; // Set to true for debug info

// Interactive elements
var interactiveElements = {
	lectern: {
		// 左侧讲台位置
		x: 102,
		y: 600,
		width: 50,
		height: 40,
		flashTimer: 0,
		flashAlpha: 0,
		interactable: false,
		showHint: false,
			hintTimer: 0
		},
		organ: {
			x: 320,
			y: 600,
			width: 170,
			height: 90,
			// The interaction area is broad, but the indicator is placed at the
			// instrument's visual center, symmetric with the lectern marker.
			pointX: 377,
			pointY: 620,
			flashTimer: 0,
			flashAlpha: 0,
			interactable: false,
			showHint: false
		},
		mog: {
			x: 432,
			y: 390,
			width: 32,
			height: 36,
			flashTimer: 0,
			frame: 0,
			interactable: false,
			showHint: false
		},
		farMoogle: {
			x: 352,
			y: 390,
			width: 48,
			height: 48,
			showBubble: false
		},
		farChocobo: {
			x: 30,
			y: 393,
			width: 48,
			height: 48,
			interactable: false
		}
};

// Message book
var messageBook = {
	visible: false,
	messages: [],
	selectedIndex: 0,
	apiUrl: buildSupabaseQueryUrl("messages", "*", {}),
	usersUrl: appConfig.SUPABASE_URL + "/rest/v1/users",
	profilesUrl: appConfig.SUPABASE_URL + "/rest/v1/user_profile",
	apiKey: appConfig.ANON_KEY || "",
	loading: false,
	error: null,
	currentPage: 0,
	messagesPerPage: 3,
	totalPages: 1,
	detailVisible: false,
	detailScroll: 0,
	userCache: {},
	profileCache: {},
	avatarImages: {}
};

// Fetch messages from Supabase API
function fetchMessages() {
	if (messageBook.loading) return;
	if (!messageBook.apiUrl) {
		messageBook.error = "未配置留言簿接口";
		reportStatus("留言簿接口未配置，可通过 URL 参数 messagesApi 配置", false);
		return;
	}
	
	messageBook.loading = true;
	messageBook.error = null;
	
	PhantomNetworkAdapter.json(messageBook.apiUrl, { headers: getMessageApiHeaders() }, "留言簿请求超时")
		.then(function(messages) {
			messageBook.messages = messages;
			messageBook.loading = false;
			messageBook.totalPages = Math.ceil(messages.length / messageBook.messagesPerPage);
			messageBook.currentPage = 0;
			messageBook.selectedIndex = 0;
			
			// Fetch usernames for all messages
			var uniqueUserIds = [];
			messages.forEach(function(msg) {
				if (msg.legacy_user_id && !messageBook.userCache[msg.legacy_user_id]) {
					uniqueUserIds.push(msg.legacy_user_id);
				}
			});
			
			// Fetch usernames for unique user IDs
			var usernamePromises = uniqueUserIds.map(function(userId) {
				if (!messageBook.usersUrl) return Promise.resolve([]);
				return PhantomNetworkAdapter.json(messageBook.usersUrl + "?select=username&id=eq." + encodeURIComponent(userId), { headers: getMessageApiHeaders() }, "用户名请求超时")
					.then(function(users) {
						if (users && users.length > 0) {
							messageBook.userCache[userId] = users[0].username || "匿名用户";
						}
						return loadUserProfile(userId);
					})
					.catch(function(error) {
						console.error("Error fetching username for user " + userId + ":", error);
						messageBook.userCache[userId] = "匿名用户";
						return loadUserProfile(userId);
					});
			});
			
			// Wait for all username requests to complete
			return Promise.all(usernamePromises);
		})
		.then(function() {
			console.log("Messages loaded successfully:", messageBook.messages.length, "messages,", messageBook.totalPages, "pages");
		})
	.catch(function(error) {
			console.error("Error fetching messages:", error);
			reportStatus("留言簿加载失败: " + error.message, true);
			messageBook.error = error.message;
			messageBook.loading = false;
		});
}

// Get current page messages
function getCurrentPageMessages() {
	var startIndex = messageBook.currentPage * messageBook.messagesPerPage;
	var endIndex = startIndex + messageBook.messagesPerPage;
	return messageBook.messages.slice(startIndex, endIndex);
}

// Wrap text to fit within specified width
function wrapText(text, maxWidth) {
	var chars = text.split('');
	var lines = [];
	var currentLine = '';
	
	for (var i = 0; i < chars.length; i++) {
		var testLine = currentLine + chars[i];
		var metrics = ctx.measureText(testLine);
		var testWidth = metrics.width;
		
		if (testWidth > maxWidth && currentLine.length > 0) {
			lines.push(currentLine);
			currentLine = chars[i];
		} else {
			currentLine = testLine;
		}
	}
	if (currentLine.length > 0) {
		lines.push(currentLine);
	}
	return lines;
}

// Update camera bounds based on current scene
function updateCameraBounds() {
	if (currentScene === "indoor") {
		// Calculate camera bounds for indoor scene
		var scaledWidth = sceneBoundaries.indoor.width * indoorZoom;
		var scaledHeight = sceneBoundaries.indoor.height * indoorZoom;
		
		camera.bounds.left = 0;
		camera.bounds.right = scaledWidth - canvas.width;
		camera.bounds.top = 0;
		camera.bounds.bottom = scaledHeight - canvas.height;
	}
}

// Update camera position to follow hero
function updateCamera() {
	if (currentScene === "indoor") {
		// Calculate target camera position to center hero
		var targetX = (hero.x + 26) * indoorZoom - canvas.width / 2;
		var targetY = (hero.y + 30) * indoorZoom - canvas.height / 2;
		
		// Clamp camera position to bounds
		camera.x = Math.max(camera.bounds.left, Math.min(camera.bounds.right, targetX));
		camera.y = Math.max(camera.bounds.top, Math.min(camera.bounds.bottom, targetY));
	}
}

// Wall collision detection - 新增indoor场景具体墙体和物品碰撞区域
var walls = {
	close: [
		// Edge blocks leave the centered indoor entrance and bottom exit open.
		{ top: 0, bottom: canvas.height / 5, left: 0, right: 200 },
		{ top: 0, bottom: canvas.height / 5, left: 300, right: canvas.width },
		{ top: 0, bottom: canvas.height, left: 0, right: 32 },
		{ top: 0, bottom: canvas.height, left: canvas.width - 32, right: canvas.width },
		{ top: canvas.height - 32, bottom: canvas.height, left: 0, right: 210 },
		{ top: canvas.height - 32, bottom: canvas.height, left: 280, right: canvas.width }
	],
	far: [
		{ top: 0, bottom: 32, left: 0, right: canvas.width },
		{ top: 0, bottom: canvas.height, left: 0, right: 32 },
		{ top: 0, bottom: canvas.height, left: canvas.width - 32, right: canvas.width },
		// The far-scene return gate is in the middle, so the bottom edge is solid.
		{ top: canvas.height - 32, bottom: canvas.height, left: 0, right: canvas.width },
		{ top: 200, bottom: 320, left: 190, right: 320 }
	],
	indoor: [
		// 边界墙体（原有的外框墙）
		{
			top: 0,
			bottom: 32,
			left: 0,
			right: sceneBoundaries.indoor.width
		},
		{
			top: 0,
			bottom: sceneBoundaries.indoor.height,
			left: 0,
			right: 32
		},
		{
			top: 0,
			bottom: sceneBoundaries.indoor.height,
			left: sceneBoundaries.indoor.width - 32,
			right: sceneBoundaries.indoor.width
		},
		{
			top: sceneBoundaries.indoor.height - 32,
			bottom: sceneBoundaries.indoor.height,
			left: 0,
			right: sceneBoundaries.indoor.width
		},

		// 左侧桌子
		{
			top: 340,
			bottom: 370,
			left: 150,
			right: 155
		},

		// 右侧桌子
		{
			top: 340,
			bottom: 370,
			left: 370,
			right: 375
		},

		// 神像
		{
			top: 340,
			bottom: 385,
			left: 262,
			right: 263
		},

		// 左侧神龛
		{
			top: 415,
			bottom: 550,
			left: 10,
			right: 200
		},

		// 右侧神龛
		{
			top: 415,
			bottom: 550,
			left: 320,
			right: 490
		},

		// 左侧水池
		{
			top: 415,
			bottom: 580,
			left: 10,
			right: 100
		},

		// 右侧水池
		{
			top: 415,
			bottom: 580,
			left: 420,
			right: 490
		},

		// 左侧讲台
		{
			top: 600,
			bottom: 690,
			left: 320,
			right: 490
		},

		// 右侧管弦乐琴
		{
			top: 600,
			bottom: 690,
			left: 10,
			right: 200
		},

		// 左侧凸出墙壁1
		{
			top: 730,
			bottom: 1200,
			left: 30,
			right: 68
		},

		// 左侧凸出墙壁2
		{
			top: 870,
			bottom: 1200,
			left: 30,
			right: 190
		},

		// 右侧凸出墙壁1
		{
			top: 730,
			bottom: 1200,
			left: 450,
			right: 600
		},

		// 右侧凸出墙壁2
		{
			top: 870,
			bottom: 1200,
			left: 330,
			right: 600
		},


		// 室内墙体4 - 上方横梁
		{
			top: 50,
			bottom: 305,
			left: 10,
			right: 500
		},

		// 左侧椅子1
		{
			top: 740,
			bottom: 782,
			left: 145,
			right: 190
		},

		// 左侧椅子2
		{
			top: 815,
			bottom: 857,
			left: 145,
			right: 190
		},

		// 右侧椅子1
		{
			top: 740,
			bottom: 782,
			left: 330,
			right: 375
		},

		// 右侧椅子2
		{
			top: 815,
			bottom: 857,
			left: 330,
			right: 375
		},
	]
};

// Game objects
var chatMessages = [];
var previousChatMessages = []; // Store previous messages for comparison
var characters = PhantomEntitySystem.items;
var characterImages = {};
var imagePaths = [];
var availableImagePaths = [];

// Hero image
var heroReady = false;
var heroImage = null;
var heroGeometry = gameConfig.hero || { width: 52, height: 60, renderScale: 0.82, collision: { x: 0, y: 0, width: 52, height: 60 } };

function getHeroCollisionGeometry() {
	return heroGeometry.sceneCollision && heroGeometry.sceneCollision[currentScene] || heroGeometry.collision;
}

// Hero object
var hero = {
	speed: 256, // movement in pixels per second
	moveAccumulator: 0,
	x: canvas.width / 2,
	y: canvas.height / 2,
	alpha: 1,
	messages: [], // Array of messages for hero
	notificationHistory: [],
	userId: "3146672611", // Specific user ID for hero
	facingRight: true // Initialize facing direction
};

// Handle keyboard controls
var keysDown = PhantomInputSystem.keys;

// Check if a point collides with any wall in the current scene
// Now only checks a horizontal line at the bottom of the character (feet)
function checkWallCollision(x, y, width, height) {
	var currentWalls = walls[currentScene] || [];

	for (var i = 0; i < currentWalls.length; i++) {
		var wall = currentWalls[i];

		// Check if character's feet line intersects with wall
		// Feet line is at the bottom of the character
		var feetY = y + height - 2; // Slightly above the very bottom
		if (
			x < wall.right &&
			x + width > wall.left &&
			feetY < wall.bottom &&
			feetY > wall.top
		) {
			return true; // Collision detected
		}
	}
	return false; // No collision
}

// Draw collision walls for debugging
function drawCollisionWalls() {
	var currentWalls = walls[currentScene] || [];
	
	for (var i = 0; i < currentWalls.length; i++) {
		var wall = currentWalls[i];
		ctx.save();
		if (currentScene === "indoor") {
			ctx.translate(-camera.x, -camera.y);
			ctx.scale(indoorZoom, indoorZoom);
		}
		ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
		ctx.lineWidth = 2;
		ctx.strokeRect(wall.left, wall.top, wall.right - wall.left, wall.bottom - wall.top);
		ctx.restore();
	}
}

// Draw hero feet collision line for debugging
function drawHeroFeetCollision() {
	ctx.save();
	var collision = getHeroCollisionBox();
	if (currentScene === "indoor") {
		collision.x = collision.x * indoorZoom - camera.x;
		collision.y = collision.y * indoorZoom - camera.y;
		collision.width *= indoorZoom;
		collision.height *= indoorZoom;
	} 
	var feetX = collision.x;
	var feetY = collision.y + collision.height - (currentScene === "indoor" ? 2 * indoorZoom : 2);
	var feetWidth = collision.width;
	// Orange is the configured collision box; green is the exact line used by
	// checkWallCollision, making the debug view match runtime behavior.
	ctx.strokeStyle = "rgba(255, 150, 0, 0.8)";
	ctx.lineWidth = 2;
	ctx.strokeRect(collision.x, collision.y, collision.width, collision.height);
	ctx.strokeStyle = "rgba(0, 255, 0, 0.95)";
	ctx.beginPath();
	ctx.moveTo(feetX, feetY);
	ctx.lineTo(feetX + feetWidth, feetY);
	ctx.stroke();
	ctx.restore();
}

function drawHeroSpriteDebug() {
	if (!heroImage) return;
	ctx.save();
	if (currentScene === "indoor") {
		ctx.strokeStyle = "rgba(255, 210, 0, 0.9)";
		ctx.strokeRect(hero.x * indoorZoom - camera.x, hero.y * indoorZoom - camera.y, heroGeometry.width, heroGeometry.height);
		ctx.strokeStyle = "rgba(255, 120, 0, 0.9)";
		ctx.strokeRect(hero.x * indoorZoom - camera.x + 1, hero.y * indoorZoom - camera.y + 1, heroGeometry.width - 2, heroGeometry.height - 2);
		ctx.restore();
		ctx.fillStyle = UI_THEME.text;
		ctx.font = "10px " + UI_THEME.font;
		ctx.textAlign = "left";
		ctx.fillText("Sprite: static trimmed PNG " + heroImage.width + "x" + heroImage.height, 10, 100);
		var debugCollision = getHeroCollisionGeometry();
		ctx.fillText("Collision: x=" + debugCollision.x + " y=" + debugCollision.y + " w=" + debugCollision.width + " h=" + debugCollision.height, 10, 115);
		return;
	}
	ctx.strokeStyle = "rgba(255, 210, 0, 0.9)";
	ctx.lineWidth = 1;
	ctx.strokeRect(hero.x, hero.y, heroGeometry.width, heroGeometry.height);
	ctx.strokeStyle = "rgba(255, 120, 0, 0.9)";
	ctx.strokeRect(hero.x + 1, hero.y + 1, heroGeometry.width - 2, heroGeometry.height - 2);
	ctx.restore();
	ctx.fillStyle = UI_THEME.text;
	ctx.font = "10px " + UI_THEME.font;
	ctx.textAlign = "left";
	ctx.fillText("Sprite: static trimmed PNG " + heroImage.width + "x" + heroImage.height, 10, 100);
	var debugCollision = getHeroCollisionGeometry();
	ctx.fillText("Collision: x=" + debugCollision.x + " y=" + debugCollision.y + " w=" + debugCollision.width + " h=" + debugCollision.height, 10, 115);
}

// Load character images
function loadCharacterImages() {
	// Predefined image paths from images/jobs directory
	imagePaths = [
		// Healer
		"images/jobs/Healer/Astrologian.png",
		"images/jobs/Healer/Sage.png",
		"images/jobs/Healer/Scholar.png",
		"images/jobs/Healer/White Mage.png",
		// Magical Ranged DPS
		"images/jobs/Magical Ranged DPS/Black Mage.png",
		"images/jobs/Magical Ranged DPS/Pictomancer.png",
		"images/jobs/Magical Ranged DPS/Red Mage.png",
		"images/jobs/Magical Ranged DPS/Summoner.png",
		// Melee DPS
		"images/jobs/Melee DPS/Dragoon.png",
		"images/jobs/Melee DPS/Monk.png",
		"images/jobs/Melee DPS/Ninja.png",
		"images/jobs/Melee DPS/Reaper.png",
		"images/jobs/Melee DPS/Samurai.png",
		"images/jobs/Melee DPS/Viper.png",
		// Physical Ranged DPS
		"images/jobs/Physical Ranged DPS/Bard.png",
		"images/jobs/Physical Ranged DPS/Dancer.png",
		"images/jobs/Physical Ranged DPS/Machinist.png",
		// Tank
		"images/jobs/Tank/Dark Knight.png",
		"images/jobs/Tank/Gunbreaker.png",
		"images/jobs/Tank/Paladin.png",
		"images/jobs/Tank/Warrior.png"
	];
	
	// Update resource count
	resources.characterImages.total = imagePaths.length;
	resources.characterImages.count = 0;
	
	// Initialize available image paths pool
	availableImagePaths = [...imagePaths];
	
	// Load images
	imagePaths.forEach(function (path) {
		var imageName = path.split('/').pop();
		characterImages[imageName] = {
			ready: false,
			image: new Image()
		};
		
		characterImages[imageName].image.onload = function () {
			characterImages[imageName].ready = true;
			resources.characterImages.count++;
			
			// Check if all character images are loaded
			if (resources.characterImages.count === resources.characterImages.total) {
				resources.markCharacterImagesLoaded();
			}
		};
		
				characterImages[imageName].image.onerror = function () {
			console.log("✗ Failed to load character image:", path);
			resources.characterImages.failed = true;
			resources.characterImages.count++;
			
			// Check if all character images are loaded
			if (resources.characterImages.count === resources.characterImages.total) {
				resources.markCharacterImagesLoaded();
			}
		};
		
		characterImages[imageName].image.src = path;
	});
}

// Fetch chat messages
function fetchChatMessages() {
	PhantomNetworkAdapter.json(getApiUrl("onebotLatestText"), {}, "聊天请求超时")
		.then(function (data) {
			processChatMessages(normalizeChatMessages(data));
			rotateNpcBubblePages();
			reportStatus("");
		})
		.catch(function (error) {
			console.error('Error fetching chat messages:', error);
			reportStatus("聊天连接不可用: " + error.message, true);
		});
}

function getHeroCollisionBox() {
	var collision = getHeroCollisionGeometry();
	return {
		x: hero.x + collision.x,
		y: hero.y + collision.y,
		width: collision.width,
		height: collision.height
	};
}

function moveHeroAxis(deltaX, deltaY, wallSize, width, height) {
	var nextX = hero.x + deltaX;
	var nextY = hero.y + deltaY;
	var collision;
	var collisionGeometry = getHeroCollisionGeometry();
	// Scene edge limits are represented by wall blocks, just like interior props.
	hero.x = nextX;
	hero.y = nextY;
	collision = getHeroCollisionBox();
	if (checkWallCollision(collision.x, collision.y, width, height)) {
		hero.x -= deltaX;
		hero.y -= deltaY;
	}
}

function drawHeroSprite(x, y, facingRight) {
	var sprite = heroImage;
	var fitScale = Math.min(heroGeometry.width / sprite.width, heroGeometry.height / sprite.height);
	var scale = fitScale * (heroGeometry.renderScale || 1);
	var drawWidth = sprite.width * scale;
	var drawHeight = sprite.height * scale;
	var drawX = (heroGeometry.width - drawWidth) / 2;
	var drawY = heroGeometry.height - drawHeight;
	ctx.save();
	if (facingRight) {
		ctx.translate(x + heroGeometry.width - drawX, y + drawY);
		ctx.scale(-1, 1);
		ctx.drawImage(sprite, 0, 0, drawWidth, drawHeight);
	} else {
		ctx.drawImage(sprite, x + drawX, y + drawY, drawWidth, drawHeight);
	}
	ctx.restore();
}

function truncateText(text, maxWidth) {
	var value = String(text || "");
	var suffix = "...";
	if (ctx.measureText(value).width <= maxWidth) return value;
	while (value.length > 0 && ctx.measureText(value + suffix).width > maxWidth) {
		value = value.slice(0, -1);
	}
	return value + suffix;
}

function openMessageDetailAtPoint(x, y) {
	var bookX = 100;
	var bookY = 80;
	var paperX = bookX + 24;
	var paperWidth = 312 - 40;
	var cardX = paperX + 10;
	var cardWidth = paperWidth - 20;
	var currentPageMessages = getCurrentPageMessages();
	for (var index = 0; index < currentPageMessages.length; index++) {
		var cardY = bookY + 76 + (index * 66);
		if (x >= cardX && x <= cardX + cardWidth && y >= cardY && y <= cardY + 60) {
			messageBook.selectedIndex = index;
			messageBook.detailVisible = true;
			messageBook.detailScroll = 0;
			return;
		}
	}
}

function drawSceneTransitions() {
	var transitions = transitionSystem.forScene(currentScene);
	transitions.forEach(function (transition) {
		var rect = transition.rect;
		var x = rect.left;
		var y = rect.top;
		var width = rect.right - rect.left;
		var height = rect.bottom - rect.top;
		ctx.save();
		if (currentScene === "indoor") {
			x = x * indoorZoom - camera.x;
			y = y * indoorZoom - camera.y;
			width *= indoorZoom;
			height *= indoorZoom;
		}
		ctx.fillStyle = "rgba(0, 220, 255, 0.18)";
		ctx.strokeStyle = "#00e5ff";
		ctx.lineWidth = 2;
		ctx.setLineDash([6, 4]);
		ctx.fillRect(x, y, width, height);
		ctx.strokeRect(x, y, width, height);
		ctx.setLineDash([]);
		ctx.fillStyle = "#bff8ff";
		ctx.font = "bold 11px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(transition.label + " -> " + transition.to, x + width / 2, y + height / 2);
		ctx.restore();
	});
}

// Normalize the backend's qqUserId shape into the engine's internal shape.
function normalizeChatMessages(data) {
	if (!Array.isArray(data)) return [];
	return data.map(function (message) {
		return {
			userId: String(message.userId != null ? message.userId : message.qqUserId),
			message: message.message == null ? "" : message.message,
			timestamp: message.timestamp,
			id: message.id
		};
	}).filter(function (message) {
		return message.userId !== "undefined" && message.userId !== "null";
	});
}

function loadUserProfile(userId) {
	if (!messageBook.profilesUrl || messageBook.profileCache[userId]) return Promise.resolve();
	return PhantomNetworkAdapter.json(messageBook.profilesUrl + "?select=*&legacy_user_id=eq." + encodeURIComponent(userId), { headers: getMessageApiHeaders() }, "头像请求超时").then(function(profiles) {
		if (profiles && profiles.length > 0 && profiles[profiles.length - 1].data) {
			var source = profiles[profiles.length - 1].data;
			messageBook.profileCache[userId] = source;
			var avatar = new Image();
			avatar.onload = function() { messageBook.avatarImages[userId] = avatar; };
			avatar.src = source;
		}
	}).catch(function(error) {
		console.warn("Unable to load profile for user " + userId + ":", error.message);
	});
}

// Supabase accepts these headers when configured, but the public endpoint can
// also be used without them when its RLS/API gateway allows anonymous reads.
function getMessageApiHeaders() {
	return getSupabaseConfig().headers;
}

// Process chat messages
function processChatMessages(messages) {
	if (!Array.isArray(messages)) {
		console.warn("Ignoring malformed chat response", messages);
		return;
	}
	// Save current messages as previous for comparison
	previousChatMessages = [...chatMessages];

	// Update chat messages
	chatMessages = messages;
	// Update characters based on messages
	updateCharacters();
}

// Parse message content
function parseMessageContent(message) {
	if (window.PhantomEngine) return PhantomEngine.normalizeMessage(message);
	// First try to remove the entire prefix
	var cleanMessage = message.replace(/^\{type=text, data=\{text=/, '');
	// Remove any trailing } characters
	cleanMessage = cleanMessage.replace(/\s*}\s*}$/, '');
	// Replace newlines with spaces for better display
	cleanMessage = cleanMessage.replace(/\n/g, ' ');
	// Trim whitespace
	cleanMessage = cleanMessage.trim();

	// If we still have the prefix, try alternative parsing
	if (cleanMessage.includes('{type=text, data={text=')) {
		// Use a more robust regex
		var match = cleanMessage.match(/text=(.*?)(?:}$|$)/);
		if (match) {
			cleanMessage = match[1].trim().replace(/\s*}$/, '');
		}
	}

	return cleanMessage;
}

function isDateNotice(message) {
	return /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}(?:\s|$)/.test(String(message || "").trim());
}

// Update characters based on chat messages
function updateCharacters() {
	// Get unique user IDs from current messages
	var currentActiveUserIds = {};
	chatMessages.forEach(function (message) {
		// Skip hero's user ID
		if (message.userId != hero.userId) {
			currentActiveUserIds[message.userId] = true;
		}
	});
	// Get unique user IDs from previous messages
	var previousActiveUserIds = {};
	previousChatMessages.forEach(function (message) {
		// Skip hero's user ID
		if (message.userId != hero.userId) {
			previousActiveUserIds[message.userId] = true;
		}
	});
	// Handle hero's messages separately
	var currentHeroMessages = chatMessages.filter(function (msg) {
		return msg.userId == hero.userId;
	});
	var previousHeroMessages = previousChatMessages.filter(function (msg) {
		return msg.userId == hero.userId;
	});

	// Add new hero messages with fade-in effect
	currentHeroMessages.forEach(function (msg) {
		var parsedMessage = parseMessageContent(msg.message);
		if (parsedMessage.trim() !== "" && !isDateNotice(parsedMessage) && !hero.notificationHistory.some(function (item) { return item.content === parsedMessage; })) {
			hero.notificationHistory.push({ content: parsedMessage, createdAt: Date.now() });
		}
		// Check if this message already exists
		var existingMessage = hero.messages.find(function (m) {
			return m.content === parsedMessage;
		});

		// Check if there's already a "..." message
		var hasEllipsis = hero.messages.some(function (m) {
			return m.content === "...";
		});

		if (!existingMessage) {
			// Check if message is not empty or just spaces
			if (parsedMessage.trim() !== '') {
				// Check if the new message would be "..."
				ctx.font = "12px Helvetica"; // Smaller font
				var textWidth = ctx.measureText(parsedMessage).width;
				var maxBubbleWidth = canvas.width - (hero.x + 32) - 10;

				if (textWidth + 16 > maxBubbleWidth) {
					// Message would be "..."
					if (!hasEllipsis) {
						// Add new message with fade-in effect
						hero.messages.push({
							content: "...",
							timeout: Date.now() + 30000, // 30 seconds
							alpha: 0, // Start with 0 for fade-in
							fadingIn: true
						});
					}
				} else {
					// Add new message with fade-in effect
					hero.messages.push({
						content: parsedMessage,
						timeout: Date.now() + 30000, // 30 seconds
						alpha: 0, // Start with 0 for fade-in
						fadingIn: true
					});
				}
			}
		}
	});

	// Mark disappeared hero messages for fade-out
	hero.messages.forEach(function (msg) {
		var stillExists = currentHeroMessages.some(function (chatMsg) {
			return parseMessageContent(chatMsg.message) === msg.content;
		});
		if (!stillExists && !msg.fadingOut) {
			msg.fadingOut = true;
			msg.fadingIn = false;
		}
	});

	// Limit number of messages for hero to 3
	if (hero.messages.length > 3) {
		// Remove oldest messages beyond 3
		hero.messages = hero.messages.slice(-3);
	}
	// Handle new users (fade-in)
	for (var userId in currentActiveUserIds) {
		if (!characters[userId]) {
			// Create new character with fade-in effect
					// Select a random image from available pool
					var randomIndex = Math.floor(Math.random() * availableImagePaths.length);
					var selectedImage = availableImagePaths[randomIndex];
					// Remove selected image from available pool
					availableImagePaths.splice(randomIndex, 1);
					// If no images left, reset the pool
					if (availableImagePaths.length === 0) {
						availableImagePaths = [...imagePaths];
					}
					var imageName = selectedImage.split('/').pop();
					// Consider 32px wall border and 52x60 character size
						var charWidth = 52;
						var charHeight = 60;
						var wallSize = 32;

						// Generate NPC position that doesn't collide with walls
						var npcX, npcY;
						var maxAttempts = 50; // Increased attempts for better positioning
						var attempts = 0;
						var validPosition = false;

						while (!validPosition && attempts < maxAttempts) {
							// Generate random position within scene-specific bounds
							// For close scene: avoid top wall area
							if (currentScene === "close") {
					// Bottom 4/5 of screen (avoid top wall)
					npcX = 32 + (Math.random() * (canvas.width - 64 - charWidth));
					npcY = canvas.height / 5 + 32 + (Math.random() * (canvas.height * 4/5 - 64 - charHeight));
				} else if (currentScene === "far" || currentScene === "indoor") {
					// Far and indoor scenes - no NPCs
					npcX = -100; // Off-screen position
					npcY = -100; // Off-screen position
					validPosition = true; // Skip collision check
				}

							// Check if position collides with walls
							if (!checkWallCollision(npcX, npcY, charWidth, charHeight)) {
								validPosition = true;
							}

							attempts++;
						}

						// If no valid position found after max attempts, use a scene-specific safe position
						if (!validPosition) {
							if (currentScene === "close") {
					// Safe position in close scene (bottom area)
					npcX = canvas.width / 2 - charWidth / 2;
					npcY = canvas.height * 3/4 - charHeight / 2;
				} else if (currentScene === "far" || currentScene === "indoor") {
					// Far and indoor scenes - no NPCs
					npcX = -100; // Off-screen position
					npcY = -100; // Off-screen position
				}
						}

						characters[userId] = {
							x: npcX,
							y: npcY,
							image: imageName,
							imagePath: selectedImage, // Store full path for later return to pool
							messages: [], // Array of messages with their own timeout and alpha
							alpha: 0, // Start with 0 for fade-in
							fadingIn: true,
							fadingOut: false,
							facingRight: true,
							bubbleSideProgress: npcX + charWidth / 2 < canvas.width / 2 ? 0 : 1,
							bubblePage: 0,
							bubblePageElapsed: 0,
							bubblePageAlpha: 1
						};
		}
		// Update character messages
		// Get all current messages from this user
		var currentUserMessages = chatMessages.filter(function (msg) {
			return msg.userId == userId;
		});

		// Get all previous messages from this user
		var previousUserMessages = previousChatMessages.filter(function (msg) {
			return msg.userId == userId;
		});

		// Add new messages with fade-in effect
		currentUserMessages.forEach(function (msg) {
			var parsedMessage = parseMessageContent(msg.message);
			// Check if this message already exists
			var existingMessage = characters[userId].messages.find(function (m) {
				return m.content === parsedMessage;
			});

			// Check if there's already a "..." message
			var hasEllipsis = characters[userId].messages.some(function (m) {
				return m.content === "...";
			});

			if (!existingMessage) {
				// Check if message is not empty or just spaces
				if (parsedMessage.trim() !== '') {
					// Keep the original message. The renderer wraps it and only
					// truncates after the maximum number of bubble lines.
					characters[userId].messages.push({
						content: parsedMessage,
						timeout: Date.now() + 30000,
						alpha: 0,
						fadingIn: true
					});
				}
			}
		});

		// Mark disappeared messages for fade-out
		characters[userId].messages.forEach(function (msg) {
			var stillExists = currentUserMessages.some(function (chatMsg) {
				return parseMessageContent(chatMsg.message) === msg.content;
			});
			if (!stillExists && !msg.fadingOut) {
				msg.fadingOut = true;
				msg.fadingIn = false;
			}
		});

		// Limit number of messages per character to 3
		if (characters[userId].messages.length > 3) {
			// Remove oldest messages beyond 3
			characters[userId].messages = characters[userId].messages.slice(-3);
		}
	}
	// Handle disappeared users (fade-out)
	for (var userId in characters) {
		if (!currentActiveUserIds[userId] && !characters[userId].fadingOut) {
			characters[userId].fadingOut = true;
			characters[userId].fadingIn = false;
		}
	}
}

// Update game objects
var update = function (modifier) {
	// Update hero position based on keyboard input
	// Consider 32px wall border and 52x60 character size
	var heroCollisionGeometry = getHeroCollisionGeometry();
	var heroWidth = heroCollisionGeometry.width;
	var heroHeight = heroCollisionGeometry.height;
	var wallSize = 32;

	// Don't move if message book is open
	if (!messageBook.visible && !musicPlayer.visible && !chocoboRace.visible) {
		var allowArrowMovement = !systemNotice.visible;
		var moveX = (keysDown[68] || (allowArrowMovement && keysDown[39]) ? 1 : 0) - (keysDown[65] || (allowArrowMovement && keysDown[37]) ? 1 : 0);
		var moveY = (keysDown[83] || (allowArrowMovement && keysDown[40]) ? 1 : 0) - (keysDown[87] || (allowArrowMovement && keysDown[38]) ? 1 : 0);
		if (moveX === 0 && moveY === 0) {
			if (currentScene === "indoor") updateCamera();
		} else {
		var moveLength = Math.sqrt(moveX * moveX + moveY * moveY) || 1;
		var distance = hero.speed * modifier;
		var stepCount = Math.max(1, Math.ceil(distance / 2));
		var stepX = moveX / moveLength * distance / stepCount;
		var stepY = moveY / moveLength * distance / stepCount;

		if (moveX < 0) hero.facingRight = false;
		if (moveX > 0) hero.facingRight = true;
		for (var step = 0; step < stepCount; step++) {
			moveHeroAxis(stepX, 0, wallSize, heroWidth, heroHeight);
			moveHeroAxis(0, stepY, wallSize, heroWidth, heroHeight);
		}
		}
		// Update camera for indoor scene
		if (currentScene === "indoor") {
			updateCamera();
		}
	}
	// Update characters
	for (var userId in characters) {
		var character = characters[userId];
		var desiredBubbleSide = character.x + 26 < canvas.width / 2 ? 0 : 1;
		if (character.bubbleSideProgress == null) character.bubbleSideProgress = desiredBubbleSide;
		character.bubbleSideProgress += (desiredBubbleSide - character.bubbleSideProgress) * Math.min(1, modifier / 0.16);
		character.bubblePageElapsed += modifier * 1000;
		character.bubblePageAlpha = Math.min(1, character.bubblePageAlpha + modifier / 0.18);
		if (character.bubblePageElapsed >= (gameConfig.npcBubbleRotationMs || 4000)) {
			character.bubblePage++;
			character.bubblePageElapsed = 0;
			character.bubblePageAlpha = 0;
		}
		// Handle animation and transitions
		if (character.fadingIn) {
			character.alpha = Math.min(1, character.alpha + modifier * 2);
			if (character.alpha >= 1) {
				character.fadingIn = false;
			}
		} else if (character.fadingOut) {
			character.alpha = Math.max(0, character.alpha - modifier * 2);
			if (character.alpha <= 0) {
				// Return the image to available pool
				if (character.imagePath && !availableImagePaths.includes(character.imagePath)) {
					availableImagePaths.push(character.imagePath);
				}
				delete characters[userId];
			}
		} else {
			// Make character move within a small area
			if (!character.movement) {
				// Initialize movement parameters
				character.movement = {
					mode: Math.random() > 0.5 ? 'range' : 'free', // 50% chance for each mode
					direction: Math.random() * Math.PI * 2,
					speed: 20 + Math.random() * 5, // Slower speed: 5 pixels per second
					range: 100, // Larger range for range mode
					homeX: character.x,
					homeY: character.y,
					state: Math.random() > 0.7 ? 'moving' : 'idle', // 30% chance to start moving, 70% chance to start idle
					stateEndTime: Date.now() + (Math.random() > 0.7 ?
						2000 + Math.random() * 3000 : // Moving for 2-5 seconds
						5000 + Math.random() * 10000), // Idle for 5-15 seconds
					changeDirectionTime: Date.now() + 2000 + Math.random() * 3000 // Change direction every 2-5 seconds for free mode
				};
			}
			// Check if current state has ended
			if (Date.now() > character.movement.stateEndTime) {
				// Switch state
				character.movement.state = character.movement.state === 'moving' ? 'idle' : 'moving';
				// Set new state duration
				if (character.movement.state === 'moving') {
					// Moving for 2-5 seconds
					character.movement.stateEndTime = Date.now() + 2000 + Math.random() * 3000;
					// Randomize direction when starting to move
					character.movement.direction = Math.random() * Math.PI * 2;
				} else {
					// Idle for 5-15 seconds
					character.movement.stateEndTime = Date.now() + 5000 + Math.random() * 10000;
				}
			}
			// Only move if in moving state
			if (character.movement.state === 'moving') {
				if (character.movement.mode === 'range') {
					// Range mode: move within a defined area around home position
					// Change direction periodically instead of every frame
					if (!character.movement.nextDirectionChange || Date.now() > character.movement.nextDirectionChange) {
						character.movement.direction += (Math.random() - 0.5) * Math.PI; // More significant direction change
						character.movement.nextDirectionChange = Date.now() + 1000 + Math.random() * 1000; // Change direction every 1-2 seconds
					}
					var deltaX = Math.cos(character.movement.direction) * character.movement.speed * modifier;
					character.x += deltaX;
					character.y += Math.sin(character.movement.direction) * character.movement.speed * modifier;
					// Always set facing direction to match movement direction
					if (deltaX > 0) {
						character.facingRight = true; // Face right when moving right
					} else if (deltaX < 0) {
						character.facingRight = false; // Face left when moving left
					}
					// Keep character within range of home position
					var dx = character.x - character.movement.homeX;
					var dy = character.y - character.movement.homeY;
					var distance = Math.sqrt(dx * dx + dy * dy);
					if (distance > character.movement.range) {
						// Bring character back within range
						character.x = character.movement.homeX + (dx / distance) * character.movement.range;
						character.y = character.movement.homeY + (dy / distance) * character.movement.range;
						// Reverse direction
						character.movement.direction += Math.PI;
						// Update facing direction after bounce
						var newDeltaX = Math.cos(character.movement.direction);
						character.facingRight = newDeltaX > 0;
					}

					// Ensure character stays within wall boundaries
					var charWidth = 52;
					var charHeight = 60;
					var wallSize = 32;

					// Store original position for collision detection
					var originalCharX = character.x;
					var originalCharY = character.y;

					character.x = Math.max(wallSize, Math.min(canvas.width - wallSize - charWidth, character.x));
					character.y = Math.max(wallSize, Math.min(canvas.height - wallSize - charHeight, character.y));

					// Check wall collision and revert if collision
					if (checkWallCollision(character.x, character.y, charWidth, charHeight)) {
						// Revert to original position
						character.x = originalCharX;
						character.y = originalCharY;
						// Reverse direction
						character.movement.direction += Math.PI;
						// Update facing direction after bounce
						var newDeltaX = Math.cos(character.movement.direction);
						character.facingRight = newDeltaX > 0;
					}
				} else {
					// Free mode: move freely around the entire map
					// Store original position for collision detection
					var originalCharX = character.x;
					var originalCharY = character.y;

					// Change direction periodically
					if (Date.now() > character.movement.changeDirectionTime) {
						character.movement.direction = Math.random() * Math.PI * 2;
						character.movement.changeDirectionTime = Date.now() + 2000 + Math.random() * 3000; // Change direction every 2-5 seconds
					}
					// Update position
					var deltaX = Math.cos(character.movement.direction) * character.movement.speed * modifier;
					character.x += deltaX;
					character.y += Math.sin(character.movement.direction) * character.movement.speed * modifier;
					// Always set facing direction to match movement direction
					if (deltaX > 0) {
						character.facingRight = true; // Face right when moving right
					} else if (deltaX < 0) {
						character.facingRight = false; // Face left when moving left
					}
					// Wrap around or bounce at map edges (considering character size 52x60 and 32px wall)
					var charWidth = 52;
					var charHeight = 60;
					var wallSize = 32;

					if (character.x < wallSize) {
						character.x = wallSize;
						character.movement.direction = Math.PI - character.movement.direction;
						// Update facing direction after bounce
						character.facingRight = true; // Now moving right
					} else if (character.x > canvas.width - wallSize - charWidth) {
						character.x = canvas.width - wallSize - charWidth;
						character.movement.direction = Math.PI - character.movement.direction;
						// Update facing direction after bounce
						character.facingRight = false; // Now moving left
					}
					if (character.y < wallSize) {
						character.y = wallSize;
						character.movement.direction = -character.movement.direction;
						// Update facing direction based on new movement
						var deltaX = Math.cos(character.movement.direction);
						character.facingRight = deltaX > 0;
					} else if (character.y > canvas.height - wallSize - charHeight) {
						character.y = canvas.height - wallSize - charHeight;
						character.movement.direction = -character.movement.direction;
						// Update facing direction based on new movement
						var deltaX = Math.cos(character.movement.direction);
						character.facingRight = deltaX > 0;
					}

					// Check wall collision and revert if collision
					if (checkWallCollision(character.x, character.y, charWidth, charHeight)) {
						// Revert to original position
						character.x = originalCharX;
						character.y = originalCharY;
						// Reverse direction
						character.movement.direction += Math.PI;
						// Update facing direction after bounce
						var newDeltaX = Math.cos(character.movement.direction);
						character.facingRight = newDeltaX > 0;
					}
				}
			}
		}
		// Handle message bubble timeouts and fade effects
		if (character.messages) {
			for (var i = character.messages.length - 1; i >= 0; i--) {
				var msg = character.messages[i];

				// Handle fade-in effect
				if (msg.fadingIn) {
					msg.alpha = Math.min(1, msg.alpha + modifier * 2);
					if (msg.alpha >= 1) {
						msg.fadingIn = false;
					}
				} else if (msg.fadingOut) {
					msg.alpha = Math.max(0, msg.alpha - modifier * 2);
					if (msg.alpha <= 0) {
						// Remove message when fully faded out
						character.messages.splice(i, 1);
					}
				} else if (Date.now() > msg.timeout) {
					// Start fade-out when timeout reached
					msg.fadingOut = true;
					msg.fadingIn = false;
				}
			}
		}
	}
	// Update hero messages with fade effects
	if (hero.messages) {
		for (var i = hero.messages.length - 1; i >= 0; i--) {
			var msg = hero.messages[i];

			// Handle fade-in effect
			if (msg.fadingIn) {
				msg.alpha = Math.min(1, msg.alpha + modifier * 2);
				if (msg.alpha >= 1) {
					msg.fadingIn = false;
				}
			} else if (msg.fadingOut) {
				msg.alpha = Math.max(0, msg.alpha - modifier * 2);
				if (msg.alpha <= 0) {
					// Remove message when fully faded out
					hero.messages.splice(i, 1);
				}
			} else if (Date.now() > msg.timeout) {
				// Start fade-out when timeout reached
				msg.fadingOut = true;
				msg.fadingIn = false;
			}
		}
	}
	// Scene transition logic
	if (!sceneTransitioning) {
		var transition = transitionSystem.find(currentScene, {
			x: hero.x + getHeroCollisionGeometry().x,
			y: hero.y + getHeroCollisionGeometry().y,
			width: getHeroCollisionGeometry().width,
			height: getHeroCollisionGeometry().height
		});
		if (transition) {
			beginSceneTransition(transition);
		}
	}
	if (sceneTransition.active) {
		sceneTransition.progress += modifier;
		if (sceneTransition.progress >= sceneTransition.duration / 2 && sceneTransition.callback) {
			sceneTransition.callback();
			sceneTransition.callback = null;
		}
		if (sceneTransition.progress >= sceneTransition.duration) {
			sceneTransition.active = false;
			sceneTransition.progress = 0;
			sceneTransitioning = false;
		}
	}
	if (PhantomInputSystem.consume(80)) {
		toggleSystemNotice();
	}

	// Update interactive elements
	if (currentScene === "indoor") {
		var lectern = interactiveElements.lectern;

		// Update flash animation
		lectern.flashTimer += modifier * 2;
		lectern.flashAlpha = Math.sin(lectern.flashTimer * 3) * 0.5 + 1;

		// Check if hero is near lectern
		var heroCenterX = hero.x + 26;
		var heroCenterY = hero.y + 30;
		var lecternCenterX = lectern.x + lectern.width / 2;
		var lecternCenterY = lectern.y + lectern.height / 2;
		var distance = Math.sqrt(
			Math.pow(heroCenterX - lecternCenterX, 2) +
			Math.pow(heroCenterY - lecternCenterY, 2)
		);

		// Set interactable if within range
		lectern.interactable = distance < 50;
		lectern.showHint = lectern.interactable;

		// Handle F key interaction
		if (lectern.interactable && keysDown[70]) { // F key
			// Open message book
			messageBook.visible = true;
			// Fetch messages from API
			fetchMessages();
			// Clear F key press
			delete keysDown[70];
		}
		var organ = interactiveElements.organ;
		organ.flashTimer += modifier * 2;
		organ.flashAlpha = Math.sin(organ.flashTimer * 3) * 0.5 + 1;
		var organDistance = Math.sqrt(Math.pow(heroCenterX - (organ.x + organ.width / 2), 2) + Math.pow(heroCenterY - (organ.y + organ.height / 2), 2));
		organ.interactable = organDistance < 70;
		organ.showHint = organ.interactable;
		if (organ.interactable && keysDown[70]) {
			musicPlayer.visible = true;
			try {
				if (!PhantomAudioSystem.playing) PhantomAudioSystem.toggle();
				reportStatus("音乐播放器已打开", false);
			} catch (error) {
				reportStatus("音乐播放器不可用：" + error.message, true);
			}
			delete keysDown[70];
		}
	} else if (currentScene === "far") {
		var mog = interactiveElements.mog;
		mog.flashTimer += modifier;
		mog.frame = Math.floor(mog.flashTimer * 6) % 5;
		var mogCenterX = mog.x + mog.width / 2;
		var mogCenterY = mog.y + mog.height / 2;
		var mogDistance = Math.sqrt(Math.pow(hero.x + 26 - mogCenterX, 2) + Math.pow(hero.y + 30 - mogCenterY, 2));
		mog.interactable = mogDistance < 48;
		mog.showHint = mog.interactable;
		if (mog.interactable && keysDown[70]) {
			mogWindow.visible = true;
			mogWindow.frame = 0;
			delete keysDown[70];
		}
		var farMoogle = interactiveElements.farMoogle;
		var farMoogleDistance = Math.sqrt(
			Math.pow(hero.x + 26 - (farMoogle.x + farMoogle.width / 2), 2) +
			Math.pow(hero.y + 30 - (farMoogle.y + farMoogle.height / 2), 2)
		);
		farMoogle.showBubble = farMoogleDistance < 58;
		var farChocobo = interactiveElements.farChocobo;
		var farChocoboDistance = Math.sqrt(
			Math.pow(hero.x + 26 - (farChocobo.x + farChocobo.width / 2), 2) +
			Math.pow(hero.y + 30 - (farChocobo.y + farChocobo.height / 2), 2)
		);
		farChocobo.interactable = farChocoboDistance < 58;
		if (farChocobo.interactable && keysDown[70]) {
			openChocoboRace();
			delete keysDown[70];
		}
	}
	if (chocoboRace.visible || chocoboRace.raceTransition.active) updateChocoboRace(modifier);
	if (mogWindow.visible) mogWindow.frame = (mogWindow.frame + modifier * 6) % 13;

	// Handle message book navigation
	if (musicPlayer.visible && keysDown[27]) {
		musicPlayer.visible = false;
		delete keysDown[27];
	}
	if (musicPlayer.visible && keysDown[32]) {
		try {
			PhantomAudioSystem.toggle().then(function () {});
		} catch (error) { reportStatus("音乐播放器不可用：" + error.message, true); }
		delete keysDown[32];
	}
	if (mogWindow.visible && keysDown[27]) {
		mogWindow.visible = false;
		delete keysDown[27];
	} else if (mogWindow.visible && (keysDown[37] || keysDown[40])) {
		mogWindow.frame = (Math.floor(mogWindow.frame) + 12) % 13;
		delete keysDown[37];
		delete keysDown[40];
	} else if (mogWindow.visible && (keysDown[39] || keysDown[38])) {
		mogWindow.frame = (Math.floor(mogWindow.frame) + 1) % 13;
		delete keysDown[39];
		delete keysDown[38];
	}
	if (chocoboRace.visible && keysDown[27]) {
		closeChocoboRace();
		delete keysDown[27];
	}
	if (chocoboRace.visible && chocoboRace.phase === "selection") {
		if (keysDown[37]) { selectRaceChocobo(chocoboRace.selectedIndex - 1); delete keysDown[37]; }
		if (keysDown[39]) { selectRaceChocobo(chocoboRace.selectedIndex + 1); delete keysDown[39]; }
		if (keysDown[13] || keysDown[32]) {
			beginChocoboRaceCountdown();
			delete keysDown[13];
			delete keysDown[32];
		}
	}
	if (messageBook.visible) {
		if (messageBook.detailVisible) {
			if (keysDown[38]) {
				messageBook.detailScroll = Math.max(0, messageBook.detailScroll - 1);
				delete keysDown[38];
			} else if (keysDown[40]) {
				messageBook.detailScroll++;
				delete keysDown[40];
			} else if (keysDown[13] || keysDown[27]) {
				messageBook.detailVisible = false;
				messageBook.detailScroll = 0;
				delete keysDown[13];
				delete keysDown[27];
			}
		} else if (keysDown[13]) {
			messageBook.detailVisible = true;
			messageBook.detailScroll = 0;
			delete keysDown[13];
		} else if (keysDown[38]) { // Up arrow
			if (messageBook.messages.length > 0) {
				if (messageBook.selectedIndex > 0) {
					messageBook.selectedIndex--;
				} else if (messageBook.currentPage > 0) {
					// Go to previous page
					messageBook.currentPage--;
					messageBook.selectedIndex = messageBook.messagesPerPage - 1;
				}
			}
			delete keysDown[38];
		} else if (keysDown[40]) { // Down arrow
			if (messageBook.messages.length > 0) {
				var currentPageMessages = getCurrentPageMessages();
				if (messageBook.selectedIndex < currentPageMessages.length - 1) {
					messageBook.selectedIndex++;
				} else if (messageBook.currentPage < messageBook.totalPages - 1) {
					// Go to next page
					messageBook.currentPage++;
					messageBook.selectedIndex = 0;
				}
			}
			delete keysDown[40];
		} else if (keysDown[37]) { // Left arrow
			if (messageBook.currentPage > 0) {
				messageBook.currentPage--;
				messageBook.selectedIndex = 0;
			}
			delete keysDown[37];
		} else if (keysDown[39]) { // Right arrow
			if (messageBook.currentPage < messageBook.totalPages - 1) {
				messageBook.currentPage++;
				messageBook.selectedIndex = 0;
			}
			delete keysDown[39];
		} else if (keysDown[27]) { // Escape key
			if (systemNotice.visible) {
				systemNotice.visible = false;
				delete keysDown[27];
				return;
			}
			messageBook.visible = false;
			messageBook.detailVisible = false;
			delete keysDown[27];
		}
	}
	if (systemNotice.visible) {
		if (keysDown[27]) {
			systemNotice.visible = false;
			systemNotice.scroll = 0;
			delete keysDown[27];
		} else if (keysDown[37]) {
			selectSystemNoticeTab(systemNoticeTabIndex() - 1);
			delete keysDown[37];
		} else if (keysDown[39]) {
			selectSystemNoticeTab(systemNoticeTabIndex() + 1);
			delete keysDown[39];
		} else if (keysDown[38]) {
			systemNotice.selectedIndex = Math.max(0, systemNotice.selectedIndex - 1);
			keepSystemNoticeSelectionVisible();
			delete keysDown[38];
		} else if (keysDown[40]) {
			var noticeItems = systemNotice.items[systemNotice.tab] || [];
			systemNotice.selectedIndex = Math.min(Math.max(0, noticeItems.length - 1), systemNotice.selectedIndex + 1);
			keepSystemNoticeSelectionVisible();
			delete keysDown[40];
		} else if (keysDown[13]) {
			openSystemNoticeItem(systemNotice.selectedIndex);
			delete keysDown[13];
		}
	}
};

// Update NPC positions when scene changes
function updateNPCPositionsForScene() {
	var charWidth = 52;
	var charHeight = 60;

	for (var userId in characters) {
		var character = characters[userId];
		var maxAttempts = 30;
		var attempts = 0;
		var validPosition = false;
		var newX, newY;

		while (!validPosition && attempts < maxAttempts) {
			// Generate scene-specific position
			if (currentScene === "close") {
					// Bottom 4/5 of screen (avoid top wall)
					newX = 32 + (Math.random() * (canvas.width - 64 - charWidth));
					newY = canvas.height / 5 + 32 + (Math.random() * (canvas.height * 4/5 - 64 - charHeight));
				} else if (currentScene === "far" || currentScene === "indoor") {
					// Far and indoor scenes - no NPCs
					newX = -100; // Off-screen position
					newY = -100; // Off-screen position
					validPosition = true; // Skip collision check
				}

			// Check if position collides with walls
			if (!checkWallCollision(newX, newY, charWidth, charHeight)) {
				validPosition = true;
			}

			attempts++;
		}

		// If no valid position found, use scene-specific safe position
		if (!validPosition) {
			if (currentScene === "close") {
					newX = canvas.width / 2 - charWidth / 2;
					newY = canvas.height * 3/4 - charHeight / 2;
				} else if (currentScene === "far" || currentScene === "indoor") {
					// Far and indoor scenes - no NPCs
					newX = -100; // Off-screen position
					newY = -100; // Off-screen position
				}
		}

		// Update NPC position
		character.x = newX;
		character.y = newY;
		// Reset movement parameters
		delete character.movement;
	}
}

// Draw everything
var render = function () {
	// Clear canvas first
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Draw background with loading handling
	var backgroundDrawn = false;
	if (currentScene === "close") {
		if (bgReady) {
			ctx.drawImage(bgImage, 0, 0, 512, 480);
			backgroundDrawn = true;
		} else {
			// Force black background if close image not ready
			ctx.fillStyle = "black";
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			// Draw loading text
			ctx.fillStyle = UI_THEME.text;
			ctx.font = "14px " + UI_THEME.font;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("Loading...", canvas.width / 2, canvas.height / 2);
		}
	} else if (currentScene === "far") {
		console.log("Rendering far scene - bgFarReady:", bgFarReady, "bgFarBlockReady:", bgFarBlockReady);
		if (bgFarReady) {
			ctx.drawImage(bgFarImage, 0, 0, 512, 480);
			backgroundDrawn = true;
		} else {
			// Force black background if far image not ready
			console.log("Far background not ready, filling with black");
			ctx.fillStyle = "black";
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			// Draw loading text
			ctx.fillStyle = "white";
			ctx.font = "16px Arial";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("Loading far scene...", canvas.width / 2, canvas.height / 2);
		}
	} else if (currentScene === "indoor") {
		if (bgIndoorReady) {
			// Draw indoor scene with camera and zoom
			ctx.save();
			ctx.translate(-camera.x, -camera.y);
			ctx.scale(indoorZoom, indoorZoom);
			ctx.drawImage(bgIndoorImage, 0, 0, sceneBoundaries.indoor.width, sceneBoundaries.indoor.height);
			ctx.restore();
			backgroundDrawn = true;
		} else {
			// Force black background if indoor image not ready
			ctx.fillStyle = "black";
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			// Draw loading text
			ctx.fillStyle = "white";
			ctx.font = "16px Arial";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("Loading indoor scene...", canvas.width / 2, canvas.height / 2);
		}
	}

	// Ensure black background if no background drawn
	if (!backgroundDrawn) {
		console.log("No background drawn, filling with black");
		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	// Interaction markers sit between the background and scene objects so walls
	// and foreground blocks can naturally cover them.
	if (currentScene === "indoor") {
		var lecternMarker = interactiveElements.lectern;
		var organMarker = interactiveElements.organ;
		ctx.save();
		ctx.translate(-camera.x, -camera.y);
		ctx.scale(indoorZoom, indoorZoom);
		ctx.globalAlpha = lecternMarker.flashAlpha * 0.8;
		ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
		ctx.beginPath();
		ctx.arc(lecternMarker.x + lecternMarker.width / 2, lecternMarker.y + lecternMarker.height / 2, 2, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = organMarker.flashAlpha * 0.8;
		ctx.beginPath();
		ctx.arc(organMarker.pointX, organMarker.pointY, 2, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		ctx.globalAlpha = 1;
	}

	// 调试模式下绘制indoor场景的碰撞区域（红色半透明）
	if (debugMode && currentScene === "indoor") {
		var currentWalls = walls[currentScene] || [];
		ctx.save();
		ctx.translate(-camera.x, -camera.y);
		ctx.scale(indoorZoom, indoorZoom);

		for (var i = 0; i < currentWalls.length; i++) {
			var wall = currentWalls[i];
			ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
			ctx.fillRect(wall.left, wall.top, wall.right - wall.left, wall.bottom - wall.top);
		}

		ctx.restore();
	}

	// Draw characters and hero with proper depth sorting (only in close scene)
	if (currentScene === "close") {
		// Create array of all characters to draw (NPCs + hero)
		var allCharacters = [];

		// Add NPCs
		for (var userId in characters) {
			var character = characters[userId];
			if (characterImages[character.image] && characterImages[character.image].ready) {
				allCharacters.push({
					type: 'npc',
					data: character,
					y: character.y
				});
			}
		}

		// Add hero
		if (heroReady) {
			allCharacters.push({
				type: 'hero',
				data: hero,
				y: hero.y
			});
		}

		// Sort by y coordinate (lower y = further away = draw first)
		allCharacters.sort(function(a, b) {
			return a.y - b.y;
		});

		// Draw all characters in sorted order
		for (var i = 0; i < allCharacters.length; i++) {
			var charObj = allCharacters[i];
			
			if (charObj.type === 'npc') {
				var character = charObj.data;
				ctx.globalAlpha = character.alpha;
				renderer.groundShadow(character.x, character.y + 47, 52, 8, character.alpha * 0.28);

				ctx.save();
				if (character.facingRight === true) {
					var imgWidth = characterImages[character.image].image.width;
					ctx.translate(character.x + imgWidth / 2, character.y);
					ctx.scale(-1, 1);
					ctx.drawImage(characterImages[character.image].image, -imgWidth / 2, 0);
				} else {
					ctx.drawImage(characterImages[character.image].image, character.x, character.y);
				}
				ctx.restore();
				ctx.globalAlpha = 1;
			} else if (charObj.type === 'hero') {
				ctx.globalAlpha = hero.alpha;
				renderer.groundShadow(hero.x, hero.y + heroGeometry.height - 8, heroGeometry.width, 8, hero.alpha * 0.3);

				ctx.save();
				drawHeroSprite(hero.x, hero.y, hero.facingRight === true);
				ctx.restore();
				ctx.globalAlpha = 1;
			}
		}
	} else if (currentScene === "indoor") {
		// Draw hero in indoor scene (no NPCs)
		if (heroReady) {
			ctx.globalAlpha = hero.alpha;
			var indoorShadowX = hero.x * indoorZoom - camera.x;
			var indoorShadowY = hero.y * indoorZoom - camera.y + heroGeometry.height - 8;
			// The indoor sprite is screen-sized; its shadow must use the same
			// screen-space dimensions instead of inheriting indoor world zoom.
			renderer.groundShadow(indoorShadowX, indoorShadowY, heroGeometry.width, 8, hero.alpha * 0.3);

			ctx.save();
			var screenX = (hero.x * indoorZoom) - camera.x;
			var screenY = (hero.y * indoorZoom) - camera.y;

			ctx.translate(screenX, screenY);
			drawHeroSprite(0, 0, hero.facingRight === true);
			ctx.restore();
			ctx.globalAlpha = 1;
		}
	} else if (currentScene === "far") {
		// Draw hero in far scene
		drawFarCompanions(true);
		if (heroReady) {
			ctx.globalAlpha = hero.alpha;
			renderer.groundShadow(hero.x, hero.y + heroGeometry.height - 8, heroGeometry.width, 8, hero.alpha * 0.3);

			ctx.save();
			drawHeroSprite(hero.x, hero.y, hero.facingRight === true);
			ctx.restore();
			ctx.globalAlpha = 1;
		}
		drawFarCompanions(false);
	}
	if (currentScene === "far") drawMogSprite(interactiveElements.mog.x, interactiveElements.mog.y, interactiveElements.mog.frame, 0.66);

	// Draw far foreground blocks (only in far scene)
	if (currentScene === "far" && bgFarBlockReady) {
		ctx.drawImage(bgFarBlockImage, 0, 0, 512, 480);
	}

	// Draw indoor foreground blocks (only in indoor scene)
	if (currentScene === "indoor" && bgIndoorBlockReady) {
		ctx.save();
		ctx.translate(-camera.x, -camera.y);
		ctx.scale(indoorZoom, indoorZoom);
		ctx.drawImage(bgIndoorBlockImage, 0, 0, sceneBoundaries.indoor.width, sceneBoundaries.indoor.height);
		ctx.restore();
	}

	// Draw chat bubbles on top (only in close scene)
	if (currentScene === "close") {
		for (var userId in characters) {
			var character = characters[userId];
			if (character.messages) {
				var visibleBubbles = character.messages.filter(function (message) {
					return message.alpha > 0 && !message.fadingOut;
				});
				var bubblePages = [];
				var currentPage = [];
				visibleBubbles.forEach(function (message) {
					if (getChatBubbleLayout(message.content).lines.length > 1) {
						if (currentPage.length) bubblePages.push(currentPage);
						bubblePages.push([message]);
						currentPage = [];
					} else {
						currentPage.push(message);
						if (currentPage.length >= (gameConfig.maxVisibleNpcBubbles || 3)) {
							bubblePages.push(currentPage);
							currentPage = [];
						}
					}
				});
				if (currentPage.length) bubblePages.push(currentPage);
				visibleBubbles = bubblePages.length ? bubblePages[character.bubblePage % bubblePages.length] : [];
				var bubbleLayout = [];
				var layoutY = character.y - 18;
				for (var layoutIndex = visibleBubbles.length - 1; layoutIndex >= 0; layoutIndex--) {
					bubbleLayout[layoutIndex] = layoutY;
					// Use the exact same layout metrics as the renderer.
					layoutY -= getChatBubbleLayout(visibleBubbles[layoutIndex].content).height;
				}
				visibleBubbles.forEach(function (msg, index) {
					if (msg.alpha > 0) {
						ctx.globalAlpha = msg.alpha * character.bubblePageAlpha;
						var bubbleSide = character.bubbleSideProgress;
						ctx.save();
						if (currentScene === "indoor") {
							// Apply camera and zoom for indoor scene
							ctx.translate(-camera.x, -camera.y);
							ctx.scale(indoorZoom, indoorZoom);
						}
						drawChatBubble(character.x + 32, bubbleLayout[index], msg.content, bubbleSide);
						ctx.restore();
						ctx.globalAlpha = 1;
					}
				});
			}
		}
	}

	// Hero messages are shown in the system notice panel instead of above the hero.
	drawSystemNotice();

	// Draw interactive elements (only in indoor scene)
	if (currentScene === "indoor") {
		var lectern = interactiveElements.lectern;
		
		// Draw interact hint
		if (lectern.showHint) {
			drawInteractionHint("互动", "打开留言簿");
		}
		var organ = interactiveElements.organ;
		if (organ.showHint) {
			drawInteractionHint("音乐", "试听 / 开关 BGM");
		}
	} else if (currentScene === "far" && interactiveElements.mog.showHint) {
		drawInteractionHint("莫古力", "按 F 查看动态");
	}
	if (currentScene === "far" && interactiveElements.farMoogle.showBubble) {
		drawChatBubble(366, 378, "库啵", "left");
	}
	if (currentScene === "far" && interactiveElements.farChocobo.interactable && !chocoboRace.visible) {
		drawChatBubble(38, 378, "开始比赛？按 F", "right");
	}

	// Draw message book
	if (messageBook.visible) {
		// Draw semi-transparent background
		ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		
		// Draw book interface with pixel-style rounded corners
		var bookX = 100;
		var bookY = 80;
		var bookWidth = 312;
		var bookHeight = 320;
		var cornerSize = 14;
		
		// Draw pixel-style shadow
		ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
		ctx.fillRect(bookX + 6, bookY + 7, bookWidth, bookHeight);
		
		// Layered cover: leather, inset border and a restrained gold frame.
		ctx.fillStyle = "#5d3a1a";
		
		// Draw main body
		ctx.fillRect(bookX + cornerSize, bookY, bookWidth - cornerSize * 2, bookHeight);
		ctx.fillRect(bookX, bookY + cornerSize, bookWidth, bookHeight - cornerSize * 2);
		ctx.strokeStyle = "#c18a42";
		ctx.lineWidth = 1;
		ctx.strokeRect(bookX + 18, bookY + 10, bookWidth - 28, bookHeight - 20);
		ctx.strokeStyle = "rgba(40, 20, 8, 0.65)";
		ctx.strokeRect(bookX + 21, bookY + 13, bookWidth - 34, bookHeight - 26);
		
		// Draw pixel-style corners
		ctx.fillStyle = "#8b541f";
		// Top-left corner
		ctx.fillRect(bookX, bookY, cornerSize, cornerSize);
		// Top-right corner
		ctx.fillRect(bookX + bookWidth - cornerSize, bookY, cornerSize, cornerSize);
		// Bottom-left corner
		ctx.fillRect(bookX, bookY + bookHeight - cornerSize, cornerSize, cornerSize);
		// Bottom-right corner
		ctx.fillRect(bookX + bookWidth - cornerSize, bookY + bookHeight - cornerSize, cornerSize, cornerSize);
		
		// Draw book spine (darker brown)
		ctx.fillStyle = "#38200f";
		ctx.fillRect(bookX + 4, bookY + 5, 9, bookHeight - 10);
		ctx.fillStyle = "#c18a42";
		ctx.fillRect(bookX + 14, bookY + 12, 2, bookHeight - 24);
		ctx.fillStyle = "#d6a354";
		ctx.beginPath();
		ctx.arc(bookX + bookWidth / 2, bookY + 18, 5, 0, Math.PI * 2);
		ctx.fill();
		
		// Draw paper inside with pixel-style rounded corners
		var paperX = bookX + 24;
		var paperY = bookY + 18;
		var paperWidth = bookWidth - 40;
		var paperHeight = bookHeight - 36;
		var paperCornerSize = 8;
		
		// Draw paper background
		ctx.fillStyle = "#f1d7a3";
		ctx.fillRect(paperX + paperCornerSize, paperY, paperWidth - paperCornerSize * 2, paperHeight);
		ctx.fillRect(paperX, paperY + paperCornerSize, paperWidth, paperHeight - paperCornerSize * 2);
		
		// Draw paper corners
		ctx.fillStyle = "#d9b77b";
		// Top-left corner
		ctx.fillRect(paperX, paperY, paperCornerSize, paperCornerSize);
		// Top-right corner
		ctx.fillRect(paperX + paperWidth - paperCornerSize, paperY, paperCornerSize, paperCornerSize);
		// Bottom-left corner
		ctx.fillRect(paperX, paperY + paperHeight - paperCornerSize, paperCornerSize, paperCornerSize);
		// Bottom-right corner
		ctx.fillRect(paperX + paperWidth - paperCornerSize, paperY + paperHeight - paperCornerSize, paperCornerSize, paperCornerSize);
		ctx.fillStyle = "rgba(95, 54, 20, 0.18)";
		ctx.fillRect(paperX + paperWidth - 5, paperY + 8, 5, paperHeight - 16);
		
		// Draw title with pixel-style font
		ctx.fillStyle = "#5d3a1a";
		ctx.font = "bold 18px " + UI_THEME.font;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("留言簿", canvas.width / 2, bookY + 36);
		ctx.fillStyle = "#9c6f38";
		ctx.font = "9px " + UI_THEME.font;
	ctx.fillText("ARCHIVE", canvas.width / 2, bookY + 51);
		
		// Draw decorative line
		ctx.strokeStyle = UI_THEME.border;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(paperX + 18, bookY + 64);
		ctx.lineTo(paperX + paperWidth - 18, bookY + 64);
		ctx.stroke();
		
		// Draw page indicator
		ctx.fillStyle = "#5d3a1a";
		ctx.font = "12px " + UI_THEME.font;
		ctx.textAlign = "right";
		ctx.fillText("第 " + (messageBook.currentPage + 1) + " / " + messageBook.totalPages, paperX + paperWidth - 12, bookY + 52);

		// Subtle page ruling makes the center area read as paper rather than a panel.
		ctx.strokeStyle = "rgba(137, 99, 48, 0.18)";
		ctx.lineWidth = 1;
		for (var ruleY = bookY + 78; ruleY < bookY + bookHeight - 45; ruleY += 18) {
			ctx.beginPath();
			ctx.moveTo(paperX + 16, ruleY);
			ctx.lineTo(paperX + paperWidth - 16, ruleY);
			ctx.stroke();
		}
		
		if (messageBook.messages.length === 0) {
			if (messageBook.loading) {
				drawMessageBookEmptyState(paperX, bookY, "正在读取留言...");
			} else if (messageBook.error) {
				drawMessageBookEmptyState(paperX, bookY, "加载失败: " + messageBook.error);
			} else {
				drawMessageBookEmptyState(paperX, bookY, "暂无留言");
			}
		} else {
			var currentPageMessages = getCurrentPageMessages();
			currentPageMessages.forEach(function(msg, index) {
				var cardX = paperX + 10;
				var cardY = bookY + 76 + (index * 66);
				var cardWidth = paperWidth - 20;
				var cardHeight = 60;
				var userId = msg.legacy_user_id;
				var avatar = messageBook.avatarImages[userId];
				var username = messageBook.userCache[userId] || "匿名用户";
				var time = msg.created_at ? new Date(msg.created_at).toLocaleDateString() : "未知时间";

				if (index === messageBook.selectedIndex) {
					ctx.fillStyle = "rgba(82, 45, 18, 0.18)";
					ctx.fillRect(cardX + 3, cardY + 3, cardWidth, cardHeight);
					drawRoundedPanel(cardX, cardY, cardWidth, cardHeight, "rgba(255, 248, 220, 0.96)", "#b67c3e");
				} else {
					drawRoundedPanel(cardX, cardY, cardWidth, cardHeight, "rgba(255, 244, 205, 0.82)", "#d0aa70");
				}
				drawAvatar(avatar, cardX + 6, cardY + 5, 42);
				ctx.fillStyle = index === messageBook.selectedIndex ? "#7a4a1e" : "#6b482c";
				ctx.font = "bold 10px " + UI_THEME.font;
				ctx.textAlign = "right";
				ctx.fillText(String(messageBook.currentPage * messageBook.messagesPerPage + index + 1).padStart(2, "0"), cardX + cardWidth - 8, cardY + 13);
				ctx.textAlign = "left";
				ctx.textBaseline = "top";
				ctx.fillStyle = "#3b2110";
				ctx.font = "bold 12px " + UI_THEME.font;
				ctx.fillText(truncateText(username, cardWidth - 66), cardX + 56, cardY + 8);
				ctx.fillStyle = "#6b482c";
				ctx.font = "10px " + UI_THEME.font;
				ctx.fillText(truncateText(time, cardWidth - 66), cardX + 56, cardY + 22);
				ctx.fillStyle = "#24170f";
				ctx.font = "11px " + UI_THEME.font;
				var messageLines = wrapText(String(msg.message || ""), cardWidth - 72);
				var detailHintX = cardX + cardWidth;
				var textWidth = cardWidth - 92;
				ctx.save();
				ctx.beginPath();
				ctx.rect(cardX + 56, cardY + 33, textWidth, cardHeight - 35);
				ctx.clip();
				ctx.fillText(truncateText(messageLines[0] || "", textWidth), cardX + 56, cardY + 35);
				if (messageLines.length > 1) {
					ctx.fillText(truncateText(messageLines[1] || "", textWidth), cardX + 56, cardY + 47);
				}
				ctx.restore();
				ctx.fillStyle = index === messageBook.selectedIndex ? "#fff8dc" : "#f1d7a3";
				ctx.strokeStyle = "#8b5e3c";
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.arc(detailHintX, cardY + cardHeight / 2, 10, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				ctx.fillStyle = "#8b5e3c";
				ctx.font = "bold 15px " + UI_THEME.font;
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText("↵", detailHintX, cardY + cardHeight / 2);
			});
		}
		
		// Draw instructions with pixel-style font
		ctx.fillStyle = "#5d3a1a";
		ctx.font = "12px " + UI_THEME.font;
		ctx.textAlign = "center";
		ctx.fillText("↑↓ 选择   ←→ 翻页   Enter 阅读   ESC 关闭", canvas.width / 2, bookY + bookHeight - 26);
		ctx.fillStyle = "#fff3d1";
		ctx.font = "10px " + UI_THEME.font;
		ctx.fillText("Enter 打开完整留言", canvas.width / 2, bookY + bookHeight - 12);

		if (messageBook.detailVisible) {
			drawMessageDetail(getCurrentPageMessages()[messageBook.selectedIndex]);
		}
	}
	if (sceneTransition.active) {
		// Draw again after the normal UI so the transition is always visible.
		drawPixelTransition();
	}
	drawMusicPlayer();
	drawMogWindow();
	drawChocoboRace();

	// Debug is the final screen layer: it must remain visible above foregrounds
	// and in-game panels while never being transformed by the camera.
	if (debugMode) {
		ctx.save();
		ctx.fillStyle = UI_THEME.text;
		ctx.font = "12px " + UI_THEME.font;
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText("Hero: x=" + Math.round(hero.x) + ", y=" + Math.round(hero.y), 10, 10);
		ctx.fillText("Scene: " + currentScene, 10, 25);
		ctx.fillText("HeroReady: " + heroReady, 10, 40);
		ctx.fillText("HeroAlpha: " + hero.alpha, 10, 55);
		ctx.fillStyle = UI_THEME.muted;
		ctx.font = "10px " + UI_THEME.font;
		ctx.fillText("Image: " + (bgReady ? "OK" : "--") + "  Far: " + (bgFarReady ? "OK" : "--") + "  Indoor: " + (bgIndoorReady ? "OK" : "--"), 10, 70);
		ctx.fillText("Sprite: " + (heroImage ? heroImage.width + "x" + heroImage.height : "--"), 10, 85);
		ctx.restore();
		drawCollisionWalls();
		drawHeroFeetCollision();
		drawHeroSpriteDebug();
		drawSceneTransitions();
	}
	if (sceneTransition.active) drawPixelTransition();
	if (chocoboRace.raceTransition && chocoboRace.raceTransition.active && !chocoboRace.visible) {
		// The far scene has already been rendered underneath this reveal mask.
		drawChocoboRaceTransition();
	}

};

function drawPixelTransition() {
	var halfDuration = sceneTransition.duration / 2;
	var phase = sceneTransition.progress < halfDuration
		? sceneTransition.progress / halfDuration
		: 1 - ((sceneTransition.progress - halfDuration) / halfDuration);
	var tileSize = 16;
	var centerX = canvas.width / 2 / tileSize;
	var centerY = canvas.height / 2 / tileSize;
	var maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
	ctx.save();
	ctx.fillStyle = "#17121b";
	for (var row = 0; row < Math.ceil(canvas.height / tileSize); row++) {
		for (var column = 0; column < Math.ceil(canvas.width / tileSize); column++) {
			var distance = Math.sqrt(Math.pow(column + 0.5 - centerX, 2) + Math.pow(row + 0.5 - centerY, 2));
			if (distance <= maxDistance * phase) {
				ctx.fillRect(column * tileSize, row * tileSize, tileSize, tileSize);
			}
		}
	}
	ctx.restore();
}

// Draw chat bubble
function getChatBubbleHeight(text) {
	ctx.font = "12px Helvetica";
	var maxWidth = Math.min(180, canvas.width - 20) - 8;
	var lines = wrapText(String(text || ""), maxWidth);
	if (lines.length > 1) {
		ctx.font = "10px Helvetica";
		lines = wrapText(String(text || ""), maxWidth);
	}
	return Math.min(lines.length, 3) * (ctx.font.indexOf("10px") === 0 ? 12 : 14) + 8;
}

function rotateNpcBubblePages() {
	for (var userId in characters) {
		var character = characters[userId];
		character.bubblePage++;
		character.bubblePageElapsed = 0;
		character.bubblePageAlpha = 0;
	}
}

function getChatBubbleLayout(text) {
	var padding = 4;
	var maxWidth = Math.min(180, canvas.width - 20);
	var font = "12px Helvetica";
	var lineHeight = 14;
	ctx.font = font;
	var lines = wrapText(String(text || ""), maxWidth - padding * 2);
	if (lines.length > 1) {
		font = "10px Helvetica";
		lineHeight = 12;
		ctx.font = font;
		lines = wrapText(String(text || ""), maxWidth - padding * 2);
	}
	if (lines.length > 3) {
		lines = lines.slice(0, 3);
		lines[2] = truncateText(lines[2], maxWidth - padding * 2);
	}
	var textWidth = lines.reduce(function (width, line) { return Math.max(width, ctx.measureText(line).width); }, 0);
	return { font: font, lineHeight: lineHeight, lines: lines, width: Math.min(maxWidth, textWidth + padding * 2), height: lines.length * lineHeight + padding * 2 };
}

function drawChatBubble(x, y, text, side) {
	ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
	ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
	ctx.lineWidth = 2;
	// Calculate text width
	var padding = 4;
	var bubbleY = Math.max(0, y);
	var layout = getChatBubbleLayout(text);
	ctx.font = layout.font;
	var lines = layout.lines;
	var lineHeight = layout.lineHeight;
	var bubbleWidth = layout.width;
	var bubbleHeight = layout.height;
	var bubbleSide = typeof side === "number" ? side : (side === "left" ? 1 : 0);
	var bubbleX = x - bubbleWidth * bubbleSide;
	// Keep a normal-length bubble readable by moving it to the actor's left
	// when the actor is too close to the right edge.
	if (bubbleX + bubbleWidth > canvas.width - 10) {
		bubbleX = x - bubbleWidth;
	}
	bubbleX = Math.max(10, Math.min(canvas.width - bubbleWidth - 10, bubbleX));
	// Draw bubble with rounded corners (compatible with all browsers)
	ctx.beginPath();
	var radius = 8; // Smaller radius
	ctx.moveTo(bubbleX + radius, bubbleY);
	ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY);
	ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius);
	ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius);
	ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight);
	ctx.lineTo(bubbleX + radius, bubbleY + bubbleHeight);
	ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius);
	ctx.lineTo(bubbleX, bubbleY + radius);
	ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
	ctx.fill();
	ctx.stroke();
	// Draw text
	ctx.fillStyle = "rgb(0, 0, 0)";
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	lines.forEach(function (line, index) {
		ctx.fillText(line, bubbleX + padding, bubbleY + padding + index * lineHeight);
	});
}

function drawRoundedPanel(x, y, width, height, fill, stroke) {
	renderer.roundedPanel(x, y, width, height, fill, stroke, 7);
}

function drawAvatar(image, x, y, size) {
	renderer.circleAvatar(image, x, y, size);
}

function drawMessageBookEmptyState(x, y, text) {
	ctx.fillStyle = "#5d3a1a";
	ctx.font = "12px " + UI_THEME.font;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text, x + 222, y + 150);
}

function drawInteractionHint(label, action) {
	var width = 228;
	var height = 42;
	var x = 20;
	var y = canvas.height - 58;
	ctx.save();
	ctx.fillStyle = "rgba(25, 18, 14, 0.94)";
	ctx.strokeStyle = UI_THEME.border;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.roundRect(x, y, width, height, 7);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = UI_THEME.accent;
	ctx.fillRect(x + 10, y + 9, 30, 24);
	ctx.fillStyle = "#3b2513";
	ctx.font = "bold 11px " + UI_THEME.font;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("F", x + 25, y + 21);
	ctx.textAlign = "left";
	ctx.fillStyle = UI_THEME.text;
	ctx.font = "bold 11px " + UI_THEME.font;
	ctx.fillText(label, x + 52, y + 13);
	ctx.fillStyle = UI_THEME.muted;
	ctx.font = "10px " + UI_THEME.font;
	ctx.fillText(action, x + 52, y + 28);
	ctx.restore();
}

function getMogSourceRect(frame, small) {
	var largeFrames = [
		{ x: 139, y: 41, width: 50, height: 70 }, { x: 235, y: 44, width: 47, height: 67 },
		{ x: 332, y: 41, width: 49, height: 70 }, { x: 427, y: 47, width: 50, height: 64 },
		{ x: 524, y: 41, width: 48, height: 64 }, { x: 607, y: 67, width: 73, height: 44 },
		{ x: 140, y: 133, width: 50, height: 74 }, { x: 236, y: 133, width: 50, height: 74 },
		{ x: 332, y: 137, width: 50, height: 70 }, { x: 428, y: 140, width: 46, height: 67 },
		{ x: 524, y: 140, width: 50, height: 67 }, { x: 620, y: 140, width: 47, height: 67 },
		{ x: 140, y: 232, width: 50, height: 67 }
	];
	var smallFrames = [
		{ x: 248, y: 241, width: 31, height: 38 }, { x: 342, y: 241, width: 33, height: 38 },
		{ x: 438, y: 241, width: 33, height: 38 }, { x: 536, y: 247, width: 31, height: 31 },
		{ x: 632, y: 241, width: 35, height: 37 }
	];
	return (small ? smallFrames : largeFrames)[frame % (small ? smallFrames.length : largeFrames.length)];
}

function drawMogSprite(x, y, frame, scale) {
	var resource = resources.images.mogSprite;
	if (!resource || !resource.ready) return;
	var source = getMogSourceRect(frame, true);
	ctx.imageSmoothingEnabled = false;
	var displayWidth = 48 * scale;
	var displayHeight = displayWidth * source.height / source.width;
	ctx.drawImage(resource.image, source.x, source.y, source.width, source.height, x, y, displayWidth, displayHeight);
}

function drawFarCompanions(beforeHero) {
	var moogle = resources.images.moogle8bit;
	var chocobo = resources.images.chocoboPixel;
	var farMoogle = interactiveElements.farMoogle;
	var heroFeet = hero.y + heroGeometry.height;
	ctx.imageSmoothingEnabled = false;
	var chocoboFeet = 393 + 48;
	var moogleFeet = 390 + 48;
	if (chocobo.ready && (chocoboFeet <= heroFeet) === beforeHero) {
		renderer.groundShadow(30, 393 + 48 - 8, 48, 8, 0.3);
		drawContainedImage(chocobo.image, 30, 393, 48, 48);
	}
	// Keep the decorative moogle near the lower-right, separate from the
	// interactive small moogle already placed farther right.
	if (moogle.ready && (moogleFeet <= heroFeet) === beforeHero) {
		renderer.groundShadow(farMoogle.x, farMoogle.y + farMoogle.height - 8, farMoogle.width, 8, 0.3);
		drawContainedImage(moogle.image, farMoogle.x, farMoogle.y, farMoogle.width, farMoogle.height);
	}
}

function drawContainedImage(image, x, y, width, height) {
	var scale = Math.min(width / image.width, height / image.height);
	var drawWidth = image.width * scale;
	var drawHeight = image.height * scale;
	ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function openChocoboRace() {
	chocoboRace.visible = true;
	chocoboRace.phase = "selection";
	chocoboRace.selectedIndex = 0;
	chocoboRace.previewTimer = 1.5;
	chocoboRace.readyTimer = 0;
	chocoboRace.countdown = 0;
	chocoboRace.started = false;
	chocoboRace.elapsed = 0;
	chocoboRace.finished = false;
	chocoboRace.winner = -1;
	chocoboRace.cameraX = 0;
	chocoboRace.ranking = [];
	chocoboRace.firstFinishTime = null;
	chocoboRace.eventTimer = 0;
	chocoboRace.nextEventAt = 4.5 + Math.random() * 2;
	chocoboRace.activeEvent = null;
	chocoboRace.commentary = "The race is underway!";
	chocoboRace.commentaryTimer = 3;
	chocoboRace.cameraPunch = 0;
	chocoboRace.crowdPulse = 0;
	chocoboRace.lastLeader = -1;
	chocoboRace.raceTransition = { active: true, progress: 0, duration: 1.05, mode: "selection" };
	var raceSpeeds = createScatteredRaceValues(0.052, 0.078, 0.003);
	var extraDistances = createScatteredRaceValues(0.035, 0.115, 0.009);
	chocoboRace.tracers = [];
	for (var index = 0; index < 8; index++) {
		chocoboRace.tracers.push({
			progress: 0,
			speed: raceSpeeds[index],
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
		});
	}
}

function updateRacePresentation(modifier) {
	chocoboRace.commentaryTimer = Math.max(0, chocoboRace.commentaryTimer - modifier);
	chocoboRace.cameraPunch = Math.max(0, chocoboRace.cameraPunch - modifier * 2.5);
	chocoboRace.crowdPulse = Math.max(0, chocoboRace.crowdPulse - modifier * 2);
	chocoboRace.eventTimer += modifier;
	if (chocoboRace.eventTimer >= chocoboRace.nextEventAt && !chocoboRace.finished) {
		var activeRacers = chocoboRace.tracers.map(function (racer, index) {
			return { racer: racer, index: index };
		}).filter(function (entry) {
			return entry.racer.status === "running";
		});
		if (activeRacers.length) {
			var target = activeRacers[Math.floor(Math.random() * activeRacers.length)];
			var eventType = Math.random() < 0.52 ? "gust" : "mud";
			target.racer.eventTimer = eventType === "gust" ? 2.1 : 1.7;
			target.racer.eventMultiplier = eventType === "gust" ? 1.14 : 0.86;
			chocoboRace.activeEvent = { type: eventType, racer: target.index, timer: target.racer.eventTimer };
			chocoboRace.commentary = eventType === "gust" ? "A tailwind gives " + getRaceColorName(target.index) + " a boost!" : getRaceColorName(target.index) + " hit a muddy patch!";
			chocoboRace.commentaryTimer = 2.4;
			chocoboRace.cameraPunch = 0.45;
			chocoboRace.crowdPulse = 1;
		}
		chocoboRace.eventTimer = 0;
		chocoboRace.nextEventAt = 5 + Math.random() * 4;
	}
	var leader = -1;
	chocoboRace.tracers.forEach(function (racer, index) {
		if (leader < 0 || racer.progress > chocoboRace.tracers[leader].progress) leader = index;
	});
	if (leader >= 0 && leader !== chocoboRace.lastLeader && chocoboRace.lastLeader >= 0) {
		chocoboRace.commentary = getRaceColorName(leader) + " takes the lead!";
		chocoboRace.commentaryTimer = 1.8;
		chocoboRace.crowdPulse = 0.7;
	}
	chocoboRace.lastLeader = leader;
}

function updateChocoboRaceTransition(modifier) {
	var transition = chocoboRace.raceTransition;
	if (!transition || !transition.active) return;
	transition.progress += modifier;
	if (transition.mode === "close" && transition.progress >= transition.duration / 2 && chocoboRace.visible) {
		chocoboRace.visible = false;
		chocoboRace.started = false;
		chocoboRace.finished = false;
		currentScene = "far";
		transition.mode = "close-reveal";
	}
	if (transition.progress >= transition.duration / 2 && transition.mode === "race" && chocoboRace.phase === "ready") {
		// The race scene is already rendered underneath the transition; the
		// midpoint marks the visual handoff into the ready/countdown state.
		transition.mode = "race-ready";
	}
	if (transition.progress >= transition.duration) transition.active = false;
}

function getRaceColorName(index) {
	return ["Yellow", "White", "Pink", "Blue", "Green", "Black", "Gold", "Brown"][index] || "A Chocobo";
}

function selectRaceChocobo(index) {
	chocoboRace.selectedIndex = (index + 8) % 8;
	chocoboRace.previewTimer = 1.5;
}

function beginChocoboRaceCountdown() {
	if (chocoboRace.phase !== "selection") return;
	chocoboRace.tracers.forEach(function (racer, index) {
		racer.playerAdvantage = index === chocoboRace.selectedIndex;
	});
	chocoboRace.phase = "ready";
	chocoboRace.readyTimer = 0;
	chocoboRace.countdown = 3.2;
	chocoboRace.countdownShown = 3;
}

function closeChocoboRace() {
	if (!chocoboRace.visible || chocoboRace.raceTransition.active) return;
	chocoboRace.raceTransition = { active: true, progress: 0, duration: 1.05, mode: "close" };
}

function createScatteredRaceValues(minimum, maximum, spacing) {
	var values = [];
	for (var index = 0; index < 8; index++) {
		var base = minimum + (maximum - minimum) * index / 7;
		var jitter = (Math.random() - 0.5) * spacing;
		values.push(Math.max(minimum, Math.min(maximum, base + jitter)));
	}
	for (var current = values.length - 1; current > 0; current--) {
		var swap = Math.floor(Math.random() * (current + 1));
		var temporary = values[current];
		values[current] = values[swap];
		values[swap] = temporary;
	}
	return values;
}

function updateChocoboRace(modifier) {
	if (chocoboRace.raceTransition && chocoboRace.raceTransition.active) {
		updateChocoboRaceTransition(modifier);
	}
	if (chocoboRace.phase === "selection") {
		chocoboRace.elapsed += modifier;
		if (chocoboRace.previewTimer > 0) {
			chocoboRace.previewTimer = Math.max(0, chocoboRace.previewTimer - modifier);
		}
		return;
	}
	if (chocoboRace.phase === "ready") {
		chocoboRace.readyTimer += modifier;
		if (chocoboRace.readyTimer < 0.8) {
			// Play the selected bird's forward-running animation without changing
			// its race position before the countdown starts.
			chocoboRace.tracers[chocoboRace.selectedIndex].frame = Math.floor(chocoboRace.readyTimer * 10) % 3;
		}
		chocoboRace.countdown -= modifier;
		if (chocoboRace.countdown <= 0) {
			chocoboRace.phase = "race";
			chocoboRace.started = true;
		}
		return;
	}
	if (!chocoboRace.started || chocoboRace.finished) return;
	chocoboRace.elapsed += modifier;
	updateRacePresentation(modifier);
	chocoboRace.tracers.forEach(function (racer, index) {
		if (racer.status === "stopped") return;
		if (racer.status === "celebrating") {
			racer.celebrateTime += modifier;
			racer.frame = Math.floor(chocoboRace.elapsed * 8 + index) % 3;
			if (racer.celebrateTime >= 2.5) {
				racer.status = "stopped";
				// Hold the second frame as the standing pose after the front-facing run.
				racer.frame = 1;
			}
			return;
		}
		var wobble = Math.sin(chocoboRace.elapsed * (2.2 + index * 0.13) + index) * 0.004;
		racer.staminaTimer += modifier;
		// Use a long stamina cycle so each state lasts several seconds instead
		// of flickering between effort levels during every short race segment.
		var staminaWave = Math.sin(racer.staminaTimer * 0.22 + racer.staminaOffset);
		var previousPhase = racer.staminaPhase;
		if (staminaWave > 0.72) {
			racer.staminaPhase = "surge";
		} else if (staminaWave < -0.72) {
			racer.staminaPhase = "tired";
		} else {
			racer.staminaPhase = "steady";
		}
		if (previousPhase !== racer.staminaPhase) racer.dustSeed += 17;
		var staminaMultiplier = racer.staminaPhase === "surge" ? 1.18 : (racer.staminaPhase === "tired" ? 0.78 : 1);
		if (racer.playerAdvantage) {
			staminaMultiplier *= racer.staminaPhase === "tired" ? 1.08 : 1.035;
		}
		if (racer.eventTimer > 0) {
			racer.eventTimer = Math.max(0, racer.eventTimer - modifier);
			if (racer.eventTimer === 0) racer.eventMultiplier = 1;
		}
		var leaderProgress = chocoboRace.tracers.reduce(function (maximum, candidate) {
			return Math.max(maximum, candidate.progress);
		}, 0);
		var progressGap = Math.max(0, leaderProgress - racer.progress);
		var catchUpBoost = Math.min(0.42, progressGap * 1.45);
		if (chocoboRace.firstFinishTime != null) catchUpBoost = Math.max(catchUpBoost, 0.28);
		var effectiveSpeed = racer.speed * staminaMultiplier * (1 + catchUpBoost) * (racer.eventMultiplier || 1);
		racer.progress = Math.min(racer.finishTarget, racer.progress + (effectiveSpeed + wobble) * modifier);
		racer.frame = Math.floor(chocoboRace.elapsed * 10 + index) % 3;
		if (racer.progress >= 1 && chocoboRace.ranking.indexOf(index) < 0) {
			chocoboRace.ranking.push(index);
			racer.finishTime = chocoboRace.elapsed;
			if (chocoboRace.firstFinishTime == null) chocoboRace.firstFinishTime = chocoboRace.elapsed;
			chocoboRace.commentary = getRaceColorName(index) + " crosses the finish line!";
			chocoboRace.commentaryTimer = 2.2;
			chocoboRace.crowdPulse = 1;
			chocoboRace.cameraPunch = 0.3;
		}
		if (racer.progress >= racer.finishTarget) {
			if (racer.status === "running") {
				racer.status = "celebrating";
				racer.celebrateTime = 0;
			}
		}
	});
	if (chocoboRace.firstFinishTime != null && chocoboRace.elapsed - chocoboRace.firstFinishTime > chocoboRace.finishGracePeriod) {
		chocoboRace.tracers.forEach(function (racer, index) {
			if (racer.status !== "running") return;
			racer.progress = Math.max(racer.progress, 1);
			if (chocoboRace.ranking.indexOf(index) < 0) {
				chocoboRace.ranking.push(index);
				racer.finishTime = chocoboRace.elapsed;
			}
			racer.status = "celebrating";
			racer.celebrateTime = 0;
		});
	}
	if (chocoboRace.tracers.every(function (racer) { return racer.status === "stopped"; })) {
		chocoboRace.winner = chocoboRace.ranking[0];
		chocoboRace.finished = true;
		chocoboRace.started = false;
	}
	if (chocoboRace.elapsed > 1.2 && !chocoboRace.finished) {
		var leader = chocoboRace.tracers.reduce(function (best, racer) {
			return racer.progress > best.progress ? racer : best;
		}, chocoboRace.tracers[0]);
		var targetCamera = leader.progress * chocoboRace.finishWorldX - 300;
		chocoboRace.cameraX = Math.max(0, Math.min(chocoboRace.worldLength - canvas.width, targetCamera));
	}
}

function drawChocoboRace() {
	if (!chocoboRace.visible) return;
	if (chocoboRace.phase === "selection") {
		drawChocoboSelection();
		drawChocoboRaceTransition();
		return;
	}
	var panelX = 12, panelY = 12, panelWidth = canvas.width - 24, panelHeight = canvas.height - 24;
	ctx.fillStyle = "#8ed0dc";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.save();
	var raceJolt = chocoboRace.cameraPunch ? Math.sin(chocoboRace.elapsed * 38) * chocoboRace.cameraPunch : 0;
	ctx.translate(raceJolt, 64);
	drawRaceBackground();
	ctx.restore();
	drawRoundedPanel(8, 6, canvas.width - 16, 54, "rgba(25, 16, 12, 0.96)", UI_THEME.border);
	ctx.fillStyle = "rgba(242, 196, 109, 0.12)";
	ctx.fillRect(12, 47, canvas.width - 24, 1);
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = UI_THEME.text;
	ctx.font = "bold 16px " + UI_THEME.font;
	drawRaceReadableText("CHOCOBO DERBY", canvas.width / 2, 19, "center");
	ctx.fillStyle = UI_THEME.muted;
	ctx.font = "10px " + UI_THEME.font;
	drawRaceReadableText(chocoboRace.phase === "ready" ? "GET READY" : (chocoboRace.finished ? "RACE COMPLETE" : "AUTOMATIC RACE · WATCH"), canvas.width / 2, 36, "center");
	ctx.textAlign = "right";
	ctx.fillStyle = UI_THEME.accent;
	ctx.font = "bold 9px " + UI_THEME.font;
	drawRaceReadableText(chocoboRace.phase === "ready" ? "READY" : (chocoboRace.finished ? "RESULT" : "LIVE"), canvas.width - 24, 19, "right");
	if (chocoboRace.commentaryTimer > 0 && chocoboRace.phase === "race") drawRaceCommentary();

	var sheet = resources.images.chocoboRaceSheet;
	// The dirt course begins at y=192; keep every lane inside that surface.
	// Reserve the upper 64px for the race HUD; shift the whole course together.
	ctx.save();
	ctx.translate(raceJolt, 64);
	var trackX = 0, trackWidth = canvas.width, laneTop = 200, laneHeight = 27;
	var names = ["Yellow", "White", "Pink", "Blue", "Green", "Black", "Gold", "Brown"];
	var renderOrder = chocoboRace.tracers.map(function (racer, index) {
		return { index: index };
	}).sort(function (left, right) {
		// Lower lanes are closer to the camera and must be drawn later.
		return left.index - right.index;
	});
	ctx.font = "10px " + UI_THEME.font;
	for (var index = 0; index < 8; index++) {
		var laneY = laneTop + index * laneHeight;
		ctx.fillStyle = index % 2 ? "rgba(255,255,255,0.12)" : "rgba(71,42,24,0.16)";
		ctx.fillRect(0, laneY - 12, canvas.width, laneHeight);
		ctx.fillStyle = UI_THEME.text;
		ctx.textAlign = "left";
		drawRaceReadableText(names[index], 10, laneY + 3, "left");
		ctx.strokeStyle = "rgba(77,43,22,0.45)";
		ctx.beginPath();
		ctx.moveTo(0, laneY + 12);
		ctx.lineTo(canvas.width, laneY + 12);
		ctx.stroke();
	}
	if (sheet.ready) {
			renderOrder.forEach(function (entry) {
			var racer = chocoboRace.tracers[entry.index];
			var racerY = laneTop + entry.index * laneHeight;
			var racerX = 50 + racer.progress * chocoboRace.finishWorldX - chocoboRace.cameraX;
			// Larger racers may overlap; the lower lane is drawn last for depth.
			// Draw the footprint immediately before the racer so the track remains
			// behind the entire character layer and never hides the sprite.
			renderer.groundShadow(racerX + 3, racerY + 9, 44, 7, 0.34);
			drawRaceStaminaEffect(racer, racerX, racerY);
			drawRaceChocobo(sheet.image, entry.index, racer.frame,
				racerX,
				// The source frame has transparent padding below the body; lift the
				// draw box so the visible feet sit on the lane's ground line.
				racerY - 33, 50, 50, racer.status === "celebrating" || racer.status === "stopped" ? 0 : 2);
		});
	}
	ctx.strokeStyle = UI_THEME.accent;
	ctx.setLineDash([3, 3]);
	ctx.beginPath();
	var finishX = 50 + chocoboRace.finishWorldX - chocoboRace.cameraX;
	ctx.moveTo(finishX, laneTop - 14);
	ctx.lineTo(finishX, laneTop + 7 * laneHeight + 15);
	ctx.stroke();
	ctx.setLineDash([]);
	if (finishX > -20 && finishX < canvas.width + 20) {
		ctx.fillStyle = "#5d3825";
		ctx.fillRect(finishX - 5, laneTop - 18, 5, 8 * laneHeight + 30);
		ctx.fillRect(finishX + 42, laneTop - 18, 5, 8 * laneHeight + 30);
		ctx.fillStyle = "#fff1bd";
		ctx.fillRect(finishX, laneTop - 28, 42, 8);
		for (var flagRow = 0; flagRow < 2; flagRow++) {
			for (var flagColumn = 0; flagColumn < 6; flagColumn++) {
				ctx.fillStyle = (flagRow + flagColumn) % 2 ? "#e65f52" : "#fff1bd";
				ctx.fillRect(finishX + flagColumn * 7, laneTop - 28 + flagRow * 4, 7, 4);
			}
		}
		ctx.fillStyle = "#70462a";
		ctx.fillRect(finishX - 12, laneTop + 7 * laneHeight + 20, 66, 5);
	}
	ctx.restore();
	if (chocoboRace.finished) {
		drawChocoboResults(sheet, names, panelX, panelY, panelWidth, panelHeight);
	}
	if (chocoboRace.phase === "ready") {
		var count = Math.max(1, Math.ceil(chocoboRace.countdown));
		ctx.fillStyle = "#fff1bd";
		ctx.font = "bold 56px " + UI_THEME.font;
		ctx.textAlign = "center";
		ctx.fillText(count, canvas.width / 2, canvas.height / 2);
	}
	ctx.fillStyle = UI_THEME.muted;
	ctx.font = "10px " + UI_THEME.font;
	drawRaceFooter("ESC 关闭");
	drawChocoboRaceTransition();
}

function drawRaceStaminaEffect(racer, x, y) {
	if (racer.status !== "running") return;
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

function drawRaceFooter(text) {
	var width = 120;
	var x = canvas.width - width - 12;
	var y = canvas.height - 31;
	drawRoundedPanel(x, y, width, 20, "rgba(25, 18, 14, 0.9)", "rgba(242, 196, 109, 0.72)");
	ctx.fillStyle = UI_THEME.muted;
	ctx.font = "10px " + UI_THEME.font;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text, x + width / 2, y + 10);
}

function drawRaceCommentary() {
	var width = Math.min(270, canvas.width - 24);
	var x = (canvas.width - width) / 2;
	var y = 69;
	drawRoundedPanel(x, y, width, 22, "rgba(25, 18, 14, 0.9)", "rgba(242, 196, 109, 0.72)");
	ctx.fillStyle = UI_THEME.text;
	ctx.font = "10px " + UI_THEME.font;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(chocoboRace.commentary, canvas.width / 2, y + 11);
}

function drawChocoboRaceTransition() {
	var transition = chocoboRace.raceTransition;
	if (!transition || !transition.active) return;
	var halfDuration = transition.duration / 2;
	var closeMode = transition.mode === "close" || transition.mode === "close-reveal";
	var diagonalProgress;
	if (transition.mode === "close") {
		// Cover the race scene during the first half before switching scenes.
		diagonalProgress = Math.min(1, transition.progress / halfDuration) * (canvas.width + canvas.height);
	} else if (transition.mode === "close-reveal") {
		// Reveal the already-rendered far scene during the second half.
		diagonalProgress = Math.max(0, 1 - (transition.progress - halfDuration) / halfDuration) * (canvas.width + canvas.height);
	} else {
		// Entry starts fully covered and reveals the selection scene.
		diagonalProgress = Math.max(0, 1 - transition.progress / transition.duration) * (canvas.width + canvas.height);
	}
	var tileSize = 16;
	ctx.save();
	ctx.fillStyle = "#17121b";
	// Pixel tiles advance diagonally from the upper-left toward the lower-right.
	// This gives the race screens a distinct old-console wipe without using a
	// smooth vector mask.
	for (var row = 0; row < Math.ceil(canvas.height / tileSize); row++) {
		for (var column = 0; column < Math.ceil(canvas.width / tileSize); column++) {
			var diagonal = column * tileSize + row * tileSize;
			if (diagonal <= diagonalProgress) ctx.fillRect(column * tileSize, row * tileSize, tileSize, tileSize);
		}
	}
	ctx.restore();
}

function drawChocoboResults(sheet, names, panelX, panelY, panelWidth, panelHeight) {
	drawRoundedPanel(panelX + 8, panelY + 58, panelWidth - 16, panelHeight - 82, "rgba(21, 15, 17, 0.92)", UI_THEME.border);
	ctx.fillStyle = "rgba(242, 196, 109, 0.1)";
	ctx.fillRect(panelX + 20, panelY + 92, panelWidth - 40, 1);
	ctx.textAlign = "center";
	ctx.fillStyle = UI_THEME.accent;
	ctx.font = "bold 14px " + UI_THEME.font;
	ctx.fillText("RACE RESULTS", canvas.width / 2, panelY + 78);
	var podium = [
		{ rank: 1, x: canvas.width / 2, top: panelY + 132, width: 72, height: 82, color: "#e7b84e" },
		{ rank: 2, x: canvas.width / 2 - 76, top: panelY + 150, width: 66, height: 64, color: "#b9c5d0" },
		{ rank: 3, x: canvas.width / 2 + 76, top: panelY + 162, width: 66, height: 52, color: "#bb8056" }
	];
	podium.forEach(function (place) {
		var racerIndex = chocoboRace.ranking[place.rank - 1];
		if (racerIndex == null) return;
		ctx.fillStyle = place.color;
		ctx.fillRect(place.x - place.width / 2, place.top, place.width, place.height);
		ctx.fillStyle = "#302225";
		ctx.fillRect(place.x - place.width / 2, place.top, place.width, 4);
		ctx.fillStyle = "#fff1bd";
		ctx.font = "bold 20px " + UI_THEME.font;
		ctx.fillText(String(place.rank), place.x, place.top + 26);
		if (sheet.ready) {
			drawRaceChocobo(sheet.image, racerIndex, 1,
				place.x - 24, place.top - 46, 46, 46, 0);
		}
		ctx.fillStyle = UI_THEME.text;
		ctx.font = "10px " + UI_THEME.font;
		drawRaceReadableText(names[racerIndex], place.x, place.top + place.height + 13, "center");
	});
	ctx.textAlign = "left";
	ctx.font = "11px " + UI_THEME.font;
	ctx.fillStyle = UI_THEME.text;
	chocoboRace.ranking.forEach(function (racerIndex, rank) {
		ctx.fillStyle = rank < 3 ? UI_THEME.accent : UI_THEME.muted;
		var racerTime = chocoboRace.tracers[racerIndex].finishTime;
		ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
		ctx.fillRect(panelX + 20, panelY + 258 + rank * 18, panelWidth - 40, 17);
		ctx.fillStyle = rank < 3 ? UI_THEME.accent : UI_THEME.muted;
		drawRaceReadableText((rank + 1) + ". " + names[racerIndex] + " Chocobo  " + formatRaceTime(racerTime), panelX + 30, panelY + 272 + rank * 18, "left");
	});
}

function formatRaceTime(seconds) {
	var milliseconds = Math.floor((seconds % 1) * 1000);
	var minutes = Math.floor(seconds / 60);
	var remainingSeconds = Math.floor(seconds % 60);
	return minutes + ":" + String(remainingSeconds).padStart(2, "0") + "." + String(milliseconds).padStart(3, "0");
}

function drawRaceReadableText(text, x, y, align) {
	ctx.save();
	ctx.textAlign = align || "left";
	ctx.textBaseline = "middle";
	ctx.lineWidth = 3;
	ctx.strokeStyle = "rgba(20, 14, 15, 0.88)";
	ctx.strokeText(text, x, y);
	ctx.fillStyle = UI_THEME.text;
	ctx.fillText(text, x, y);
	ctx.restore();
}

function drawChocoboSelection() {
	var horizonY = 126;
	var startY = 374;
	var vanishingX = canvas.width / 2;
	var roadBottom = canvas.height;
	var roadTopY = horizonY + 28;
	var roadTopLeft = vanishingX - 34;
	var roadTopRight = vanishingX + 34;
	function roadEdgeAt(y, side) {
		var depth = Math.max(0, Math.min(1, (y - roadTopY) / (roadBottom - roadTopY)));
		var top = side === "left" ? roadTopLeft : roadTopRight;
		var bottom = side === "left" ? 0 : canvas.width;
		return top + (bottom - top) * depth;
	}
	ctx.imageSmoothingEnabled = false;
	ctx.fillStyle = "#62b5ce";
	ctx.fillRect(0, 0, canvas.width, horizonY);
	ctx.fillStyle = "#dcebd5";
	ctx.fillRect(0, 80, canvas.width, 8);
	// Layered scenery keeps the selection view from feeling like an empty stage.
	for (var cloud = -80; cloud < canvas.width + 100; cloud += 150) {
		ctx.fillStyle = "#eaf3dc";
		ctx.fillRect(cloud + 12, 28, 44, 5);
		ctx.fillRect(cloud + 5, 33, 58, 6);
		ctx.fillRect(cloud, 39, 74, 6);
		ctx.fillStyle = "#c9e4d8";
		ctx.fillRect(cloud + 8, 45, 18, 3);
		ctx.fillRect(cloud + 48, 45, 16, 3);
		ctx.fillStyle = "#f7f5dc";
		ctx.fillRect(cloud + 18, 29, 8, 2);
		ctx.fillRect(cloud + 34, 34, 12, 2);
	}
	ctx.fillStyle = "#476f7d";
	for (var mountain = -120; mountain < canvas.width + 180; mountain += 160) {
		ctx.fillRect(mountain + 50, 94, 64, 32);
		ctx.fillRect(mountain + 30, 104, 104, 22);
		ctx.fillStyle = "#5b8790";
		ctx.fillRect(mountain + 66, 98, 18, 3);
		ctx.fillRect(mountain + 42, 112, 24, 3);
		ctx.fillRect(mountain + 91, 106, 14, 3);
		ctx.fillStyle = "#3c6572";
		ctx.fillRect(mountain + 55, 108, 8, 3);
		ctx.fillRect(mountain + 78, 114, 12, 3);
		ctx.fillStyle = "#476f7d";
	}
	ctx.fillStyle = "#6da379";
	ctx.fillRect(0, horizonY, canvas.width, 28);
	var crowdFlash = chocoboRace.crowdPulse > 0 ? Math.floor(chocoboRace.crowdPulse * 10) % 2 : 0;
	for (var shrub = 12; shrub < canvas.width; shrub += 48) {
		ctx.fillStyle = "#3d7659";
		ctx.fillRect(shrub, horizonY + 8, 20, 8);
		ctx.fillRect(shrub + 3, horizonY + 5, 14, 5);
		ctx.fillStyle = "#2f634f";
		ctx.fillRect(shrub + 1, horizonY + 12, 3, 2);
		ctx.fillRect(shrub + 10, horizonY + 9, 2, 2);
		ctx.fillStyle = "#69a16b";
		ctx.fillRect(shrub + 5, horizonY + 4, 5, 4);
		ctx.fillRect(shrub + 13, horizonY + 7, 4, 3);
	}
	// A prominent finish palace anchors the far end of the perspective course.
	var distantFinishY = horizonY - 2;
	var finishWidth = 116;
	var finishLeft = vanishingX - finishWidth / 2;
	ctx.save();
	// Scale the finish structure around the vanishing point so it reads as
	// distant instead of competing with the foreground starting line.
	ctx.translate(vanishingX, distantFinishY);
	ctx.scale(0.7, 0.7);
	ctx.translate(-vanishingX, -distantFinishY);
	ctx.lineJoin = "round";
	ctx.lineWidth = 4;
	ctx.strokeStyle = "#171113";
	ctx.fillStyle = "#6a4028";
	ctx.beginPath();
	ctx.roundRect(finishLeft - 10, distantFinishY + 18, 20, 82, 5);
	ctx.roundRect(finishLeft + finishWidth - 10, distantFinishY + 18, 20, 82, 5);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = "#b9783f";
	ctx.fillRect(finishLeft - 4, distantFinishY + 25, 8, 66);
	ctx.fillRect(finishLeft + finishWidth - 4, distantFinishY + 25, 8, 66);
	ctx.strokeStyle = "#171113";
	ctx.fillStyle = "#f1d27c";
	ctx.beginPath();
	ctx.roundRect(finishLeft - 2, distantFinishY + 10, finishWidth + 4, 24, 5);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = "#e75c51";
	ctx.fillRect(finishLeft + 8, distantFinishY + 14, finishWidth - 16, 12);
	for (var finishFlag = 0; finishFlag < 7; finishFlag++) {
		ctx.fillStyle = finishFlag % 2 ? "#fff0b5" : "#c84349";
		ctx.fillRect(finishLeft + 10 + finishFlag * 14, distantFinishY + 14, 14, 6);
		ctx.fillStyle = finishFlag % 2 ? "#c84349" : "#fff0b5";
		ctx.fillRect(finishLeft + 10 + finishFlag * 14, distantFinishY + 20, 14, 6);
	}
	ctx.fillStyle = "#f6d36a";
	ctx.beginPath();
	ctx.arc(vanishingX, distantFinishY + 2, 15, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = "#fff1bd";
	ctx.beginPath();
	ctx.arc(vanishingX, distantFinishY + 2, 8, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = "#d8b45e";
	ctx.fillRect(finishLeft - 27, distantFinishY + 2, 12, 42);
	ctx.fillRect(finishLeft + finishWidth + 15, distantFinishY + 2, 12, 42);
	ctx.strokeStyle = "#171113";
	ctx.strokeRect(finishLeft - 27, distantFinishY + 2, 12, 42);
	ctx.strokeRect(finishLeft + finishWidth + 15, distantFinishY + 2, 12, 42);
	ctx.fillStyle = "#e65c52";
	ctx.fillRect(finishLeft - 35, distantFinishY + 3, 8, 27);
	ctx.fillRect(finishLeft + finishWidth + 27, distantFinishY + 3, 8, 27);
	ctx.fillStyle = "#fff0b5";
	ctx.fillRect(finishLeft - 35, distantFinishY + 11, 8, 8);
	ctx.fillRect(finishLeft + finishWidth + 27, distantFinishY + 11, 8, 8);
	ctx.fillStyle = "#fff0b5";
	ctx.fillRect(finishLeft + 18, distantFinishY + 94, finishWidth - 36, 5);
	ctx.restore();
	ctx.fillStyle = "#8b5e3c";
	ctx.fillRect(0, horizonY + 28, canvas.width, roadBottom - horizonY - 28);
	// The course is a single perspective fan, not eight separate columns.
	ctx.fillStyle = "#c99655";
	ctx.beginPath();
	ctx.moveTo(0, roadBottom);
	ctx.lineTo(canvas.width, roadBottom);
	ctx.lineTo(roadTopRight, roadTopY);
	ctx.lineTo(roadTopLeft, roadTopY);
	ctx.closePath();
	ctx.fill();
	ctx.fillStyle = "#b47b48";
	for (var trackMark = 0; trackMark < 7; trackMark++) {
		var markY = roadTopY + 25 + trackMark * 38;
		var markLeft = roadEdgeAt(markY, "left") + 8;
		var markRight = roadEdgeAt(markY, "right") - 8;
		ctx.fillRect(markLeft, markY, markRight - markLeft, 3);
	}
	// Side spectator stands and bunting frame the course without crossing the birds.
	ctx.fillStyle = "#6b412c";
	ctx.fillRect(0, horizonY + 42, 44, 5);
	ctx.fillRect(canvas.width - 44, horizonY + 42, 44, 5);
	for (var stand = 0; stand < 5; stand++) {
		ctx.fillStyle = stand % 2 ? "#e65c52" : "#f3d580";
		ctx.fillRect(4 + stand * 9, horizonY + 48, 7, 8);
		ctx.fillRect(canvas.width - 11 - stand * 9, horizonY + 48, 7, 8);
	}
	ctx.fillStyle = "#e0b267";
	ctx.fillRect(0, startY + 28, canvas.width, 8);
	ctx.fillStyle = "#6b412c";
	ctx.fillRect(0, startY + 36, canvas.width, 5);
	// Eight lane separators converge toward the distant center.
	for (var lane = 0; lane <= 8; lane++) {
		var bottomX = lane * canvas.width / 8;
		ctx.strokeStyle = lane === 0 || lane === 8 ? "#5a3929" : "#e2b66a";
		ctx.lineWidth = lane === 0 || lane === 8 ? 4 : 2;
		ctx.beginPath();
		ctx.moveTo(bottomX, roadBottom);
		ctx.lineTo(roadTopLeft + lane * (roadTopRight - roadTopLeft) / 8, roadTopY);
		ctx.stroke();
	}
	// Small distant posts make the depth direction readable.
	for (var post = 0; post < 7; post++) {
		var postT = post / 7;
		var postY = horizonY + 34 + postT * (startY - horizonY - 48);
		var postYEdgeLeft = roadEdgeAt(postY, "left");
		var postYEdgeRight = roadEdgeAt(postY, "right");
		var postSize = 2 + Math.round(postT * 3);
		var postHeight = 7 + Math.round(postT * 9);
		ctx.fillStyle = "#5b3827";
		ctx.fillRect(postYEdgeLeft - postSize - 4, postY, postSize, postHeight);
		ctx.fillRect(postYEdgeRight + 4, postY, postSize, postHeight);
	}
	// Trees, fence rails, and banners follow the same perspective edges.
	for (var scenery = 0; scenery < 6; scenery++) {
		var sceneryT = 0.12 + scenery * 0.15;
		var sceneryY = roadTopY + sceneryT * (startY - roadTopY);
		var treeVariants = [0.82, 1.18, 0.68, 1.04, 0.76, 1.27];
		var sceneryScale = (0.35 + sceneryT * 0.8) * treeVariants[scenery];
		var leftEdge = roadEdgeAt(sceneryY, "left");
		var rightEdge = roadEdgeAt(sceneryY, "right");
		var treeWidth = Math.max(14, Math.round(44 * sceneryScale));
		var treeHeight = Math.max(24, Math.round(76 * sceneryScale));
		var trunkWidth = Math.max(2, Math.round(treeWidth * (0.18 + (scenery % 3) * 0.04)));
		var leftTreeX = leftEdge - 30 - treeWidth / 2 - (scenery % 2) * 5;
		var rightTreeX = rightEdge + 30 + ((scenery + 1) % 2) * 7;
		var crownY = sceneryY - treeHeight - treeWidth;
		var crownHeight = Math.max(7, treeWidth - 3 - (scenery % 3) * 2);
		var darkLeaves = scenery % 2 ? "#285b4d" : "#2f6654";
		var lightLeaves = scenery % 3 ? "#4c9165" : "#5ca46b";
		ctx.fillStyle = "#4b3025";
		ctx.fillRect(leftTreeX + treeWidth / 2 - trunkWidth / 2, sceneryY - treeHeight, trunkWidth, treeHeight);
		ctx.fillRect(rightTreeX + treeWidth / 2 - trunkWidth / 2, sceneryY - treeHeight, trunkWidth, treeHeight);
		ctx.strokeStyle = "#171113";
		ctx.lineWidth = 1;
		ctx.strokeRect(leftTreeX + treeWidth / 2 - trunkWidth / 2 + 0.5, sceneryY - treeHeight + 0.5, Math.max(1, trunkWidth - 1), Math.max(1, treeHeight - 1));
		ctx.strokeRect(rightTreeX + treeWidth / 2 - trunkWidth / 2 + 0.5, sceneryY - treeHeight + 0.5, Math.max(1, trunkWidth - 1), Math.max(1, treeHeight - 1));
		ctx.fillStyle = "#68432d";
		ctx.fillRect(leftTreeX + treeWidth / 2 - trunkWidth / 2, sceneryY - treeHeight + 5, 2, Math.max(2, Math.round(treeHeight * 0.22)));
		ctx.fillRect(rightTreeX + treeWidth / 2 - trunkWidth / 2, sceneryY - treeHeight + 8, 2, Math.max(2, Math.round(treeHeight * 0.18)));
		ctx.fillStyle = darkLeaves;
		ctx.fillRect(leftTreeX, crownY + 5, treeWidth, crownHeight);
		ctx.fillRect(rightTreeX, crownY + 5, treeWidth, crownHeight);
		ctx.strokeRect(leftTreeX + 0.5, crownY + 5.5, Math.max(1, treeWidth - 1), Math.max(1, crownHeight - 1));
		ctx.strokeRect(rightTreeX + 0.5, crownY + 5.5, Math.max(1, treeWidth - 1), Math.max(1, crownHeight - 1));
		ctx.fillRect(leftTreeX + Math.round(treeWidth * 0.18), crownY, Math.max(4, Math.round(treeWidth * 0.55)), 7 + scenery % 3);
		ctx.fillRect(rightTreeX + Math.round(treeWidth * 0.18), crownY, Math.max(4, Math.round(treeWidth * 0.55)), 7 + (scenery + 1) % 3);
		ctx.fillRect(leftTreeX - Math.round(treeWidth * 0.18), crownY + Math.round(treeWidth * 0.35), Math.max(4, Math.round(treeWidth * 0.3)), Math.max(5, Math.round(treeWidth * 0.4)));
		ctx.fillRect(leftTreeX + Math.round(treeWidth * 0.78), crownY + Math.round(treeWidth * 0.3), Math.max(4, Math.round(treeWidth * 0.28)), Math.max(5, Math.round(treeWidth * 0.45)));
		ctx.fillRect(rightTreeX - Math.round(treeWidth * 0.12), crownY + Math.round(treeWidth * 0.28), Math.max(4, Math.round(treeWidth * 0.3)), Math.max(5, Math.round(treeWidth * 0.42)));
		ctx.fillRect(rightTreeX + Math.round(treeWidth * 0.78), crownY + Math.round(treeWidth * 0.38), Math.max(4, Math.round(treeWidth * 0.3)), Math.max(5, Math.round(treeWidth * 0.35)));
		ctx.fillStyle = lightLeaves;
		ctx.fillRect(leftTreeX + 2 + (scenery % 3), crownY + 3, Math.max(2, Math.round(treeWidth * 0.25)), 3);
		ctx.fillRect(leftTreeX + Math.round(treeWidth * 0.6), crownY + 9, Math.max(2, Math.round(treeWidth * 0.2)), 3);
		ctx.fillRect(rightTreeX + 3, crownY + 4 + (scenery % 2), Math.max(2, Math.round(treeWidth * 0.22)), 3);
		ctx.fillRect(rightTreeX + Math.round(treeWidth * 0.62), crownY + 8, Math.max(2, Math.round(treeWidth * 0.18)), 3);
		ctx.fillRect(leftTreeX + Math.round(treeWidth * 0.12), crownY + Math.round(treeWidth * 0.42), Math.max(3, Math.round(treeWidth * 0.2)), 4);
		ctx.fillRect(leftTreeX + Math.round(treeWidth * 0.72), crownY + Math.round(treeWidth * 0.55), Math.max(3, Math.round(treeWidth * 0.18)), 4);
		ctx.fillRect(rightTreeX + Math.round(treeWidth * 0.18), crownY + Math.round(treeWidth * 0.5), Math.max(3, Math.round(treeWidth * 0.2)), 4);
		ctx.fillRect(rightTreeX + Math.round(treeWidth * 0.68), crownY + Math.round(treeWidth * 0.3), Math.max(3, Math.round(treeWidth * 0.18)), 4);
		var railY = sceneryY + 4;
		ctx.fillStyle = "#70462a";
		ctx.fillRect(leftEdge - 22 - treeWidth, railY, Math.max(4, treeWidth * 2), Math.max(2, sceneryScale * 3));
		ctx.fillRect(rightEdge + 22, railY, Math.max(4, treeWidth * 2), Math.max(2, sceneryScale * 3));
		ctx.fillStyle = "#9d6337";
		ctx.fillRect(leftEdge - 18 - treeWidth, railY, Math.max(2, Math.round(treeWidth * 0.35)), 1);
		ctx.fillRect(rightEdge + 24, railY, Math.max(2, Math.round(treeWidth * 0.35)), 1);
		if (scenery % 2 === 0) {
			ctx.fillStyle = crowdFlash ? "#fff0b5" : "#e65c52";
			ctx.fillRect(leftEdge - 18 - treeWidth, sceneryY - treeHeight - treeWidth - 8, Math.max(4, treeWidth), Math.max(4, treeWidth / 2));
			ctx.fillRect(rightEdge + 18, sceneryY - treeHeight - treeWidth - 8, Math.max(4, treeWidth), Math.max(4, treeWidth / 2));
		}
	}
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = UI_THEME.text;
	ctx.font = "bold 17px " + UI_THEME.font;
	drawRaceReadableText("SELECT YOUR CHOCOBO", canvas.width / 2, 24, "center");
	ctx.fillStyle = UI_THEME.accent;
	ctx.font = "bold 9px " + UI_THEME.font;
	ctx.fillText("CHOCOBO DERBY  ·  ENTRY", canvas.width / 2, 41);
	ctx.fillStyle = UI_THEME.muted;
	ctx.font = "10px " + UI_THEME.font;
	drawRaceReadableText("←→ SELECT · ENTER START · ESC BACK", canvas.width / 2, 56, "center");
	var sheet = resources.images.chocoboRaceSheet;
	var names = ["Yellow", "White", "Pink", "Blue", "Green", "Black", "Gold", "Brown"];
	var startLeft = roadEdgeAt(startY, "left");
	var startRight = roadEdgeAt(startY, "right");
	var startLaneWidth = (startRight - startLeft) / 8;
	ctx.fillStyle = "#f0c879";
	ctx.fillRect(startLeft, startY, startRight - startLeft, 7);
	ctx.fillStyle = "#593528";
	ctx.fillRect(startLeft, startY + 7, startRight - startLeft, 4);
	for (var index = 0; index < 8; index++) {
		var laneX = Math.round(startLeft + (index + 0.5) * startLaneWidth);
		var size = 50;
		var birdY = startY - 44;
		ctx.fillStyle = index === chocoboRace.selectedIndex ? "rgba(255,241,189,0.3)" : "rgba(42,33,27,0.12)";
		ctx.fillRect(laneX - 25, startY - 16, 50, 32);
		ctx.fillStyle = UI_THEME.text;
		ctx.textAlign = "center";
		ctx.font = index === chocoboRace.selectedIndex ? "bold 15px Arial, sans-serif" : "12px Arial, sans-serif";
		drawRaceReadableText(names[index], laneX, startY + 30, "center");
		if (index === chocoboRace.selectedIndex) {
			ctx.save();
			ctx.fillStyle = "#ffffff";
			ctx.strokeStyle = "#171113";
			ctx.lineWidth = 3;
			ctx.font = "bold 24px Arial, sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.strokeText("▼", laneX, startY - 58);
			ctx.fillText("▼", laneX, startY - 58);
			ctx.restore();
		}
		if (sheet.ready) {
			var frame = index === chocoboRace.selectedIndex && chocoboRace.previewTimer > 0 ? Math.floor(chocoboRace.elapsed * 8 + index) % 3 : 1;
			drawRaceChocobo(sheet.image, index, frame, laneX - size / 2, birdY, size, size, 3);
		}
	}
	ctx.textAlign = "center";
	ctx.fillStyle = UI_THEME.muted;
	drawRaceFooter("ENTER 确认    ESC 返回");
}

function drawRaceBackground() {
	var farOffset = Math.floor(chocoboRace.cameraX * 0.18);
	var nearOffset = Math.floor(chocoboRace.cameraX * 0.5);
	ctx.imageSmoothingEnabled = false;
	ctx.fillStyle = "#63b8d1";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = "#78c7d7";
	ctx.fillRect(0, 54, canvas.width, 20);
	ctx.fillStyle = "#a9dce0";
	ctx.fillRect(0, 74, canvas.width, 14);
	for (var cloud = -((farOffset * 2) % 150) - 80; cloud < canvas.width + 120; cloud += 150) {
		ctx.fillStyle = "#eaf3dc";
		ctx.fillRect(cloud + 12, 24, 42, 8);
		ctx.fillRect(cloud, 32, 72, 8);
		ctx.fillRect(cloud + 20, 40, 32, 5);
		ctx.fillStyle = "#c8e5d5";
		ctx.fillRect(cloud + 8, 40, 14, 5);
		ctx.fillStyle = "#d7eadb";
		ctx.fillRect(cloud + 24, 28, 18, 3);
		ctx.fillRect(cloud + 48, 34, 16, 3);
	}

	for (var mountain = -((farOffset) % 180) - 180; mountain < canvas.width + 180; mountain += 180) {
		ctx.fillStyle = "#477e8c";
		ctx.fillRect(mountain + 48, 84, 84, 30);
		ctx.fillRect(mountain + 32, 94, 116, 20);
		ctx.fillRect(mountain + 16, 104, 148, 10);
		ctx.fillStyle = "#d8e4cd";
		ctx.fillRect(mountain + 72, 84, 20, 6);
		ctx.fillRect(mountain + 64, 90, 36, 6);
		ctx.fillStyle = "#386b79";
		ctx.fillRect(mountain + 40, 100, 20, 4);
		ctx.fillRect(mountain + 104, 94, 18, 5);
		ctx.fillRect(mountain + 76, 108, 28, 4);
		ctx.fillStyle = "#568d91";
		ctx.fillRect(mountain + 24, 108, 14, 3);
		ctx.fillRect(mountain + 124, 104, 18, 3);
	}
	for (var tree = -((farOffset * 2) % 96) - 50; tree < canvas.width + 50; tree += 96) {
		ctx.fillStyle = "#68452c";
		ctx.fillRect(tree + 18, 108, 8, 24);
		ctx.fillStyle = "#4a3025";
		ctx.fillRect(tree + 18, 112, 3, 18);
		ctx.fillStyle = "#3d8760";
		ctx.fillRect(tree + 6, 96, 8, 5);
		ctx.fillRect(tree + 28, 102, 9, 5);
		ctx.fillStyle = "#2d6656";
		ctx.fillRect(tree + 8, 92, 28, 20);
		ctx.fillRect(tree + 2, 100, 40, 12);
		ctx.fillStyle = "#3d8760";
		ctx.fillRect(tree + 14, 86, 16, 8);
	}
	ctx.fillStyle = "#83b84e";
	ctx.fillRect(0, 122, canvas.width, 20);
	ctx.fillStyle = "#c99552";
	ctx.fillRect(0, 142, canvas.width, 18);
	ctx.fillStyle = "#e0b66a";
	ctx.fillRect(0, 160, canvas.width, 8);
	ctx.fillStyle = "#292126";
	ctx.fillRect(0, 188, canvas.width, 4);
	for (var post = -(nearOffset % 72) - 40; post < canvas.width + 40; post += 72) {
		pixelOutlineBlock(post - 2, 114, 10, 56, "#241f22");
		ctx.fillStyle = "#70462a";
		ctx.fillRect(post, 116, 6, 52);
		ctx.fillStyle = "#9d6337";
		ctx.fillRect(post + 2, 116, 3, 52);
		ctx.fillStyle = "#583a29";
		ctx.fillRect(post + 1, 124, 2, 10);
		ctx.fillRect(post + 1, 143, 2, 14);
		ctx.fillStyle = "#b97942";
		ctx.fillRect(post + 5, 119, 1, 18);
		ctx.fillRect(post - 12, 128, 30, 5);
		ctx.fillRect(post - 12, 150, 30, 5);
	}
	ctx.fillStyle = "#5d9b42";
	ctx.fillRect(0, 168, canvas.width, 8);
	ctx.fillStyle = "#78aa45";
	ctx.fillRect(0, 176, canvas.width, 8);
	ctx.fillStyle = "#b77a43";
	ctx.fillRect(0, 184, canvas.width, 8);
	ctx.fillStyle = "#d19a55";
	ctx.fillRect(0, 192, canvas.width, 220);
	for (var texture = -((nearOffset * 2) % 58) - 58; texture < canvas.width + 58; texture += 58) {
		ctx.fillStyle = "#c18447";
		ctx.fillRect(texture + 4, 214, 18, 3);
		ctx.fillRect(texture + 30, 246, 12, 3);
		ctx.fillRect(texture + 12, 286, 24, 3);
		ctx.fillRect(texture + 38, 330, 14, 3);
		ctx.fillStyle = "#e2b66a";
		ctx.fillRect(texture + 20, 228, 9, 2);
		ctx.fillRect(texture + 2, 310, 13, 2);
		ctx.fillStyle = "#a96f3f";
		ctx.fillRect(texture + 8, 216, 5, 1);
		ctx.fillRect(texture + 34, 248, 4, 1);
		ctx.fillRect(texture + 18, 288, 7, 1);
		ctx.fillRect(texture + 41, 332, 5, 1);
	}
	ctx.fillStyle = "#292126";
	ctx.fillRect(0, 188, canvas.width, 4);
	ctx.fillRect(0, 408, canvas.width, 4);
}

function pixelOutlineBlock(x, y, width, height, outline) {
	ctx.fillStyle = outline;
	ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(width), Math.ceil(height));
}

function drawRaceChocobo(image, colorIndex, frame, x, y, width, height, directionRow) {
	var sourceWidth = image.width / 12;
	var sourceHeight = image.height / 8;
	var colorGroup = Math.floor(colorIndex / 4);
	var colorColumn = colorIndex % 4;
	ctx.imageSmoothingEnabled = false;
	// Use the right-facing row for a side-on race while cycling its three frames.
	var row = directionRow == null ? 2 : directionRow;
	// The upper four color groups have four transparent pixels below their
	// source cells; compensate so every color's visible feet share one baseline.
	var alignedY = y + (colorGroup === 0 ? 4 : 0);
	// The source cells also have asymmetric side padding. These offsets align
	// each color's visible body center with its assigned lane center.
	var horizontalOffsets = [3, 1, -1, -4];
	var alignedX = x + horizontalOffsets[colorColumn] * width / sourceWidth;
	ctx.drawImage(image, (colorColumn * 3 + frame) * sourceWidth, (colorGroup * 4 + row) * sourceHeight,
		sourceWidth, sourceHeight, alignedX, alignedY, width, height);
}

function isPointInChocoboRaceClose(x, y) {
	return x >= canvas.width - 100 && y >= canvas.height - 48;
}

function drawMogWindow() {
	if (!mogWindow.visible) return;
	var panelX = 54, panelY = 48, panelWidth = canvas.width - 108, panelHeight = 300;
	ctx.fillStyle = "rgba(8, 6, 7, 0.78)";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	drawRoundedPanel(panelX, panelY, panelWidth, panelHeight, "#fffdf7", "#f2c46d");
	ctx.fillStyle = "#5d3a1a";
	ctx.font = "bold 16px " + UI_THEME.font;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("莫古力(FF6)", canvas.width / 2, panelY + 24);
	ctx.fillStyle = "#765e4a";
	ctx.font = "10px " + UI_THEME.font;
	ctx.fillText("这里有一只莫古力", canvas.width / 2, panelY + 40);
	var source = getMogSourceRect(Math.floor(mogWindow.frame) % 13, false);
	var resource = resources.images.mogSprite;
	var imageBoxX = panelX + 28;
	var imageBoxY = panelY + 52;
	var imageBoxWidth = panelWidth - 56;
	var imageBoxHeight = 198;
	if (resource && resource.ready) {
		ctx.imageSmoothingEnabled = false;
		ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
		ctx.fillRect(imageBoxX, imageBoxY, imageBoxWidth, imageBoxHeight);
		// Keep one pixel scale for every pose; fitting each bounding box separately
		// makes the wide sleeping pose look stretched compared with the others.
		var scale = 2.5;
		if (source.width * scale > imageBoxWidth || source.height * scale > imageBoxHeight) {
			scale = Math.min(imageBoxWidth / source.width, imageBoxHeight / source.height);
		}
		var displayWidth = source.width * scale;
		var displayHeight = source.height * scale;
		ctx.drawImage(resource.image, source.x, source.y, source.width, source.height,
			imageBoxX + (imageBoxWidth - displayWidth) / 2,
			imageBoxY + (imageBoxHeight - displayHeight) / 2,
			displayWidth, displayHeight);
	}
	ctx.fillStyle = "#765e4a";
	ctx.font = "11px " + UI_THEME.font;
	ctx.fillText("←→ / ↑↓ 查看动作 · ESC 关闭", canvas.width / 2, panelY + panelHeight - 18);
}

function isPointInInteractionHint(x, y) {
	var hintX = 20;
	var hintY = canvas.height - 58;
	return x >= hintX && x <= hintX + 228 && y >= hintY && y <= hintY + 42;
}

function isPointInMusicPlayer(x, y) {
	return x >= 76 && x <= 134 && y >= 339 && y <= 397;
}

function drawMusicPlayer() {
	if (!musicPlayer.visible) return;
	var state = PhantomAudioSystem.getState();
	var panelX = 10, panelY = 10, panelWidth = canvas.width - 20, panelHeight = canvas.height - 20;
	if (!musicPlayer.cover) {
		musicPlayer.cover = new Image();
		musicPlayer.cover.src = "audio/sonnet-phantom-cover.png";
	}
	ctx.fillStyle = "rgba(8, 6, 7, 0.82)";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	drawRoundedPanel(panelX, panelY, panelWidth, panelHeight, "#21191a", "#c79a59");
	ctx.fillStyle = "#312326";
	ctx.fillRect(panelX + 1, panelY + 1, panelWidth - 2, 50);
	ctx.fillStyle = UI_THEME.accent;
	ctx.font = "bold 15px " + UI_THEME.font;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("管弦乐琴", panelX + panelWidth / 2, panelY + 25);
	ctx.fillStyle = UI_THEME.muted;
	ctx.textAlign = "left";
	ctx.font = "bold 9px " + UI_THEME.font;
	ctx.fillText("RECORDS", panelX + panelWidth / 2 + 48, panelY + 25);
	ctx.textAlign = "right";
	ctx.font = "9px " + UI_THEME.font;
	ctx.fillText("ESC 关闭", panelX + panelWidth - 18, panelY + 38);
	var leftX = panelX + 18;
	var leftWidth = 150;
	var lyricX = leftX + leftWidth + 18;
	var lyricWidth = panelX + panelWidth - 16 - lyricX;
	var lyricContentWidth = lyricWidth - 20;
	ctx.fillStyle = "#171113";
	ctx.fillRect(leftX - 5, panelY + 62, leftWidth + 10, panelHeight - 76);
	if (musicPlayer.cover.complete && musicPlayer.cover.naturalWidth) {
		ctx.drawImage(musicPlayer.cover, leftX, panelY + 72, leftWidth, leftWidth);
	}
	ctx.fillStyle = UI_THEME.text;
	ctx.font = "bold 14px " + UI_THEME.font;
	ctx.textAlign = "left";
	ctx.fillText(state.title, leftX, panelY + 242);
	ctx.fillStyle = UI_THEME.muted;
	ctx.font = "11px " + UI_THEME.font;
	ctx.fillText("YukiRinLL", leftX, panelY + 260);
	ctx.fillStyle = "#8f7775";
	ctx.font = "10px " + UI_THEME.font;
	ctx.fillText("Phantoms' Poetry Collection I", leftX, panelY + 275);
	ctx.fillStyle = state.playing ? UI_THEME.accent : UI_THEME.muted;
	ctx.fillText(state.playing ? "● 正在播放" : "○ 已暂停", leftX, panelY + 296);
	ctx.fillStyle = "#574237";
	ctx.fillRect(leftX, panelY + 314, leftWidth, 4);
	ctx.fillStyle = UI_THEME.accent;
	ctx.fillRect(leftX, panelY + 314, state.duration ? leftWidth * state.currentTime / state.duration : 0, 4);
	ctx.fillStyle = "#6f5c50";
	drawMusicSkipButton(leftX + 24, panelY + 368, false);
	drawMusicSkipButton(leftX + 126, panelY + 368, true);
	ctx.fillStyle = UI_THEME.accent;
	ctx.beginPath();
	ctx.arc(leftX + 75, panelY + 368, 29, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = "#3b2513";
	ctx.beginPath();
	if (state.playing) {
		ctx.roundRect(leftX + 67, panelY + 358, 6, 20, 2);
		ctx.roundRect(leftX + 78, panelY + 358, 6, 20, 2);
	} else {
		ctx.moveTo(leftX + 70, panelY + 356);
		ctx.lineTo(leftX + 70, panelY + 380);
		ctx.lineTo(leftX + 88, panelY + 368);
		ctx.closePath();
	}
	ctx.fill();
	var lyricIndex = PhantomAudioSystem.getCurrentLyricIndex();
	ctx.fillStyle = "#171113";
	ctx.fillRect(lyricX - 10, panelY + 62, lyricWidth + 10, panelHeight - 76);
	ctx.fillStyle = UI_THEME.accent;
	ctx.font = "bold 11px " + UI_THEME.font;
	ctx.textAlign = "left";
	ctx.fillText("LYRICS / 十四行诗：幻影", lyricX, panelY + 82);
	ctx.fillStyle = "#70565a";
	ctx.fillRect(lyricX, panelY + 92, lyricContentWidth, 1);
	ctx.save();
	ctx.beginPath();
	ctx.rect(lyricX - 2, panelY + 100, lyricContentWidth + 4, panelHeight - 116);
	ctx.clip();
	if (!PhantomAudioSystem.lyrics.length) {
		ctx.fillStyle = UI_THEME.muted;
		ctx.font = "10px " + UI_THEME.font;
		ctx.textAlign = "center";
		ctx.fillText("歌词加载中...", lyricX + lyricWidth / 2, panelY + 180);
	} else {
		var lyricLinesByIndex = PhantomAudioSystem.lyrics.map(function (line) {
			return { english: line.english, chinese: line.chinese };
		});
		var activeIndex = Math.max(0, lyricIndex);
		var lyricPositions = [];
		var activeY = panelY + 180;
		lyricPositions[activeIndex] = activeY;
		for (var previousIndex = activeIndex - 1; previousIndex >= 0; previousIndex--) {
			var previousHeight = 26 + 8;
			activeY -= previousHeight;
			lyricPositions[previousIndex] = activeY;
		}
		activeY = panelY + 180;
		for (var nextIndex = activeIndex + 1; nextIndex < lyricLinesByIndex.length; nextIndex++) {
			var currentHeight = 26 + 8;
			activeY += currentHeight;
			lyricPositions[nextIndex] = activeY;
		}
		PhantomAudioSystem.lyrics.forEach(function (line, index) {
			var y = lyricPositions[index];
			var lyricLines = lyricLinesByIndex[index];
			ctx.fillStyle = index === lyricIndex ? UI_THEME.accent : (index < lyricIndex ? "#765e60" : "#b99fa0");
			ctx.textAlign = "left";
			ctx.font = (index === lyricIndex ? "bold " : "") + fitLyricFontSize(lyricLines.english, lyricContentWidth) + "px " + UI_THEME.font;
			ctx.fillText(lyricLines.english, lyricX, y);
			if (lyricLines.chinese) {
				ctx.font = (index === lyricIndex ? "bold " : "") + fitLyricFontSize(lyricLines.chinese, lyricContentWidth) + "px " + UI_THEME.font;
				ctx.fillText(lyricLines.chinese, lyricX, y + 14);
			}
		});
	}
	ctx.restore();
	drawFantasyFrame(panelX, panelY, panelWidth, panelHeight);
}

function drawFantasyFrame(x, y, width, height) {
	ctx.save();
	ctx.strokeStyle = "rgba(242, 196, 109, 0.9)";
	ctx.fillStyle = "rgba(242, 196, 109, 0.95)";
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.roundRect(x + 6, y + 6, width - 12, height - 12, 9);
	ctx.stroke();
	drawFantasyCorner(x + 13, y + 13, 1, 1);
	drawFantasyCorner(x + width - 13, y + 13, -1, 1);
	drawFantasyCorner(x + 13, y + height - 13, 1, -1);
	drawFantasyCorner(x + width - 13, y + height - 13, -1, -1);
	var center = x + width / 2;
	ctx.strokeStyle = "rgba(242, 196, 109, 0.95)";
	ctx.beginPath();
	ctx.moveTo(center - 88, y + 51);
	ctx.quadraticCurveTo(center - 62, y + 35, center - 34, y + 51);
	ctx.moveTo(center + 34, y + 51);
	ctx.quadraticCurveTo(center + 62, y + 35, center + 88, y + 51);
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(center, y + 49, 4, 0, Math.PI * 2);
	ctx.fill();
	ctx.beginPath();
	ctx.moveTo(center - 9, y + 49);
	ctx.lineTo(center, y + 39);
	ctx.lineTo(center + 9, y + 49);
	ctx.stroke();
	ctx.restore();
}

function drawFantasyCorner(x, y, scaleX, scaleY) {
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(scaleX, scaleY);
	ctx.beginPath();
	ctx.moveTo(0, 24);
	ctx.quadraticCurveTo(0, 7, 15, 0);
	ctx.quadraticCurveTo(10, 13, 24, 16);
	ctx.moveTo(5, 19);
	ctx.quadraticCurveTo(13, 7, 21, 6);
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(6, 6, 3, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

function fitLyricFontSize(text, maxWidth) {
	var fontSize = 11;
	while (fontSize > 7) {
		ctx.font = fontSize + "px " + UI_THEME.font;
		if (ctx.measureText(text).width <= maxWidth) return fontSize;
		fontSize -= 0.5;
	}
	return 7;
}

function drawMusicSkipButton(x, y, forward) {
	ctx.save();
	ctx.globalAlpha = 0.55;
	ctx.fillStyle = "#756258";
	ctx.beginPath();
	ctx.arc(x, y, 17, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = "#332629";
	ctx.beginPath();
	ctx.moveTo(forward ? x - 5 : x + 5, y - 6);
	ctx.lineTo(forward ? x + 3 : x - 3, y);
	ctx.lineTo(forward ? x - 5 : x + 5, y + 6);
	ctx.closePath();
	ctx.fill();
	ctx.fillRect(forward ? x + 5 : x - 7, y - 7, 2, 14);
	ctx.restore();
}

function drawSystemNotice() {
	var button = systemNotice.button;
	ctx.save();
	ctx.fillStyle = systemNotice.visible ? "#f2c46d" : "rgba(32, 27, 24, 0.85)";
	ctx.strokeStyle = "#f2c46d";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.roundRect(button.x, button.y, button.width, button.height, 6);
	ctx.fill();
	ctx.stroke();
	var iconColor = systemNotice.visible ? "#4a2911" : "#fff3d1";
	ctx.fillStyle = iconColor;
	ctx.strokeStyle = iconColor;
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.arc(button.x + 11, button.y + 10, 5, Math.PI, 0);
	ctx.lineTo(button.x + 17, button.y + 16);
	ctx.lineTo(button.x + 5, button.y + 16);
	ctx.closePath();
	ctx.fill();
	ctx.beginPath();
	ctx.arc(button.x + 11, button.y + 17, 2, 0, Math.PI);
	ctx.stroke();
	ctx.font = "bold 12px system-ui";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("P", button.x + 31, button.y + button.height / 2);
	ctx.restore();

	if (!systemNotice.visible) return;
	var panelX = 42;
	var panelY = 42;
	var panelWidth = canvas.width - 84;
	var panelHeight = 210;
	drawRoundedPanel(panelX, panelY, panelWidth, panelHeight, "rgba(30, 24, 20, 0.96)", "#f2c46d");
	ctx.fillStyle = "rgba(242, 196, 109, 0.08)";
	ctx.fillRect(panelX + 1, panelY + 1, panelWidth - 2, 34);
	ctx.fillStyle = "#f2c46d";
	ctx.font = "bold 16px system-ui";
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.fillText("通知提示", panelX + 18, panelY + 16);
	ctx.fillStyle = "#b9a995";
	ctx.font = "11px system-ui";
	ctx.textAlign = "right";
	ctx.fillText("P / ESC 关闭", panelX + panelWidth - 18, panelY + 20);
	ctx.strokeStyle = "rgba(242, 196, 109, 0.35)";
	ctx.beginPath();
	ctx.moveTo(panelX + 12, panelY + 34);
	ctx.lineTo(panelX + panelWidth - 12, panelY + 34);
	ctx.stroke();

	var tabs = ["活动", "新闻", "NEWS", "TOPICS"];
	var activeTab = systemNoticeTabIndex();
	var tabWidth = (panelWidth - 20) / tabs.length;
	ctx.font = "bold 11px system-ui";
	tabs.forEach(function (tab, index) {
		var tabX = panelX + 10 + index * tabWidth;
		ctx.fillStyle = index === activeTab ? "#f2c46d" : "rgba(70, 56, 44, 0.8)";
		ctx.fillRect(tabX, panelY + 42, tabWidth - 3, 25);
		ctx.fillStyle = index === activeTab ? "#4a2911" : "#d2c2ae";
		ctx.textAlign = "center";
		ctx.fillText(tab, tabX + (tabWidth - 3) / 2, panelY + 55);
	});
	var messages = systemNotice.items[systemNotice.tab] || [];
	// Keep the list above the footer so the navigation hint never overlaps content.
	var visibleCount = 4;
	var contentTop = panelY + 92;
	var footerY = panelY + panelHeight - 18;
	var pageY = footerY - 16;
	var rowX = panelX + 14;
	var rowWidth = panelWidth - 28;
	var rowHeight = 22;
	var maxScroll = Math.max(0, messages.length - visibleCount);
	systemNotice.scroll = Math.min(systemNotice.scroll, maxScroll);
	ctx.textAlign = "left";
	ctx.fillStyle = "#fff3d1";
	ctx.font = "13px system-ui";
	if (messages.length === 0) {
		ctx.fillStyle = "#b9a995";
		var emptyText = systemNotice.loading[systemNotice.tab]
			? "正在加载新闻..."
			: (systemNotice.errors[systemNotice.tab] || "暂无新闻");
		ctx.fillText(emptyText, panelX + 18, contentTop);
		if (systemNotice.errors[systemNotice.tab]) {
			ctx.textAlign = "right";
			ctx.fillText("点击当前标签重试", panelX + panelWidth - 18, contentTop);
			ctx.textAlign = "left";
		}
	} else {
		var visibleMessages = messages.slice(systemNotice.scroll, systemNotice.scroll + visibleCount);
		visibleMessages.forEach(function (message, index) {
			var title = message.title || message.content || "";
			var lines = wrapText(title, panelWidth - 36);
			var rowTop = contentTop + index * 25 - 15;
			var y = rowTop + rowHeight / 2;
			ctx.fillStyle = index % 2 === 0 ? "rgba(70, 56, 44, 0.42)" : "rgba(50, 40, 34, 0.42)";
			ctx.fillRect(rowX, rowTop, rowWidth, rowHeight);
			if (systemNotice.selectedIndex === systemNotice.scroll + index) {
				ctx.strokeStyle = UI_THEME.accent;
				ctx.lineWidth = 1;
				ctx.strokeRect(rowX, rowTop, rowWidth, rowHeight);
			}
			ctx.fillStyle = "rgba(242, 196, 109, 0.18)";
			ctx.fillRect(rowX, rowTop + rowHeight - 1, rowWidth, 1);
			ctx.fillStyle = index === visibleMessages.length - 1 && systemNotice.scroll === maxScroll ? "#fff3d1" : "#d2c2ae";
			ctx.textBaseline = "middle";
			ctx.fillText(truncateText(lines[0] || "", rowWidth - 16), rowX + 8, y);
			if (lines.length > 1) ctx.fillText("...", rowX + rowWidth - 16, y);
		});
		ctx.fillStyle = "rgba(30, 24, 20, 0.9)";
		ctx.fillRect(panelX + 1, footerY - 8, panelWidth - 2, 18);
		ctx.fillStyle = "#9f8b76";
		ctx.font = "10px " + UI_THEME.font;
		ctx.textAlign = "right";
		ctx.fillText((systemNotice.scroll + 1) + "-" + Math.min(systemNotice.scroll + visibleCount, messages.length) + " / " + messages.length, panelX + panelWidth - 18, pageY);
		if (maxScroll > 0) {
			var trackX = panelX + panelWidth - 12;
			var trackY = panelY + 54;
			var trackHeight = panelHeight - 108;
			var thumbHeight = Math.max(22, trackHeight * visibleCount / messages.length);
			var thumbY = trackY + (trackHeight - thumbHeight) * (systemNotice.scroll / maxScroll);
			ctx.fillStyle = "rgba(242, 196, 109, 0.22)";
			ctx.fillRect(trackX, trackY, 4, trackHeight);
			ctx.fillStyle = UI_THEME.accent;
			ctx.fillRect(trackX - 1, thumbY, 6, thumbHeight);
			ctx.fillStyle = UI_THEME.muted;
			ctx.textAlign = "center";
			ctx.font = "11px " + UI_THEME.font;
			if (systemNotice.scroll > 0) ctx.fillText("▲", trackX + 2, trackY - 10);
			if (systemNotice.scroll < maxScroll) ctx.fillText("▼", trackX + 2, trackY + trackHeight + 13);
		}
	}
	ctx.fillStyle = "rgba(242, 196, 109, 0.12)";
	ctx.fillRect(panelX + 1, footerY - 8, panelWidth - 2, 18);
	ctx.fillStyle = UI_THEME.muted;
	ctx.font = "10px " + UI_THEME.font;
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillText(messages.length > visibleCount ? "←→ 切换 · ↑↓ 滚动 · ESC 关闭" : "←→ 切换 · ESC 关闭", panelX + 18, footerY);
}

function isPointInMogHint(x, y) {
	return x >= 20 && x <= 248 && y >= canvas.height - 58 && y <= canvas.height - 16;
}

function isPointInMogWindow(x, y) {
	return x >= 54 && x <= canvas.width - 54 && y >= 48 && y <= 348;
}

function drawMessageDetail(message) {
	if (!message) return;
	var panelX = 38;
	var panelY = 48;
	var panelWidth = canvas.width - 76;
	var panelHeight = canvas.height - 96;
	var userId = message.legacy_user_id;
	var username = messageBook.userCache[userId] || "匿名用户";
	var avatar = messageBook.avatarImages[userId];
	var content = String(message.message || "");
	var lines;

	ctx.fillStyle = "rgba(15, 10, 8, 0.78)";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	drawRoundedPanel(panelX, panelY, panelWidth, panelHeight, UI_THEME.panel, UI_THEME.border);
	drawAvatar(avatar, panelX + 16, panelY + 16, 48);
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.fillStyle = UI_THEME.text;
	ctx.font = "bold 15px " + UI_THEME.font;
	ctx.fillText(truncateText(username, panelWidth - 110), panelX + 76, panelY + 19);
	ctx.fillStyle = UI_THEME.muted;
	ctx.font = "11px " + UI_THEME.font;
	ctx.fillText(truncateText(message.created_at ? new Date(message.created_at).toLocaleString() : "未知时间", panelWidth - 110), panelX + 76, panelY + 42);
	ctx.strokeStyle = "#6f5435";
	ctx.beginPath();
	ctx.moveTo(panelX + 16, panelY + 78);
	ctx.lineTo(panelX + panelWidth - 16, panelY + 78);
	ctx.stroke();

	ctx.font = "13px " + UI_THEME.font;
	lines = wrapText(content, panelWidth - 32);
	var visibleLines = Math.max(1, Math.floor((panelHeight - 122) / 20));
	var maxScroll = Math.max(0, lines.length - visibleLines);
	messageBook.detailScroll = Math.min(messageBook.detailScroll, maxScroll);
	ctx.fillStyle = UI_THEME.text;
	for (var i = 0; i < visibleLines; i++) {
		if (lines[i + messageBook.detailScroll] !== undefined) {
			ctx.fillText(lines[i + messageBook.detailScroll], panelX + 16, panelY + 96 + i * 20);
		}
	}
	ctx.fillStyle = UI_THEME.muted;
	ctx.font = "10px " + UI_THEME.font;
	ctx.textAlign = "center";
	ctx.fillText("↑↓ 阅读 · Enter / ESC 返回列表", canvas.width / 2, panelY + panelHeight - 16);
}

// The main game loop
var main = function (then) {
	var fixedStep = 1 / 60;
	var frameSeconds;
	var updates = 0;
	// Draw loading screen if still loading
	if (resources.loading) {
		drawLoadingScreen();
		requestAnimationFrame(function() {
			main(then);
		});
		return;
	}
	
	// Update resource references
	if (!bgReady && resources.images.bgImage.ready) {
		bgImage = resources.images.bgImage.image;
		bgReady = true;
	}
	
	if (!bgFarReady && resources.images.bgFarImage.ready) {
		bgFarImage = resources.images.bgFarImage.image;
		bgFarReady = true;
	}
	
	if (!bgFarBlockReady && resources.images.bgFarBlockImage.ready) {
		bgFarBlockImage = resources.images.bgFarBlockImage.image;
		bgFarBlockReady = true;
	}
	
	if (!bgIndoorReady && resources.images.bgIndoorImage.ready) {
		bgIndoorImage = resources.images.bgIndoorImage.image;
		bgIndoorReady = true;
	}
	
	if (!bgIndoorBlockReady && resources.images.bgIndoorBlockImage.ready) {
		bgIndoorBlockImage = resources.images.bgIndoorBlockImage.image;
		bgIndoorBlockReady = true;
	}
	
	if (!heroReady && resources.images.heroImage.ready) {
		heroImage = resources.images.heroImage.image;
		heroReady = true;
	}
	
	var now = (window.performance && window.performance.now) ? window.performance.now() : Date.now();
	var delta = Math.min(now - then, 50);
	frameSeconds = delta / 1000;
	main.accumulator = (main.accumulator || 0) + frameSeconds;
	while (main.accumulator >= fixedStep && updates < 4) {
		update(fixedStep);
		main.accumulator -= fixedStep;
		updates++;
	}
	render();
	
	// Request to do this again ASAP
	requestAnimationFrame(function() {
		main(now);
	});
};

// Cross-browser support for requestAnimationFrame
var w = window;
requestAnimationFrame = w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.msRequestAnimationFrame || w.mozRequestAnimationFrame;

// Initialize character images loading
loadCharacterImages();
