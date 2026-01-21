// src/components/effects/FilterCarousel.jsx
"use client";

import React, { useRef, useEffect } from 'react';
import { FILTERS, getCSSFilter } from '../../lib/filters/webgl-filters';

export default function FilterCarousel({ selectedFilter, onSelectFilter, videoRef }) {
	const carouselRef = useRef(null);

	// Scroll to center selected filter
	useEffect(() => {
		if (carouselRef.current && selectedFilter) {
			const index = FILTERS.findIndex(f => f.id === selectedFilter);
			const itemWidth = 80; // Approximate width of each item
			const scrollPosition = index * itemWidth - (carouselRef.current.clientWidth / 2) + (itemWidth / 2);
			carouselRef.current.scrollTo({
				left: Math.max(0, scrollPosition),
				behavior: 'smooth',
			});
		}
	}, [selectedFilter]);

	return (
		<div
			ref={carouselRef}
			className="flex overflow-x-auto space-x-4 py-4 px-4 scrollbar-hide"
			style={{
				WebkitOverflowScrolling: 'touch',
				scrollSnapType: 'x mandatory',
			}}
		>
			{FILTERS.map((filter) => (
				<button
					key={filter.id}
					onClick={() => onSelectFilter(filter.id)}
					className={`flex-shrink-0 flex flex-col items-center scroll-snap-align-center ${
						selectedFilter === filter.id ? 'opacity-100' : 'opacity-60'
					}`}
					style={{ scrollSnapAlign: 'center' }}
				>
					{/* Preview thumbnail */}
					<div
						className={`w-16 h-16 rounded-xl overflow-hidden border-2 mb-2 ${
							selectedFilter === filter.id ? 'border-white' : 'border-transparent'
						}`}
					>
						<div
							className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600"
							style={{ filter: getCSSFilter(filter.id) }}
						>
							{/* Show icon as preview placeholder */}
							<div className="w-full h-full flex items-center justify-center text-2xl">
								{filter.icon}
							</div>
						</div>
					</div>

					{/* Filter name */}
					<span
						className={`text-xs font-medium ${
							selectedFilter === filter.id ? 'text-white' : 'text-white/60'
						}`}
					>
						{filter.name}
					</span>
				</button>
			))}

			<style jsx>{`
				.scrollbar-hide {
					-ms-overflow-style: none;
					scrollbar-width: none;
				}
				.scrollbar-hide::-webkit-scrollbar {
					display: none;
				}
			`}</style>
		</div>
	);
}
