import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getStory, getChaptersByStory, getCommentsByStory, getStoryRating, getUserRating,
  incrementViews, followStory, isFollowing, addBookmark, createComment, rateStory,
  createReport, getRelatedStories
} from '../services/api';

export default function StoryDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [story, setStory] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [comments, setComments] = useState([]);
  const [rating, setRating] = useState({ averageRating: 0, totalRatings: 0 });
  const [userRating, setUserRating] = useState(0);
  const [following, setFollowing] = useState(false);
  const [relatedStories, setRelatedStories] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('chapters');

  useEffect(() => {
    loadStory();
    incrementViews(id).catch(() => {});
  }, [id]);

  const loadStory = async () => {
    setLoading(true);
    try {
      const [sRes, chRes, cmRes, rRes, relRes] = await Promise.all([
        getStory(id), getChaptersByStory(id), getCommentsByStory(id), getStoryRating(id), getRelatedStories(id)
      ]);
      setStory(sRes.data);
      setChapters(chRes.data);
      setComments(cmRes.data);
      setRating(rRes.data);
      setRelatedStories(relRes.data);

      if (user) {
        isFollowing(id).then(r => setFollowing(r.data.isFollowing)).catch(() => {});
        getUserRating(id).then(r => { if (r.data.score) setUserRating(r.data.score); }).catch(() => {});
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleFollow = async () => {
    if (!user) return alert('Vui lòng đăng nhập!');
    const res = await followStory(id);
    setFollowing(res.data.isFollowing);
  };

  const handleBookmark = async () => {
    if (!user) return alert('Vui lòng đăng nhập!');
    await addBookmark({ storyId: id, note: story.title });
    alert('Đã bookmark!');
  };

  const handleRate = async (score) => {
    if (!user) return alert('Vui lòng đăng nhập!');
    await rateStory({ storyId: id, score });
    setUserRating(score);
    const rRes = await getStoryRating(id);
    setRating(rRes.data);
  };

  const handleComment = async () => {
    if (!user) return alert('Vui lòng đăng nhập!');
    if (!newComment.trim()) return;
    await createComment({ storyId: id, content: newComment });
    setNewComment('');
    const cmRes = await getCommentsByStory(id);
    setComments(cmRes.data);
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    await createReport({ storyId: id, reason: reportReason });
    setShowReport(false);
    setReportReason('');
    alert('Đã gửi báo lỗi cho admin!');
  };

  if (loading) return <div className="loading"><div className="spinner" />Đang tải...</div>;
  if (!story) return <div className="container"><p>Không tìm thấy truyện.</p></div>;

  return (
    <div className="container">
      {/* Story Header */}
      <div className="card" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ width: '200px', minWidth: '200px', height: '280px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
          {story.coverImage ? (
            <img src={story.coverImage} alt={story.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : <div style={{ width: '100%', height: '100%', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}>📖</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{
              padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
              background: story.type === 'MANGA' ? 'var(--badge-manga-bg)' : 'var(--badge-novel-bg)',
              color: story.type === 'MANGA' ? 'var(--warning)' : 'var(--accent)'
            }}>{story.type === 'MANGA' ? '🎨 Truyện Tranh' : '📝 Light Novel'}</span>
            <span className={`status-badge status-${story.status}`}>{story.status === 'COMPLETED' ? 'Hoàn thành' : story.status === 'ONGOING' ? 'Đang ra' : 'Ngừng'}</span>
          </div>
          <h1 style={{ marginBottom: '0.5rem' }}>{story.title}</h1>
          {story.authors?.length > 0 && <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>✍️ {story.authors.map(a => a.name).join(', ')}</p>}
          {story.categories?.length > 0 && (
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {story.categories.map(c => <span key={c.id} className="category-tag" style={{ fontSize: '0.75rem' }}>{c.name}</span>)}
            </div>
          )}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <span>👁 {story.views || 0} lượt xem</span>
            <span>📖 {chapters.length} chương</span>
            <span>⭐ {rating.averageRating} ({rating.totalRatings} đánh giá)</span>
            <span>❤️ {story.followers || 0} theo dõi</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1rem' }}>{story.description}</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {chapters.length > 0 && (
              <Link to={`/story/${id}/chapter/${chapters[0].id}`} className="btn btn-primary">📖 Đọc từ đầu</Link>
            )}
            <button className={`btn ${following ? 'btn-danger' : 'btn-outline'}`} onClick={handleFollow}>
              {following ? '❤️ Đang theo dõi' : '🤍 Theo dõi'}
            </button>
            <button className="btn btn-outline" onClick={handleBookmark}>📑 Bookmark</button>
            <button className="btn btn-outline" onClick={() => setShowReport(true)} style={{ color: 'var(--warning)' }}>⚠️ Báo lỗi</button>
          </div>
        </div>
      </div>

      {/* Related Stories */}
      {relatedStories.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ marginBottom: '0.75rem' }}>🔗 Phiên bản liên quan</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {relatedStories.map(rs => (
              <Link key={rs.id} to={`/story/${rs.id}`} className="story-card" style={{ textDecoration: 'none', color: 'inherit', maxWidth: '200px' }}>
                <div className="story-cover" style={{ height: '120px' }}>
                  {rs.coverImage ? <img src={rs.coverImage} alt={rs.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📖'}
                </div>
                <div className="story-info">
                  <h3 style={{ fontSize: '0.8rem' }}>{rs.title}</h3>
                  <div className="story-meta">
                    <span style={{
                      padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700,
                      background: rs.type === 'MANGA' ? 'var(--badge-manga-bg)' : 'var(--badge-novel-bg)',
                      color: rs.type === 'MANGA' ? 'var(--warning)' : 'var(--accent)'
                    }}>{rs.type === 'MANGA' ? '🎨 Manga' : '📝 Novel'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Rating */}
      <div className="card" style={{ marginTop: '1rem', textAlign: 'center' }}>
        <h3>Đánh giá truyện</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Mỗi người chỉ được đánh giá 1 lần</p>
        <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', fontSize: '1.8rem', cursor: 'pointer' }}>
          {[1, 2, 3, 4, 5].map(star => (
            <span key={star} onClick={() => handleRate(star)} style={{ color: star <= userRating ? '#f59e0b' : '#555', transition: 'transform 0.2s' }}
              onMouseEnter={e => e.target.style.transform = 'scale(1.2)'} onMouseLeave={e => e.target.style.transform = 'scale(1)'}>★</span>
          ))}
        </div>
        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
          ⭐ {rating.averageRating} trung bình · {rating.totalRatings} đánh giá
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginTop: '1.5rem' }}>
        <button className={`tab ${tab === 'chapters' ? 'active' : ''}`} onClick={() => setTab('chapters')}>📖 Danh sách chương ({chapters.length})</button>
        <button className={`tab ${tab === 'comments' ? 'active' : ''}`} onClick={() => setTab('comments')}>💬 Bình luận ({comments.length})</button>
      </div>

      {/* Chapters */}
      {tab === 'chapters' && (
        <div className="card">
          {chapters.length > 0 ? (
            <ul className="chapter-list">
              {chapters.map(ch => (
                <li key={ch.id} className="chapter-item">
                  <Link to={`/story/${id}/chapter/${ch.id}`} className="chapter-title" style={{ textDecoration: 'none', color: 'inherit' }}>
                    Chương {ch.chapterNumber}: {ch.title}
                  </Link>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(ch.createdAt).toLocaleDateString('vi-VN')}</span>
                </li>
              ))}
            </ul>
          ) : <p>Chưa có chương nào.</p>}
        </div>
      )}

      {/* Comments */}
      {tab === 'comments' && (
        <div className="card">
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input className="form-control" style={{ flex: 1 }} placeholder="Viết bình luận... (có thể bình luận nhiều lần)" value={newComment} onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleComment()} />
            <button className="btn btn-primary" onClick={handleComment}>Gửi</button>
          </div>
          {comments.length > 0 ? comments.map(c => (
            <div key={c.id} style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <strong style={{ color: 'var(--accent)' }}>{c.username || 'Ẩn danh'}</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(c.createdAt).toLocaleString('vi-VN')}</span>
              </div>
              <p style={{ margin: 0 }}>{c.content}</p>
            </div>
          )) : <p>Chưa có bình luận. Hãy là người đầu tiên!</p>}
        </div>
      )}

      {/* Report Modal */}
      {showReport && (
        <div className="modal-overlay" onClick={() => setShowReport(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>⚠️ Báo lỗi nội dung</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nội dung sẽ được gửi đến admin để xử lý.</p>
            <div className="form-group">
              <label>Lý do</label>
              <textarea className="form-control" value={reportReason} onChange={e => setReportReason(e.target.value)}
                placeholder="Mô tả lỗi chi tiết..." />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowReport(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleReport}>Gửi báo lỗi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
