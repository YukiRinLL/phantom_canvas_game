# Phantom Canvas

一个由实时聊天驱动的 Canvas 游戏实验项目。当前版本保留原 demo 的教堂场景、NPC、场景切换、碰撞、留言簿和调试能力，同时增加可配置、可测试的工程基础。

## 快速开始

项目是无构建依赖的原生 Web 应用，建议使用 Node 18+。

```bash
npx serve .
# 或 python -m http.server 8000
```

推荐通过环境变量生成浏览器运行时配置：

```bash
copy .env.example .env
npm run config
npx serve .
```

Windows PowerShell 也可以直接设置当前终端的环境变量：

`npm run dev` 会先生成配置再启动静态服务器。配置优先级为：当前进程环境变量 > 根目录 `.env` > 本地 `config.local.js` > 代码默认值。生成器会读取 `.env` 文件，PowerShell 中也可以直接设置当前终端环境变量：

```powershell
$env:PHANTOM_SUPABASE_ANON_KEY = "你的 anon key"
npm run dev
```

注意：前端项目的环境变量会在生成阶段写入 `js/config.runtime.js` 并发送给浏览器。Supabase anon key 只能依靠 Supabase RLS 限制权限，不能当作服务器私密凭据。

然后访问 `http://localhost:3000`（或 Python server 使用的端口）。

留言簿中使用 `↑↓` 选择留言，按 `Enter` 打开当前留言的完整内容；详情页中使用 `↑↓` 阅读，按 `Enter` 或 `ESC` 返回列表。

校验源码和运行单元测试：

```bash
npm run check
npm test
```

## 配置

默认聊天接口仍为 `https://phantoms-backend.onrender.com/onebot/latest/text`。可用 URL 参数覆盖：

`?chatApi=https%3A%2F%2Fexample.test%2Fchat&messagesApi=https%3A%2F%2Fexample.test%2Fmessages&usersApi=https%3A%2F%2Fexample.test%2Fusers`

留言簿接口已按主站参考页面迁移到统一的 `APP_CONFIG` / `getSupabaseConfig()` 配置方式，使用同一个 Supabase 项目和 `messages`、`users` 表。Supabase anon key 不再硬编码到源码，请复制本地配置模板：

```bash
copy js\config.local.example.js js\config.local.js
```

然后在 `js/config.local.js` 中设置 `APP_CONFIG.ANON_KEY`。该文件已加入 `.gitignore`，不会被提交。游戏现在会像参考页面一样发送 `apikey`、`Authorization`、`Prefer` 和 `Content-Type` 请求头；如果 Supabase 项目的匿名读取策略不允许匿名访问，接口会返回 401/403，此时需要配置 anon key 或使用后端代理。

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
- **Fetch API**: For retrieving chat messages, with timeout and response validation
- **Collision Detection**: Prevents NPCs from stacking too much
- **Animation System**: Uses alpha values for fade effects and state transitions
- **Runtime safety**: Clamped frame delta, malformed response handling, optional asset fallback, no infinite loading retry

## 工程结构

```
index.html              页面宿主和可访问性入口
css/game.css            响应式布局和运行时状态样式
js/config.js            环境无关的运行时配置
js/engine-utils.js      可独立测试的引擎纯工具
js/game.js              当前 Canvas 游戏运行时
js/engine/              AssetManager、InputSystem、NetworkAdapter、SceneManager、TransitionSystem、EntitySystem、Renderer
test/                   Node 内置测试
```

引擎模块通过浏览器全局命名空间提供基础服务，`game.js` 仅负责当前 demo 的场景规则和组合。新增功能应优先扩展对应模块，而不是继续增加全局工具函数。

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
