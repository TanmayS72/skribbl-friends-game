# DoodleDash 🎨

> A premium, modern real-time multiplayer drawing and guessing game inspired by Skribbl.io, engineered with React, TypeScript, Tailwind CSS, Node.js, and Socket.IO.

---

## 🌟 Key Features

- **Real-Time Multiplayer**: Low-latency drawing and chat synchronization powered by Socket.IO.
- **Private Room System**: Unique 6-character room codes (`EJCHV4`), 1-click shareable invitation links (`?room=CODE`), host controls (kick, settings, transfer host).
- **Advanced Drawing Engine**:
  - Virtual coordinate resolution (1200x800) for uniform rendering across all mobile, tablet, and desktop screens.
  - Tools: Pencil, Smooth Brush (midpoint quadratic interpolation), Eraser, Line, Rectangle, Circle, and 32-bit Scanline BFS Flood Fill.
  - 16 curated gamer colors + native hex color picker.
  - 5 discrete brush sizes (XS, S, M, L, XL).
  - Undo and Clear canvas actions.
- **Mobile & Touch Native**:
  - Pointer Events API with `touch-action: none` prevents accidental page zooming, scrolling, or pull-to-refresh.
  - Dedicated mobile layout with maximum canvas visibility, collapsible chat drawer, and player sheet.
- **Word Bank & Progressive Hints**:
  - 1,200+ words across 12 categories (Animals, Food, Tech, Movies, Sports, etc.).
  - Host can specify custom words or play custom-words-only mode.
  - Dynamic hint system periodically reveals letters based on elapsed drawing time.
  - "You are so close!" fuzzy Levenshtein distance detection.
- **Authoritative Scoring & State Machine**:
  - Server-calculated time decay points, rank bonus (up to 500 pts for 1st guesser), and drawer participation points.
- **Victory Podium & Instant Rematch**:
  - Confetti explosion and 3D podium for top 3 winners.
  - Rematch preserves room members and invitation links.
- **Zero-Dependency Sound Engine**:
  - Synthesized Web Audio API sound effects for correct guesses, round starts, countdown ticks, and game over fanfares (no external MP3 asset failures).
- **Solo Practice Mode**:
  - Playable solo drawing practice against a countdown timer with random prompt generator.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
# In server directory:
cd server
npm install

# In client directory:
cd ../client
npm install
```

### 2. Run in Development Mode
You can run the server and client concurrently or in separate terminals:

**Terminal 1 (Backend - Port 4000):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend - Port 5173):**
```bash
cd client
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser!

### 3. Production Build & Unified Run
You can also compile both frontend and backend and run them from a single unified server:
```bash
# Build client and server
npm run build

# Start unified server on port 4000
npm start
```
Then navigate to [http://localhost:4000](http://localhost:4000).

---

## 🧪 Testing

Run the automated 11-step multiplayer test suite:
```bash
# Ensure server is running or run:
node server/test-multiplayer.js
```

---

## 📂 Project Architecture

```
scribble/
├── client/                     # Frontend (React 18, Vite, TypeScript, Tailwind)
│   ├── src/
│   │   ├── audio/              # Web Audio API Synthesizer (SoundEngine)
│   │   ├── components/
│   │   │   ├── common/         # Navbar, theme toggles, buttons
│   │   │   ├── landing/        # ProfileCard, JoinModal, HowToPlayModal
│   │   │   ├── lobby/          # LobbyView, GameSettingsModal
│   │   │   ├── game/           # DrawingCanvas, DrawingToolbar, WordHintBar, ChatBox, PlayerSidebar, MobileGameLayout
│   │   │   └── results/        # ResultsView, Podium, Confetti
│   │   ├── context/            # GameContext (Socket.IO client state)
│   │   ├── drawing/            # DrawingEngine (Virtual 1200x800 resolution, Flood Fill, Smoothing)
│   │   ├── pages/              # HomePage, PracticePage
│   │   └── types/              # Game & event types
├── server/                     # Backend (Node.js, Express, Socket.IO, TypeScript)
│   ├── src/
│   │   ├── game/               # GameEngine, HintSystem, ScoringSystem, WordManager
│   │   ├── rooms/              # RoomManager, Room model
│   │   ├── socket/             # Socket event handlers
│   │   ├── utils/              # Word database (12 categories), sanitizers
│   │   └── index.ts            # Express + Socket.IO server entry point
│   └── test-multiplayer.js     # Automated multi-client test suite
├── DEVELOPMENT.md              # Phase tracking & testing verification log
└── package.json                # Monorepo scripts
```
