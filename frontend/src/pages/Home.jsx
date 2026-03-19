import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStories, getCategories } from '../services/api';

export default function Home() {
  const [stories, setStories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStories(), getCategories()])
      .then(([sRes, cRes]) => { setStories(sRes.data); setCategories(cRes.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const manga = stories.filter(s => s.type === 'MANGA');
  const novels = stories.filter(s => s.type === 'NOVEL');
  const trending = [...stories].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 8);

  if (loading) return <div className="loading"><div className="spinner" />Đang tải...</div>;

  return (
    <div className="container">
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(167,139,250,0.1))',
        borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center', marginBottom: '2.5rem',
        border: '1px solid rgba(108,99,255,0.2)'
      }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.75rem' }}>📖 Khám phá thế giới truyện</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
          Truyện tranh & Light Novel — Đọc miễn phí, mọi lúc mọi nơi.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/stories?type=MANGA" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>🎨 Truyện Tranh</Link>
          <Link to="/stories?type=NOVEL" className="btn btn-outline" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>📝 Light Novel</Link>
        </div>
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

      {/* Hot */}
      {trending.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 className="section-title">🔥 Truyện hot nhất</h2>
          <div className="story-grid">{trending.map(s => <StoryCard key={s.id} story={s} />)}</div>
        </div>
      )}

      {/* Manga */}
      {manga.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="section-title">🎨 Truyện Tranh (Manga)</h2>
            <Link to="/stories?type=MANGA" style={{ fontSize: '0.85rem' }}>Xem tất cả →</Link>
          </div>
          <div className="story-grid">{manga.slice(0, 8).map(s => <StoryCard key={s.id} story={s} />)}</div>
        </div>
      )}

      {/* Novel */}
      {novels.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="section-title">📝 Light Novel / Tiểu Thuyết</h2>
            <Link to="/stories?type=NOVEL" style={{ fontSize: '0.85rem' }}>Xem tất cả →</Link>
          </div>
          <div className="story-grid">{novels.slice(0, 8).map(s => <StoryCard key={s.id} story={s} />)}</div>
        </div>
      )}

      {stories.length === 0 && (
        <div className="empty-state"><div className="icon">📚</div><p>Chưa có truyện nào.</p></div>
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
          <span style={{
            padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700,
            background: story.type === 'MANGA' ? 'rgba(255,179,71,0.2)' : 'rgba(108,99,255,0.2)',
            color: story.type === 'MANGA' ? 'var(--warning)' : 'var(--accent)'
          }}>{story.type === 'MANGA' ? '🎨 Manga' : '📝 Novel'}</span>
          <span>👁 {story.views || 0}</span>
          <span>⭐ {story.averageRating || 0}</span>
        </div>
      </div>
    </Link>
  );
}
