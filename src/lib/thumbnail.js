/**
 * Generate a thumbnail from a video file
 * @param {File|Blob} videoFile - The video file
 * @param {number} timeInSeconds - The time to capture the thumbnail (default: 0.5)
 * @param {Object} options - Options for thumbnail generation
 * @returns {Promise<Blob>} The thumbnail as a Blob
 */
export async function generateThumbnail(videoFile, timeInSeconds = 0.5, options = {}) {
  const {
    maxWidth = 720,
    maxHeight = 1280,
    quality = 0.8,
    format = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(videoFile);
    video.src = url;

    video.onloadedmetadata = () => {
      // Seek to the specified time
      video.currentTime = Math.min(timeInSeconds, video.duration);
    };

    video.onseeked = () => {
      try {
        // Calculate dimensions maintaining aspect ratio
        let width = video.videoWidth;
        let height = video.videoHeight;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw the video frame
        ctx.drawImage(video, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate thumbnail'));
            }
          },
          format,
          quality
        );
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Error loading video'));
    };
  });
}

/**
 * Generate a thumbnail and return as a data URL
 * @param {File|Blob} videoFile - The video file
 * @param {number} timeInSeconds - The time to capture the thumbnail
 * @returns {Promise<string>} The thumbnail as a data URL
 */
export async function generateThumbnailDataUrl(videoFile, timeInSeconds = 0.5) {
  const blob = await generateThumbnail(videoFile, timeInSeconds);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generate multiple thumbnails from a video
 * @param {File|Blob} videoFile - The video file
 * @param {number} count - Number of thumbnails to generate (default: 5)
 * @returns {Promise<{time: number, blob: Blob}[]>} Array of thumbnails with their timestamps
 */
export async function generateThumbnailStrip(videoFile, count = 5) {
  return new Promise(async (resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    
    const url = URL.createObjectURL(videoFile);
    video.src = url;

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const interval = duration / count;
      const thumbnails = [];

      try {
        for (let i = 0; i < count; i++) {
          const time = i * interval + interval / 2;
          const blob = await generateThumbnail(videoFile, time, {
            maxWidth: 160,
            maxHeight: 280,
            quality: 0.6,
          });
          thumbnails.push({ time, blob });
        }
        URL.revokeObjectURL(url);
        resolve(thumbnails);
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Error loading video'));
    };
  });
}

/**
 * Upload a thumbnail to the server
 * @param {Blob} thumbnailBlob - The thumbnail blob
 * @param {string} filename - The filename (without extension)
 * @returns {Promise<string>} The URL of the uploaded thumbnail
 */
export async function uploadThumbnail(thumbnailBlob, filename = 'thumbnail') {
  const formData = new FormData();
  const file = new File([thumbnailBlob], `${filename}.jpg`, { type: 'image/jpeg' });
  formData.append('file', file);
  formData.append('type', 'thumbnail');

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Failed to upload thumbnail');
  }

  const data = await res.json();
  return data.url;
}

/**
 * Generate and upload a thumbnail in one step
 * @param {File|Blob} videoFile - The video file
 * @param {number} timeInSeconds - The time to capture the thumbnail
 * @returns {Promise<string>} The URL of the uploaded thumbnail
 */
export async function generateAndUploadThumbnail(videoFile, timeInSeconds = 0.5) {
  const thumbnailBlob = await generateThumbnail(videoFile, timeInSeconds);
  const timestamp = Date.now();
  const url = await uploadThumbnail(thumbnailBlob, `thumb_${timestamp}`);
  return url;
}
