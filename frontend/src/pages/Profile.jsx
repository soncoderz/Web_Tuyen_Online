import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getReadingHistory, getBookmarks, deleteBookmark, deleteReadingHistoryItem, getStory, getFollowedStories, getChaptersByStory } from '../services/api';

function timeAgo(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 30) return `${days} ngày trước`;
  return new Date(date).toLocaleDateString('vi-VN');
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'history');
  const [history, setHistory] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [followedStories, setFollowedStories] = useState([]);
  const [chaptersMap, setChaptersMap] = useState({});
  const [readChapterIds, setReadChapterIds] = useState(new Set());
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
      const followed = fRes.data || [];
      setFollowedStories(followed);

      // Build set of read chapter IDs from history
      const readIds = new Set(hRes.data.map(h => h.chapterId).filter(Boolean));
      setReadChapterIds(readIds);

      // Load chapters for each followed story (2 newest)
      const chMap = {};
      await Promise.all(followed.map(async (story) => {
        try {
          const cRes = await getChaptersByStory(story.id);
          const sorted = (cRes.data || []).sort((a, b) => b.chapterNumber - a.chapterNumber);
          chMap[story.id] = sorted.slice(0, 2);
        } catch (e) { chMap[story.id] = []; }
      }));
      setChaptersMap(chMap);

      // Load story titles for history/bookmarks
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
                  {followedStories.map(story => {
                    const latestChapters = chaptersMap[story.id] || [];
                    return (
                      <div key={story.id} className="story-card" style={{ overflow: 'hidden' }}>
                        <Link to={`/story/${story.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
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
                        {/* 2 chương mới nhất - luôn hiện */}
                        <div style={{ borderTop: '1px solid var(--border)' }}>
                          {latestChapters.length > 0 ? (
                            latestChapters.map(ch => {
                              const isRead = readChapterIds.has(ch.id);
                              return (
                                <Link
                                  key={ch.id}
                                  to={`/story/${story.id}/chapter/${ch.id}`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.55rem 0.75rem',
                                    fontSize: '0.82rem',
                                    textDecoration: 'none',
                                    color: isRead ? '#555' : '#fff',
                                    borderBottom: '1px solid var(--border)',
                                    transition: 'background 0.2s',
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-glass)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span style={{
                                      color: isRead ? '#555' : 'var(--accent)',
                                      fontSize: '0.9rem'
                                    }}>
                                      {isRead ? '✓' : '🔖'}
                                    </span>
                                    <span style={{ fontWeight: isRead ? 400 : 600 }}>
                                      Chương {ch.chapterNumber}
                                    </span>
                                  </span>
                                  <span style={{ fontSize: '0.72rem', color: isRead ? '#444' : 'var(--text-secondary)' }}>
                                    {timeAgo(ch.createdAt)}
                                  </span>
                                </Link>
                              );
                            })
                          ) : (
                            <div style={{
                              padding: '0.5rem 0.75rem',
                              fontSize: '0.78rem',
                              color: 'var(--text-secondary)',
                              textAlign: 'center'
                            }}>
                              Chưa có chương
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
