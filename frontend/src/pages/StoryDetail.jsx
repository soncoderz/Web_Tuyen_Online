import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getStory, getChaptersByStory, incrementViews, followStory, isFollowing,
  getCommentsByStory, createComment, deleteComment,
  rateStory, getStoryRating, getUserRating,
  addBookmark, createReport
} from '../services/api';

export default function StoryDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [story, setStory] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [comments, setComments] = useState([]);
  const [following, setFollowing] = useState(false);
  const [rating, setRating] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [tab, setTab] = useState('chapters');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getStory(id),
      getChaptersByStory(id),
      getCommentsByStory(id),
      getStoryRating(id)
    ]).then(([sRes, chRes, cmRes, rRes]) => {
      setStory(sRes.data);
      setChapters(chRes.data);
      setComments(cmRes.data);
      setRating(rRes.data);
      incrementViews(id).catch(() => {});
    }).catch(console.error).finally(() => setLoading(false));

    if (user) {
      isFollowing(id).then(r => setFollowing(r.data.isFollowing)).catch(() => {});
      getUserRating(id).then(r => { if (r.data.score) setUserScore(r.data.score); }).catch(() => {});
    }
  }, [id, user]);

  const handleFollow = async () => {
    if (!user) return navigate('/login');
    const res = await followStory(id);
    setFollowing(res.data.isFollowing);
    setStory(s => ({ ...s, followers: res.data.followers }));
  };

  const handleRate = async (score) => {
    if (!user) return navigate('/login');
    setUserScore(score);
    await rateStory({ storyId: id, score });
    const rRes = await getStoryRating(id);
    setRating(rRes.data);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    if (!commentText.trim()) return;
    await createComment({ storyId: id, content: commentText });
    setCommentText('');
    const cmRes = await getCommentsByStory(id);
    setComments(cmRes.data);
  };

  const handleDeleteComment = async (cmId) => {
    await deleteComment(cmId);
    setComments(comments.filter(c => c.id !== cmId));
  };

  const handleBookmark = async () => {
    if (!user) return navigate('/login');
    await addBookmark({ storyId: id });
    setMessage('Đã thêm bookmark!');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    await createReport({ storyId: id, reason: reportReason });
    setShowReport(false);
    setReportReason('');
    setMessage('Báo lỗi đã được gửi!');
    setTimeout(() => setMessage(''), 2000);
  };

  if (loading) return <div className="loading"><div className="spinner" />Đang tải...</div>;
  if (!story) return <div className="container"><div className="empty-state"><p>Không tìm thấy truyện.</p></div></div>;

  return (
    <div className="container">
      {message && <div className="alert alert-success">{message}</div>}

      <div className="story-detail">
        <div className="story-detail-cover">
          {story.coverImage ? (
            <img src={story.coverImage} alt={story.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius)' }} />
          ) : '📖'}
        </div>
        <div className="story-detail-info">
          <h1>{story.title}</h1>
          <div className="categories-list">
            {story.categories?.map(c => (
              <span key={c.id} className="category-tag">{c.name}</span>
            ))}
            <span className={`status-badge status-${story.status}`}>{story.status}</span>
          </div>
          <div className="story-detail-stats">
            <div className="stat-item">👁 <strong>{story.views}</strong> lượt xem</div>
            <div className="stat-item">❤️ <strong>{story.followers}</strong> theo dõi</div>
            <div className="stat-item">⭐ <strong>{rating.averageRating || 0}</strong> ({rating.totalRatings || 0} đánh giá)</div>
            <div className="stat-item">📖 <strong>{chapters.length}</strong> chương</div>
          </div>

          {/* Rating */}
          <div style={{ margin: '1rem 0' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>Đánh giá:</span>
            <span className="rating-stars">
              {[1, 2, 3, 4, 5].map(s => (
                <span key={s} className={`star ${s <= (hoveredStar || userScore) ? 'filled' : ''}`}
                  onMouseEnter={() => setHoveredStar(s)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => handleRate(s)}>★</span>
              ))}
            </span>
          </div>

          <div className="story-detail-actions">
            {chapters.length > 0 && (
              <Link to={`/story/${id}/chapter/${chapters[0].id}`} className="btn btn-primary">
                📖 Đọc từ đầu
              </Link>
            )}
            <button className={`btn ${following ? 'btn-danger' : 'btn-outline'}`} onClick={handleFollow}>
              {following ? '❤️ Đang theo dõi' : '🤍 Theo dõi'}
            </button>
            <button className="btn btn-outline" onClick={handleBookmark}>📑 Bookmark</button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowReport(true)}>⚠️ Báo lỗi</button>
          </div>

          <p className="story-description">{story.description}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'chapters' ? 'active' : ''}`} onClick={() => setTab('chapters')}>
          📖 Danh sách chương ({chapters.length})
        </button>
        <button className={`tab ${tab === 'comments' ? 'active' : ''}`} onClick={() => setTab('comments')}>
          💬 Bình luận ({comments.length})
        </button>
      </div>

      {tab === 'chapters' && (
        <div className="card">
          {chapters.length > 0 ? (
            <ul className="chapter-list">
              {chapters.map(ch => (
                <li key={ch.id} className="chapter-item"
                  onClick={() => navigate(`/story/${id}/chapter/${ch.id}`)}>
                  <span className="chapter-title">Chương {ch.chapterNumber}: {ch.title}</span>
                  <span className="chapter-date">{new Date(ch.createdAt).toLocaleDateString('vi-VN')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state"><p>Chưa có chương nào.</p></div>
          )}
        </div>
      )}

      {tab === 'comments' && (
        <div className="card">
          <form className="comment-form" onSubmit={handleComment}>
            <input className="form-control" placeholder="Viết bình luận..."
              value={commentText} onChange={e => setCommentText(e.target.value)} />
            <button className="btn btn-primary" type="submit">Gửi</button>
          </form>
          {comments.length > 0 ? (
            comments.map(c => (
              <div key={c.id} className="comment-item">
                <div className="comment-header">
                  <span className="comment-user">{c.username}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="comment-date">{new Date(c.createdAt).toLocaleDateString('vi-VN')}</span>
                    {user && (user.id === c.userId || user.roles?.includes('ROLE_ADMIN')) && (
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteComment(c.id)}>Xóa</button>
                    )}
                  </div>
                </div>
                <p className="comment-content">{c.content}</p>
              </div>
            ))
          ) : (
            <div className="empty-state"><p>Chưa có bình luận nào.</p></div>
          )}
        </div>
      )}

      {/* Report Modal */}
      {showReport && (
        <div className="modal-overlay" onClick={() => setShowReport(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>⚠️ Báo lỗi nội dung</h2>
            <div className="form-group">
              <label>Lý do</label>
              <textarea className="form-control" value={reportReason}
                onChange={e => setReportReason(e.target.value)} placeholder="Mô tả lỗi..." />
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
