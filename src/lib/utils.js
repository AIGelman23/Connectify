export const formatTimestamp = (dateString) => {
	const postDate = new Date(dateString);
	const now = new Date();
	const diffSeconds = Math.round((now.getTime() - postDate.getTime()) / 1000);
	const diffMinutes = Math.round(diffSeconds / 60);
	const diffHours = Math.round(diffMinutes / 60);
	const diffDays = Math.round(diffHours / 24);

	if (diffMinutes < 1) return "Just now";
	if (diffMinutes < 60) return `${diffMinutes}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;

	return postDate.toLocaleDateString(); // Fallback for older posts
};