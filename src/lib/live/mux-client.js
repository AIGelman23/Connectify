// src/lib/live/mux-client.js

// Mux API client wrapper
// Note: In production, you'll need to set up Mux API credentials

const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;

// Generate a unique stream key
export function generateStreamKey() {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let key = '';
	for (let i = 0; i < 32; i++) {
		key += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return `live_${key}`;
}

// Create a live stream with Mux
export async function createLiveStream() {
	// In development, return mock data
	if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
		const streamKey = generateStreamKey();
		return {
			streamKey,
			playbackId: `playback_${streamKey}`,
			rtmpUrl: 'rtmp://global-live.mux.com:5222/app',
		};
	}

	// Production: Call Mux API
	try {
		const response = await fetch('https://api.mux.com/video/v1/live-streams', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Basic ${Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')}`,
			},
			body: JSON.stringify({
				playback_policy: ['public'],
				new_asset_settings: {
					playback_policy: ['public'],
				},
				latency_mode: 'low',
				reconnect_window: 60,
			}),
		});

		if (!response.ok) {
			throw new Error('Failed to create Mux live stream');
		}

		const data = await response.json();
		return {
			streamKey: data.data.stream_key,
			playbackId: data.data.playback_ids[0].id,
			rtmpUrl: 'rtmp://global-live.mux.com:5222/app',
		};
	} catch (error) {
		console.error('Error creating Mux live stream:', error);
		throw error;
	}
}

// Get live stream status
export async function getLiveStreamStatus(streamKey) {
	// In development, return mock status
	if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
		return {
			status: 'idle',
			viewerCount: 0,
		};
	}

	// Production: Query Mux API
	try {
		const response = await fetch(`https://api.mux.com/video/v1/live-streams`, {
			headers: {
				'Authorization': `Basic ${Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')}`,
			},
		});

		if (!response.ok) {
			throw new Error('Failed to get live stream status');
		}

		const data = await response.json();
		const stream = data.data.find(s => s.stream_key === streamKey);

		if (!stream) {
			return { status: 'not_found', viewerCount: 0 };
		}

		return {
			status: stream.status,
			viewerCount: 0, // Mux doesn't provide viewer count directly
		};
	} catch (error) {
		console.error('Error getting live stream status:', error);
		throw error;
	}
}

// End a live stream
export async function endLiveStream(streamId) {
	if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
		return { success: true };
	}

	try {
		const response = await fetch(`https://api.mux.com/video/v1/live-streams/${streamId}/complete`, {
			method: 'PUT',
			headers: {
				'Authorization': `Basic ${Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')}`,
			},
		});

		if (!response.ok) {
			throw new Error('Failed to end live stream');
		}

		return { success: true };
	} catch (error) {
		console.error('Error ending live stream:', error);
		throw error;
	}
}

// Get HLS playback URL
export function getPlaybackUrl(playbackId) {
	if (!playbackId) return null;
	return `https://stream.mux.com/${playbackId}.m3u8`;
}

// Get thumbnail URL
export function getThumbnailUrl(playbackId) {
	if (!playbackId) return null;
	return `https://image.mux.com/${playbackId}/thumbnail.jpg`;
}
