import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { getDeviceTier, getMediaPipeConfig } from '../utils/devicePerformance';

export default function CameraDetector({ isActive, onPoseUpdate, onSegmentationMask, preloadedStream, preloadedLandmarker }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const poseLandmarkerRef = useRef(null);
  const requestRef = useRef(null);
  const isActiveRef = useRef(isActive);
  const hasWarmedUpRef = useRef(false);
  
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Smoothed positions for stable circle rendering (EMA)
  const smoothLeftRef = useRef({ x: 0.5, y: 0.5 });
  const smoothRightRef = useRef({ x: 0.5, y: 0.5 });
  const SMOOTH = 0.4; // 0=frozen, 1=no smoothing

  useEffect(() => {
    let active = true;

    // Sync canvas to video dimensions ONCE when video loads (fixes mobile dot offset)
    const syncCanvasOnce = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;
      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }
    };

    // If preloaded resources are available, use them directly (skips heavy init)
    if (preloadedStream && preloadedLandmarker) {
      poseLandmarkerRef.current = preloadedLandmarker;
      if (videoRef.current) {
        videoRef.current.srcObject = preloadedStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          syncCanvasOnce();
          setIsLoaded(true);
          predictWebcam();
        };
      }

      return () => {
        active = false;
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        // Don't close landmarker or stop stream here — they're managed by Preloader/App
      };
    }

    // Fallback: self-initialize (backwards compatible)
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
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
        
        if (!active) return;
        poseLandmarkerRef.current = landmarker;
        
        startCamera();
      } catch (e) {
        console.error("MediaPipe initialization failed", e);
      }
    };

    const startCamera = async () => {
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
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            syncCanvasOnce();
            setIsLoaded(true);
            predictWebcam();
          };
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    };

    initMediaPipe();

    return () => {
      active = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (poseLandmarkerRef.current) poseLandmarkerRef.current.close();
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [preloadedStream, preloadedLandmarker]);

  const predictWebcam = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const poseLandmarker = poseLandmarkerRef.current;

    if (!video || !canvas || !poseLandmarker) return;

    // Skip processing if not active, BUT allow exactly 1 frame to warm up the GPU shaders
    if (!isActiveRef.current && hasWarmedUpRef.current) {
      requestRef.current = requestAnimationFrame(predictWebcam);
      return;
    }

    let startTimeMs = performance.now();
    let results = null;

    if (video.currentTime > 0) {
      results = poseLandmarker.detectForVideo(video, startTimeMs);
    }

    // Forward segmentation mask to parent for aura effect
    if (onSegmentationMask && results && results.segmentationMasks && results.segmentationMasks.length > 0) {
      const mask = results.segmentationMasks[0];
      // getAsFloat32Array gives us per-pixel confidence (0.0–1.0)
      try {
        const maskData = mask.getAsFloat32Array();
        onSegmentationMask(maskData, canvas.width, canvas.height);
      } catch (e) {
        // Mask format not supported — silently skip
      }
    }

    const ctx = canvas.getContext("2d");
    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    let leftWrist = null;
    let rightWrist = null;

    if (results && results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
      
      leftWrist = landmarks[15]; // left wrist
      rightWrist = landmarks[16]; // right wrist

      // Smoothed wrist drawing — EMA for stability
      if (leftWrist && leftWrist.visibility > 0.4) {
        smoothLeftRef.current.x += (leftWrist.x - smoothLeftRef.current.x) * SMOOTH;
        smoothLeftRef.current.y += (leftWrist.y - smoothLeftRef.current.y) * SMOOTH;
        const sx = smoothLeftRef.current.x * cw;
        const sy = smoothLeftRef.current.y * ch;
        
        // Aesthetic Soft Rose color
        const color = '#FF9E9E'; 
        const size = 22;

        // Futuristic tech ring design for left wrist
        const time = performance.now() / 1000;
        
        ctx.save();
        ctx.translate(sx, sy);
        
        // Outer pulsing dashed ring
        ctx.rotate(time);
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.5, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 15]);
        ctx.stroke();
        
        // Inner glowing solid ring
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.8, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.setLineDash([]);
        ctx.lineWidth = 4;
        ctx.stroke();

        // Core dot
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fill();

        ctx.restore();
      }
      
      if (rightWrist && rightWrist.visibility > 0.4) {
        smoothRightRef.current.x += (rightWrist.x - smoothRightRef.current.x) * SMOOTH;
        smoothRightRef.current.y += (rightWrist.y - smoothRightRef.current.y) * SMOOTH;
        const sx = smoothRightRef.current.x * cw;
        const sy = smoothRightRef.current.y * ch;
        
        // Aesthetic Ice Blue color
        const color = '#A0E6FF'; 
        const size = 22;

        // Futuristic tech ring design for right wrist
        const time = performance.now() / 1000;
        
        ctx.save();
        ctx.translate(sx, sy);
        
        // Outer pulsing dashed ring (rotate opposite direction)
        ctx.rotate(-time);
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.5, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 15]);
        ctx.stroke();
        
        // Inner glowing solid ring
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.8, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.setLineDash([]);
        ctx.lineWidth = 4;
        ctx.stroke();

        // Core dot
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fill();

        ctx.restore();
      }
      
      // Animated dashed connection line between wrists
      if (leftWrist && rightWrist && leftWrist.visibility > 0.4 && rightWrist.visibility > 0.4) {
        const lx = smoothLeftRef.current.x * cw;
        const ly = smoothLeftRef.current.y * ch;
        const rx = smoothRightRef.current.x * cw;
        const ry = smoothRightRef.current.y * ch;
        ctx.strokeStyle = 'rgba(17, 17, 17, 0.25)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = -(performance.now() / 40); // animated dash
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(rx, ry);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Forward wrist positions to App.jsx (null if visibility too low)
    // Visibility threshold check is done here; parent handles game logic
    onPoseUpdate(
       leftWrist && leftWrist.visibility > 0.4 ? leftWrist : null, 
       rightWrist && rightWrist.visibility > 0.4 ? rightWrist : null
    );

    if (!hasWarmedUpRef.current) {
      hasWarmedUpRef.current = true;
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <div className="camera-container">
      {!isLoaded && <div className="loading-overlay">Ładowanie AI i kamery... Upewnij się, że masz połączenie z internetem.</div>}
      <video
        ref={videoRef}
        className="camera-video"
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="camera-canvas"
        width={640}
        height={480}
      />
    </div>
  );
}
