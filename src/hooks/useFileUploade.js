// src/hooks/useFileUpload.js

import { useState } from "react";

export const useFileUpload = () => {
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    progress: 0,
    error: null,
    uploadedUrls: {},
  });

  const uploadFiles = async (files) => {
    setUploadState((prev) => ({
      ...prev,
      isUploading: true,
      progress: 0,
      error: null,
    }));

    try {
      const formData = new FormData();

      // Add files to FormData
      if (files.profilePicture) {
        formData.append("profilePicture", files.profilePicture);
      }
      if (files.coverPhoto) {
        formData.append("coverPhoto", files.coverPhoto);
      }
      if (files.resume) {
        formData.append("resume", files.resume);
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const result = await response.json();

      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        progress: 100,
        uploadedUrls: result.urls,
      }));

      return result.urls;
    } catch (error) {
      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        error: error.message,
      }));
      throw error;
    }
  };

  const uploadSingleFile = async (file, uploadType) => {
    setUploadState((prev) => ({
      ...prev,
      isUploading: true,
      progress: 0,
      error: null,
    }));

    try {
      const formData = new FormData();
      formData.append(uploadType, file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const result = await response.json();

      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        progress: 100,
        uploadedUrls: { ...prev.uploadedUrls, ...result.urls },
      }));

      return result.urls;
    } catch (error) {
      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        error: error.message,
      }));
      throw error;
    }
  };

  const resetUploadState = () => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      uploadedUrls: {},
    });
  };

  return {
    uploadFiles,
    uploadSingleFile,
    resetUploadState,
    ...uploadState,
  };
};
