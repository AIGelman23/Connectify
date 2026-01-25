/**
 * Extract hashtags from content
 * @param {string} content - The text content to parse
 * @returns {string[]} Array of hashtag names (lowercase, without #)
 */
export function extractHashtags(content) {
  if (!content) return [];
  
  // Match #hashtag pattern (alphanumeric and underscores)
  const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
  const matches = content.match(hashtagRegex) || [];
  
  // Remove # and convert to lowercase, deduplicate
  const hashtags = [...new Set(
    matches.map(tag => tag.slice(1).toLowerCase())
  )];
  
  return hashtags;
}

/**
 * Replace hashtags in content with clickable links
 * @param {string} content - The text content
 * @returns {string} Content with hashtags wrapped in special markers
 */
export function formatHashtags(content) {
  if (!content) return "";
  
  return content.replace(
    /#([a-zA-Z0-9_]+)/g,
    '<hashtag>$1</hashtag>'
  );
}

/**
 * Render content with clickable hashtags (for React)
 * @param {string} content - The text content
 * @param {function} onHashtagClick - Callback when hashtag is clicked
 * @returns {JSX.Element[]} Array of text and link elements
 */
export function renderContentWithHashtags(content, onHashtagClick) {
  if (!content) return [];
  
  const parts = content.split(/(#[a-zA-Z0-9_]+)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('#')) {
      const tag = part.slice(1).toLowerCase();
      return {
        type: 'hashtag',
        key: index,
        tag,
        text: part,
      };
    }
    return {
      type: 'text',
      key: index,
      text: part,
    };
  });
}
