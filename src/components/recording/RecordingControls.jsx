// src/components/recording/RecordingControls.jsx
"use client";

import React from 'react';

export default function RecordingControls({
	isRecording,
	onStartRecording,
	onStopRecording,
	recordingDuration,
	maxDuration,
}) {
	return (
		<div className="absolute bottom-8 left-0 right-0 flex flex-col items-center z-10">
			{/* Main record button */}
			<button
				onClick={isRecording ? onStopRecording : onStartRecording}
				className="relative w-20 h-20 flex items-center justify-center"
			>
				{/* Outer ring */}
				<div className={`absolute inset-0 rounded-full border-4 ${isRecording ? 'border-red-500' : 'border-white'} transition-colors`}>
					{/* Progress ring when recording */}
					{isRecording && (
						<svg className="absolute inset-0 w-full h-full -rotate-90">
							<circle
								cx="40"
								cy="40"
								r="38"
								fill="none"
								stroke="rgba(255,255,255,0.3)"
								strokeWidth="4"
							/>
							<circle
								cx="40"
								cy="40"
								r="38"
								fill="none"
								stroke="white"
								strokeWidth="4"
								strokeDasharray={`${(recordingDuration / maxDuration) * 238.76} 238.76`}
								className="transition-all duration-100"
							/>
						</svg>
					)}
				</div>

				{/* Inner button */}
				<div
					className={`transition-all duration-200 ${isRecording
							? 'w-8 h-8 bg-red-500 rounded-md'
							: 'w-14 h-14 bg-red-500 rounded-full'
						}`}
				/>
			</button>

			{/* Recording hint */}
			<p className="text-white/70 text-sm mt-4">
				{isRecording ? 'Tap to stop' : 'Tap to record'}
			</p>

			{/* Duration info */}
			<p className="text-white/50 text-xs mt-1">
				Max {maxDuration} seconds
			</p>
		</div>
	);
}
