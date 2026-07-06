import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import useLanguage from '../hooks/useLanguage';
import { getDeviceTier, getMediaPipeConfig } from '../utils/devicePerformance';

const PHASES = [
  { key: 'init', label: 'INICJALIZACJA', percent: 10 },
  { key: 'wasm', label: 'SILNIK AI', percent: 35 },
  { key: 'model', label: 'MODEL AI', percent: 60 },
  { key: 'camera_ask', label: 'DOSTĘP DO KAMERY', percent: 75 },
  { key: 'camera_init', label: 'KAMERA', percent: 90 },
  { key: 'done', label: 'GOTOWE', percent: 100 },
];

// Get 3 zero-padded digits from a number (e.g., 87 → ['0','8','7'])
const getDigits = (n) => {
  const s = String(Math.min(Math.round(n), 100)).padStart(3, '0');
  return [s[0], s[1], s[2]];
};

export default function Preloader({ onResourcesLoaded, onReady, onProgress, onExitStart }) {
  const [phase, setPhase] = useState('init');
  const [progress, setProgress] = useState(0);
  const [cameraState, setCameraState] = useState('pending');
  const [cameraErrorType, setCameraErrorType] = useState('cameraRequired');
  const [isExiting, setIsExiting] = useState(false);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const hasStarted = useRef(false);
  const { t } = useLanguage();


  // Smooth progress animation
  const targetProgress = PHASES.find(p => p.key === phase)?.percent || 0;
  
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const diff = targetProgress - prev;
        if (Math.abs(diff) < 0.5) return targetProgress;
        return prev + diff * 0.08;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [targetProgress]);

  // Sync progress to parent
  useEffect(() => {
    if (onProgress) onProgress(progress);
  }, [progress, onProgress]);



  const startLoading = useCallback(async () => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    try {
      setPhase('wasm');
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );

      setPhase('model');
      
      const tier = getDeviceTier();
      const config = getMediaPipeConfig(tier);
      
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: config.modelPath,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.3,
        minPosePresenceConfidence: 0.3,
        minTrackingConfidence: 0.3,
        outputSegmentationMasks: config.segmentation
      });
      landmarkerRef.current = landmarker;

      setPhase('camera_ask');
      
      let permissionGranted = false;
      try {
        const permStatus = await navigator.permissions.query({ name: 'camera' });
        if (permStatus.state === 'granted') {
          permissionGranted = true;
          setCameraState('granted');
        } else if (permStatus.state === 'denied') {
          setCameraState('denied');
          return;
        }
      } catch {
        // permissions API not supported
      }

      if (!permissionGranted) {
        setCameraState('prompting');
        return;
      }

      await initCamera();
    } catch (e) {
      console.error("Preloader error:", e);
    }
  }, []);

  const requestCamera = async () => {
    setCameraState('pending');
    setPhase('camera_init');
    try {
      await initCamera();
    } catch (e) {
      console.error("Camera request failed:", e);
      setCameraState('denied');
      setPhase('camera_ask');
    }
  };

  const initCamera = async () => {
    setPhase('camera_init');
    try {
      const tier = getDeviceTier();
      const config = getMediaPipeConfig(tier);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          frameRate: { ideal: config.cameraFps, min: 30 }
        }
      });
      streamRef.current = stream;
      setCameraState('granted');

      if (onResourcesLoaded) {
        onResourcesLoaded(stream, landmarkerRef.current);
      }

      setPhase('done');
      // Force progress to 100 instantly (skip interpolation)
      setProgress(100);

      // Wait for user to see the counter hit 100, then exit
      setTimeout(() => {
        setIsExiting(true);
        if (onExitStart) onExitStart();
        
        setTimeout(() => {
          onReady(stream, landmarkerRef.current);
        }, 900);
      }, 2200);
    } catch (err) {
      console.error("Camera error:", err);
      
      let errorKey = 'cameraError';
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorKey = 'cameraNotFound';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorKey = 'cameraInUse';
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorKey = 'cameraRequired';
      }
      
      setCameraErrorType(errorKey);
      setCameraState('denied');
      setPhase('camera_ask');
    }
  };

  useEffect(() => {
    const t = setTimeout(() => startLoading(), 300);
    return () => clearTimeout(t);
  }, [startLoading]);

  const digits = getDigits(progress);
  const isDone = phase === 'done';
  const showCameraPrompt = cameraState === 'prompting';
  const showCameraDenied = cameraState === 'denied';


  return (
    <div className={`preloader ${isExiting ? 'preloader--exiting' : ''}`}>
      <div className="preloader__content">
        {/* Spacer for the global 67 hero */}
        <div className="preloader__hero-spacer" />
      </div>

      {/* HORIZON LINES — positioned absolutely via JS-measured --pl-horizon-y */}
      <div className="horizon-lines">
        <div className="horizon-line horizon-line--left" style={{ width: `${progress / 2}%` }} />
        <div className="horizon-line horizon-line--right" style={{ width: `${progress / 2}%` }} />
      </div>

      {/* Camera Permission Prompt */}
      {showCameraPrompt && createPortal(
        <div className="camera-modal-overlay">
          <div className="preloader__camera-card" key="camera-prompt">
            <div className="preloader__camera-icon">📸</div>
            <h3 className="preloader__camera-title">{t('cameraAccess')}</h3>
            <p className="preloader__camera-desc">
              {t('preloaderDesc1')}
              <br />{t('preloaderDesc2')}
            </p>
            <button className="btn-primary preloader__camera-btn" onClick={requestCamera}>
              {t('turnOnCamera')}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Camera Denied State */}
      {showCameraDenied && createPortal(
        <div className="camera-modal-overlay">
          <div className="preloader__camera-card preloader__camera-card--denied" key="camera-denied">
            <div className="preloader__camera-icon">🚫</div>
            <h3 className="preloader__camera-title">{t('noCameraAccess')}</h3>
            <p className="preloader__camera-desc">
              {t(cameraErrorType)}
            </p>
            {cameraErrorType === 'cameraRequired' && (
              <div className="preloader__camera-steps">
                <div className="preloader__step">
                  <span className="preloader__step-num">1</span>
                  {t('cameraStep1')}
                </div>
                <div className="preloader__step">
                  <span className="preloader__step-num">2</span>
                  {t('cameraStep2')}
                </div>
                <div className="preloader__step">
                  <span className="preloader__step-num">3</span>
                  {t('cameraStep3')}
                </div>
              </div>
            )}
            <button className="btn-primary preloader__camera-btn" onClick={requestCamera}>
              {t('tryAgain')}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
