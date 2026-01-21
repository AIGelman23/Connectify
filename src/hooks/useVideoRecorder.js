// src/hooks/useVideoRecorder.js
"use client";

import { useState, useRef, useCallback, useEffect } from 'react';

export default function useVideoRecorder(stream) {
	const [isRecording, setIsRecording] = useState(false);
	const [isPaused, setIsPaused] = useState(false);
	const [recordedBlob, setRecordedBlob] = useState(null);
	const [recordingDuration, setRecordingDuration] = useState(0);
	const [error, setError] = useState(null);

	const mediaRecorderRef = useRef(null);
	const chunksRef = useRef([]);
	const timerRef = useRef(null);
	const startTimeRef = useRef(null);

	const MAX_DURATION = 60; // 60 seconds max

	const getSupportedMimeType = () => {
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
	};

	const startRecording = useCallback(() => {
		if (!stream) {
			setError('No media stream available');
			return;
		}

		try {
			const mimeType = getSupportedMimeType();
			const mediaRecorder = new MediaRecorder(stream, {
				mimeType,
				videoBitsPerSecond: 2500000, // 2.5 Mbps
			});

			chunksRef.current = [];

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					chunksRef.current.push(event.data);
				}
			};

			mediaRecorder.onstop = () => {
				const blob = new Blob(chunksRef.current, { type: mimeType });
				setRecordedBlob(blob);
				setIsRecording(false);
				setIsPaused(false);

				// Clear timer
				if (timerRef.current) {
					clearInterval(timerRef.current);
					timerRef.current = null;
				}
			};

			mediaRecorder.onerror = (event) => {
				console.error('MediaRecorder error:', event.error);
				setError('Recording failed');
				setIsRecording(false);
			};

			mediaRecorderRef.current = mediaRecorder;
			mediaRecorder.start(100); // Collect data every 100ms
			setIsRecording(true);
			setRecordedBlob(null);
			startTimeRef.current = Date.now();

			// Start duration timer
			timerRef.current = setInterval(() => {
				const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
				setRecordingDuration(elapsed);

				// Auto-stop at max duration
				if (elapsed >= MAX_DURATION) {
					stopRecording();
				}
			}, 100);
		} catch (err) {
			console.error('Error starting recording:', err);
			setError('Failed to start recording');
		}
	}, [stream]);

	const stopRecording = useCallback(() => {
		if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
			mediaRecorderRef.current.stop();
		}
	}, []);

	const pauseRecording = useCallback(() => {
		if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
			mediaRecorderRef.current.pause();
			setIsPaused(true);
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
		}
	}, []);

	const resumeRecording = useCallback(() => {
		if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
			mediaRecorderRef.current.resume();
			setIsPaused(false);
			timerRef.current = setInterval(() => {
				const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
				setRecordingDuration(elapsed);
				if (elapsed >= MAX_DURATION) {
					stopRecording();
				}
			}, 100);
		}
	}, [stopRecording]);

	const togglePause = useCallback(() => {
		// Check actual MediaRecorder state instead of React state to avoid stale closure
		if (mediaRecorderRef.current) {
			if (mediaRecorderRef.current.state === 'paused') {
				resumeRecording();
			} else if (mediaRecorderRef.current.state === 'recording') {
				pauseRecording();
			}
		}
	}, [pauseRecording, resumeRecording]);

	const clearRecording = useCallback(() => {
		setRecordedBlob(null);
		setRecordingDuration(0);
		setIsRecording(false);
		setIsPaused(false);
		chunksRef.current = [];
		// Clear the media recorder reference
		mediaRecorderRef.current = null;
		// Clear any remaining timer
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	// Cleanup
	useEffect(() => {
		return () => {
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
			if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
				mediaRecorderRef.current.stop();
			}
		};
	}, []);

	return {
		isRecording,
		isPaused,
		recordedBlob,
		recordingDuration,
		maxDuration: MAX_DURATION,
		error,
		startRecording,
		stopRecording,
		pauseRecording,
		resumeRecording,
		togglePause,
		clearRecording,
	};
}
