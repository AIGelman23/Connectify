// src/lib/filters/webgl-filters.js

// Filter definitions with shader parameters
export const FILTERS = [
	{
		id: 'original',
		name: 'Original',
		icon: '🎬',
		params: {
			brightness: 1,
			contrast: 1,
			saturation: 1,
			hue: 0,
			sepia: 0,
			grayscale: 0,
		},
	},
	{
		id: 'vintage',
		name: 'Vintage',
		icon: '📼',
		params: {
			brightness: 1.1,
			contrast: 0.9,
			saturation: 0.7,
			hue: 0,
			sepia: 0.4,
			grayscale: 0,
		},
	},
	{
		id: 'bw',
		name: 'B&W',
		icon: '🎞️',
		params: {
			brightness: 1.1,
			contrast: 1.2,
			saturation: 0,
			hue: 0,
			sepia: 0,
			grayscale: 1,
		},
	},
	{
		id: 'warm',
		name: 'Warm',
		icon: '☀️',
		params: {
			brightness: 1.05,
			contrast: 1.05,
			saturation: 1.2,
			hue: 15,
			sepia: 0.15,
			grayscale: 0,
		},
	},
	{
		id: 'cool',
		name: 'Cool',
		icon: '❄️',
		params: {
			brightness: 1.05,
			contrast: 1.1,
			saturation: 1.1,
			hue: -15,
			sepia: 0,
			grayscale: 0,
		},
	},
	{
		id: 'dramatic',
		name: 'Dramatic',
		icon: '🎭',
		params: {
			brightness: 0.9,
			contrast: 1.4,
			saturation: 1.3,
			hue: 0,
			sepia: 0,
			grayscale: 0,
		},
	},
	{
		id: 'fade',
		name: 'Fade',
		icon: '🌫️',
		params: {
			brightness: 1.15,
			contrast: 0.85,
			saturation: 0.8,
			hue: 0,
			sepia: 0.1,
			grayscale: 0,
		},
	},
	{
		id: 'vivid',
		name: 'Vivid',
		icon: '🎨',
		params: {
			brightness: 1.1,
			contrast: 1.2,
			saturation: 1.5,
			hue: 0,
			sepia: 0,
			grayscale: 0,
		},
	},
];

// Apply CSS filter to a video element or canvas
export function applyFilter(element, filterId) {
	const filter = FILTERS.find(f => f.id === filterId) || FILTERS[0];
	const { brightness, contrast, saturation, hue, sepia, grayscale } = filter.params;

	const filterString = `
		brightness(${brightness})
		contrast(${contrast})
		saturate(${saturation})
		hue-rotate(${hue}deg)
		sepia(${sepia})
		grayscale(${grayscale})
	`.replace(/\s+/g, ' ').trim();

	element.style.filter = filterString;
}

// Create a filtered canvas from video frame
export function createFilteredCanvas(videoElement, filterId, width, height) {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	canvas.width = width || videoElement.videoWidth;
	canvas.height = height || videoElement.videoHeight;

	// Draw video frame
	ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

	// Get image data
	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const data = imageData.data;

	const filter = FILTERS.find(f => f.id === filterId) || FILTERS[0];
	const { brightness, contrast, saturation, grayscale, sepia } = filter.params;

	// Apply filters pixel by pixel
	for (let i = 0; i < data.length; i += 4) {
		let r = data[i];
		let g = data[i + 1];
		let b = data[i + 2];

		// Brightness
		r *= brightness;
		g *= brightness;
		b *= brightness;

		// Contrast
		r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
		g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
		b = ((b / 255 - 0.5) * contrast + 0.5) * 255;

		// Grayscale
		if (grayscale > 0) {
			const gray = 0.299 * r + 0.587 * g + 0.114 * b;
			r = r + (gray - r) * grayscale;
			g = g + (gray - g) * grayscale;
			b = b + (gray - b) * grayscale;
		}

		// Sepia
		if (sepia > 0) {
			const tr = 0.393 * r + 0.769 * g + 0.189 * b;
			const tg = 0.349 * r + 0.686 * g + 0.168 * b;
			const tb = 0.272 * r + 0.534 * g + 0.131 * b;
			r = r + (tr - r) * sepia;
			g = g + (tg - g) * sepia;
			b = b + (tb - b) * sepia;
		}

		// Saturation
		const gray2 = 0.299 * r + 0.587 * g + 0.114 * b;
		r = gray2 + (r - gray2) * saturation;
		g = gray2 + (g - gray2) * saturation;
		b = gray2 + (b - gray2) * saturation;

		// Clamp values
		data[i] = Math.max(0, Math.min(255, r));
		data[i + 1] = Math.max(0, Math.min(255, g));
		data[i + 2] = Math.max(0, Math.min(255, b));
	}

	ctx.putImageData(imageData, 0, 0);
	return canvas;
}

// Get CSS filter string for a filter ID
export function getCSSFilter(filterId) {
	const filter = FILTERS.find(f => f.id === filterId) || FILTERS[0];
	const { brightness, contrast, saturation, hue, sepia, grayscale } = filter.params;

	return `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) hue-rotate(${hue}deg) sepia(${sepia}) grayscale(${grayscale})`;
}
