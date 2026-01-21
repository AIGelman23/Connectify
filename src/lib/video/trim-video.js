// src/lib/video/trim-video.js

/**
 * Trims a video blob to the specified start and end times using MediaRecorder re-encoding.
 * This is a client-side solution that works in modern browsers.
 *
 * @param {Blob} blob - The original video blob
 * @param {number} startTime - Start time in seconds
 * @param {number} endTime - End time in seconds
 * @returns {Promise<Blob>} - The trimmed video blob
 */
export async function trimVideo(blob, startTime, endTime) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(blob);
    video.muted = true;
    video.playsInline = true;

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };

    video.onloadedmetadata = async () => {
      try {
        // Validate times
        const duration = video.duration;
        const validStartTime = Math.max(0, Math.min(startTime, duration - 0.1));
        const validEndTime = Math.max(validStartTime + 0.1, Math.min(endTime, duration));

        // Create canvas for video frames
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');

        // Create a stream from the canvas
        const stream = canvas.captureStream(30);

        // Try to get audio track from the original video if it exists
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const source = audioCtx.createMediaElementSource(video);
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          source.connect(audioCtx.destination);

          // Add audio tracks to the stream
          dest.stream.getAudioTracks().forEach(track => {
            stream.addTrack(track);
          });
        } catch (audioError) {
          // Continue without audio if it fails
          console.warn('Could not capture audio:', audioError);
        }

        // Get supported mime type
        const mimeType = getSupportedMimeType();

        // Create MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 2500000, // 2.5 Mbps
        });

        const chunks = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          URL.revokeObjectURL(video.src);
          const trimmedBlob = new Blob(chunks, { type: mimeType });
          resolve(trimmedBlob);
        };

        mediaRecorder.onerror = (e) => {
          URL.revokeObjectURL(video.src);
          reject(e.error || new Error('MediaRecorder error'));
        };

        // Seek to start time
        video.currentTime = validStartTime;

        await new Promise((resolveSeek) => {
          video.onseeked = resolveSeek;
        });

        // Start recording
        mediaRecorder.start(100);
        video.play();

        // Draw frames to canvas
        const drawFrame = () => {
          if (video.currentTime >= validEndTime || video.paused || video.ended) {
            video.pause();
            mediaRecorder.stop();
            return;
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          requestAnimationFrame(drawFrame);
        };

        drawFrame();

        // Safety timeout - stop recording after expected duration + buffer
        const expectedDuration = (validEndTime - validStartTime) * 1000;
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            video.pause();
            mediaRecorder.stop();
          }
        }, expectedDuration + 500);

      } catch (error) {
        URL.revokeObjectURL(video.src);
        reject(error);
      }
    };
  });
}

/**
 * Gets a supported video mime type for MediaRecorder
 * @returns {string} - A supported mime type
 */
function getSupportedMimeType() {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return 'video/webm';
}

/**
 * Alternative simpler approach that just seeks the video and extracts metadata
 * without re-encoding. Returns trim times that can be used server-side.
 *
 * @param {Blob} blob - The video blob
 * @returns {Promise<{duration: number, width: number, height: number}>} Video metadata
 */
export async function getVideoMetadata(blob) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(blob);
    video.muted = true;

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };

    video.onloadedmetadata = () => {
      const metadata = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      };
      URL.revokeObjectURL(video.src);
      resolve(metadata);
    };
  });
}

export default trimVideo;
