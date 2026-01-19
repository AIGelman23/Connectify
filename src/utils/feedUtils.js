/**
 * Merges posts and news items into a single feed, sorted chronologically.
 * This mimics a social feed where news appears alongside user content.
 *
 * @param {Array} posts - Array of post objects
 * @param {Array} news - Array of news objects
 * @returns {Array} Combined and sorted feed items
 */
export const mergeFeedItems = (posts, news) => {
  // Normalize posts to ensure they have the 'type' property for discrimination
  const normalizedPosts = posts.map((p) => ({
    ...p,
    type: "post",
  }));

  const combined = [...normalizedPosts, ...news];

  return combined.sort((a, b) => {
    const dateA = new Date(getItemDate(a)).getTime();
    const dateB = new Date(getItemDate(b)).getTime();

    // Sort descending (newest first)
    return dateB - dateA;
  });
};

const getItemDate = (item) => {
  if (item.type === "news") {
    return item.pubDate;
  }
  return item.createdAt;
};
