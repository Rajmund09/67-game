# 67 Game ⚡

> **A Kinetic Brutalist Speed Game** built for Festiwal Nauki UO 2026.  
> Players use real-time hand tracking to compete for the fastest alternating arm swings in 15 seconds.

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-8-purple?logo=vite)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Pose_Tracking-blue)
![Firebase](https://img.shields.io/badge/Firebase-Realtime_DB-orange?logo=firebase)

---

## 🎮 How It Works

1. **Camera Access**: Integrates **MediaPipe Pose Landmarker** to detect and track wrist positions via the webcam in real time.
2. **Calibration**: Requires 5 practice gestures to verify tracking accuracy and user positioning.
3. **Gameplay**: A rapid 15-second challenge demanding alternating left-high / right-high arm swings.
4. **Live Leaderboard**: Scores are synchronized to a **Firebase Realtime Database** for instant competitive feedback.
5. **Dynamic Certification**: Auto-generates a brutalist-style digital certificate featuring a QR code for easy sharing.

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| **Frontend Framework** | React 19, Vite 8 |
| **Pose Detection** | MediaPipe Tasks Vision (PoseLandmarker) |
| **Database & Auth** | Firebase Realtime Database |
| **Media Hosting** | ImgBB API |
| **Asset Generation** | jsPDF + Canvas API |
| **QR Code Engine** | qrcode.react |
| **Testing Suite** | Vitest + Testing Library |

## 📁 Architecture & Structure

```text
src/
├── components/          # Modular React components (Camera, UI, Admin, Particles)
├── hooks/               # Custom React hooks (Live subscription, Layout algorithms)
├── styles/              # Scoped CSS architecture (Variables, layout, animations)
├── test/                # Comprehensive Unit and Integration tests
├── gameLogic.js         # Core gesture detection and tracking algorithm
├── firebase.js          # Firebase configuration and secure exports
└── App.jsx              # Main application orchestrator
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Rajmund09/67-game.git
   cd 67-game
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the project root with your credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_IMGBB_API_KEY=your_imgbb_api_key
   VITE_ADMIN_PASSWORD=your_admin_password
   VITE_FIREBASE_DATABASE_URL=your_firebase_database_url
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

## 🎨 Design Philosophy & Mechanics

**Mechanics-First Brutalism** — The architecture prioritizes core logic, precise layout, and high performance before applying aesthetic layers.

- **GPU-Accelerated Transitions**: All critical animations utilize `transform` and `will-change` to avoid layout thrashing.
- **Visual Safety**: Effects are rigorously rate-limited to ensure accessibility and prevent rapid flashing.
- **FLIP-Lite Positioning**: Odometer slots utilize measured coordinates for pixel-perfect, seamless flight animations.
- **Semantic Layering**: CSS variables (`--z-header`, `--z-modal`) replace arbitrary z-index magic numbers for a maintainable stacking context.

## ⚡ Performance Optimization

- **Real-Time Processing**: Achieves 60fps pose detection via MediaPipe WASM and GPU delegation.
- **Efficient Memory Management**: Employs O(1) swap-and-pop particle removal rather than expensive O(n) array operations.
- **Canvas Rendering**: Dedicated canvas particle systems eliminate DOM overhead for intense visual effects like flames and score bursts.
- **Signal Processing**: Uses EMA (Exponential Moving Average) smoothing on wrist tracking to provide stable, jitter-free visual feedback.

## 📝 Testing

Execute the test suite using Vitest:

```bash
# Run all tests
npm test

# Run in watch mode for development
npm run test:watch
```

**Test Coverage Includes:**
- **Gesture Detection Algorithms**: Robust null handling, threshold boundary validation, and directional movement detection.
- **Progression Systems**: Rank threshold accuracy, edge-case boundary values, and max rank stabilization.

## 👤 Author & Credits

**Rajmund09**  
Explore more projects on my [Portfolio](https://prabhu-shankar-portfolio.vercel.app/).
