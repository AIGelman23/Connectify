import React from 'react';

const NewsFeedCard = ({ item }) => {
  const timeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / 36e5;

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h`;
    return date.toLocaleDateString();
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.avatarPlaceholder}>
          {item.source.charAt(0).toUpperCase()}
        </div>
        <div style={styles.headerInfo}>
          <span style={styles.sourceName}>{item.source}</span>
          <span style={styles.timestamp}>{timeAgo(item.pubDate)}</span>
        </div>
        <div style={styles.menuDots}>•••</div>
      </div>

      <div style={styles.body}>
        <p style={styles.title}>{item.title}</p>

        {item.imageUrl && (
          <a href={item.link} target="_blank" rel="noopener noreferrer" style={styles.imageLink}>
            <img src={item.imageUrl} alt={item.title} style={styles.mainImage} />
          </a>
        )}

        {!item.imageUrl && item.contentSnippet && (
          <p style={styles.snippet}>{item.contentSnippet}</p>
        )}
      </div>

      <div style={styles.footer}>
        <div style={styles.actionButton}>
          <i className="fa fa-thumbs-up" aria-hidden="true"></i> Like
        </div>
        <div style={styles.actionButton}>
          <i className="fa fa-comment" aria-hidden="true"></i> Comment
        </div>
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...styles.actionButton, textDecoration: 'none', color: 'inherit' }}
        >
          <i className="fa fa-share" aria-hidden="true"></i> Read Article
        </a>
      </div>
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
    marginBottom: '20px',
    maxWidth: '600px',
    width: '100%',
    fontFamily: 'Helvetica, Arial, sans-serif',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
  },
  avatarPlaceholder: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#1877F2',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    marginRight: '10px',
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  sourceName: {
    fontWeight: 'bold',
    fontSize: '15px',
    color: '#050505',
  },
  timestamp: {
    fontSize: '13px',
    color: '#65676B',
  },
  menuDots: {
    color: '#65676B',
    cursor: 'pointer',
    fontSize: '20px',
  },
  body: {
    padding: '0',
  },
  title: {
    padding: '4px 16px 12px 16px',
    margin: 0,
    fontSize: '15px',
    color: '#050505',
    lineHeight: '1.4',
  },
  imageLink: {
    display: 'block',
    width: '100%',
  },
  mainImage: {
    width: '100%',
    height: 'auto',
    display: 'block',
    objectFit: 'cover',
    maxHeight: '400px',
    backgroundColor: '#f0f2f5',
  },
  snippet: {
    padding: '0 16px 16px 16px',
    color: '#65676B',
    fontSize: '14px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-around',
    borderTop: '1px solid #ced0d4',
    padding: '8px 0',
    margin: '0 12px',
  },
  actionButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 0',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#65676B',
    fontSize: '14px',
    fontWeight: 600,
    gap: '8px',
  },
};

export default NewsFeedCard;