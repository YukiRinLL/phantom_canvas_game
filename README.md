# Phantom Canvas Chat Room

A Canvas-based online chat room game where characters appear and move based on real-time chat messages from an API.

## Features

- **Real-time Chat Integration**: Fetches and displays chat messages from `https://phantoms-backend.onrender.com/onebot/latest/text`
- **Character System**: 
  - NPC characters with random images from job categories (Healer, Magical Ranged DPS, Melee DPS, Physical Ranged DPS, Tank)
  - Hero character that can be controlled with keyboard
  - All characters rendered at 52x60 pixels
- **Movement System**: 
  - NPCs move in either range-bound or free-roaming modes
  - Characters face the direction they're moving
  - Collision detection between NPCs (hero can pass through)
  - Idle/moving states for more natural behavior
- **Chat Bubbles**: 
  - Display messages above characters
  - Multiple bubbles per character
  - Text truncation for long messages
  - Fade effects for smooth transitions
- **Visual Effects**: 
  - Image flipping based on movement direction
  - Fade-in/out effects for characters and bubbles
  - Transparent chat bubbles

## Technical Details

- **Canvas API**: For rendering characters, backgrounds, and chat bubbles
- **JavaScript Game Loop**: Using `requestAnimationFrame` for smooth animation
- **Fetch API**: For retrieving chat messages
- **Collision Detection**: Prevents NPCs from stacking too much
- **Animation System**: Uses alpha values for fade effects and state transitions

## Setup Instructions

1. **Clone or download** the project files to your local machine

2. **Start a local server**:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Python 2
   python -m SimpleHTTPServer 8000
   
   # Using Node.js (if available)
   npx http-server -p 8000
   ```

3. **Open your browser** and navigate to:
   ```
   http://localhost:8000
   ```

## Controls

- **Arrow Keys**: Move the Hero character around the scene
  - Left/Right: Move horizontally and change facing direction
  - Up/Down: Move vertically

## API Information

The game fetches chat messages from:
- **Endpoint**: `https://phantoms-backend.onrender.com/onebot/latest/text`
- **Method**: GET
- **Frequency**: Every 5 seconds

### Message Format

The API returns messages in the following format:

```json
[
  {
    "userId": "123456789",
    "message": "Hello world!"
  },
  {
    "userId": "987654321",
    "message": "How are you?"
  }
]
```

## Project Structure

```
phantom_canvas_game/
├── index.html          # Main HTML file
├── js/
│   └── game.js         # Core game logic
├── images/
│   ├── background.png  # Background image
│   ├── hero.png        # Hero character image
│   └── jobs/           # NPC character images by job category
│       ├── Healer/
│       ├── Magical Ranged DPS/
│       ├── Melee DPS/
│       ├── Physical Ranged DPS/
│       └── Tank/
└── README.md           # This file
```

## Key Features Explained

### Character System
- Each chat message from a unique `userId` spawns a character
- NPCs use random images from the available job categories
- The Hero character is associated with a specific `userId` (3146672611)
- Characters fade in when they appear and fade out when they leave

### Movement System
- **Range Mode**: NPCs move within a defined area around their spawn point
- **Free Mode**: NPCs move freely around the entire map
- **Idle/Moving States**: NPCs alternate between idle (5-15 seconds) and moving (2-5 seconds)
- **Collision Detection**: NPCs can overlap slightly (10px) but not stack completely

### Chat Bubbles
- Displayed above characters' heads
- Multiple bubbles per character (newest at bottom)
- Text truncated to "..." for long messages
- Fade out after 30 seconds
- Move with characters as they walk

## Browser Compatibility

The game should work in all modern browsers that support:
- HTML5 Canvas
- JavaScript ES5+
- Fetch API

## Troubleshooting

### Common Issues

1. **No characters appear**: Check if the API endpoint is accessible and returning valid data
2. **Characters not moving**: Ensure the game loop is running properly
3. **Images not loading**: Verify the image paths are correct and files exist

### Debugging

- Open browser developer tools (F12)
- Check the Console tab for error messages
- Verify network requests to the API endpoint

## License

This project is open source and available for modification and distribution.

## Acknowledgments

- Character images from various job categories
- Canvas API for rendering
- Fetch API for data retrieval
- JavaScript game development techniques