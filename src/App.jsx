import React, { useState, useEffect, useRef, useCallback } from 'react';
import CameraDetector from './components/CameraDetector';
import Leaderboard from './components/Leaderboard';
import NameInput from './components/NameInput';
import Flames from './components/Flames';
import AuraCanvas from './components/AuraCanvas';
import ParticleCanvas from './components/ParticleCanvas';
import FloatingScores from './components/FloatingScores';
import ComboCounter from './components/ComboCounter';
import ShockwaveRing from './components/ShockwaveRing';
import Certificate from './components/Certificate';
import ProgressBar, { getRank } from './components/ProgressBar';
import AdminPanel from './components/AdminPanel';
import CreatorBadge from './components/CreatorBadge';
import NoiseOverlay from './components/NoiseOverlay';
import CircularTimer from './components/CircularTimer';
import Preloader from './components/Preloader';
import { check67Gesture } from './gameLogic';
import useLeaderboard from './hooks/useLeaderboard';
import { getDeviceTier } from './utils/devicePerformance';
import useScrollLock from './hooks/useScrollLock';
import useOdometerLayout from './hooks/useOdometerLayout';
import useLanguage from './hooks/useLanguage';
import './index.css';
import { database } from './firebase';
import { ref as dbRef, push, set, serverTimestamp } from 'firebase/database';

// ── Game Constants ──────────────────────────────────────────
const GAME_DURATION = 15;          // seconds of gameplay
const COUNTDOWN_SECONDS = 3;       // pre-game countdown
const CALIBRATION_THRESHOLD = 5;   // gestures needed to start
const MAX_SCORE = 250;             // hard cap on score
const MAX_LEADERBOARD_ENTRIES = 5; // top N shown in leaderboard
const COMBO_WINDOW_MS = 1200;      // ms to chain combos
const COMBO_RESET_MS = 1500;       // ms of inactivity to reset combo
const EFFECT_THROTTLE_MS = 400;    // min ms between visual effect bursts
const EXIT_ANIM_MS = 600;          // exit animation duration
const SHOCKWAVE_INTERVAL = 7;      // score interval for shockwave + camera bump

// GPU Warmup — pre-allocates compositor layers during preloader to eliminate first-transition jank
const GPUWarmup = React.memo(() => (
  <div style={{ position:'fixed', top:'-9999px', left:'-9999px', width:1, height:1, pointerEvents:'none', overflow:'hidden' }} aria-hidden="true">
    <div style={{ width:1, height:1, transform:'translateZ(0)', willChange:'transform, opacity' }} />
    <div style={{ width:1, height:1, transform:'translateZ(0)', willChange:'transform, opacity', opacity:0.99 }} />
    <canvas width={1} height={1} style={{ transform:'translateZ(0)' }} />
  </div>
));
GPUWarmup.displayName = 'GPUWarmup';

function App() {
  // Detect cert deep-link BEFORE setting initial screen
  const initialScreen = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('cert') && params.has('score')) return 'CERT_ONLY';
    if (params.get('admin') === '67adminxd') return 'ADMIN';
    return 'PRELOADING';
  };
  const [screen, setScreen] = useState(initialScreen);
  const [preloaderProgress, setPreloaderProgress] = useState(0);
  const [isPreloaderExiting, setIsPreloaderExiting] = useState(false);

  // ── Transition state (must be declared before hooks that depend on it) ──
  const [isExitingStart, setIsExitingStart] = useState(false);
  const [isExitingGame, setIsExitingGame] = useState(false);
  const [isExitingNameInput, setIsExitingNameInput] = useState(false);
  const [isExitingResult, setIsExitingResult] = useState(false);
  const [isReturningToMenu, setIsReturningToMenu] = useState(false);

  // ── Custom Hooks ──────────────────────────────────────────
  const leaderboard = useLeaderboard(MAX_LEADERBOARD_ENTRIES);
  const lockScrollForAnimation = useScrollLock(screen);
  const { t } = useLanguage();

  // Odometer FLIP-lite refs
  const startCardRef = useRef(null);
  const leaderboardRef = useRef(null);
  const speedGameRef = useRef(null);

  const { targetCoords, slotsRevealed } = useOdometerLayout({
    screen,
    isPreloaderExiting,
    isReturningToMenu,
    startCardRef,
    leaderboardRef,
    speedGameRef,
  });

  // ── Preloaded resources ───────────────────────────────────
  const preloadedStreamRef = useRef(null);
  const preloadedLandmarkerRef = useRef(null);
  const [resourcesReady, setResourcesReady] = useState(false);

  // ── Game state ────────────────────────────────────────────
  const [score, setScore] = useState(0);
  const [calibrationCount, setCalibrationCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [countdownTime, setCountdownTime] = useState(COUNTDOWN_SECONDS);
  const [showStartText, setShowStartText] = useState(false);
  const [showEndText, setShowEndText] = useState(false);
  const [combo, setCombo] = useState(0);
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [showCertificate, setShowCertificate] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState(null);
  const [resetTimeLeft, setResetTimeLeft] = useState('');

  // ── Performance refs (avoid re-renders on every frame) ───
  const photoCapturedRef = useRef(false);
  const calibrationRef = useRef(0);
  const lastGestureRef = useRef('neutral');
  const scoreRef = useRef(0);
  const screenRef = useRef('START');
  const isGameOverRef = useRef(false);
  const lastLeftWristRef = useRef(null);
  const lastRightWristRef = useRef(null);
  const cameraWrapperRef = useRef(null);

  // ── Aura effect refs ─────────────────────────────────────
  const segMaskRef = useRef({ data: null, w: 640, h: 480 });
  
  // Performance gate: only enable aura on capable hardware
  const isAuraCapable = useRef(
    typeof navigator !== 'undefined' &&
    getDeviceTier() !== 'low' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  // Throttle mask updates to ~15fps to avoid React re-render storm
  const lastMaskUpdateRef = useRef(0);

  // ── Effect system refs (anti-epilepsy throttling) ────────
  const particleRef = useRef(null);
  const floatingScoresRef = useRef(null);
  const shockwaveRef = useRef(null);
  const lastEffectTimeRef = useRef(0);
  const pendingScoreRef = useRef(0);
  const comboRef = useRef(0);
  const lastScoreTimeRef = useRef(0);
  const comboTimeoutRef = useRef(null);

  // Check URL for QR certificate deep-link on mount
  // When screen is CERT_ONLY, skip preloader entirely and show only certificate
  const isCertOnly = screen === 'CERT_ONLY';
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    if (params.has('cert') && params.has('score')) {
      const paramName = params.get('cert');
      const paramScore = parseInt(params.get('score'), 10) || 0;
      setPlayerName(paramName);
      setScore(paramScore);
      
      if (params.has('img')) {
        setPhotoDataUrl(decodeURIComponent(params.get('img')));
      }
      
      setShowCertificate(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Sync screen ref for use in animation frame callbacks
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  // Leaderboard reset timer
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diffMs = tomorrow - now;

      const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diffMs / 1000 / 60) % 60);
      const seconds = Math.floor((diffMs / 1000) % 60);

      setResetTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  // 1. Countdown and game timer tick handler
  useEffect(() => {
    let timer;
    if (screen === 'COUNTDOWN' && countdownTime > 0) {
      timer = setInterval(() => setCountdownTime(prev => prev - 1), 1000);
    } else if (screen === 'PLAYING' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [screen, countdownTime > 0, timeLeft > 0]);

  // 2. Transition after COUNTDOWN ends
  useEffect(() => {
    if (screen === 'COUNTDOWN' && countdownTime === 0) {
      // Reset ALL refs directly — useEffect sync is async and too late
      isGameOverRef.current = false;
      setScore(0);
      scoreRef.current = 0;
      setTimeLeft(GAME_DURATION);
      setCombo(0);
      comboRef.current = 0;
      pendingScoreRef.current = 0;
      lastEffectTimeRef.current = 0;
      lastScoreTimeRef.current = 0;
      lastGestureRef.current = 'neutral';
      // Reset photo for new game
      setPhotoDataUrl(null);
      photoCapturedRef.current = false;
      setScreen('PLAYING');
      setShowStartText(true);
      setTimeout(() => setShowStartText(false), 1000);
    }
  }, [countdownTime, screen]);

  // 3. Capture photo during gameplay (at 10s and 5s marks)
  useEffect(() => {
    if (screen === 'PLAYING' && (timeLeft === 10 || timeLeft === 5) && !photoCapturedRef.current) {
      capturePhoto();
    }
  }, [timeLeft, screen]);

  // 4. Transition after game time runs out
  useEffect(() => {
    if (screen === 'PLAYING' && timeLeft === 0 && !showEndText) {
      isGameOverRef.current = true;
      // Final photo capture if not done yet
      if (!photoCapturedRef.current) capturePhoto();
      
      setShowEndText(true);
      
      // Show "KONIEC!" overlay, then trigger exit after 2s
      setTimeout(() => {
        // Delay screen transition for exit animation
        setIsExitingGame(true);
        lockScrollForAnimation(1200); // Lock during exit + entry
        setTimeout(() => {
          setIsExitingGame(false);
          setShowEndText(false); // reset state
          setScreen('NAME_INPUT');
        }, 600);
      }, 2000);
    }
  }, [timeLeft, screen, showEndText]);

  const capturePhoto = () => {
    try {
      const video = document.querySelector('.camera-video');
      if (!video) return;
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.scale(-1, 1); // mirror to match display
      ctx.drawImage(video, -640, 0, 640, 480);
      ctx.restore();
      // Optimized WEBP compression (smaller size, great quality)
      const dataUrl = canvas.toDataURL('image/webp', 0.80);
      setPhotoDataUrl(dataUrl);
      photoCapturedRef.current = true;
    } catch (e) {
      console.error('Photo capture failed:', e);
    }
  };

  // Flush effects — throttled at max 3x/sec to prevent epilepsy
  const flushEffects = (newScore) => {
    const now = performance.now();
    
    // Accumulate pending score for batched visual
    pendingScoreRef.current += 1;
    
    // Combo system — COMBO_WINDOW_MS window
    if (now - lastScoreTimeRef.current < COMBO_WINDOW_MS) {
      comboRef.current += 1;
    } else {
      comboRef.current = 1;
    }
    lastScoreTimeRef.current = now;
    setCombo(comboRef.current);
    
    // Reset combo after inactivity
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    comboTimeoutRef.current = setTimeout(() => {
      comboRef.current = 0;
      setCombo(0);
    }, COMBO_RESET_MS);

    // Throttle visual bursts to prevent epilepsy on mobile
    if (now - lastEffectTimeRef.current < EFFECT_THROTTLE_MS) return;
    lastEffectTimeRef.current = now;
    
    const pending = pendingScoreRef.current;
    pendingScoreRef.current = 0;

    // 1. Particle burst — emit at camera center area
    if (particleRef.current) {
      const cx = 0.3 + Math.random() * 0.4; // 30-70% horizontal
      const cy = 0.3 + Math.random() * 0.4; // 30-70% vertical
      
      const tier = getDeviceTier();
      let maxParticles = 15;
      if (tier === 'medium') maxParticles = 8;
      if (tier === 'low') maxParticles = 3;
      
      const count = Math.min(pending * 4, maxParticles);
      particleRef.current.emit(cx, cy, count);
    }

    // 2. Floating score numbers
    if (floatingScoresRef.current) {
      floatingScoresRef.current.add(pending);
    }

    // 3. Shockwave ring every SHOCKWAVE_INTERVAL points
    if (newScore % SHOCKWAVE_INTERVAL === 0 && shockwaveRef.current && getDeviceTier() !== 'low') {
      shockwaveRef.current.trigger();
    }

    // 4. Camera bump every SHOCKWAVE_INTERVAL points (WAAPI — avoids offsetWidth reflow)
    if (newScore % SHOCKWAVE_INTERVAL === 0 && cameraWrapperRef.current) {
      cameraWrapperRef.current.animate([
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(8px) scale(0.98)', boxShadow: '4px 4px 0px var(--neo-black)' },
        { transform: 'translateY(0) scale(1)', boxShadow: '12px 12px 0px var(--neo-black)' },
      ], { duration: 150, easing: 'ease-out' });
    }
  };

  const handleStartGame = () => {
    setIsExitingStart(true);
    lockScrollForAnimation(1400); // Lock during exit + entry
    setTimeout(() => {
      setIsExitingStart(false);
      setScreen('CALIBRATION');
    }, 600); // Wait 600ms for exit animations
  };

  const handlePoseUpdate = (leftWrist, rightWrist) => {
    if (screenRef.current !== 'CALIBRATION' && screenRef.current !== 'PLAYING') return;
    if (isGameOverRef.current) return;

    // Cache the positions
    if (leftWrist) lastLeftWristRef.current = leftWrist;
    if (rightWrist) lastRightWristRef.current = rightWrist;

    const currentGesture = check67Gesture(lastLeftWristRef.current, lastRightWristRef.current);
    const lastGesture = lastGestureRef.current;

    // Detect transition from left_high to right_high or vice versa
    if (
      (currentGesture === 'left_high' && lastGesture === 'right_high') ||
      (currentGesture === 'right_high' && lastGesture === 'left_high')
    ) {
      // Gesture detected!
      if (screenRef.current === 'CALIBRATION') {
        const newCal = calibrationRef.current + 1;
        calibrationRef.current = newCal;
        setCalibrationCount(newCal);
        if (newCal >= CALIBRATION_THRESHOLD) {
          setCountdownTime(COUNTDOWN_SECONDS);
          setScreen('COUNTDOWN');
        }
      } else if (screenRef.current === 'PLAYING') {
        // Increment score, capped at 250
        const newScore = Math.min(scoreRef.current + 1, MAX_SCORE);
        setScore(newScore);
        
        // Trigger all visual effects (throttled internally)
        flushEffects(newScore);
      }
    }

    if (currentGesture !== 'neutral') {
      lastGestureRef.current = currentGesture;
    }
  };

  const handleNameSubmit = async (name, consent) => {
    setPlayerName(name);
    setIsExitingNameInput(true);
    lockScrollForAnimation(1400); // Lock during exit + entry
    
    // Animate out for 600ms
    setTimeout(() => {
      setIsExitingNameInput(false);
      setScreen('RESULT'); // Show result screen while upload runs in background
    }, 600);
    
    try {
      // Save to global leaderboard (Firebase Realtime Database)
      const newScoreRef = push(dbRef(database, 'leaderboard'));
      await set(newScoreRef, {
        name,
        score,
        consentGiven: consent,
        timestamp: serverTimestamp()
      });
      
    } catch (e) {
      console.error("Error saving score:", e);
    }
  };

  const resetGameState = () => {
    isGameOverRef.current = false;
    scoreRef.current = 0;
    calibrationRef.current = 0;
    setScore(0);
    setCalibrationCount(0);
    setTimeLeft(GAME_DURATION);
    setCombo(0);
    comboRef.current = 0;
    pendingScoreRef.current = 0;
    lastEffectTimeRef.current = 0;
    lastScoreTimeRef.current = 0;
    lastGestureRef.current = 'neutral';
    lastLeftWristRef.current = null;
    lastRightWristRef.current = null;
    setPhotoDataUrl(null);
    setPlayerName('');
    setShowCertificate(false);
    photoCapturedRef.current = false;
  };

  const restartGame = () => {
    if (screenRef.current === 'RESULT') {
      setIsExitingResult(true);
      lockScrollForAnimation(1000);
      setTimeout(() => {
        setIsExitingResult(false);
        screenRef.current = 'START';
        resetGameState();
        setScreen('CALIBRATION');
      }, 500);
    } else {
      screenRef.current = 'START';
      resetGameState();
      setScreen('CALIBRATION');
    }
  };

  const goToMenu = () => {
    if (screenRef.current === 'RESULT') {
      setIsExitingResult(true);
      lockScrollForAnimation(1000);
      setTimeout(() => {
        setIsExitingResult(false);
        screenRef.current = 'START';
        resetGameState();
        setIsReturningToMenu(true);
        setScreen('START');
        setTimeout(() => setIsReturningToMenu(false), 1000);
      }, 500);
    } else {
      screenRef.current = 'START';
      resetGameState();
      setIsReturningToMenu(true);
      setScreen('START');
      setTimeout(() => setIsReturningToMenu(false), 1000);
    }
  };

  const handleAdminLogin = () => {
    setScreen('ADMIN');
  };

  const handleResourcesLoaded = useCallback((stream, landmarker) => {
    preloadedStreamRef.current = stream;
    preloadedLandmarkerRef.current = landmarker;
    setResourcesReady(true);
  }, []);

  const handlePreloaderReady = useCallback((stream, landmarker) => {
    preloadedStreamRef.current = stream;
    preloadedLandmarkerRef.current = landmarker;
    setScreen('START');
    setIsPreloaderExiting(false);
  }, []);

  const isFireMode = screen === 'PLAYING' && score >= 45;
  const isWarmGlow = screen === 'PLAYING' && score >= 10 && score < 45;
  const isGameplay = screen === 'CALIBRATION' || screen === 'COUNTDOWN' || screen === 'PLAYING';
  const isPreloading = screen === 'PRELOADING';
  const isAuraActive = screen === 'PLAYING' && combo >= 30 && isAuraCapable.current;

  // ── Segmentation mask handler (no re-renders!) ──────────
  const handleSegmentationMask = useCallback((maskData, w, h) => {
    if (!isAuraCapable.current) return;
    segMaskRef.current = { data: maskData, w, h };
  }, []);

  // CERT_ONLY mode: render only the certificate overlay, nothing else
  if (isCertOnly) {
    return (
      <div className="app-container">
        <NoiseOverlay />
        <main className="main-content">
          {showCertificate && (
            <Certificate
              name={playerName || 'GRACZ'}
              score={score}
              photoDataUrl={photoDataUrl}
              uploadedPhotoUrl={uploadedPhotoUrl}
              onClose={() => setShowCertificate(false)}
            />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className={`app-container ${isFireMode ? 'fire-mode' : ''} ${isWarmGlow ? 'glow-warm' : ''} ${isGameplay ? 'is-gameplay' : ''}`}>
      {/* Film grain overlay — always present */}
      <NoiseOverlay />

      {/* GPU Warmup — invisible layers to pre-allocate compositor during preloader */}
      {isPreloading && <GPUWarmup />}
      
      {/* Preloader Background and UI (renders underneath the global header) */}
      {isPreloading && (
        <Preloader 
          onResourcesLoaded={handleResourcesLoaded}
          onReady={handlePreloaderReady} 
          onProgress={setPreloaderProgress}
          onExitStart={() => setIsPreloaderExiting(true)}
        />
      )}
      
      {/* Global Marquee — 3D Slot Machine */}
      <div className="marquee-3d-container">
        <div className={`marquee-3d-drum ${!isPreloading || isPreloaderExiting ? 'is-flipped' : ''}`}>
          
          {/* FRONT FACE (Preloading) */}
          <div className="marquee-face marquee-face--front">
            <div className="marquee-content">
              <div className="marquee-track">
                <span>/// {t('speedGame')} ///</span>
                <span>{t('loading')}</span>
                <span>/// {t('playNow')} ///</span>
                <span>{t('testSpeed')}</span>
                <span>/// {t('speedGame')} ///</span>
                <span>{t('loading')}</span>
                <span>/// {t('playNow')} ///</span>
                <span>{t('testSpeed')}</span>
                <span>/// {t('speedGame')} ///</span>
                <span>{t('loading')}</span>
              </div>
              <div className="marquee-track" aria-hidden="true">
                <span>/// {t('speedGame')} ///</span>
                <span>{t('loading')}</span>
                <span>/// {t('playNow')} ///</span>
                <span>{t('testSpeed')}</span>
                <span>/// {t('speedGame')} ///</span>
                <span>{t('loading')}</span>
                <span>/// {t('playNow')} ///</span>
                <span>{t('testSpeed')}</span>
                <span>/// {t('speedGame')} ///</span>
                <span>{t('loading')}</span>
              </div>
            </div>
          </div>

          {/* BOTTOM FACE (Start Screen) */}
          <div className="marquee-face marquee-face--bottom">
            <div className="marquee-content">
              <div className="marquee-track">
                <span>/// {t('speedGame')} ///</span>
                <span>{t('globalChallenge')}</span>
                <span>/// {t('playNow')} ///</span>
                <span>{t('testSpeed')}</span>
                <span>/// {t('speedGame')} ///</span>
                <span>{t('globalChallenge')}</span>
                <span>/// {t('playNow')} ///</span>
                <span>{t('testSpeed')}</span>
                <span>/// {t('speedGame')} ///</span>
                <span>{t('globalChallenge')}</span>
              </div>
              <div className="marquee-track" aria-hidden="true">
                <span>/// {t('speedGame')} ///</span>
                <span>{t('globalChallenge')}</span>
                <span>/// {t('playNow')} ///</span>
                <span>{t('testSpeed')}</span>
                <span>/// {t('speedGame')} ///</span>
                <span>{t('globalChallenge')}</span>
                <span>/// {t('playNow')} ///</span>
                <span>{t('testSpeed')}</span>
                <span>/// {t('speedGame')} ///</span>
                <span>{t('globalChallenge')}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Shared HEADER with 67 Hero — Active during PRELOADER and START */}
      {(isPreloading || screen === 'START') && (
        <header className={`header ${isExitingStart ? 'is-exiting' : ''} ${isPreloading ? 'header--preloading' : ''} ${isPreloaderExiting ? 'header--preloader-exiting' : ''} ${isReturningToMenu ? 'header--returning' : ''}`}>
          <div className={`hero-67 ${screen === 'START' ? 'is-floating' : ''}`}>
            <span className="hero-six">6</span>
            <span className="hero-seven">7</span>
          </div>
          
          {/* Label only visible on START (or during transition for accurate measurement) */}
          {(!isPreloading || isPreloaderExiting) && (
            <div className="hero-game-label-wrapper">
              <span className="hero-game-label" ref={speedGameRef}>✦ {t('speedGame')} ✦</span>
            </div>
          )}
        </header>
      )}

      {/* Shared ODOMETER — persists between PRELOADER and START (like hero 67) */}
      {(isPreloading || screen === 'START') && (() => {
        const getDigits = (n) => {
          const s = String(Math.min(Math.round(n), 100)).padStart(3, '0');
          return [s[0], s[1], s[2]];
        };
        const digits = getDigits(preloaderProgress);
        const isDone = preloaderProgress >= 100;
        return (
          <div className={`odometer-global ${isPreloading ? 'odometer-global--preloading' : ''} ${screen === 'START' ? 'odometer-global--start' : ''} ${isPreloaderExiting ? 'odometer-global--transitioning' : ''} ${isExitingStart ? 'odometer-global--exiting' : ''} ${isReturningToMenu ? 'odometer-global--returning' : ''} ${isDone ? 'odometer--done' : ''} ${slotsRevealed ? 'odometer-global--revealed' : ''}`}>
            <div 
              className="odometer__slot odometer__slot--left"
              style={{
                '--target-x': (screen === 'START' || isPreloaderExiting) && targetCoords.left.x ? `${targetCoords.left.x}px` : undefined,
                '--target-y': (screen === 'START' || isPreloaderExiting) && targetCoords.left.x ? `${targetCoords.left.y}px` : undefined,
                ...((screen === 'START' || isPreloaderExiting) && targetCoords.left.w ? {
                  width: `${targetCoords.left.w}px`,
                  height: `${targetCoords.left.h}px`,
                  borderRadius: targetCoords.left.br
                } : {})
              }}
            >
              <div className="odometer__digit-track" style={{ transform: `translateY(-${parseInt(digits[0]) * 10}%)` }}>
                {[0,1,2,3,4,5,6,7,8,9].map(d => <span className="odometer__digit" key={d}>{d}</span>)}
              </div>
              {/* Card content — revealed by curtain */}
              <div className="odometer__content">
                <div className="card-header-editorial">
                  <span className="card-overline">{t('globalChallenge')}</span>
                  <h2 className="card-title">{t('challenge67')}</h2>
                </div>
                <p>{t('instruction')}</p>
                <div className="instruction-box" style={{marginBottom: '1.5rem'}}>
                  <span className="icon">⚠️</span> {t('warningCamera')}
                </div>
                <button className="btn-primary" onClick={handleStartGame}>
                  {t('startGame')}
                </button>
              </div>
            </div>
            <div 
              className="odometer__slot odometer__slot--center"
              style={{
                '--target-x': (screen === 'START' || isPreloaderExiting) && targetCoords.center.x ? `${targetCoords.center.x}px` : undefined,
                '--target-y': (screen === 'START' || isPreloaderExiting) && targetCoords.center.x ? `${targetCoords.center.y}px` : undefined,
                ...((screen === 'START' || isPreloaderExiting) && targetCoords.center.w ? {
                  width: `${targetCoords.center.w}px`,
                  height: `${targetCoords.center.h}px`,
                  borderRadius: targetCoords.center.br
                } : {})
              }}
            >
              <div className="odometer__digit-track" style={{ transform: `translateY(-${parseInt(digits[1]) * 10}%)` }}>
                {[0,1,2,3,4,5,6,7,8,9].map(d => <span className="odometer__digit" key={d}>{d}</span>)}
              </div>
              {/* Speed game label — revealed by curtain */}
              <div className="odometer__content odometer__content--label">
                <span>✦ {t('speedGame')} ✦</span>
              </div>
            </div>
            <div 
              className="odometer__slot odometer__slot--right"
              style={{
                '--target-x': (screen === 'START' || isPreloaderExiting) && targetCoords.right.x ? `${targetCoords.right.x}px` : undefined,
                '--target-y': (screen === 'START' || isPreloaderExiting) && targetCoords.right.x ? `${targetCoords.right.y}px` : undefined,
                ...((screen === 'START' || isPreloaderExiting) && targetCoords.right.w ? {
                  width: `${targetCoords.right.w}px`,
                  height: `${targetCoords.right.h}px`,
                  borderRadius: targetCoords.right.br
                } : {})
              }}
            >
              <div className="odometer__digit-track" style={{ transform: `translateY(-${parseInt(digits[2]) * 10}%)` }}>
                {[0,1,2,3,4,5,6,7,8,9].map(d => <span className="odometer__digit" key={d}>{d}</span>)}
              </div>
              {/* Leaderboard content — revealed by curtain */}
              <div className="odometer__content">
                <h3 className="glow-text-small" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{t('top5Today')}</span>
                  <span style={{ fontSize: '0.6em', opacity: 0.8, fontWeight: 'normal' }}>
                    {t('resetIn')} {resetTimeLeft}
                  </span>
                </h3>
                <ul className="leaderboard-list">
                  {[...(leaderboard || []), ...Array(5)].slice(0, 5).map((entry, index) => (
                    <li key={index} className={`leaderboard-item ${!entry ? 'empty-slot' : ''}`}>
                      <span className="rank">#{index + 1}</span>
                      <span className="name">{entry ? entry.name : '---'}</span>
                      <span className="score">{entry ? entry.score : '-'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Fixed positioned elements / Footer */}
      {screen === 'START' && (
        <div className={`start-footer ${isExitingStart ? 'is-exiting-fixed' : ''}`}>
          <CreatorBadge />
        </div>
      )}

      <main className="main-content">
        {(screen === 'START' || isPreloaderExiting) && (
          <div className={`start-layout ${isExitingStart ? 'is-exiting' : ''}`} key="start">
            {/* Ghost divs — invisible, only for position measurement */}
            <div className="card start-card" ref={startCardRef} />
            <Leaderboard ref={leaderboardRef} leaderboard={leaderboard} />
          </div>
        )}

        <div 
          className={`game-area ${isExitingGame ? 'is-exiting-game' : ''}`} 
          style={{ display: isGameplay ? 'flex' : 'none' }}
          key="gameplay"
        >
            <div className={`stats-bar stats-bar--${screen.toLowerCase()}`}>
              {/* LEFT: State indicator — morphs between states */}
              <div className="stats-bar__left">
                {screen === 'PLAYING' ? (
                  <span className="live-dot" key="live">{t('live')}</span>
                ) : screen === 'COUNTDOWN' ? (
                  <span className="stats-bar__state-label stats-bar__state-label--countdown" key="countdown">
                    <span className="stats-bar__pulse-icon">⏳</span>
                    {t('startHUD')}
                  </span>
                ) : (
                  <span className="stats-bar__state-label stats-bar__state-label--calibration" key="calibration">
                    <span className="stats-bar__pulse-icon">🎯</span>
                    {t('calibrationHUD')}
                  </span>
                )}
              </div>

              {/* CENTER: Value display — morphs between counter types */}
              <div className="stats-bar__center">
                {screen === 'PLAYING' ? (
                  <div className="stats-bar__value-group" key="score">
                    <span className="stats-bar__value-label">{t('scoreHUD')}</span>
                    <span className="stats-bar__value-box">
                      <span key={score} className="score-punch">{score}</span>
                    </span>
                  </div>
                ) : screen === 'COUNTDOWN' ? (
                  <div className="stats-bar__value-group stats-bar__value-group--countdown" key="countdown">
                    <span className="stats-bar__value-label">{t('prepareHUD')}</span>
                  </div>
                ) : (
                  <div className="stats-bar__value-group" key="calibration">
                    <span className="stats-bar__value-label">{t('swingHUD')}</span>
                    <span className="stats-bar__value-box">
                      <span key={calibrationCount} className="score-punch">{calibrationCount}</span>
                    </span>
                    <span className="stats-bar__value-total">/5</span>
                  </div>
                )}
              </div>

              {/* RIGHT: Ring — morphs from progress ring to timer */}
              <div className="stats-bar__right">
                {screen === 'PLAYING' ? (
                  <CircularTimer timeLeft={timeLeft} />
                ) : (
                  <div className="calibration-ring">
                    <svg width="100%" height="100%" viewBox="0 0 90 90">
                      {/* Background segments */}
                      {[0,1,2,3,4].map(i => {
                        const segAngle = 360 / 5;
                        const gap = 8;
                        const startAngle = i * segAngle - 90 + gap / 2;
                        const endAngle = startAngle + segAngle - gap;
                        const r = 38;
                        const x1 = 45 + r * Math.cos(startAngle * Math.PI / 180);
                        const y1 = 45 + r * Math.sin(startAngle * Math.PI / 180);
                        const x2 = 45 + r * Math.cos(endAngle * Math.PI / 180);
                        const y2 = 45 + r * Math.sin(endAngle * Math.PI / 180);
                        const filled = i < calibrationCount;
                        return (
                          <path
                            key={i}
                            d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
                            fill="none"
                            stroke={filled ? 'var(--neo-white)' : 'var(--neo-black)'}
                            strokeWidth={filled ? '6' : '4'}
                            strokeLinecap="round"
                            opacity={filled ? 1 : 0.2}
                            style={{ transition: 'stroke 0.3s ease, opacity 0.3s ease, stroke-width 0.3s ease' }}
                          />
                        );
                      })}
                      {/* Outer ring */}
                      <circle cx="45" cy="45" r="43" fill="none" stroke="var(--neo-black)" strokeWidth="3" opacity="0.3" />
                    </svg>
                    <span className="calibration-ring__value">
                      {screen === 'COUNTDOWN' ? '✓' : `${calibrationCount}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Progress bar — always visible during gameplay to prevent layout shift */}
            <div className="progress-wrapper">
              {screen === 'PLAYING' ? (
                <ProgressBar score={score} leaderboard={leaderboard} />
              ) : (
                <div style={{ opacity: 0.3 }}>
                  <ProgressBar score={0} leaderboard={leaderboard} />
                </div>
              )}
            </div>
            
            <div 
              ref={cameraWrapperRef}
              className="camera-wrapper"
            >
              
              <div className="camera-inner">
                <CameraDetector 
                  isActive={isGameplay}
                  onPoseUpdate={handlePoseUpdate}
                  onSegmentationMask={handleSegmentationMask}
                  preloadedStream={preloadedStreamRef.current}
                  preloadedLandmarker={preloadedLandmarkerRef.current}
                />
                
                {/* Anime fire aura — behind particles, on top of camera */}
                {isAuraActive && (
                  <AuraCanvas
                    maskRef={segMaskRef}
                    combo={combo}
                    active={isAuraActive}
                  />
                )}

                {/* Particle canvas — inside camera for clean clipping */}
                {screen === 'PLAYING' && (
                  <ParticleCanvas ref={particleRef} />
                )}

                {/* Shockwave rings — inside camera */}
                {screen === 'PLAYING' && (
                  <ShockwaveRing ref={shockwaveRef} />
                )}

                {/* Combo counter — inside camera, top-right */}
                {screen === 'PLAYING' && (
                  <ComboCounter combo={combo} />
                )}
                
                {screen === 'COUNTDOWN' && (
                  <div className="countdown-overlay">
                    <span key={countdownTime} className="countdown-text">{countdownTime}</span>
                  </div>
                )}
                
                {showStartText && screen === 'PLAYING' && (
                  <div className="countdown-overlay" style={{ color: 'var(--neo-yellow)' }}>
                    <span className="countdown-text">{t('startText')}</span>
                  </div>
                )}
                {showEndText && screen === 'PLAYING' && (
                  <div className="countdown-overlay" style={{ color: 'var(--neo-pink)' }}>
                    <span className="countdown-text">{t('endText')}</span>
                  </div>
                )}
              </div>

              {/* Floating scores — outside overflow:hidden to fly upward */}
              {screen === 'PLAYING' && (
                <FloatingScores ref={floatingScoresRef} />
              )}
              <Flames active={isFireMode} />
            </div>
          </div>

        {screen === 'NAME_INPUT' && (
          <div className={`card text-center result-card ${isExitingNameInput ? 'is-exiting-name' : ''}`} key="name-input">
            <NameInput score={score} onSubmit={handleNameSubmit} />
          </div>
        )}

        {screen === 'RESULT' && (
          <div className={`card text-center final-result-card ${isExitingResult ? 'is-exiting-result' : ''}`} key="result">
            <h2 className="glow-text">{t('timeUp')}</h2>
            <div className="final-score">
              {t('youDid')} <br/>
              <span className="huge-number">{score}</span> <br/>
              {t('reps')}
            </div>
            
            <div className="rank-display" style={{ margin: '1rem 0', fontSize: '1.5rem', color: 'var(--secondary)' }}>
              {t('rank')} <strong>{getRank(score, t).label}</strong>
            </div>

            <div className="result-actions">
              <button className="btn-primary mt-4" onClick={() => setShowCertificate(true)}
                style={{ background: 'var(--neo-green)' }}>
                {t('seeCertificate')}
              </button>
              <button className="btn-primary mt-4" onClick={restartGame}>
                {t('playAgain')}
              </button>
              <button className="btn-secondary mt-4" onClick={goToMenu}>
                {t('mainMenu')}
              </button>
            </div>
          </div>
        )}

        {showCertificate && (
          <Certificate
            name={playerName || 'GRACZ'}
            score={score}
            photoDataUrl={photoDataUrl}
            uploadedPhotoUrl={uploadedPhotoUrl}
            onClose={() => setShowCertificate(false)}
          />
        )}

        {screen === 'ADMIN' && (
          <AdminPanel onBack={() => {
            setIsReturningToMenu(true);
            setScreen('START');
            setTimeout(() => setIsReturningToMenu(false), 1000);
          }} />
        )}
      </main>
    </div>
  );
}

export default App;
