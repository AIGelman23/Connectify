import React from 'react';
import PostCard from './PostCard';
import { formatTimestamp } from '../lib/utils';

const FeedItemCard = ({ item, sessionUserId, setPostError, openReplyModal }) => {
  if (item.type === 'news') {
    // Try to get favicon from domain
    let authorImageUrl = `https://ui-avatars.com/api/?name=${item.source || 'News'}&background=random`;
    try {
      if (item.link) {
        const domain = new URL(item.link).hostname;
        authorImageUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      }
    } catch (e) {
      // Fallback to UI avatars if URL parsing fails
    }

    // Use provided image or fallback
    const displayImage = item.imageUrl || "https://placehold.co/600x400/e2e8f0/475569?text=News+Update";

    const newsPost = {
      id: item.id,
      title: item.title,
      content: item.contentSnippet || '',
      imageUrl: displayImage,
      imageUrls: [displayImage],
      timestamp: formatTimestamp(item.pubDate),
      link: item.link,
      author: {
        id: 'news',
        name: item.source || 'News',
        imageUrl: authorImageUrl,
        headline: 'News',
      },
      likesCount: 0,
      comments: [],
      likedByCurrentUser: false,
      type: 'news',
    };

    return (
      <PostCard
        post={newsPost}
        sessionUserId={sessionUserId}
        setPostError={setPostError}
        openReplyModal={openReplyModal}
      />
    );
  }

  return (
    <PostCard
      post={item}
      sessionUserId={sessionUserId}
      setPostError={setPostError}
      openReplyModal={openReplyModal}
    />
  );
};

export default FeedItemCard;