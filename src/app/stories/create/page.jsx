// src/app/stories/create/page.jsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/NavBar";
import ConnectifyLogo from "@/components/ConnectifyLogo";
import SoundPicker from "@/components/reels/SoundPicker";
import StickerPicker from "@/components/stories/StickerPicker";
import MentionInput from "@/components/stories/MentionInput";
import LocationPicker from "@/components/stories/LocationPicker";
import { generateAndUploadThumbnail } from "@/lib/thumbnail";

// Gradient presets for text stories
const GRADIENT_PRESETS = [
  { id: 'sunset', colors: ['#ff512f', '#dd2476'], name: 'Sunset' },
  { id: 'ocean', colors: ['#2193b0', '#6dd5ed'], name: 'Ocean' },
  { id: 'purple', colors: ['#8E2DE2', '#4A00E0'], name: 'Purple' },
  { id: 'fire', colors: ['#f12711', '#f5af19'], name: 'Fire' },
  { id: 'mint', colors: ['#00b09b', '#96c93d'], name: 'Mint' },
  { id: 'night', colors: ['#0f0c29', '#302b63', '#24243e'], name: 'Night' },
  { id: 'cotton', colors: ['#ff9a9e', '#fecfef'], name: 'Cotton' },
  { id: 'cosmic', colors: ['#ff00cc', '#333399'], name: 'Cosmic' },
  { id: 'forest', colors: ['#134e5e', '#71b280'], name: 'Forest' },
  { id: 'gold', colors: ['#f7971e', '#ffd200'], name: 'Gold' },
];

// Photo filter presets
const FILTER_PRESETS = [
  { id: 'none', name: 'Normal', css: 'none' },
  { id: 'grayscale', name: 'B&W', css: 'grayscale(100%)' },
  { id: 'sepia', name: 'Sepia', css: 'sepia(80%)' },
  { id: 'warm', name: 'Warm', css: 'sepia(30%) saturate(140%) brightness(105%)' },
  { id: 'cool', name: 'Cool', css: 'saturate(80%) hue-rotate(10deg) brightness(105%)' },
  { id: 'vintage', name: 'Vintage', css: 'sepia(40%) contrast(90%) brightness(90%)' },
  { id: 'dramatic', name: 'Dramatic', css: 'contrast(130%) brightness(90%)' },
  { id: 'fade', name: 'Fade', css: 'contrast(90%) brightness(110%) saturate(80%)' },
  { id: 'vivid', name: 'Vivid', css: 'saturate(150%) contrast(110%)' },
  { id: 'noir', name: 'Noir', css: 'grayscale(100%) contrast(120%) brightness(90%)' },
];

export default function CreateStoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState("mode"); // 'mode' | 'capture' | 'text' | 'edit' | 'publish'
  const [storyMode, setStoryMode] = useState(null); // 'camera' | 'text' | 'upload'
  const [mediaBlob, setMediaBlob] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'image' | 'video' | 'text'
  const [mediaUrl, setMediaUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState("");

  // Edit options
  const [caption, setCaption] = useState("");
  const [textOverlays, setTextOverlays] = useState([]);
  const [selectedSound, setSelectedSound] = useState(null);
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [stickers, setStickers] = useState([]);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [mentions, setMentions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Text story options
  const [textStoryContent, setTextStoryContent] = useState("");
  const [selectedGradient, setSelectedGradient] = useState(GRADIENT_PRESETS[0]);
  const [textStoryFontSize, setTextStoryFontSize] = useState(28);

  // Camera state
  const [facingMode, setFacingMode] = useState("user");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  // Text overlay editing
  const [editingText, setEditingText] = useState(null);
  const [newTextValue, setNewTextValue] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textBgColor, setTextBgColor] = useState("transparent");

  // Refs
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const canvasRef = useRef(null);
  const textStoryCanvasRef = useRef(null);

  const MAX_RECORDING_TIME = 15; // 15 seconds max for stories

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    setIsLoading(false);
  }, [status, router]);

  // Initialize camera
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: true,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError("Unable to access camera. Please check permissions.");
    }
  }, [facingMode]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Start camera on capture step
  useEffect(() => {
    if (step === "capture" && !mediaBlob) {
      startCamera();
    }
    return () => {
      if (step !== "capture") {
        stopCamera();
      }
    };
  }, [step, mediaBlob, startCamera, stopCamera]);

  // Switch camera
  const switchCamera = () => {
    stopCamera();
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Take photo
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Mirror if front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        setMediaBlob(blob);
        setMediaType("image");
        setMediaUrl(URL.createObjectURL(blob));
        stopCamera();
        setStep("edit");
      },
      "image/jpeg",
      0.9
    );
  };

  // Start recording
  const startRecording = () => {
    if (!stream) return;

    chunksRef.current = [];
    const options = { mimeType: "video/webm;codecs=vp9,opus" };

    try {
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setMediaBlob(blob);
        setMediaType("video");
        setMediaUrl(URL.createObjectURL(blob));
        stopCamera();
        setStep("edit");
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      // Recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_RECORDING_TIME) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Recording error:", err);
      setUploadError("Failed to start recording");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  // Handle file upload
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      setUploadError("Please select an image or video file");
      return;
    }

    setMediaBlob(file);
    setMediaType(isVideo ? "video" : "image");
    setMediaUrl(URL.createObjectURL(file));
    stopCamera();
    setStep("edit");
  };

  // Add text overlay
  const addTextOverlay = () => {
    const newOverlay = {
      id: Date.now(),
      text: "Tap to edit",
      x: 50, // percentage
      y: 50, // percentage
      color: "#ffffff",
      bgColor: "transparent",
      fontSize: 24,
    };
    setTextOverlays([...textOverlays, newOverlay]);
    setEditingText(newOverlay.id);
    setNewTextValue("Tap to edit");
  };

  // Update text overlay
  const updateTextOverlay = (id, updates) => {
    setTextOverlays((prev) =>
      prev.map((overlay) =>
        overlay.id === id ? { ...overlay, ...updates } : overlay
      )
    );
  };

  // Delete text overlay
  const deleteTextOverlay = (id) => {
    setTextOverlays((prev) => prev.filter((overlay) => overlay.id !== id));
    if (editingText === id) {
      setEditingText(null);
    }
  };

  // Save text edit
  const saveTextEdit = () => {
    if (editingText && newTextValue.trim()) {
      updateTextOverlay(editingText, {
        text: newTextValue.trim(),
        color: textColor,
        bgColor: textBgColor,
      });
    }
    setEditingText(null);
    setNewTextValue("");
  };

  // Retake
  const handleRetake = () => {
    setMediaBlob(null);
    setMediaType(null);
    setMediaUrl(null);
    setCaption("");
    setTextOverlays([]);
    setSelectedSound(null);
    setSelectedFilter('none');
    setStickers([]);
    setMentions([]);
    setSelectedLocation(null);
    setTextStoryContent("");
    setSelectedGradient(GRADIENT_PRESETS[0]);
    setStep("mode");
    setStoryMode(null);
  };

  // Generate text story image from canvas
  const generateTextStoryImage = () => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Story dimensions (9:16 aspect ratio)
      canvas.width = 1080;
      canvas.height = 1920;
      
      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      selectedGradient.colors.forEach((color, index) => {
        gradient.addColorStop(index / (selectedGradient.colors.length - 1), color);
      });
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw text
      if (textStoryContent) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${textStoryFontSize * 3}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Word wrap
        const words = textStoryContent.split(' ');
        const lines = [];
        let currentLine = '';
        const maxWidth = canvas.width - 120;
        
        words.forEach(word => {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        });
        if (currentLine) lines.push(currentLine);
        
        // Draw lines centered
        const lineHeight = textStoryFontSize * 3.5;
        const totalHeight = lines.length * lineHeight;
        const startY = (canvas.height - totalHeight) / 2 + lineHeight / 2;
        
        lines.forEach((line, index) => {
          // Text shadow for readability
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          ctx.fillText(line, canvas.width / 2, startY + index * lineHeight);
        });
      }
      
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.9);
    });
  };

  // Publish story
  const handlePublish = async () => {
    // For text stories, generate image first
    let blobToUpload = mediaBlob;
    let typeToUpload = mediaType;
    
    if (storyMode === 'text') {
      if (!textStoryContent.trim()) {
        setUploadError("Please enter some text for your story");
        return;
      }
      blobToUpload = await generateTextStoryImage();
      typeToUpload = 'image';
    }
    
    if (!blobToUpload) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress("Uploading media...");

    try {
      // Upload media file
      const formData = new FormData();
      const filename = typeToUpload === "video" ? "story.webm" : "story.jpg";
      formData.append("file", blobToUpload, filename);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload media");
      }

      const uploadData = await uploadRes.json();
      const uploadedMediaUrl = uploadData.url;

      // Generate thumbnail for videos
      let thumbnailUrl = null;
      if (typeToUpload === "video") {
        setUploadProgress("Generating thumbnail...");
        try {
          thumbnailUrl = await generateAndUploadThumbnail(blobToUpload, 0.5);
        } catch (err) {
          console.warn("Thumbnail generation failed:", err);
        }
      }

      // Create story
      setUploadProgress("Publishing story...");
      const storyRes = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaUrl: uploadedMediaUrl,
          mediaType: typeToUpload,
          thumbnailUrl,
          caption: caption.trim() || null,
          duration: typeToUpload === "video" ? recordingTime * 1000 : 5000,
          musicId: selectedSound?.id || null,
          textOverlays: textOverlays.length > 0 ? JSON.stringify(textOverlays) : null,
          stickers: stickers.length > 0 ? JSON.stringify(stickers) : null,
          mentions: mentions.length > 0 ? JSON.stringify(mentions) : null,
          location: selectedLocation ? selectedLocation.name : null,
          filters: selectedFilter !== 'none' ? JSON.stringify({ filter: selectedFilter }) : null,
          backgroundColor: storyMode === 'text' ? JSON.stringify(selectedGradient) : null,
        }),
      });

      if (!storyRes.ok) {
        const errorData = await storyRes.json();
        throw new Error(errorData.error || "Failed to create story");
      }

      // Success - redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error("Publish error:", err);
      setUploadError(err.message || "Failed to publish story");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  // Loading state
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <ConnectifyLogo width={200} height={200} className="animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Navbar - hidden on mobile */}
      <div className="hidden md:block">
        <Navbar session={session} router={router} />
      </div>

      <main className="flex-1 relative">
        {/* Back button */}
        <button
          onClick={() => {
            if (step === "mode") {
              router.back();
            } else if (step === "capture" || step === "text") {
              stopCamera();
              setStep("mode");
              setStoryMode(null);
            } else if (step === "edit") {
              if (storyMode === 'text') {
                setStep("text");
              } else {
                handleRetake();
              }
            } else {
              setStep("edit");
            }
          }}
          className="fixed top-4 left-4 z-50 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center"
          aria-label="Go back"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* MODE SELECTION STEP */}
        {step === "mode" && (
          <div className="min-h-screen flex flex-col items-center justify-center p-8">
            <h1 className="text-2xl font-bold text-white mb-2">Create Story</h1>
            <p className="text-gray-400 mb-8">Choose how you want to share</p>
            
            <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
              {/* Camera option */}
              <button
                onClick={() => {
                  setStoryMode('camera');
                  setStep('capture');
                }}
                className="p-6 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl flex items-center gap-4 hover:opacity-90 transition-opacity"
              >
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <i className="fas fa-camera text-white text-xl"></i>
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold text-lg">Camera</p>
                  <p className="text-white/70 text-sm">Take a photo or video</p>
                </div>
              </button>
              
              {/* Text story option */}
              <button
                onClick={() => {
                  setStoryMode('text');
                  setStep('text');
                }}
                className="p-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center gap-4 hover:opacity-90 transition-opacity"
              >
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <i className="fas fa-font text-white text-xl"></i>
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold text-lg">Text</p>
                  <p className="text-white/70 text-sm">Share your thoughts</p>
                </div>
              </button>
              
              {/* Upload option */}
              <button
                onClick={() => {
                  setStoryMode('upload');
                  fileInputRef.current?.click();
                }}
                className="p-6 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl flex items-center gap-4 hover:opacity-90 transition-opacity"
              >
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <i className="fas fa-images text-white text-xl"></i>
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold text-lg">Upload</p>
                  <p className="text-white/70 text-sm">From your gallery</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* TEXT STORY CREATION STEP */}
        {step === "text" && (
          <div className="min-h-screen flex flex-col">
            {/* Preview with gradient */}
            <div 
              className="flex-1 relative flex items-center justify-center p-8"
              style={{
                background: `linear-gradient(135deg, ${selectedGradient.colors.join(', ')})`
              }}
            >
              <textarea
                value={textStoryContent}
                onChange={(e) => setTextStoryContent(e.target.value)}
                placeholder="Type something..."
                maxLength={280}
                autoFocus
                className="w-full max-w-lg text-center bg-transparent border-none outline-none text-white font-bold placeholder-white/50 resize-none"
                style={{ fontSize: `${textStoryFontSize}px` }}
                rows={5}
              />
              
              {/* Font size controls */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                <button
                  onClick={() => setTextStoryFontSize(Math.min(48, textStoryFontSize + 4))}
                  className="w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50"
                >
                  <i className="fas fa-plus"></i>
                </button>
                <button
                  onClick={() => setTextStoryFontSize(Math.max(16, textStoryFontSize - 4))}
                  className="w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50"
                >
                  <i className="fas fa-minus"></i>
                </button>
              </div>
            </div>
            
            {/* Gradient selector */}
            <div className="bg-black/90 p-4">
              <p className="text-white/60 text-xs mb-2 text-center">Background</p>
              <div className="flex gap-2 justify-center overflow-x-auto pb-2">
                {GRADIENT_PRESETS.map((gradient) => (
                  <button
                    key={gradient.id}
                    onClick={() => setSelectedGradient(gradient)}
                    className={`w-10 h-10 rounded-full flex-shrink-0 border-2 transition-transform ${
                      selectedGradient.id === gradient.id 
                        ? 'border-white scale-110' 
                        : 'border-transparent'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${gradient.colors.join(', ')})`
                    }}
                    title={gradient.name}
                  />
                ))}
              </div>
              
              <p className="text-right text-xs text-slate-500 mt-2">{textStoryContent.length}/280</p>
              
              {/* Continue button */}
              <button
                onClick={() => setStep('edit')}
                disabled={!textStoryContent.trim()}
                className="w-full mt-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* CAPTURE STEP */}
        {step === "capture" && (
          <div className="min-h-screen flex flex-col">
            {/* Camera preview */}
            <div className="flex-1 relative bg-black">
              {cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8">
                  <i className="fas fa-camera-slash text-4xl mb-4 opacity-50"></i>
                  <p className="text-center mb-4">{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${
                    facingMode === "user" ? "scale-x-[-1]" : ""
                  }`}
                />
              )}

              {/* Recording indicator */}
              {isRecording && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-500/80 px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-white text-sm font-medium">
                    {recordingTime}s / {MAX_RECORDING_TIME}s
                  </span>
                </div>
              )}

              {/* Top controls */}
              <div className="absolute top-4 right-4 flex flex-col gap-3">
                <button
                  onClick={switchCamera}
                  className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center"
                >
                  <i className="fas fa-sync-alt text-white"></i>
                </button>
              </div>
            </div>

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 pb-8 pt-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-center gap-8">
                {/* Gallery button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 rounded-xl border-2 border-white/50 overflow-hidden flex items-center justify-center"
                >
                  <i className="fas fa-images text-white text-lg"></i>
                </button>

                {/* Capture button */}
                <div className="relative">
                  {isRecording ? (
                    <button
                      onClick={stopRecording}
                      className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center border-4 border-white"
                    >
                      <div className="w-8 h-8 bg-white rounded-sm"></div>
                    </button>
                  ) : (
                    <button
                      onClick={takePhoto}
                      onTouchStart={startRecording}
                      onMouseDown={startRecording}
                      className="w-20 h-20 rounded-full bg-white flex items-center justify-center border-4 border-white/50 hover:scale-105 transition-transform active:scale-95"
                    >
                      <div className="w-16 h-16 rounded-full bg-white border-2 border-gray-200"></div>
                    </button>
                  )}
                </div>

                {/* Placeholder for symmetry */}
                <div className="w-12 h-12"></div>
              </div>

              <p className="text-center text-white/60 text-xs mt-4">
                Tap for photo, hold for video
              </p>
            </div>
          </div>
        )}

        {/* EDIT STEP */}
        {step === "edit" && (mediaUrl || storyMode === 'text') && (
          <div className="min-h-screen flex flex-col">
            {/* Media preview with overlays */}
            <div className="flex-1 relative bg-black">
              {/* Text story preview */}
              {storyMode === 'text' ? (
                <div 
                  className="w-full h-full flex items-center justify-center p-8"
                  style={{
                    background: `linear-gradient(135deg, ${selectedGradient.colors.join(', ')})`
                  }}
                >
                  <p 
                    className="text-white font-bold text-center max-w-lg break-words"
                    style={{ 
                      fontSize: `${textStoryFontSize}px`,
                      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {textStoryContent}
                  </p>
                </div>
              ) : mediaType === "video" ? (
                <video
                  src={mediaUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                  style={{ 
                    filter: FILTER_PRESETS.find(f => f.id === selectedFilter)?.css || 'none' 
                  }}
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt="Story preview"
                  className="w-full h-full object-contain"
                  style={{ 
                    filter: FILTER_PRESETS.find(f => f.id === selectedFilter)?.css || 'none' 
                  }}
                />
              )}

              {/* Text overlays */}
              {textOverlays.map((overlay) => (
                <div
                  key={overlay.id}
                  className="absolute cursor-move select-none"
                  style={{
                    left: `${overlay.x}%`,
                    top: `${overlay.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onClick={() => {
                    setEditingText(overlay.id);
                    setNewTextValue(overlay.text);
                    setTextColor(overlay.color);
                    setTextBgColor(overlay.bgColor);
                  }}
                >
                  <span
                    style={{
                      color: overlay.color,
                      backgroundColor: overlay.bgColor,
                      fontSize: `${overlay.fontSize}px`,
                    }}
                    className="px-2 py-1 rounded font-semibold whitespace-nowrap"
                  >
                    {overlay.text}
                  </span>
                </div>
              ))}

              {/* Stickers */}
              {stickers.map((sticker) => (
                <div
                  key={sticker.id}
                  className="absolute cursor-move select-none group"
                  style={{
                    left: `${sticker.x}%`,
                    top: `${sticker.y}%`,
                    transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
                  }}
                >
                  <img
                    src={sticker.url}
                    alt="Sticker"
                    className="max-w-[120px] pointer-events-none"
                    draggable={false}
                  />
                  {/* Delete button */}
                  <button
                    onClick={() => setStickers((prev) => prev.filter((s) => s.id !== sticker.id))}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}

              {/* Add button (opens modal) */}
              <button
                onClick={() => setShowAddModal(true)}
                className="absolute top-1/2 right-4 -translate-y-1/2 w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                title="Add to Story"
              >
                <i className="fas fa-plus text-white text-xl"></i>
              </button>

              {/* Active items indicators */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                {selectedSound && (
                  <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <i className="fas fa-music text-pink-400 text-xs"></i>
                    <span className="text-white text-xs truncate max-w-[100px]">{selectedSound.name}</span>
                  </div>
                )}
                {stickers.length > 0 && (
                  <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <i className="fas fa-sticky-note text-pink-400 text-xs"></i>
                    <span className="text-white text-xs">{stickers.length} sticker{stickers.length > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              {/* Location indicator on preview */}
              {selectedLocation && (
                <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-full">
                  <i className="fas fa-map-marker-alt text-pink-400 text-sm"></i>
                  <span className="text-white text-sm font-medium">{selectedLocation.name}</span>
                </div>
              )}
            </div>

            {/* ADD TO STORY MODAL */}
            {showAddModal && (
              <div className="fixed inset-0 z-50 flex items-end justify-center">
                <div 
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setShowAddModal(false)}
                />
                <div className="relative bg-slate-900 rounded-t-3xl w-full max-w-lg p-6 animate-slide-up">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Add to Story</h2>
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    {/* Text */}
                    <button
                      onClick={() => {
                        setShowAddModal(false);
                        addTextOverlay();
                      }}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <i className="fas fa-font text-white text-lg"></i>
                      </div>
                      <span className="text-white text-xs font-medium">Text</span>
                    </button>

                    {/* Stickers */}
                    <button
                      onClick={() => {
                        setShowAddModal(false);
                        setShowStickerPicker(true);
                      }}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-colors"
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        stickers.length > 0 
                          ? 'bg-gradient-to-br from-pink-500 to-purple-600' 
                          : 'bg-gradient-to-br from-yellow-500 to-orange-500'
                      }`}>
                        <i className="fas fa-sticky-note text-white text-lg"></i>
                      </div>
                      <span className="text-white text-xs font-medium">Stickers</span>
                    </button>

                    {/* Music */}
                    <button
                      onClick={() => {
                        setShowAddModal(false);
                        setShowSoundPicker(true);
                      }}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-colors"
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        selectedSound 
                          ? 'bg-gradient-to-br from-pink-500 to-purple-600' 
                          : 'bg-gradient-to-br from-purple-500 to-pink-500'
                      }`}>
                        <i className="fas fa-music text-white text-lg"></i>
                      </div>
                      <span className="text-white text-xs font-medium">Music</span>
                    </button>

                    {/* Location */}
                    <button
                      onClick={() => {
                        setShowAddModal(false);
                        setShowLocationPicker(true);
                      }}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-colors"
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        selectedLocation 
                          ? 'bg-gradient-to-br from-pink-500 to-purple-600' 
                          : 'bg-gradient-to-br from-green-500 to-emerald-500'
                      }`}>
                        <i className="fas fa-map-marker-alt text-white text-lg"></i>
                      </div>
                      <span className="text-white text-xs font-medium">Location</span>
                    </button>

                    {/* Mention */}
                    <button
                      onClick={() => {
                        setShowAddModal(false);
                        // Focus the caption input and add @
                        setCaption((prev) => prev + '@');
                      }}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
                        <i className="fas fa-at text-white text-lg"></i>
                      </div>
                      <span className="text-white text-xs font-medium">Mention</span>
                    </button>

                    {/* Hashtag */}
                    <button
                      onClick={() => {
                        setShowAddModal(false);
                        setCaption((prev) => prev + '#');
                      }}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                        <i className="fas fa-hashtag text-white text-lg"></i>
                      </div>
                      <span className="text-white text-xs font-medium">Hashtag</span>
                    </button>

                    {/* Link (placeholder for future) */}
                    <button
                      onClick={() => {
                        setShowAddModal(false);
                        alert('Link feature coming soon!');
                      }}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-colors opacity-50"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                        <i className="fas fa-link text-white text-lg"></i>
                      </div>
                      <span className="text-white text-xs font-medium">Link</span>
                    </button>

                    {/* Poll (placeholder for future) */}
                    <button
                      onClick={() => {
                        setShowAddModal(false);
                        alert('Poll feature coming soon!');
                      }}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-colors opacity-50"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                        <i className="fas fa-poll text-white text-lg"></i>
                      </div>
                      <span className="text-white text-xs font-medium">Poll</span>
                    </button>
                  </div>

                  {/* Current selections summary */}
                  {(selectedSound || selectedLocation || stickers.length > 0 || textOverlays.length > 0) && (
                    <div className="mt-6 pt-4 border-t border-slate-700">
                      <p className="text-xs text-slate-400 mb-3">Added to this story:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedSound && (
                          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full">
                            <i className="fas fa-music text-pink-400 text-xs"></i>
                            <span className="text-white text-xs truncate max-w-[80px]">{selectedSound.name}</span>
                            <button onClick={() => setSelectedSound(null)} className="text-slate-400 hover:text-red-400">
                              <i className="fas fa-times text-xs"></i>
                            </button>
                          </div>
                        )}
                        {selectedLocation && (
                          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full">
                            <i className="fas fa-map-marker-alt text-pink-400 text-xs"></i>
                            <span className="text-white text-xs truncate max-w-[80px]">{selectedLocation.name}</span>
                            <button onClick={() => setSelectedLocation(null)} className="text-slate-400 hover:text-red-400">
                              <i className="fas fa-times text-xs"></i>
                            </button>
                          </div>
                        )}
                        {stickers.length > 0 && (
                          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full">
                            <i className="fas fa-sticky-note text-pink-400 text-xs"></i>
                            <span className="text-white text-xs">{stickers.length} sticker{stickers.length > 1 ? 's' : ''}</span>
                            <button onClick={() => setStickers([])} className="text-slate-400 hover:text-red-400">
                              <i className="fas fa-times text-xs"></i>
                            </button>
                          </div>
                        )}
                        {textOverlays.length > 0 && (
                          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full">
                            <i className="fas fa-font text-pink-400 text-xs"></i>
                            <span className="text-white text-xs">{textOverlays.length} text{textOverlays.length > 1 ? 's' : ''}</span>
                            <button onClick={() => setTextOverlays([])} className="text-slate-400 hover:text-red-400">
                              <i className="fas fa-times text-xs"></i>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Text editing modal */}
            {editingText && (
              <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md">
                  <h3 className="text-white font-semibold mb-4">Edit Text</h3>
                  
                  <input
                    type="text"
                    value={newTextValue}
                    onChange={(e) => setNewTextValue(e.target.value)}
                    placeholder="Enter text..."
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 mb-4"
                    autoFocus
                  />

                  {/* Color options */}
                  <div className="flex items-center gap-4 mb-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Text Color</label>
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Background</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setTextBgColor("transparent")}
                          className={`w-8 h-8 rounded border-2 ${
                            textBgColor === "transparent"
                              ? "border-pink-500"
                              : "border-slate-600"
                          }`}
                          style={{ background: "repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 8px 8px" }}
                        />
                        <button
                          onClick={() => setTextBgColor("#000000")}
                          className={`w-8 h-8 rounded bg-black border-2 ${
                            textBgColor === "#000000"
                              ? "border-pink-500"
                              : "border-slate-600"
                          }`}
                        />
                        <button
                          onClick={() => setTextBgColor("#ffffff")}
                          className={`w-8 h-8 rounded bg-white border-2 ${
                            textBgColor === "#ffffff"
                              ? "border-pink-500"
                              : "border-slate-600"
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => deleteTextOverlay(editingText)}
                      className="flex-1 py-3 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setEditingText(null)}
                      className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveTextEdit}
                      className="flex-1 py-3 bg-pink-500 text-white rounded-xl font-medium hover:bg-pink-600"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom panel */}
            <div className="bg-black/90 p-4">
              {/* Filter selector - only for camera/upload (images) */}
              {storyMode !== 'text' && mediaType === 'image' && (
                <div className="mb-4">
                  <p className="text-white/60 text-xs mb-2">Filters</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {FILTER_PRESETS.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setSelectedFilter(filter.id)}
                        className={`flex-shrink-0 flex flex-col items-center gap-1 ${
                          selectedFilter === filter.id ? 'opacity-100' : 'opacity-60'
                        }`}
                      >
                        <div 
                          className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                            selectedFilter === filter.id 
                              ? 'border-pink-500 scale-105' 
                              : 'border-transparent'
                          }`}
                        >
                          <img
                            src={mediaUrl}
                            alt={filter.name}
                            className="w-full h-full object-cover"
                            style={{ filter: filter.css }}
                          />
                        </div>
                        <span className={`text-xs ${
                          selectedFilter === filter.id ? 'text-pink-500 font-medium' : 'text-white/60'
                        }`}>
                          {filter.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Gradient selector for text stories in edit mode */}
              {storyMode === 'text' && (
                <div className="mb-4">
                  <p className="text-white/60 text-xs mb-2">Background</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {GRADIENT_PRESETS.map((gradient) => (
                      <button
                        key={gradient.id}
                        onClick={() => setSelectedGradient(gradient)}
                        className={`w-10 h-10 rounded-full flex-shrink-0 border-2 transition-transform ${
                          selectedGradient.id === gradient.id 
                            ? 'border-white scale-110' 
                            : 'border-transparent'
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${gradient.colors.join(', ')})`
                        }}
                        title={gradient.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Caption input with @mentions */}
              <div className="mb-4">
                <MentionInput
                  value={caption}
                  onChange={setCaption}
                  placeholder="Add a caption... Use @ to mention"
                  maxLength={200}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  onMentionsChange={setMentions}
                />
              </div>

              {/* Selected sound indicator */}
              {selectedSound && (
                <div className="mb-4 flex items-center justify-between bg-slate-800 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <i className="fas fa-music text-white text-sm"></i>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{selectedSound.name}</p>
                      <p className="text-slate-400 text-xs">{selectedSound.artist || "Original sound"}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSound(null)}
                    className="text-slate-400 hover:text-red-400"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )}

              {/* Error message */}
              {uploadError && (
                <p className="text-red-500 text-sm text-center mb-4">{uploadError}</p>
              )}

              {/* Progress message */}
              {isUploading && uploadProgress && (
                <p className="text-slate-400 text-sm text-center mb-4">{uploadProgress}</p>
              )}

              {/* Action buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleRetake}
                  disabled={isUploading}
                  className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 disabled:opacity-50"
                >
                  Retake
                </button>
                <button
                  onClick={handlePublish}
                  disabled={isUploading}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Publishing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane mr-2"></i>
                      Share Story
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sound Picker Modal */}
        <SoundPicker
          isOpen={showSoundPicker}
          onClose={() => setShowSoundPicker(false)}
          onSelect={setSelectedSound}
          selectedSound={selectedSound}
        />

        {/* Sticker Picker Modal */}
        <StickerPicker
          isOpen={showStickerPicker}
          onClose={() => setShowStickerPicker(false)}
          onSelect={(sticker) => setStickers((prev) => [...prev, sticker])}
        />

        {/* Location Picker Modal */}
        <LocationPicker
          isOpen={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onSelect={setSelectedLocation}
          selectedLocation={selectedLocation}
        />

        {/* Animation styles */}
        <style jsx>{`
          @keyframes slide-up {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          :global(.animate-slide-up) {
            animation: slide-up 0.3s ease-out;
          }
        `}</style>
      </main>
    </div>
  );
}
