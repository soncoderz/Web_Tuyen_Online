import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getReadingHistory, getBookmarks, deleteBookmark, deleteReadingHistoryItem, getStory, getFollowedStories } from '../services/api';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'history');
  const [history, setHistory] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [followedStories, setFollowedStories] = useState([]);
  const [storyCache, setStoryCache] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadData();
  }, [user]);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t) setTab(t);
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [hRes, bRes, fRes] = await Promise.all([getReadingHistory(), getBookmarks(), getFollowedStories()]);
      setHistory(hRes.data);
      setBookmarks(bRes.data);
      setFollowedStories(fRes.data || []);

      // Load story titles
      const ids = new Set([
        ...hRes.data.map(h => h.storyId),
        ...bRes.data.map(b => b.storyId)
      ]);
      const cache = {};
      for (const sid of ids) {
        try {
          const s = await getStory(sid);
          cache[sid] = s.data;
        } catch (e) { cache[sid] = { title: 'Truyện đã xóa' }; }
      }
      setStoryCache(cache);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleDeleteBookmark = async (id) => {
    await deleteBookmark(id);
    setBookmarks(bookmarks.filter(b => b.id !== id));
  };

  const handleDeleteHistory = async (id) => {
    await deleteReadingHistoryItem(id);
    setHistory(history.filter(h => h.id !== id));
  };

  if (!user) return null;

  return (
    <div className="container">
      <div className="profile-header">
        <div className="profile-avatar">{user.username?.[0]?.toUpperCase()}</div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{user.username}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user.email}</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            {user.roles?.map(r => (
              <span key={r} className="category-tag">{r.replace('ROLE_', '')}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          📚 Lịch sử đọc ({history.length})
        </button>
        <button className={`tab ${tab === 'bookmarks' ? 'active' : ''}`} onClick={() => setTab('bookmarks')}>
          📑 Bookmark ({bookmarks.length})
        </button>
        <button className={`tab ${tab === 'following' ? 'active' : ''}`} onClick={() => setTab('following')}>
          ❤️ Theo dõi ({followedStories.length})
        </button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />Đang tải...</div>
      ) : (
        <>
          {tab === 'history' && (
            <div className="card">
              {history.length > 0 ? (
                history.map(h => (
                  <div key={h.id} className="chapter-item">
                    <div>
                      <Link to={`/story/${h.storyId}`} style={{ fontWeight: 600 }}>
                        {storyCache[h.storyId]?.title || 'Đang tải...'}
                      </Link>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Đọc lần cuối: {new Date(h.lastReadAt).toLocaleString('vi-VN')}
                      </div>
                    </div>
                    <button className="btn btn-sm btn-outline" onClick={() => handleDeleteHistory(h.id)}>✕</button>
                  </div>
                ))
              ) : (
                <div className="empty-state"><p>Chưa có lịch sử đọc.</p></div>
              )}
            </div>
          )}

          {tab === 'bookmarks' && (
            <div className="card">
              {bookmarks.length > 0 ? (
                bookmarks.map(b => (
                  <div key={b.id} className="chapter-item">
                    <div>
                      <Link to={`/story/${b.storyId}`} style={{ fontWeight: 600 }}>
                        {storyCache[b.storyId]?.title || 'Đang tải...'}
                      </Link>
                      {b.note && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{b.note}</div>}
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {new Date(b.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </div>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteBookmark(b.id)}>Xóa</button>
                  </div>
                ))
              ) : (
                <div className="empty-state"><p>Chưa có bookmark nào.</p></div>
              )}
            </div>
          )}

          {tab === 'following' && (
            <div className="card">
              {followedStories.length > 0 ? (
                <div className="story-grid">
                  {followedStories.map(story => (
                    <Link key={story.id} to={`/story/${story.id}`} className="story-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="story-cover" style={{ height: '180px' }}>
                        {story.coverImage ? (
                          <img src={story.coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : '📖'}
                      </div>
                      <div className="story-info">
                        <h3>{story.title}</h3>
                        <div className="story-meta">
                          <span>👁️ {story.views || 0}</span>
                          <span>❤️ {story.followers || 0}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="empty-state"><p>Chưa theo dõi truyện nào.</p></div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
