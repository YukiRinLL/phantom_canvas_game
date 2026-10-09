// The host page owns the canvas so the renderer remains embeddable and responsive.
var canvas = document.getElementById("game-canvas") || document.createElement("canvas");
var ctx = canvas.getContext("2d");
var appConfig = window.APP_CONFIG;
var gameConfig = appConfig.GAME;
var renderer = new PhantomRenderer(ctx);
PhantomInputSystem.init(window);
canvas.width = gameConfig.canvas.width;
canvas.height = gameConfig.canvas.height;
var runtimeStatus = document.getElementById("runtime-status");
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
var systemNotice = {
	visible: false,
	button: { x: 464, y: 5, width: 42, height: 24 },
	scroll: 0
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
	if (messageBook && messageBook.visible && !messageBook.detailVisible) {
		openMessageDetailAtPoint(x, y);
	}
});

function reportStatus(message, isError) {
	if (runtimeStatus) {
		runtimeStatus.textContent = message || "";
		runtimeStatus.style.color = isError ? "#ff8a8a" : "#ffd166";
	}
	if (isError) console.warn("[Phantom] " + message);
}

function toggleSystemNotice() {
	if (messageBook && messageBook.visible) return;
	systemNotice.visible = !systemNotice.visible;
	systemNotice.scroll = 0;
}

// Debug mode keyboard toggle (F12 key)
addEventListener("keydown", function (e) {
	if (e.keyCode === 123) { // F12 key
		e.preventDefault(); // Prevent default browser action (dev tools)
		debugMode = !debugMode;
		console.log("Debug mode " + (debugMode ? "enabled" : "disabled"));
		// Show debug mode status on screen briefly
		showDebugStatus("Debug Mode: " + (debugMode ? "ON" : "OFF"));
	}
}, false);

// Function to show debug status message
function showDebugStatus(message) {
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
	}, 2000);
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
		}
	},
	
	// Character images (loaded later)
	characterImages: {
		ready: false,
		count: 0,
		total: 0
	},
	
	// Loading status
	loading: true,
	loadCount: 0,
	totalToLoad: 0,
	loadLog: [],
	
	// Initialize resource loading
	init: function() {
		// Calculate total resources to load
		this.totalToLoad = Object.keys(this.images).length;
		
		// Start loading images
		for (var key in this.images) {
			this.loadImage(key);
		}
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
			
			if (allImagesLoaded) {
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
				this.loading = false;
				setTimeout(startGame, 0);
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
	{ id: "close-to-far", from: "close", to: "far", label: "前往远景", rect: { left: 0, top: 380, right: canvas.width, bottom: canvas.height }, spawn: { x: canvas.width / 2 - 26, y: 300 } },
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
		// Top wall (1/5 of screen height)
		{
			top: 0,
			bottom: canvas.height / 5, // 1/5 height
			left: 0,
			right: canvas.width
		}
	],
	far: [
		// Add far scene walls here if needed
		{
			top: 200,
			bottom: 320,
			left: 190,
			right: 320
		}
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

		// 右侧管风琴
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
	var maxX = (currentScene === "indoor" ? sceneBoundaries.indoor.width : canvas.width) - wallSize - heroGeometry.width;
	var maxY = (currentScene === "indoor" ? sceneBoundaries.indoor.height : canvas.height) - wallSize - heroGeometry.height;
	var collision;
	var collisionGeometry = getHeroCollisionGeometry();
	// Keep the visual role inside the scene, while collision uses its foot box.
	hero.x = Math.max(wallSize - collisionGeometry.x, Math.min(maxX, nextX));
	hero.y = Math.max(wallSize - collisionGeometry.y, Math.min(maxY, nextY));
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
							facingRight: true // Initialize facing direction
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
	if (!messageBook.visible) {
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
	}

	// Handle message book navigation
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
		} else if (keysDown[38]) {
			systemNotice.scroll = Math.max(0, systemNotice.scroll - 1);
			delete keysDown[38];
		} else if (keysDown[40]) {
			systemNotice.scroll++;
			delete keysDown[40];
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
		if (heroReady) {
			ctx.globalAlpha = hero.alpha;
			renderer.groundShadow(hero.x, hero.y + heroGeometry.height - 8, heroGeometry.width, 8, hero.alpha * 0.3);

			ctx.save();
			drawHeroSprite(hero.x, hero.y, hero.facingRight === true);
			ctx.restore();
			ctx.globalAlpha = 1;
		}
	}

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
				character.messages.forEach(function (msg, index) {
					if (msg.alpha > 0) {
						ctx.globalAlpha = msg.alpha;
						// Position bubbles above each other (newest at bottom)
						var bubbleIndex = character.messages.length - 1 - index;
						ctx.save();
						if (currentScene === "indoor") {
							// Apply camera and zoom for indoor scene
							ctx.translate(-camera.x, -camera.y);
							ctx.scale(indoorZoom, indoorZoom);
						}
						drawChatBubble(character.x + 32, character.y - 18 - (bubbleIndex * 50), msg.content);
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
		
		// Draw flash animation for lectern
		ctx.save();
		ctx.translate(-camera.x, -camera.y);
		ctx.scale(indoorZoom, indoorZoom);
		ctx.globalAlpha = lectern.flashAlpha * 0.8;
		ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
		ctx.beginPath();
		ctx.arc(lectern.x + lectern.width / 2, lectern.y + lectern.height / 2, 2, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		ctx.globalAlpha = 1;
		
		// Draw interact hint
		if (lectern.showHint) {
			ctx.save();
			ctx.fillStyle = UI_THEME.panel;
			ctx.fillRect(20, canvas.height - 60, 200, 40);
			ctx.fillStyle = UI_THEME.text;
			ctx.font = "14px " + UI_THEME.font;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("按 F 键互动", 120, canvas.height - 40);
			ctx.restore();
		}
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
		ctx.fillText("PHANTOM ARCHIVE", canvas.width / 2, bookY + 51);
		
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
function drawChatBubble(x, y, text) {
	ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
	ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
	ctx.lineWidth = 2;
	// Calculate text width
	ctx.font = "12px Helvetica";
	var padding = 4; // padding
	var maxBubbleWidth = Math.min(180, canvas.width - 20);
	var lineHeight = 14;
	var maxLines = 3;
	var bubbleX = x;
	var bubbleY = Math.max(0, y);
	var displayText = text;
	var lines = wrapText(displayText, maxBubbleWidth - padding * 2);
	var truncated = lines.length > maxLines;
	if (truncated) lines = lines.slice(0, maxLines);
	if (truncated) lines[maxLines - 1] = truncateText(lines[maxLines - 1], maxBubbleWidth - padding * 2);
	var textWidth = lines.reduce(function (width, line) { return Math.max(width, ctx.measureText(line).width); }, 0);
	var bubbleWidth = Math.min(maxBubbleWidth, textWidth + padding * 2);
	var bubbleHeight = lines.length * lineHeight + padding * 2;
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
	ctx.fillStyle = "#f2c46d";
	ctx.font = "bold 16px system-ui";
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.fillText("通知提示", panelX + 18, panelY + 16);
	ctx.fillStyle = "#b9a995";
	ctx.font = "11px system-ui";
	ctx.textAlign = "right";
	ctx.fillText("P / ESC 关闭", panelX + panelWidth - 18, panelY + 20);

	var messages = hero.notificationHistory;
	var visibleCount = 5;
	var maxScroll = Math.max(0, messages.length - visibleCount);
	systemNotice.scroll = Math.min(systemNotice.scroll, maxScroll);
	ctx.textAlign = "left";
	ctx.fillStyle = "#fff3d1";
	ctx.font = "13px system-ui";
	if (messages.length === 0) {
		ctx.fillStyle = "#b9a995";
		ctx.fillText("暂无新的主角消息", panelX + 18, panelY + 70);
	} else {
		var visibleMessages = messages.slice(systemNotice.scroll, systemNotice.scroll + visibleCount);
		visibleMessages.forEach(function (message, index) {
			var lines = wrapText(message.content, panelWidth - 36);
			var y = panelY + 64 + index * 26;
			ctx.fillStyle = index === visibleMessages.length - 1 && systemNotice.scroll === maxScroll ? "#fff3d1" : "#d2c2ae";
			ctx.fillText(truncateText(lines[0] || "", panelWidth - 36), panelX + 18, y);
			if (lines.length > 1) ctx.fillText("...", panelX + panelWidth - 36, y + 13);
		});
		ctx.fillStyle = "#9f8b76";
		ctx.font = "10px " + UI_THEME.font;
		ctx.textAlign = "right";
		ctx.fillText((systemNotice.scroll + 1) + "-" + Math.min(systemNotice.scroll + visibleCount, messages.length) + " / " + messages.length, panelX + panelWidth - 18, panelY + panelHeight - 18);
		if (maxScroll > 0) {
			var trackX = panelX + panelWidth - 12;
			var trackY = panelY + 54;
			var trackHeight = panelHeight - 86;
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
	ctx.fillStyle = UI_THEME.muted;
	ctx.font = "10px " + UI_THEME.font;
	ctx.textAlign = "left";
	ctx.fillText(messages.length > visibleCount ? "↑↓ 滚动 · ESC 关闭" : "ESC 关闭", panelX + 18, panelY + panelHeight - 18);
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
