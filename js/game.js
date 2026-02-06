// Create the canvas
var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");
canvas.width = 512;
canvas.height = 480;
document.body.appendChild(canvas);

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

// Background image
var bgReady = false;
var bgImage = new Image();
bgImage.onload = function () {
	bgReady = true;
	console.log("✓ Loaded close background image");
};
bgImage.onerror = function () {
	console.log("✗ Failed to load local church-close.png, trying remote...");
	// Try remote URL if local fails
	bgImage.src = "https://dlink.host/wx3.sinaimg.cn/large/006fhRoTly8i9ykaj3dcsj30u00u00xc.jpg";
};
console.log("Loading close background from local file...");
bgImage.src = "images/church-close.png";

// Far background image
var bgFarReady = false;
var bgFarImage = new Image();
bgFarImage.onload = function () {
	bgFarReady = true;
	console.log("✓ Loaded far background image");
};
bgFarImage.onerror = function () {
	console.log("✗ Failed to load local church-far.png, trying remote...");
	// Try remote URL if local fails
	bgFarImage.src = "https://dlink.host/wx1.sinaimg.cn/large/006fhRoTly8i9ykaqhl08j30u00u0n2m.jpg";
};
console.log("Loading far background from local file...");
bgFarImage.src = "images/church-far.png";

// Far foreground image (blocks)
var bgFarBlockReady = false;
var bgFarBlockImage = new Image();
bgFarBlockImage.onload = function () {
	bgFarBlockReady = true;
	console.log("✓ Loaded far block image from local");
};
bgFarBlockImage.onerror = function () {
	console.log("✗ Failed to load local church-far-block.png");
};
console.log("Loading far block from local file...");
bgFarBlockImage.src = "images/church-far-block.png";

// Indoor scene image
var bgIndoorReady = false;
var bgIndoorImage = new Image();
bgIndoorImage.onload = function () {
	bgIndoorReady = true;
	console.log("✓ Loaded indoor scene image");
};
bgIndoorImage.onerror = function () {
	console.log("✗ Failed to load local church-indoor.png, trying remote...");
	// Try remote URL if local fails
	bgIndoorImage.src = "https://dlink.host/wx4.sinaimg.cn/large/006fhRoTly8i9ykaqhl08j30u00u0n2m.jpg";
};
console.log("Loading indoor scene from local file...");
bgIndoorImage.src = "images/church-indoor.png";

// Indoor foreground image (blocks)
var bgIndoorBlockReady = false;
var bgIndoorBlockImage = new Image();
bgIndoorBlockImage.onload = function () {
	bgIndoorBlockReady = true;
	console.log("✓ Loaded indoor block image from local");
};
bgIndoorBlockImage.onerror = function () {
	console.log("✗ Failed to load local church-indoor-block.png");
};
console.log("Loading indoor block from local file...");
bgIndoorBlockImage.src = "images/church-indoor-block.png";

// Scene management
var currentScene = "close"; // "close", "far", or "indoor"
var sceneTransitioning = false; // Prevent multiple transitions at once
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
	messages: [
		{ user: "勇者", text: "愿圣光指引你的道路！" },
		{ user: "旅行者", text: "这里的教堂很安静..." },
		{ user: "牧师", text: "请保持虔诚的心。" },
		{ user: "骑士", text: "为了国王和国家！" }
	],
	selectedIndex: 0
};

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
var characters = {};
var characterImages = {};
var imagePaths = [];
var availableImagePaths = [];

// Hero image
var heroReady = false;
var heroImage = new Image();
heroImage.onload = function () {
	heroReady = true;
};
heroImage.src = "images/hero.png";

// Hero object
var hero = {
	speed: 256, // movement in pixels per second
	x: canvas.width / 2,
	y: canvas.height / 2,
	alpha: 1,
	messages: [], // Array of messages for hero
	userId: "3146672611", // Specific user ID for hero
	facingRight: true // Initialize facing direction
};

// Handle keyboard controls
var keysDown = {};
addEventListener("keydown", function (e) {
	keysDown[e.keyCode] = true;
}, false);
addEventListener("keyup", function (e) {
	delete keysDown[e.keyCode];
}, false);

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
	if (currentScene === "indoor") {
		ctx.translate(-camera.x, -camera.y);
		ctx.scale(indoorZoom, indoorZoom);
	}
	var feetY = hero.y + 60 - 2; // Hero height is 60
	ctx.strokeStyle = "rgba(0, 255, 0, 0.7)";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(hero.x, feetY);
	ctx.lineTo(hero.x + 52, feetY); // Hero width is 52
	ctx.stroke();
	ctx.restore();
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
		};
		characterImages[imageName].image.src = path;
	});
}

// Fetch chat messages
function fetchChatMessages() {
	fetch('https://phantoms-backend.onrender.com/onebot/latest/text')
		.then(function (response) {
			return response.json();
		})
		.then(function (data) {
			processChatMessages(data);
		})
		.catch(function (error) {
			console.error('Error fetching chat messages:', error);
		});
}

// Process chat messages
function processChatMessages(messages) {
	// Save current messages as previous for comparison
	previousChatMessages = [...chatMessages];

	// Update chat messages
	chatMessages = messages;
	// Update characters based on messages
	updateCharacters();
}

// Parse message content
function parseMessageContent(message) {
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
					// Check if the new message would be "..."
					ctx.font = "12px Helvetica"; // Smaller font
					var textWidth = ctx.measureText(parsedMessage).width;
					var maxBubbleWidth = canvas.width - (characters[userId].x + 32) - 10;

					if (textWidth + 16 > maxBubbleWidth) {
						// Message would be "..."
						if (!hasEllipsis) {
							// Add new message with fade-in effect
							characters[userId].messages.push({
								content: "...",
								timeout: Date.now() + 30000, // 30 seconds
								alpha: 0, // Start with 0 for fade-in
								fadingIn: true
							});
						}
					} else {
						// Add new message with fade-in effect
						characters[userId].messages.push({
							content: parsedMessage,
							timeout: Date.now() + 30000, // 30 seconds
							alpha: 0, // Start with 0 for fade-in
							fadingIn: true
						});
					}
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
	var heroWidth = 52;
	var heroHeight = 60;
	var wallSize = 32;

	// Store original position for collision detection
	var originalX = hero.x;
	var originalY = hero.y;
	if (38 in keysDown || 87 in keysDown) { // Player holding up (arrow up or W)
		if (currentScene === "indoor") {
			hero.y = Math.max(wallSize, hero.y - hero.speed * modifier);
		} else {
			hero.y = Math.max(wallSize, hero.y - hero.speed * modifier);
		}
	}
	if (40 in keysDown || 83 in keysDown) { // Player holding down (arrow down or S)
		if (currentScene === "indoor") {
			hero.y = Math.min(sceneBoundaries.indoor.height - wallSize, hero.y + hero.speed * modifier);
		} else {
			hero.y = Math.min(canvas.height - wallSize, hero.y + hero.speed * modifier);
		}
	}
	if (37 in keysDown || 65 in keysDown) { // Player holding left (arrow left or A)
		if (currentScene === "indoor") {
			hero.x = Math.max(wallSize, hero.x - hero.speed * modifier);
		} else {
			hero.x = Math.max(wallSize, hero.x - hero.speed * modifier);
		}
		hero.facingRight = false; // Face left
	}
	if (39 in keysDown || 68 in keysDown) { // Player holding right (arrow right or D)
		if (currentScene === "indoor") {
			hero.x = Math.min(sceneBoundaries.indoor.width - wallSize, hero.x + hero.speed * modifier);
		} else {
			hero.x = Math.min(canvas.width - wallSize, hero.x + hero.speed * modifier);
		}
		hero.facingRight = true; // Face right
	}
	// Update camera for indoor scene
	if (currentScene === "indoor") {
		updateCamera();
	}
	// Check wall collision and revert if collision
	if (checkWallCollision(hero.x, hero.y, heroWidth, heroHeight)) {
		// Revert to original position
		hero.x = originalX;
		hero.y = originalY;
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
		if (currentScene === "close") {
			// Check for transition to far scene
			if (hero.y > sceneBoundaries.close.bottom) {
				// Switch to far scene
				sceneTransitioning = true;
				currentScene = "far";
				// Reset hero position to top of far scene (above transition area)
				hero.y = 300; // Top of screen
				// Update NPC positions for new scene
				updateNPCPositionsForScene();
				// Reset transition flag after a short delay
				setTimeout(function() {
					sceneTransitioning = false;
				}, 500);
			}
			// Check for transition to indoor scene (top center)
			else if (hero.y <= sceneBoundaries.close.top.bottom &&
				hero.y >= sceneBoundaries.close.top.top &&
				hero.x >= sceneBoundaries.close.top.left &&
				hero.x <= sceneBoundaries.close.top.right) {
				// Switch to indoor scene
				sceneTransitioning = true;
				currentScene = "indoor";
				// Reset hero position to middle of indoor scene
				hero.x = sceneBoundaries.indoor.width / 2 - 26;
				hero.y = sceneBoundaries.indoor.height - 100;
				// Update NPC positions for new scene
				updateNPCPositionsForScene();
				// Update camera bounds for indoor scene
				updateCameraBounds();
				// Reset transition flag after a short delay
				setTimeout(function() {
					sceneTransitioning = false;
				}, 500);
			}
		} else if (currentScene === "far"
			&& hero.y >= sceneBoundaries.far.top && hero.y <= sceneBoundaries.far.bottom
			&& hero.x >= sceneBoundaries.far.left && hero.x <= sceneBoundaries.far.right) {
			// Switch to close scene
			sceneTransitioning = true;
			currentScene = "close";
			// Reset hero position to bottom of close scene (above transition area)
			hero.y = 350; // Just above the bottom boundary
			// Update NPC positions for new scene
			updateNPCPositionsForScene();
			// Reset transition flag after a short delay
			setTimeout(function() {
				sceneTransitioning = false;
			}, 500);
		} else if (currentScene === "indoor" &&
			hero.y >= sceneBoundaries.indoor.bottom &&
			hero.x >= sceneBoundaries.indoor.left &&
			hero.x <= sceneBoundaries.indoor.right) {
			// Switch back to close scene from indoor
			sceneTransitioning = true;
			currentScene = "close";
			// Reset hero position to edge of indoor transition area (outside indoor entrance)
			hero.y = sceneBoundaries.close.top.bottom + 10; // Just below indoor transition area
			hero.x = (sceneBoundaries.close.top.left + sceneBoundaries.close.top.right) / 2 - 26; // Center horizontally
			// Update NPC positions for new scene
			updateNPCPositionsForScene();
			// Reset transition flag after a short delay
			setTimeout(function() {
					sceneTransitioning = false;
			}, 500);

		}
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
			// Clear F key press
			delete keysDown[70];
		}
	}

	// Handle message book navigation
	if (messageBook.visible) {
		if (keysDown[38]) { // Up arrow
			messageBook.selectedIndex = Math.max(0, messageBook.selectedIndex - 1);
			delete keysDown[38];
		} else if (keysDown[40]) { // Down arrow
			messageBook.selectedIndex = Math.min(messageBook.messages.length - 1, messageBook.selectedIndex + 1);
			delete keysDown[40];
		} else if (keysDown[27]) { // Escape key
			messageBook.visible = false;
			delete keysDown[27];
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
			ctx.fillStyle = "white";
			ctx.font = "16px Arial";
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

	// Draw debug info for image loading
	if (debugMode) {
		ctx.fillStyle = "white";
		ctx.font = "10px Arial";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText("Image Status:", 10, 70);
		ctx.fillText("Close: " + (bgReady ? "✓" : "✗"), 10, 85);
		ctx.fillText("Far: " + (bgFarReady ? "✓" : "✗"), 10, 100);
		ctx.fillText("Block: " + (bgFarBlockReady ? "✓" : "✗"), 10, 115);
		ctx.fillText("Indoor: " + (bgIndoorReady ? "✓" : "✗"), 10, 130);
		ctx.fillText("IndoorBlock: " + (bgIndoorBlockReady ? "✓" : "✗"), 10, 145);
		ctx.fillText("Current Scene: " + currentScene, 10, 160);
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

				ctx.save();
				if (hero.facingRight === true) {
					ctx.translate(hero.x + 26, hero.y);
					ctx.scale(-1, 1);
					var scale = 52 / 70;
					var cropY = (70 - 60/scale) / 2;
					ctx.drawImage(heroImage, 0, cropY, 70, 70 - cropY*2, -26, 0, 52, 60);
				} else {
					var scale = 52 / 70;
					var cropY = (70 - 60/scale) / 2;
					ctx.drawImage(heroImage, 0, cropY, 70, 70 - cropY*2, hero.x, hero.y, 52, 60);
				}
				ctx.restore();
				ctx.globalAlpha = 1;
			}
		}
	} else if (currentScene === "indoor") {
		// Draw hero in indoor scene (no NPCs)
		if (heroReady) {
			ctx.globalAlpha = hero.alpha;

			ctx.save();
			var screenX = (hero.x * indoorZoom) - camera.x;
			var screenY = (hero.y * indoorZoom) - camera.y;

			if (hero.facingRight === true) {
				ctx.translate(screenX + 26, screenY);
				ctx.scale(-1, 1);
				var scale = 52 / 70;
				var cropY = (70 - 60/scale) / 2;
				ctx.drawImage(heroImage, 0, cropY, 70, 70 - cropY*2, -26, 0, 52, 60);
			} else {
				var scale = 52 / 70;
				var cropY = (70 - 60/scale) / 2;
				ctx.drawImage(heroImage, 0, cropY, 70, 70 - cropY*2, screenX, screenY, 52, 60);
			}
			ctx.restore();
			ctx.globalAlpha = 1;
		}
	} else if (currentScene === "far") {
		// Draw hero in far scene
		if (heroReady) {
			ctx.globalAlpha = hero.alpha;

			ctx.save();
			if (hero.facingRight === true) {
				ctx.translate(hero.x + 26, hero.y);
				ctx.scale(-1, 1);
				var scale = 52 / 70;
				var cropY = (70 - 60/scale) / 2;
				ctx.drawImage(heroImage, 0, cropY, 70, 70 - cropY*2, -26, 0, 52, 60);
			} else {
				var scale = 52 / 70;
				var cropY = (70 - 60/scale) / 2;
				ctx.drawImage(heroImage, 0, cropY, 70, 70 - cropY*2, hero.x, hero.y, 52, 60);
			}
			ctx.restore();
			ctx.globalAlpha = 1;
		}
	}

	// Draw debug info for hero
	if (debugMode) {
			ctx.fillStyle = "white";
			ctx.font = "12px Arial";
			ctx.textAlign = "left";
			ctx.textBaseline = "top";
			ctx.fillText("Hero: x=" + Math.round(hero.x) + ", y=" + Math.round(hero.y), 10, 10);
			ctx.fillText("Scene: " + currentScene, 10, 25);
			ctx.fillText("HeroReady: " + heroReady, 10, 40);
			ctx.fillText("HeroAlpha: " + hero.alpha, 10, 55);
			if (currentScene === "indoor") {
				ctx.fillText("Camera: x=" + Math.round(camera.x) + ", y=" + Math.round(camera.y), 10, 70);
				ctx.fillText("Zoom: " + indoorZoom, 10, 85);
			}
			
			// Draw collision walls
			drawCollisionWalls();
			
			// Draw hero feet collision line
			drawHeroFeetCollision();
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
						drawChatBubble(character.x + 32, character.y - 18 - (bubbleIndex * 20), msg.content);
						ctx.restore();
						ctx.globalAlpha = 1;
					}
				});
			}
		}
	}

	// Draw hero's chat bubbles
	if (hero.messages) {
		hero.messages.forEach(function (msg, index) {
			if (msg.alpha > 0) {
				ctx.globalAlpha = msg.alpha;
				// Position bubbles above hero (newest at bottom)
				var bubbleIndex = hero.messages.length - 1 - index;
				ctx.save();
				if (currentScene === "indoor") {
					// Apply camera and zoom for indoor scene
					ctx.translate(-camera.x, -camera.y);
					ctx.scale(indoorZoom, indoorZoom);
				}
				drawChatBubble(hero.x + 32, hero.y - 18 - (bubbleIndex * 24), msg.content);
				ctx.restore();
				ctx.globalAlpha = 1;
			}
		});
	}

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
			ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
			ctx.fillRect(20, canvas.height - 60, 200, 40);
			ctx.fillStyle = "white";
			ctx.font = "14px Arial";
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
		
		// Draw book interface
		ctx.fillStyle = "#8B4513";
		ctx.fillRect(100, 80, 312, 320);
		ctx.fillStyle = "#F5DEB3";
		ctx.fillRect(110, 90, 292, 300);
		
		// Draw title
		ctx.fillStyle = "#8B4513";
		ctx.font = "16px Arial";
		ctx.textAlign = "center";
		ctx.fillText("留言簿", 256, 120);
		
		// Draw messages
		ctx.fillStyle = "#333";
		ctx.font = "14px Arial";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		
		messageBook.messages.forEach(function(msg, index) {
			var y = 150 + (index * 60);
			if (index === messageBook.selectedIndex) {
				ctx.fillStyle = "#E6E6FA";
				ctx.fillRect(120, y - 5, 272, 50);
				ctx.fillStyle = "#333";
			}
			ctx.fillText(msg.user + ":", 130, y);
			ctx.fillText(msg.text, 130, y + 20);
		});
		
		// Draw instructions
		ctx.fillStyle = "#666";
		ctx.font = "12px Arial";
		ctx.textAlign = "center";
		ctx.fillText("↑↓ 选择留言  |  ESC 关闭", 256, 400);
	}

	// Draw debug info for hero
	if (debugMode) {
		ctx.fillStyle = "white";
		ctx.font = "12px Arial";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText("Hero: x=" + Math.round(hero.x) + ", y=" + Math.round(hero.y), 10, 10);
		ctx.fillText("Scene: " + currentScene, 10, 25);
		ctx.fillText("HeroReady: " + heroReady, 10, 40);
		ctx.fillText("HeroAlpha: " + hero.alpha, 10, 55);
		if (currentScene === "indoor") {
			ctx.fillText("Camera: x=" + Math.round(camera.x) + ", y=" + Math.round(camera.y), 10, 70);
			ctx.fillText("Zoom: " + indoorZoom, 10, 85);
		}
		
		// Draw collision walls
		drawCollisionWalls();
		
		// Draw hero feet collision line
		drawHeroFeetCollision();
	}
};

// Draw chat bubble
function drawChatBubble(x, y, text) {
	ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
	ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
	ctx.lineWidth = 2;
	// Calculate text width
	ctx.font = "12px Helvetica"; // font
	var padding = 4; // padding
	var maxBubbleWidth = canvas.width - x - 10;
	var bubbleHeight = 20; // bubble height
	// Adjust position to avoid off-screen
	var bubbleX = Math.max(0, x);
	var bubbleY = Math.max(0, y);
	// Check if text is too long and replace with "..."
	var displayText = text;
	var textWidth = ctx.measureText(displayText).width;

	if (textWidth + padding * 2 > maxBubbleWidth) {
		displayText = "...";
		textWidth = ctx.measureText(displayText).width;
	}
	var bubbleWidth = textWidth + padding * 2;
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
	ctx.textBaseline = "middle";
	ctx.fillText(displayText, bubbleX + padding, bubbleY + bubbleHeight / 2);
}

// The main game loop
var main = function () {
	var now = Date.now();
	var delta = now - then;
	update(delta / 1000);
	render();
	then = now;
	// Request to do this again ASAP
	requestAnimationFrame(main);
};

// Cross-browser support for requestAnimationFrame
var w = window;
requestAnimationFrame = w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.msRequestAnimationFrame || w.mozRequestAnimationFrame;

// Let's start the chat room!
var then = Date.now();
loadCharacterImages();
// Fetch chat messages initially
// fetchChatMessages();
// Set up periodic fetching of chat messages
// setInterval(fetchChatMessages, 5000); // Every 5 seconds
main();