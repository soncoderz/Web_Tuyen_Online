import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  createComment,
  getChapter,
  getChaptersByStory,
  getCommentsByChapter,
  getStory,
  saveReadingHistory,
  addBookmark,
  deleteBookmark,
  getBookmarksByChapter,
} from '../services/api';

export default function ChapterReader() {
  const { storyId, chapterId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { themeKey } = useTheme();

  const [story, setStory] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  // Bookmark state
  const [chapterBookmarks, setChapterBookmarks] = useState([]);
  const [bookmarkAnimating, setBookmarkAnimating] = useState(null);

  // Reader settings
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('Georgia');
  const [bgColor, setBgColor] = useState('');
  const [textColor, setTextColor] = useState('');
  const [lineHeight, setLineHeight] = useState(1.8);
  const [showSettings, setShowSettings] = useState(false);

  // Refs for scrolling to bookmark
  const pageRefs = useRef([]);
  const paragraphRefs = useRef([]);

  useEffect(() => {
    loadChapter();
  }, [chapterId]);

  useEffect(() => {
    const getVar = (name, fallback) => {
      if (typeof window === 'undefined') return fallback;
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    };
    setBgColor(getVar('--bg-card', '#ffffff'));
    setTextColor(getVar('--text-primary', '#0f172a'));
  }, [themeKey]);

  // Scroll to bookmarked position from URL param
  useEffect(() => {
    if (!loading && chapter) {
      const scrollTo = searchParams.get('page');
      if (scrollTo !== null) {
        const idx = parseInt(scrollTo, 10);
        setTimeout(() => scrollToIndex(idx), 300);
      }
    }
  }, [loading, chapter, searchParams]);

  const scrollToIndex = (idx) => {
    const isManga = story?.type === 'MANGA';
    const refs = isManga ? pageRefs.current : paragraphRefs.current;
    if (refs[idx]) {
      refs[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash effect
      refs[idx].style.outline = '3px solid var(--accent)';
      refs[idx].style.outlineOffset = '4px';
      refs[idx].style.transition = 'outline 0.3s ease';
      setTimeout(() => {
        if (refs[idx]) {
          refs[idx].style.outline = 'none';
        }
      }, 2000);
    }
  };

  const loadChapter = async () => {
    setLoading(true);
    try {
      const [chRes, sRes, chsRes, cmRes] = await Promise.all([
        getChapter(chapterId),
        getStory(storyId),
        getChaptersByStory(storyId),
        getCommentsByChapter(chapterId),
      ]);
      setChapter(chRes.data);
      setStory(sRes.data);
      setChapters(chsRes.data);
      setComments(cmRes.data);
      if (user) {
        saveReadingHistory({ storyId, chapterId }).catch(() => { });
        loadBookmarks();
      }
      try {
        const readChapters = JSON.parse(localStorage.getItem('readChapters') || '[]');
        if (!readChapters.includes(chapterId)) {
          readChapters.push(chapterId);
          localStorage.setItem('readChapters', JSON.stringify(readChapters));
        }
      } catch { }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const loadBookmarks = async () => {
    try {
      const res = await getBookmarksByChapter(chapterId);
      setChapterBookmarks(res.data);
    } catch {
      setChapterBookmarks([]);
    }
  };

  const isPageBookmarked = (pageIdx) => {
    return chapterBookmarks.find(b => b.pageIndex === pageIdx);
  };

  const handleToggleBookmark = async (pageIdx) => {
    if (!user) return alert('Vui lòng đăng nhập để đánh dấu!');
    const existing = isPageBookmarked(pageIdx);
    setBookmarkAnimating(pageIdx);
    try {
      if (existing) {
        await deleteBookmark(existing.id);
      } else {
        const isManga = story?.type === 'MANGA';
        const note = isManga
          ? `Trang ${pageIdx + 1} - Ch.${chapter.chapterNumber}: ${chapter.title}`
          : `Đoạn ${pageIdx + 1} - Ch.${chapter.chapterNumber}: ${chapter.title}`;
        await addBookmark({
          storyId,
          chapterId,
          pageIndex: pageIdx,
          note,
        });
      }
      await loadBookmarks();
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => setBookmarkAnimating(null), 400);
  };

  const currentIndex = chapters.findIndex((c) => c.id === chapterId);
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;
  const isManga = story?.type === 'MANGA';

  const handleComment = async () => {
    if (!user) return alert('Vui long dang nhap!');
    if (!newComment.trim()) return;
    await createComment({ storyId, chapterId, content: newComment });
    setNewComment('');
    const cmRes = await getCommentsByChapter(chapterId);
    setComments(cmRes.data);
  };

  // Split novel content into paragraphs
  const getNovelParagraphs = () => {
    if (!chapter?.content) return [];
    return chapter.content.split('\n').filter(p => p.trim().length > 0);
  };

  if (loading) return <div className="loading"><div className="spinner" />Dang tai...</div>;
  if (!chapter || !story) return <div className="container"><p>Khong tim thay chuong.</p></div>;

  const novelParagraphs = isManga ? [] : getNovelParagraphs();

  return (
    <div style={{ minHeight: '100vh', background: isManga ? 'var(--bg-primary)' : bgColor, transition: 'background 0.25s ease' }}>
      {/* Top Navigation */}
      <div style={{
        background: 'var(--bg-header)',
        backdropFilter: 'blur(10px)',
        padding: '0.75rem 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '1px solid var(--border)',
      }}>
        <Link to={`/story/${storyId}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
          ← {story.title}
        </Link>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={chapterId}
            onChange={(e) => navigate(`/story/${storyId}/chapter/${e.target.value}`)}
            style={{
              padding: '0.35rem 0.6rem',
              borderRadius: '6px',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              fontSize: '0.85rem',
            }}
          >
            {chapters.map((ch) => (
              <option key={ch.id} value={ch.id}>Ch.{ch.chapterNumber}: {ch.title}</option>
            ))}
          </select>
          {!isManga && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                background: showSettings ? 'var(--accent)' : 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              ⚙️
            </button>
          )}
        </div>
      </div>

      {/* Novel Settings Panel */}
      {showSettings && !isManga && (
        <div style={{
          background: 'var(--bg-card)',
          padding: '1rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}>
          <label>Co chu: <input type="range" min="14" max="28" value={fontSize} onChange={(e) => setFontSize(+e.target.value)} /> {fontSize}px</label>
          <label>Dan dong: <input type="range" min="1.2" max="3" step="0.1" value={lineHeight} onChange={(e) => setLineHeight(+e.target.value)} /> {lineHeight}</label>
          <label>Font:
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              style={{
                marginLeft: '4px',
                padding: '2px 6px',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
              }}
            >
              <option value="Georgia">Georgia</option>
              <option value="Inter">Inter</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
            </select>
          </label>
          <label>Nen: <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} /></label>
          <label>Chu: <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} /></label>
        </div>
      )}

      {/* Chapter Title */}
      <div style={{ textAlign: 'center', padding: '1.5rem 1rem 0.5rem', color: 'var(--text-primary)' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Chuong {chapter.chapterNumber}: {chapter.title}</h2>
        <span style={{
          padding: '0.15rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.7rem',
          fontWeight: 700,
          background: isManga ? 'var(--badge-manga-bg)' : 'var(--badge-novel-bg)',
          color: isManga ? 'var(--warning)' : 'var(--accent)',
        }}>{isManga ? 'Truyen Tranh' : 'Light Novel'}</span>
      </div>

      {/* Bookmark Legend */}
      {user && (
        <div style={{
          textAlign: 'center',
          padding: '0.25rem 1rem 0.75rem',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
        }}>
          <span style={{ fontSize: '1rem' }}>🔖</span>
          <span>Bấm vào nút đánh dấu bên cạnh {isManga ? 'trang ảnh' : 'đoạn văn'} để bookmark vị trí đọc</span>
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: isManga ? '900px' : '750px', margin: '0 auto', padding: '1rem' }}>
        {isManga ? (
          /* === MANGA READER: Image Pages with Bookmark Buttons === */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            {chapter.pages && chapter.pages.length > 0 ? (
              chapter.pages.map((page, idx) => {
                const bm = isPageBookmarked(idx);
                const isAnimating = bookmarkAnimating === idx;
                return (
                  <div
                    key={idx}
                    ref={el => pageRefs.current[idx] = el}
                    style={{ position: 'relative', width: '100%', maxWidth: '900px' }}
                  >
                    <img
                      src={page}
                      alt={`Trang ${idx + 1}`}
                      style={{ width: '100%', display: 'block', borderRadius: '2px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                      loading="lazy"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    {/* Bookmark button - top right of each image */}
                    {user && (
                      <button
                        onClick={() => handleToggleBookmark(idx)}
                        title={bm ? 'Bỏ đánh dấu trang này' : 'Đánh dấu trang này'}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.3rem',
                          background: bm
                            ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                            : 'rgba(0,0,0,0.55)',
                          color: '#fff',
                          backdropFilter: 'blur(6px)',
                          boxShadow: bm
                            ? '0 2px 12px rgba(245,158,11,0.5)'
                            : '0 2px 8px rgba(0,0,0,0.3)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          transform: isAnimating ? 'scale(1.3)' : 'scale(1)',
                          zIndex: 10,
                        }}
                      >
                        {bm ? '🔖' : '📌'}
                      </button>
                    )}
                    {/* Page number indicator */}
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '8px',
                      background: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      backdropFilter: 'blur(4px)',
                    }}>
                      Trang {idx + 1}/{chapter.pages.length}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎨</div>
                <p>Chuong nay chua co hinh anh.</p>
              </div>
            )}
          </div>
        ) : (
          /* === NOVEL READER: Text Content with Paragraph Bookmarks === */
          <div style={{
            background: bgColor,
            borderRadius: '12px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
            padding: '1.5rem',
          }}>
            {novelParagraphs.length > 0 ? (
              novelParagraphs.map((para, idx) => {
                const bm = isPageBookmarked(idx);
                const isAnimating = bookmarkAnimating === idx;
                return (
                  <div
                    key={idx}
                    ref={el => paragraphRefs.current[idx] = el}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'flex-start',
                      marginBottom: '0.25rem',
                      padding: '0.35rem 0.25rem 0.35rem 0',
                      borderRadius: '6px',
                      transition: 'background 0.2s ease',
                      background: bm ? 'rgba(245,158,11,0.08)' : 'transparent',
                      borderLeft: bm ? '3px solid #f59e0b' : '3px solid transparent',
                    }}
                  >
                    {/* Bookmark button for paragraph */}
                    {user && (
                      <button
                        onClick={() => handleToggleBookmark(idx)}
                        title={bm ? 'Bỏ đánh dấu đoạn này' : 'Đánh dấu đoạn này'}
                        style={{
                          flexShrink: 0,
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          background: bm
                            ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                            : 'rgba(128,128,128,0.15)',
                          color: bm ? '#fff' : 'var(--text-secondary)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          transform: isAnimating ? 'scale(1.3)' : 'scale(1)',
                          opacity: bm ? 1 : 0.4,
                          marginTop: '2px',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={e => { if (!bm) e.currentTarget.style.opacity = '0.4'; }}
                      >
                        {bm ? '🔖' : '📌'}
                      </button>
                    )}
                    <p style={{
                      margin: 0,
                      fontSize: `${fontSize}px`,
                      fontFamily,
                      color: textColor,
                      lineHeight,
                      textAlign: 'justify',
                      flex: 1,
                    }}>
                      {para}
                    </p>
                  </div>
                );
              })
            ) : (
              <p style={{ color: textColor }}>Chuong nay chua co noi dung.</p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', padding: '1.5rem', flexWrap: 'wrap' }}>
        {prevChapter && (
          <Link to={`/story/${storyId}/chapter/${prevChapter.id}`} className="btn btn-outline" style={{ minWidth: '140px', textAlign: 'center' }}>← Chuong truoc</Link>
        )}
        <Link to={`/story/${storyId}`} className="btn btn-outline">📚 Danh sach</Link>
        {nextChapter && (
          <Link to={`/story/${storyId}/chapter/${nextChapter.id}`} className="btn btn-primary" style={{ minWidth: '140px', textAlign: 'center' }}>Chuong tiep →</Link>
        )}
      </div>

      {/* Comments */}
      <div style={{ maxWidth: '750px', margin: '0 auto', padding: '1rem' }}>
        <div className="card">
          <h3>💬 Binh luan chuong ({comments.length})</h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', marginTop: '0.75rem' }}>
            <input
              className="form-control"
              style={{ flex: 1 }}
              placeholder="Viet binh luan..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
            />
            <button className="btn btn-primary" onClick={handleComment}>Gui</button>
          </div>
          {comments.map((c) => (
            <div key={c.id} style={{ padding: '0.6rem', borderBottom: '1px solid var(--border)', marginBottom: '0.4rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <strong style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>{c.username || 'An danh'}</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(c.createdAt).toLocaleString('vi-VN')}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>{c.content}</p>
            </div>
          ))}
          {comments.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Chua co binh luan cho chuong nay.</p>}
        </div>
      </div>
    </div>
  );
}
