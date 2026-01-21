// src/components/live/GoLiveModal.jsx
"use client";

import React, { useState } from 'react';

export default function GoLiveModal({ onStart, onCancel, isLoading }) {
	const [title, setTitle] = useState('');

	const handleSubmit = (e) => {
		e.preventDefault();
		if (title.trim()) {
			onStart(title.trim());
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
			<div className="w-full max-w-md mx-4 bg-gray-900 rounded-2xl overflow-hidden">
				{/* Header */}
				<div className="p-4 border-b border-gray-800 flex items-center justify-between">
					<button
						onClick={onCancel}
						className="text-gray-400 hover:text-white"
					>
						<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
					<h2 className="text-white font-semibold text-lg">Go Live</h2>
					<div className="w-6" /> {/* Spacer */}
				</div>

				{/* Content */}
				<form onSubmit={handleSubmit} className="p-6">
					<div className="mb-6">
						<label className="block text-sm font-medium text-gray-300 mb-2">
							Stream Title
						</label>
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="What's this stream about?"
							className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
							maxLength={100}
							autoFocus
						/>
						<p className="text-right text-xs text-gray-500 mt-1">
							{title.length}/100
						</p>
					</div>

					<div className="space-y-3">
						<button
							type="submit"
							disabled={!title.trim() || isLoading}
							className="w-full py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
						>
							{isLoading ? (
								<>
									<svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Setting up...
								</>
							) : (
								'Start Setup'
							)}
						</button>

						<button
							type="button"
							onClick={onCancel}
							className="w-full py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
						>
							Cancel
						</button>
					</div>

					<p className="text-center text-xs text-gray-500 mt-4">
						By going live, you agree to our Community Guidelines
					</p>
				</form>
			</div>
		</div>
	);
}
