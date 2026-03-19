import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStories, getCategories } from '../services/api';

export default function Home() {
  const [stories, setStories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStories(), getCategories()])
      .then(([sRes, cRes]) => {
        setStories(sRes.data);
        setCategories(cRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const trending = [...stories].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 8);
  const latest = [...stories].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
  const topRated = [...stories].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0)).slice(0, 8);

  if (loading) return <div className="loading"><div className="spinner" />Đang tải...</div>;

  return (
    <div className="container">
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(167,139,250,0.1))',
        borderRadius: '16px',
        padding: '3rem 2rem',
        textAlign: 'center',
        marginBottom: '2.5rem',
        border: '1px solid rgba(108,99,255,0.2)'
      }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          📖 Khám phá thế giới truyện
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
          Hàng ngàn bộ truyện hay, cập nhật liên tục. Đọc miễn phí, mọi lúc mọi nơi.
        </p>
        <Link to="/stories" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>
          Khám phá ngay →
        </Link>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 className="section-title">📁 Thể loại</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {categories.map(c => (
              <Link key={c.id} to={`/stories?category=${c.id}`} className="category-tag" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Trending */}
      {trending.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 className="section-title">🔥 Truyện hot</h2>
          <div className="story-grid">
            {trending.map(story => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </div>
      )}

      {/* Latest */}
      {latest.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 className="section-title">🆕 Mới cập nhật</h2>
          <div className="story-grid">
            {latest.map(story => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </div>
      )}

      {/* Top Rated */}
      {topRated.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 className="section-title">⭐ Đánh giá cao</h2>
          <div className="story-grid">
            {topRated.map(story => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </div>
      )}

      {stories.length === 0 && (
        <div className="empty-state">
          <div className="icon">📚</div>
          <p>Chưa có truyện nào. Admin hãy thêm truyện đầu tiên!</p>
        </div>
      )}
    </div>
  );
}

function StoryCard({ story }) {
  return (
    <Link to={`/story/${story.id}`} className="story-card" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="story-cover">
        {story.coverImage ? (
          <img src={story.coverImage} alt={story.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : '📖'}
      </div>
      <div className="story-info">
        <h3>{story.title}</h3>
        <div className="story-meta">
          <span>👁 {story.views || 0}</span>
          <span>⭐ {story.averageRating || 0}</span>
          <span className={`status-badge status-${story.status}`}>{story.status}</span>
        </div>
      </div>
    </Link>
  );
}
