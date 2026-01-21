// src/components/effects/FilterPreview.jsx
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { getCSSFilter } from '../../lib/filters/webgl-filters';
import FilterCarousel from './FilterCarousel';

export default function FilterPreview({ videoBlob, selectedFilter, onFilterChange, onApply, onCancel }) {
	const videoRef = useRef(null);
	const [videoUrl, setVideoUrl] = useState(null);

	useEffect(() => {
		if (videoBlob) {
			const url = URL.createObjectURL(videoBlob);
			setVideoUrl(url);
			return () => URL.revokeObjectURL(url);
		}
	}, [videoBlob]);

	useEffect(() => {
		if (videoRef.current && videoUrl) {
			videoRef.current.src = videoUrl;
			videoRef.current.play().catch(() => { });
		}
	}, [videoUrl]);

	return (
		<div className="h-screen w-full relative bg-black flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between p-4 z-10">
				<button
					onClick={onCancel}
					className="text-white p-2"
				>
					<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
				<h2 className="text-white font-semibold text-lg">Filters</h2>
				<button
					onClick={onApply}
					className="text-blue-400 font-semibold"
				>
					Apply
				</button>
			</div>

			{/* Video preview */}
			<div className="flex-1 flex items-center justify-center overflow-hidden">
				<video
					ref={videoRef}
					className="max-h-full max-w-full object-contain"
					style={{ filter: getCSSFilter(selectedFilter) }}
					loop
					muted
					playsInline
				/>
			</div>

			{/* Filter carousel */}
			<div className="bg-black/80 backdrop-blur-sm">
				<FilterCarousel
					selectedFilter={selectedFilter}
					onSelectFilter={onFilterChange}
					videoRef={videoRef}
				/>
			</div>
		</div>
	);
}
