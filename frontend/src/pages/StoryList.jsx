import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getStories, getCategories, searchStories } from '../services/api';

export default function StoryList() {
  const [stories, setStories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    getCategories().then(r => setCategories(r.data)).catch(() => {});
    const cat = searchParams.get('category');
    if (cat) setCategoryId(cat);
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (keyword) params.keyword = keyword;
    if (categoryId) params.categoryId = categoryId;
    if (status) params.status = status;

    const hasFilter = Object.keys(params).length > 0;

    (hasFilter ? searchStories(params) : getStories())
      .then(r => setStories(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [keyword, categoryId, status]);

  return (
    <div className="container">
      <h1 className="page-title">📚 Danh sách truyện</h1>

      <div className="search-bar">
        <input
          className="form-control"
          placeholder="🔍 Tìm kiếm truyện..."
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
        />
        <select className="form-control" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
          <option value="">Tất cả thể loại</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="form-control" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="ONGOING">Đang tiến hành</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="DROPPED">Ngừng</option>
        </select>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />Đang tải...</div>
      ) : stories.length > 0 ? (
        <div className="story-grid">
          {stories.map(story => (
            <Link key={story.id} to={`/story/${story.id}`} className="story-card" style={{ textDecoration: 'none', color: 'inherit' }}>
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
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="icon">🔍</div>
          <p>Không tìm thấy truyện nào phù hợp.</p>
        </div>
      )}
    </div>
  );
}
