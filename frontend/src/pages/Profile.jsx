import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import BookmarkIcon from '../components/BookmarkIcon';
import { useAuth } from '../context/AuthContext';
import useBookmarks, { getBookmarkLocation } from '../hooks/useBookmarks';
import {
  deleteReadingHistoryItem,
  getChapter,
  getChaptersByStory,
  getFollowedStories,
  getReadingHistory,
  getStory,
} from '../services/api';

function getReadChapters() {
  try {
    return JSON.parse(localStorage.getItem('readChapters') || '[]');
  } catch {
    return [];
  }
}

function isValidMongoId(id) {
  return Boolean(id) && typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';

  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Vua xong';
  if (diffMin < 60) return `${diffMin} phut truoc`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} gio truoc`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} ngay truoc`;

  return new Date(dateStr).toLocaleDateString('vi-VN');
}

function buildBookmarkStory(bookmark) {
  const story = bookmark?.story || null;
  const fallbackTitle = story?.title || 'Truyen khong con kha dung';

  return {
    id: story?.id || '',
    title: fallbackTitle,
    coverImage: story?.coverImage || '',
    type: story?.type || null,
    views: typeof story?.views === 'number' ? story.views : null,
    averageRating:
      typeof story?.averageRating === 'number' ? story.averageRating : null,
  };
}

function getBookmarkNote(bookmark) {
  if (bookmark?.textSnippet) {
    return bookmark.textSnippet;
  }

  const note = bookmark?.note?.trim();
  if (!note) {
    return '';
  }

  const storyTitle = bookmark?.story?.title?.trim();
  if (storyTitle && note === storyTitle) {
    return '';
  }

  if (/^(Trang|Doan)\s+\d+$/i.test(note)) {
    return '';
  }

  return note;
}

function getBookmarkLocationLabel(bookmark) {
  const chapterNumber = bookmark?.chapter?.chapterNumber;
  const chapterLabel =
    typeof chapterNumber === 'number' ? `Ch.${chapterNumber}` : bookmark?.chapter?.title || '';

  if (typeof bookmark?.pageIndex === 'number') {
    return chapterLabel
      ? `${chapterLabel} · Trang ${bookmark.pageIndex + 1}`
      : `Trang ${bookmark.pageIndex + 1}`;
  }

  if (typeof bookmark?.paragraphIndex === 'number') {
    return chapterLabel
      ? `${chapterLabel} · Doan ${bookmark.paragraphIndex + 1}`
      : `Doan ${bookmark.paragraphIndex + 1}`;
  }

  return chapterLabel;
}

function getBookmarkAction(bookmark) {
  if (!bookmark?.story?.id) {
    return { href: '#', label: 'Khong kha dung', disabled: true };
  }

  if (bookmark.chapterId && !bookmark.chapter?.id) {
    return { href: '#', label: 'Khong mo duoc vi tri', disabled: true };
  }

  if (bookmark.chapter?.id) {
    const params = new URLSearchParams();
    if (typeof bookmark.pageIndex === 'number') {
      params.set('page', String(bookmark.pageIndex + 1));
    }
    if (typeof bookmark.paragraphIndex === 'number') {
      params.set('paragraph', String(bookmark.paragraphIndex + 1));
    }
    const suffix = params.toString() ? `?${params.toString()}` : '';

    return {
      href: `/story/${bookmark.story.id}/chapter/${bookmark.chapter.id}${suffix}`,
      label: typeof bookmark.pageIndex === 'number'
        ? `Doc Trang ${bookmark.pageIndex + 1}`
        : typeof bookmark.paragraphIndex === 'number'
          ? `Doc Doan ${bookmark.paragraphIndex + 1}`
          : typeof bookmark.chapter.chapterNumber === 'number'
            ? `Doc Ch.${bookmark.chapter.chapterNumber}`
            : 'Doc ngay',
      disabled: false,
    };
  }

  return {
    href: `/story/${bookmark.story.id}`,
    label: 'Doc ngay',
    disabled: false,
  };
}

function getBookmarkChapterLabel(bookmark) {
  if (typeof bookmark?.chapter?.chapterNumber === 'number') {
    const chapterTitle = bookmark?.chapter?.title?.trim();
    return chapterTitle
      ? `Ch.${bookmark.chapter.chapterNumber}: ${chapterTitle}`
      : `Ch.${bookmark.chapter.chapterNumber}`;
  }

  const chapterTitle = bookmark?.chapter?.title?.trim();
  if (chapterTitle) {
    return chapterTitle;
  }

  if (bookmark?.chapterId) {
    return 'Chuong da luu';
  }

  return 'Bookmark tong quat';
}

function getBookmarkPositionLabel(bookmark) {
  const { pageIndex, paragraphIndex } = getBookmarkLocation(bookmark);

  if (typeof pageIndex === 'number') {
    return `Trang ${pageIndex + 1}`;
  }

  if (typeof paragraphIndex === 'number') {
    return `Doan ${paragraphIndex + 1}`;
  }

  return 'Vi tri da luu';
}

function getBookmarkProfileAction(bookmark) {
  if (!bookmark?.story?.id) {
    return { href: '#', label: 'Khong kha dung', disabled: true };
  }

  if (bookmark.chapterId && !bookmark.chapter?.id) {
    return { href: '#', label: 'Khong mo duoc vi tri', disabled: true };
  }

  if (bookmark.chapter?.id) {
    const { pageIndex, paragraphIndex } = getBookmarkLocation(bookmark);
    const params = new URLSearchParams();
    if (typeof pageIndex === 'number') {
      params.set('page', String(pageIndex + 1));
    }
    if (typeof paragraphIndex === 'number') {
      params.set('paragraph', String(paragraphIndex + 1));
    }
    const suffix = params.toString() ? `?${params.toString()}` : '';

    return {
      href: `/story/${bookmark.story.id}/chapter/${bookmark.chapter.id}${suffix}`,
      label: 'Doc',
      disabled: false,
    };
  }

  return {
    href: `/story/${bookmark.story.id}`,
    label: 'Doc',
    disabled: false,
  };
}

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'history');
  const [history, setHistory] = useState([]);
  const [followedStories, setFollowedStories] = useState([]);
  const [chaptersMap, setChaptersMap] = useState({});
  const [storyCache, setStoryCache] = useState({});
  const [chapterCache, setChapterCache] = useState({});
  const [loading, setLoading] = useState(true);
  const {
    bookmarks,
    loading: bookmarksLoading,
    isProcessing: isBookmarkProcessing,
    toggleBookmark,
  } = useBookmarks(user);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    loadData();
  }, [user, authLoading]);

  useEffect(() => {
    const nextTab = searchParams.get('tab');
    if (nextTab) {
      setTab(nextTab);
    }
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    const silentRequest = { silent: true };

    try {
      const [historyRes, followedRes] = await Promise.all([
        getReadingHistory(),
        getFollowedStories(),
      ]);

      const historyItems = historyRes.data || [];
      const followedItems = followedRes.data || [];

      setHistory(historyItems);
      setFollowedStories(followedItems);

      const storyIds = Array.from(
        new Set(historyItems.map((item) => item.storyId).filter(isValidMongoId)),
      );

      const storyResults = await Promise.all(
        storyIds.map((storyId) =>
          getStory(storyId, silentRequest)
            .then((response) => ({ storyId, story: response.data }))
            .catch(() => ({ storyId, story: null })),
        ),
      );

      const nextStoryCache = {};
      storyResults.forEach(({ storyId, story }) => {
        nextStoryCache[storyId] = story;
      });
      setStoryCache(nextStoryCache);

      const chapterIds = Array.from(
        new Set(historyItems.map((item) => item.chapterId).filter(isValidMongoId)),
      );

      const chapterResults = await Promise.all(
        chapterIds.map((chapterId) =>
          getChapter(chapterId, silentRequest)
            .then((response) => ({ chapterId, chapter: response.data }))
            .catch(() => ({ chapterId, chapter: null })),
        ),
      );

      const nextChapterCache = {};
      chapterResults.forEach(({ chapterId, chapter }) => {
        nextChapterCache[chapterId] = chapter;
      });
      setChapterCache(nextChapterCache);

      if (followedItems.length > 0) {
        const followedChapterResults = await Promise.all(
          followedItems.map((story) =>
            getChaptersByStory(story.id, silentRequest)
              .then((response) => ({
                storyId: story.id,
                chapters: response.data || [],
              }))
              .catch(() => ({ storyId: story.id, chapters: [] })),
          ),
        );

        const nextChaptersMap = {};
        followedChapterResults.forEach(({ storyId, chapters }) => {
          const sorted = [...chapters].sort(
            (a, b) => b.chapterNumber - a.chapterNumber,
          );
          nextChaptersMap[storyId] = sorted.slice(0, 2);
        });
        setChaptersMap(nextChaptersMap);
      } else {
        setChaptersMap({});
      }
    } catch (error) {
      if (!error?.sessionExpired && error?.response?.status !== 401) {
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistory = async (id) => {
    await deleteReadingHistoryItem(id);
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDeleteBookmark = async (bookmark) => {
    try {
      await toggleBookmark({
        storyId: bookmark.storyId,
        chapterId: bookmark.chapterId,
        pageIndex: bookmark.pageIndex,
        paragraphIndex: bookmark.paragraphIndex,
      });
    } catch (error) {
      alert('Khong cap nhat duoc bookmark.');
    }
  };

  if (!user) {
    return null;
  }

  const pageLoading = loading || bookmarksLoading;

  return (
    <div className="container">
      <div className="profile-header">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.username}
            className="profile-avatar-img"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="profile-avatar">{user.username?.[0]?.toUpperCase()}</div>
        )}

        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{user.username}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {user.email}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            {user.roles?.map((role) => (
              <span key={role} className="category-tag">
                {role.replace('ROLE_', '')}
              </span>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginTop: '0.9rem',
              flexWrap: 'wrap',
            }}
          >
            <Link to="/studio" className="btn btn-primary btn-sm">
              Dang truyen va them chuong
            </Link>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          Lich su doc ({history.length})
        </button>
        <button
          className={`tab ${tab === 'bookmarks' ? 'active' : ''}`}
          onClick={() => setTab('bookmarks')}
        >
          Bookmark ({bookmarks.length})
        </button>
        <button
          className={`tab ${tab === 'following' ? 'active' : ''}`}
          onClick={() => setTab('following')}
        >
          Theo doi ({followedStories.length})
        </button>
      </div>

      {pageLoading ? (
        <div className="loading">
          <div className="spinner" />
          Dang tai...
        </div>
      ) : (
        <>
          {tab === 'history' && (
            <div>
              {history.length > 0 ? (
                <div className="story-grid">
                  {history.map((item) => {
                    const story = storyCache[item.storyId];
                    const chapter = item.chapterId ? chapterCache[item.chapterId] : null;
                    const hasStory = Boolean(story?.id);

                    return (
                      <LibraryStoryCard
                        key={item.id}
                        story={
                          story || {
                            id: '',
                            title: 'Truyen khong con kha dung',
                            coverImage: '',
                            type: null,
                            views: null,
                            averageRating: null,
                          }
                        }
                        chapter={chapter}
                        timestampLabel={`Doc lan cuoi ${formatTimeAgo(item.lastReadAt)}`}
                        actionHref={
                          hasStory
                            ? chapter?.id
                              ? `/story/${story.id}/chapter/${chapter.id}`
                              : `/story/${story.id}`
                            : '#'
                        }
                        actionLabel={
                          hasStory
                            ? chapter?.chapterNumber
                              ? `Doc tiep Ch.${chapter.chapterNumber}`
                              : 'Doc tiep'
                            : 'Khong kha dung'
                        }
                        actionDisabled={!hasStory}
                        statusLabel={!hasStory ? 'Khong con truy cap' : ''}
                        onDelete={() => handleDeleteHistory(item.id)}
                        deleteLabel="Xoa lich su"
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="card">
                  <div className="empty-state">
                    <p>Chua co lich su doc.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'bookmarks' && (
            <div>
              {bookmarks.length > 0 ? (
                <div className="bookmark-list">
                  {bookmarks.map((bookmark) => {
                    const action = getBookmarkProfileAction(bookmark);

                    return (
                      <BookmarkLibraryItem
                        key={bookmark.id}
                        bookmark={bookmark}
                        story={buildBookmarkStory(bookmark)}
                        chapterLabel={getBookmarkChapterLabel(bookmark)}
                        positionLabel={getBookmarkPositionLabel(bookmark)}
                        note={getBookmarkNote(bookmark)}
                        timestampLabel={`Da luu ${formatTimeAgo(bookmark.createdAt)}`}
                        action={action}
                        onDelete={() => handleDeleteBookmark(bookmark)}
                        deleteDisabled={isBookmarkProcessing(
                          bookmark.storyId,
                          bookmark.chapterId,
                          bookmark.pageIndex,
                          bookmark.paragraphIndex,
                        )}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="card">
                  <div className="empty-state">
                    <p>Chua co bookmark nao.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'following' &&
            (followedStories.length > 0 ? (
              <div className="story-grid">
                {followedStories.map((story) => (
                  <FollowedStoryCard
                    key={story.id}
                    story={story}
                    chapters={chaptersMap[story.id] || []}
                  />
                ))}
              </div>
            ) : (
              <div className="card">
                <div className="empty-state">
                  <p>Chua theo doi truyen nao.</p>
                </div>
              </div>
            ))}
        </>
      )}
    </div>
  );
}

function FollowedStoryCard({ story, chapters }) {
  const readChapters = getReadChapters();
  const recentChapter = chapters?.[0];
  const actionHref = recentChapter
    ? `/story/${story.id}/chapter/${recentChapter.id}`
    : `/story/${story.id}`;

  return (
    <div className="story-card">
      <Link to={`/story/${story.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="story-cover">
          {story.coverImage ? (
            <img
              src={story.coverImage}
              alt={story.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            'Truyen'
          )}
        </div>
        <div className="story-info">
          <h3>{story.title}</h3>
          <div className="story-meta">
            <span
              style={{
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
                fontSize: '0.65rem',
                fontWeight: 700,
                background:
                  story.type === 'MANGA'
                    ? 'var(--badge-manga-bg)'
                    : 'var(--badge-novel-bg)',
                color: story.type === 'MANGA' ? 'var(--warning)' : 'var(--accent)',
              }}
            >
              {story.type === 'MANGA' ? 'Manga' : 'Novel'}
            </span>
            <span>Views {story.views || 0}</span>
            <span>Rating {story.averageRating || 0}</span>
          </div>
          {recentChapter && (
            <div className="story-meta" style={{ marginTop: 6, fontSize: '0.82rem' }}>
              <strong>Ch.{recentChapter.chapterNumber}</strong> · {recentChapter.title}
            </div>
          )}
        </div>
      </Link>

      {chapters.length > 0 && (
        <div className="story-card-chapters">
          {chapters.map((chapter) => {
            const isRead = readChapters.includes(chapter.id);
            return (
              <Link
                key={chapter.id}
                to={`/story/${story.id}/chapter/${chapter.id}`}
                className={`story-card-chapter ${isRead ? 'read' : 'unread'}`}
                title={`Ch.${chapter.chapterNumber}: ${chapter.title}`}
              >
                <span className="ch-name">Ch.{chapter.chapterNumber}</span>
                <span className="ch-time">{formatTimeAgo(chapter.createdAt)}</span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="story-card-footer">
        <div className="story-footer-left">
          {recentChapter && (
            <span className="muted">
              Cap nhat {formatTimeAgo(recentChapter.createdAt)}
            </span>
          )}
        </div>
        <div className="story-actions">
          <Link to={actionHref} className="btn btn-sm btn-primary">
            {recentChapter ? `Doc Ch.${recentChapter.chapterNumber}` : 'Xem truyen'}
          </Link>
        </div>
      </div>
    </div>
  );
}

function LibraryStoryCard({
  story,
  chapter,
  detailLabel,
  actionHref,
  actionLabel,
  actionDisabled = false,
  timestampLabel,
  note,
  statusLabel,
  showBookmarkBadge = false,
  onDelete,
  deleteLabel,
  deleteDisabled = false,
}) {
  const isManga = story?.type === 'MANGA';
  const hasStory = Boolean(story?.id);
  const hasMeta =
    Boolean(story?.type) ||
    typeof story?.views === 'number' ||
    typeof story?.averageRating === 'number';

  return (
    <div className="story-card">
      <Link
        to={hasStory ? `/story/${story.id}` : '#'}
        onClick={(event) => {
          if (!hasStory) {
            event.preventDefault();
          }
        }}
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <div className="story-cover">
          {showBookmarkBadge && (
            <span className="story-bookmark-badge" aria-hidden="true">
              <BookmarkIcon filled className="story-bookmark-badge-icon" />
            </span>
          )}
          {story?.coverImage ? (
            <img
              src={story.coverImage}
              alt={story?.title || 'Truyen'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            'Bookmark'
          )}
        </div>
        <div className="story-info">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '0.5rem',
              alignItems: 'flex-start',
            }}
          >
            <h3>{story?.title || 'Truyen khong con kha dung'}</h3>
            {statusLabel && <span className="story-library-state">{statusLabel}</span>}
          </div>

          {hasMeta && (
            <div className="story-meta">
              {story?.type && (
                <span
                  style={{
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    background: isManga
                      ? 'var(--badge-manga-bg)'
                      : 'var(--badge-novel-bg)',
                    color: isManga ? 'var(--warning)' : 'var(--accent)',
                  }}
                >
                  {isManga ? 'Manga' : 'Novel'}
                </span>
              )}
              {typeof story?.views === 'number' && <span>Views {story.views}</span>}
              {typeof story?.averageRating === 'number' && (
                <span>Rating {story.averageRating}</span>
              )}
            </div>
          )}

          {detailLabel ? (
            <div className="story-meta" style={{ marginTop: 6, fontSize: '0.82rem' }}>
              <strong>{detailLabel}</strong>
            </div>
          ) : chapter && (
            <div className="story-meta" style={{ marginTop: 6, fontSize: '0.82rem' }}>
              <strong>Ch.{chapter.chapterNumber}</strong> - {chapter.title}
            </div>
          )}

          {note && <div className="story-note">{note}</div>}
        </div>
      </Link>

      <div className="story-card-footer">
        <div className="story-footer-left">
          {timestampLabel && <span className="muted">{timestampLabel}</span>}
        </div>
        <div className="story-actions">
          {actionDisabled ? (
            <span className="btn btn-sm btn-outline btn-disabled">{actionLabel}</span>
          ) : (
            <Link to={actionHref} className="btn btn-sm btn-primary">
              {actionLabel}
            </Link>
          )}
          <button
            className="btn btn-sm btn-outline"
            onClick={onDelete}
            disabled={deleteDisabled}
          >
            {deleteLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function BookmarkLibraryItem({
  bookmark,
  story,
  chapterLabel,
  positionLabel,
  note,
  timestampLabel,
  action,
  onDelete,
  deleteDisabled = false,
}) {
  const hasStory = Boolean(story?.id);
  const isManga = story?.type === 'MANGA';
  const typeLabel = story?.type ? (isManga ? 'Manga' : 'Novel') : '';
  const storyHref = hasStory ? `/story/${story.id}` : '#';
  const chapterUnavailable = Boolean(bookmark?.chapterId && !bookmark?.chapter?.id);

  return (
    <article className="bookmark-item">
      <Link
        to={storyHref}
        className={`bookmark-cover-link ${hasStory ? '' : 'disabled'}`.trim()}
        onClick={(event) => {
          if (!hasStory) {
            event.preventDefault();
          }
        }}
      >
        <div className="bookmark-cover-thumb">
          <span className="bookmark-cover-badge" aria-hidden="true">
            <BookmarkIcon filled className="story-bookmark-badge-icon" />
          </span>
          {story?.coverImage ? (
            <img src={story.coverImage} alt={story?.title || 'Bookmark'} />
          ) : (
            <div className="bookmark-cover-fallback">{isManga ? 'M' : 'B'}</div>
          )}
        </div>
      </Link>

      <div className="bookmark-main">
        <div className="bookmark-body">
          <div className="bookmark-title-row">
            <BookmarkIcon filled className="story-detail-bookmark-icon" />
            {hasStory ? (
              <Link to={storyHref} className="bookmark-title">
                {story.title}
              </Link>
            ) : (
              <span className="bookmark-title bookmark-title-muted">{story.title}</span>
            )}
          </div>

          <div className="bookmark-chip-row">
            {chapterLabel && <span className="bookmark-chip">{chapterLabel}</span>}
            {positionLabel && (
              <span className="bookmark-chip bookmark-chip-position">{positionLabel}</span>
            )}
            {typeLabel && <span className="bookmark-chip bookmark-chip-type">{typeLabel}</span>}
          </div>

          {note && <p className="bookmark-note">{note}</p>}

          <div className="bookmark-meta-row">
            {timestampLabel && <span>{timestampLabel}</span>}
            {chapterUnavailable && <span>Khong con truy cap chuong da bookmark</span>}
            {!bookmark?.story && <span>Truyen nay khong con kha dung</span>}
          </div>
        </div>

        <div className="bookmark-action-row">
          {action?.disabled ? (
            <span className="btn btn-sm btn-outline btn-disabled">{action.label}</span>
          ) : (
            <Link to={action.href} className="btn btn-sm btn-outline">
              {action.label}
            </Link>
          )}
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={onDelete}
            disabled={deleteDisabled}
          >
            Xoa
          </button>
        </div>
      </div>
    </article>
  );
}
