// src/components/reels/DuetCreator.jsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { generateAndUploadThumbnail } from "@/lib/thumbnail";

const DUET_LAYOUTS = {
  SIDE_BY_SIDE: "side-by-side",
  TOP_BOTTOM: "top-bottom",
  GREEN_SCREEN: "green-screen",
};

export default function DuetCreator({ originalReel, onClose }) {
  const router = useRouter();
  const [layout, setLayout] = useState(DUET_LAYOUTS.SIDE_BY_SIDE);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("record"); // 'record' | 'preview' | 'details'
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const originalVideoRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const recordingTimerRef = useRef(null);

  const MAX_DURATION = 60; // 60 seconds max

  // Initialize camera
  useEffect(() => {
    let mounted = true;

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 720, height: 1280 },
          audio: true,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.muted = true;
          await cameraVideoRef.current.play();
        }

        setCameraReady(true);
      } catch (err) {
        console.error("Camera error:", err);
        setError("Could not access camera. Please grant permission.");
      }
    }

    initCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  // Start recording with countdown
  const startRecording = useCallback(() => {
    setCountdown(3);

    const countdownTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          beginRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    timerRef.current = countdownTimer;
  }, []);

  // Actually begin recording
  const beginRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];

    // Start original video
    if (originalVideoRef.current) {
      originalVideoRef.current.currentTime = 0;
      originalVideoRef.current.play();
    }

    // Create MediaRecorder
    const options = { mimeType: "video/webm;codecs=vp9,opus" };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = "video/webm";
    }

    const mediaRecorder = new MediaRecorder(streamRef.current, options);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
      setStep("preview");

      // Pause original video
      if (originalVideoRef.current) {
        originalVideoRef.current.pause();
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100);
    setIsRecording(true);
    setRecordingTime(0);

    // Recording timer
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= MAX_DURATION) {
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  }, [isRecording]);

  // Retake recording
  const handleRetake = useCallback(() => {
    setRecordedBlob(null);
    setRecordingTime(0);
    setStep("record");
    setCaption("");
  }, []);

  // Proceed to details
  const handleProceed = useCallback(() => {
    setStep("details");
  }, []);

  // Publish duet
  const handlePublish = async () => {
    if (!recordedBlob) return;

    setIsUploading(true);
    setUploadProgress("Generating thumbnail...");

    try {
      // Generate thumbnail
      let thumbnailUrl = null;
      try {
        thumbnailUrl = await generateAndUploadThumbnail(recordedBlob, 0.5);
      } catch (err) {
        console.warn("Thumbnail generation failed:", err);
      }

      // Upload video
      setUploadProgress("Uploading duet video...");
      const formData = new FormData();
      formData.append("file", recordedBlob, "duet.webm");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload video");

      const { url: videoUrl } = await uploadRes.json();

      // Create duet reel
      setUploadProgress("Publishing duet...");
      const reelRes = await fetch("/api/reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: caption,
          videoUrl,
          thumbnailUrl,
          isReel: true,
          duetParentId: originalReel.id,
          duetLayout: layout,
          soundId: originalReel.sound?.id || null,
        }),
      });

      if (!reelRes.ok) throw new Error("Failed to create duet");

      router.push("/reels");
    } catch (err) {
      console.error("Publish error:", err);
      setError(err.message || "Failed to publish duet");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Layout styles
  const getLayoutStyles = () => {
    switch (layout) {
      case DUET_LAYOUTS.SIDE_BY_SIDE:
        return {
          container: "flex flex-row",
          original: "w-1/2 h-full",
          camera: "w-1/2 h-full",
        };
      case DUET_LAYOUTS.TOP_BOTTOM:
        return {
          container: "flex flex-col",
          original: "w-full h-1/2",
          camera: "w-full h-1/2",
        };
      case DUET_LAYOUTS.GREEN_SCREEN:
        return {
          container: "relative",
          original: "absolute inset-0 w-full h-full",
          camera: "absolute inset-0 w-full h-full z-10 opacity-50",
        };
      default:
        return {
          container: "flex flex-row",
          original: "w-1/2 h-full",
          camera: "w-1/2 h-full",
        };
    }
  };

  const layoutStyles = getLayoutStyles();

  if (error) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-center p-6">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={onClose || (() => router.push("/reels"))}
            className="px-6 py-3 bg-gray-800 text-white rounded-xl"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={onClose || (() => router.push("/reels"))}
          className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-white font-semibold">
          {step === "record" ? "Create Duet" : step === "preview" ? "Preview" : "Add Details"}
        </div>

        {step === "record" && !isRecording && (
          <div className="flex gap-2">
            {/* Layout toggle buttons */}
            <button
              onClick={() => setLayout(DUET_LAYOUTS.SIDE_BY_SIDE)}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                layout === DUET_LAYOUTS.SIDE_BY_SIDE ? "bg-white text-black" : "bg-black/50 text-white"
              }`}
              title="Side by Side"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
              </svg>
            </button>
            <button
              onClick={() => setLayout(DUET_LAYOUTS.TOP_BOTTOM)}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                layout === DUET_LAYOUTS.TOP_BOTTOM ? "bg-white text-black" : "bg-black/50 text-white"
              }`}
              title="Top & Bottom"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 10a1 1 0 011-1h14a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
          </div>
        )}

        {step !== "record" && <div className="w-10" />}
      </div>

      {/* Main content */}
      {step === "record" && (
        <div className={`flex-1 ${layoutStyles.container}`}>
          {/* Original video */}
          <div className={`${layoutStyles.original} relative overflow-hidden`}>
            <video
              ref={originalVideoRef}
              src={originalReel.videoUrl}
              className="w-full h-full object-cover"
              loop
              playsInline
              muted={!isRecording}
            />
            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-xs">
              @{originalReel.author?.name || "Original"}
            </div>
          </div>

          {/* Camera preview */}
          <div className={`${layoutStyles.camera} relative overflow-hidden`}>
            <video
              ref={cameraVideoRef}
              className="w-full h-full object-cover scale-x-[-1]"
              playsInline
              muted
            />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
              </div>
            )}
            <div className="absolute bottom-2 right-2 bg-black/50 px-2 py-1 rounded text-white text-xs">
              You
            </div>
          </div>

          {/* Countdown overlay */}
          {countdown > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
              <span className="text-white text-8xl font-bold animate-pulse">{countdown}</span>
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-2 bg-black/70 px-4 py-2 rounded-full">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-white font-medium">{formatTime(recordingTime)}</span>
              <span className="text-gray-400">/ {formatTime(MAX_DURATION)}</span>
            </div>
          )}
        </div>
      )}

      {step === "preview" && recordedBlob && (
        <div className={`flex-1 ${layoutStyles.container}`}>
          {/* Original video */}
          <div className={`${layoutStyles.original} relative overflow-hidden`}>
            <video
              src={originalReel.videoUrl}
              className="w-full h-full object-cover"
              loop
              playsInline
              autoPlay
              muted
            />
          </div>

          {/* Recorded video */}
          <div className={`${layoutStyles.camera} relative overflow-hidden`}>
            <video
              src={URL.createObjectURL(recordedBlob)}
              className="w-full h-full object-cover scale-x-[-1]"
              loop
              playsInline
              autoPlay
              muted
            />
          </div>
        </div>
      )}

      {step === "details" && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Add Details</h2>

            {/* Preview thumbnail */}
            <div className="relative w-full aspect-video max-h-48 mx-auto mb-6 rounded-xl overflow-hidden bg-gray-900">
              <div className={`w-full h-full ${layoutStyles.container}`}>
                <video
                  src={originalReel.videoUrl}
                  className={`${layoutStyles.original} object-cover`}
                  muted
                />
                <video
                  src={recordedBlob ? URL.createObjectURL(recordedBlob) : ""}
                  className={`${layoutStyles.camera} object-cover scale-x-[-1]`}
                  muted
                />
              </div>
            </div>

            {/* Caption */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Caption</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={`Duet with @${originalReel.author?.name || "creator"}...`}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                rows={3}
                maxLength={500}
              />
              <p className="text-right text-xs text-gray-500 mt-1">{caption.length}/500</p>
            </div>

            {/* Layout indicator */}
            <div className="mb-4 p-3 bg-gray-800 rounded-xl">
              <p className="text-gray-400 text-sm">
                Layout: <span className="text-white font-medium">
                  {layout === DUET_LAYOUTS.SIDE_BY_SIDE ? "Side by Side" :
                   layout === DUET_LAYOUTS.TOP_BOTTOM ? "Top & Bottom" : "Green Screen"}
                </span>
              </p>
            </div>

            {uploadProgress && (
              <p className="text-gray-400 text-sm mb-4 text-center">{uploadProgress}</p>
            )}

            {/* Action buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleRetake}
                disabled={isUploading}
                className="flex-1 py-3 px-6 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 disabled:opacity-50"
              >
                Retake
              </button>
              <button
                onClick={handlePublish}
                disabled={isUploading}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Publishing...
                  </>
                ) : (
                  "Publish Duet"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      {step === "record" && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex items-center justify-center gap-6">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={!cameraReady || countdown > 0}
                className="w-20 h-20 rounded-full bg-red-500 border-4 border-white flex items-center justify-center disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-red-500 rounded-full"></div>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="w-20 h-20 rounded-full bg-red-500 border-4 border-white flex items-center justify-center"
              >
                <div className="w-8 h-8 bg-white rounded-sm"></div>
              </button>
            )}
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleRetake}
              className="flex-1 max-w-[150px] py-3 px-6 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700"
            >
              Retake
            </button>
            <button
              onClick={handleProceed}
              className="flex-1 max-w-[150px] py-3 px-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
