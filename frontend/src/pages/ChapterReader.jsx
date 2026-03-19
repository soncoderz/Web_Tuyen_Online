import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getChapter, getChaptersByStory, getStory,
  saveReadingHistory, getCommentsByChapter, createComment, deleteComment
} from '../services/api';

export default function ChapterReader() {
  const { storyId, chapterId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState(null);
  const [story, setStory] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);

  // Reader settings
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [bgColor, setBgColor] = useState('#0f0f1a');
  const [textColor, setTextColor] = useState('#e8e8f0');
  const [lineHeight, setLineHeight] = useState(2);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getChapter(chapterId),
      getChaptersByStory(storyId),
      getStory(storyId),
      getCommentsByChapter(chapterId)
    ]).then(([chRes, chsRes, sRes, cmRes]) => {
      setChapter(chRes.data);
      setChapters(chsRes.data);
      setStory(sRes.data);
      setComments(cmRes.data);
      if (user) saveReadingHistory({ storyId, chapterId }).catch(() => {});
    }).catch(console.error).finally(() => setLoading(false));
    window.scrollTo(0, 0);
  }, [chapterId, storyId, user]);

  const currentIndex = chapters.findIndex(c => c.id === chapterId);
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    if (!commentText.trim()) return;
    await createComment({ storyId, chapterId, content: commentText });
    setCommentText('');
    const cmRes = await getCommentsByChapter(chapterId);
    setComments(cmRes.data);
  };

  const handleDeleteComment = async (cmId) => {
    await deleteComment(cmId);
    setComments(comments.filter(c => c.id !== cmId));
  };

  if (loading) return <div className="loading"><div className="spinner" />Đang tải...</div>;
  if (!chapter) return <div className="container"><div className="empty-state"><p>Không tìm thấy chương.</p></div></div>;

  return (
    <div style={{ background: bgColor, minHeight: '100vh' }}>
      <div className="reader-container">
        {/* Header */}
        <div className="reader-header">
          <Link to={`/story/${storyId}`} style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>
            ← {story?.title}
          </Link>
          <h1 style={{ color: textColor }}>Chương {chapter.chapterNumber}</h1>
          <h2 style={{ color: textColor, opacity: 0.7 }}>{chapter.title}</h2>
        </div>

        {/* Settings */}
        <div className="reader-settings">
          <label>Cỡ chữ:
            <input type="range" min="14" max="28" value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))} />
            {fontSize}px
          </label>
          <label>Font:
            <select value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
              <option value="Inter">Inter</option>
              <option value="Georgia">Georgia</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
            </select>
          </label>
          <label>Nền:
            <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ width: '32px', height: '24px' }} />
          </label>
          <label>Chữ:
            <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} style={{ width: '32px', height: '24px' }} />
          </label>
          <label>Dãn dòng:
            <select value={lineHeight} onChange={e => setLineHeight(Number(e.target.value))}>
              <option value={1.5}>1.5</option>
              <option value={1.8}>1.8</option>
              <option value={2}>2.0</option>
              <option value={2.5}>2.5</option>
            </select>
          </label>
        </div>

        {/* Content */}
        <div className="reader-content" style={{
          fontSize: `${fontSize}px`,
          fontFamily,
          color: textColor,
          lineHeight
        }}>
          {chapter.content}
        </div>

        {/* Navigation */}
        <div className="reader-nav">
          {prevChapter ? (
            <button className="btn btn-outline"
              onClick={() => navigate(`/story/${storyId}/chapter/${prevChapter.id}`)}>
              ← Chương trước
            </button>
          ) : <div />}

          <select className="form-control" style={{ maxWidth: '200px' }}
            value={chapterId}
            onChange={e => navigate(`/story/${storyId}/chapter/${e.target.value}`)}>
            {chapters.map(c => (
              <option key={c.id} value={c.id}>Chương {c.chapterNumber}: {c.title}</option>
            ))}
          </select>

          {nextChapter ? (
            <button className="btn btn-primary"
              onClick={() => navigate(`/story/${storyId}/chapter/${nextChapter.id}`)}>
              Chương sau →
            </button>
          ) : <div />}
        </div>

        {/* Chapter Comments */}
        <div style={{ marginTop: '2rem' }}>
          <h3 className="section-title">💬 Bình luận chương</h3>
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
              <div className="empty-state"><p>Chưa có bình luận.</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
