// src/hooks/useMediaStream.js
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export default function useMediaStream() {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [facingMode, setFacingMode] = useState("user");
  const [hasPermission, setHasPermission] = useState(() => {
    // Check if we've previously granted permission (stored in localStorage)
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cameraPermissionGranted') === 'true' ? true : null;
    }
    return null;
  });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomCapabilities, setZoomCapabilities] = useState({ min: 1, max: 1, step: 0.1 });
  const streamRef = useRef(null);

  // Helper to grant permission and save to localStorage
  const grantPermission = useCallback(() => {
    setHasPermission(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cameraPermissionGranted', 'true');
    }
  }, []);

  const startStream = useCallback(async () => {
    // Debugging: Check environment and devices
    if (typeof window !== "undefined" && !window.isSecureContext) {
      console.error(
        "Camera access requires a secure context (HTTPS or localhost)"
      );
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("navigator.mediaDevices.getUserMedia is not supported");
      setError("Camera API not supported in this browser");
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log(
        "Available Media Devices:",
        JSON.stringify(
          devices.map((d) => ({
            kind: d.kind,
            label: d.label || "(unknown - permission not granted yet)",
            deviceId: d.deviceId,
          })),
          null,
          2
        )
      );

      const hasVideo = devices.some((d) => d.kind === "videoinput");
      if (!hasVideo) {
        console.warn(
          "No videoinput devices detected. This is likely why getUserMedia fails with NotFoundError."
        );
      }
    } catch (e) {
      console.warn("Failed to enumerate devices:", e);
    }

    // Check Permissions API
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permissionStatus = await navigator.permissions.query({
          name: "camera",
        });
        console.log("Camera Permission Status:", permissionStatus.state);
        permissionStatus.onchange = () => {
          console.log("Camera permission changed to:", permissionStatus.state);
        };
      } catch (e) {
        // Some browsers might not support 'camera' in permissions query
        console.log("Permissions API check for camera not supported:", e);
      }
    }

    setIsLoading(true);
    setError(null);

    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      // Request the highest resolution available for maximum field of view
      // Modern phones support 4K, laptops typically support 1080p or higher
      // Not constraining aspect ratio lets the camera use its native FOV
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          // Request highest available resolution
          width: { ideal: 3840, min: 640 },  // Up to 4K
          height: { ideal: 2160, min: 480 }, // Up to 4K
          frameRate: { ideal: 30, min: 24 },
          // Explicitly request wide angle if available (for devices with multiple lenses)
          // This helps avoid the telephoto lens which would be more zoomed in
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      grantPermission();

      // Check zoom capabilities and set to widest view (minimum zoom)
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const capabilities = videoTrack.getCapabilities();
          if (capabilities.zoom) {
            const minZoom = capabilities.zoom.min || 1;
            setZoomCapabilities({
              min: minZoom,
              max: capabilities.zoom.max || 1,
              step: capabilities.zoom.step || 0.1,
            });
            // Start at minimum zoom for widest field of view
            setZoomLevel(minZoom);
            // Apply minimum zoom immediately
            await videoTrack.applyConstraints({
              advanced: [{ zoom: minZoom }],
            });
          }
        } catch (e) {
          console.log("Zoom capabilities not available:", e);
        }
      }
    } catch (err) {
      console.error(
        "Initial camera access failed:",
        err.name,
        err.message,
        err
      );

      // Fallback: Try basic constraints if advanced ones fail
      if (err.name === "OverconstrainedError" || err.name === "NotFoundError") {
        try {
          console.warn(
            "Advanced constraints failed, trying basic constraints..."
          );
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          streamRef.current = fallbackStream;
          setStream(fallbackStream);
          grantPermission();
          return;
        } catch (fallbackErr) {
          console.warn("Fallback constraints also failed.");

          // Second Fallback: Try video only (in case audio device is missing or denied)
          try {
            console.warn("Trying video-only constraints...");
            const videoOnlyStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
            streamRef.current = videoOnlyStream;
            setStream(videoOnlyStream);
            grantPermission();
            return;
          } catch (videoErr) {
            console.warn("Video-only fallback failed.");
          }
        }
      }

      console.error("Error accessing media devices:", err);
      setError(err.message || "Failed to access camera");
      setHasPermission(false);

      if (err.name === "NotAllowedError") {
        setError(
          "Camera access denied. Please reset permissions in your browser address bar."
        );
      } else if (err.name === "NotFoundError") {
        setError(
          "No camera detected. Please check your system privacy settings (OS level)."
        );
      } else if (err.name === "NotReadableError") {
        setError("Camera is already in use by another application.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [facingMode]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  const flipCamera = useCallback(async () => {
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    const oldStream = streamRef.current;

    setIsFlipping(true);

    try {
      // Get new stream first BEFORE stopping old one
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacingMode,
          width: { ideal: 3840, min: 640 },
          height: { ideal: 2160, min: 480 },
          frameRate: { ideal: 30, min: 24 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Now stop old stream
      if (oldStream) {
        oldStream.getTracks().forEach((track) => track.stop());
      }

      // Update state with new stream
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setFacingMode(newFacingMode);

      // Reset zoom for new camera
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const capabilities = videoTrack.getCapabilities();
          if (capabilities.zoom) {
            const minZoom = capabilities.zoom.min || 1;
            setZoomCapabilities({
              min: minZoom,
              max: capabilities.zoom.max || 1,
              step: capabilities.zoom.step || 0.1,
            });
            setZoomLevel(minZoom);
            await videoTrack.applyConstraints({
              advanced: [{ zoom: minZoom }],
            });
          } else {
            setZoomCapabilities({ min: 1, max: 1, step: 0.1 });
            setZoomLevel(1);
          }
        } catch (e) {
          console.log("Zoom not available on this camera");
          setZoomCapabilities({ min: 1, max: 1, step: 0.1 });
          setZoomLevel(1);
        }
      }
    } catch (err) {
      console.error("Failed to flip camera:", err);
      // Keep the old stream if flip fails
    } finally {
      setIsFlipping(false);
    }
  }, [facingMode]);

  const setZoom = useCallback(async (level) => {
    if (!streamRef.current) return;

    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const capabilities = videoTrack.getCapabilities();
      if (capabilities.zoom) {
        const clampedLevel = Math.max(
          capabilities.zoom.min || 1,
          Math.min(capabilities.zoom.max || 1, level)
        );
        await videoTrack.applyConstraints({
          advanced: [{ zoom: clampedLevel }],
        });
        setZoomLevel(clampedLevel);
      }
    } catch (e) {
      console.log("Failed to set zoom:", e);
    }
  }, []);

  // Note: flipCamera now handles stream restart internally
  // This effect is no longer needed for camera flip

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    stream,
    error,
    isLoading,
    isFlipping,
    hasPermission,
    facingMode,
    zoomLevel,
    zoomCapabilities,
    startStream,
    stopStream,
    flipCamera,
    setZoom,
  };
}
