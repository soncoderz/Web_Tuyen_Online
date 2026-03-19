import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getAdminStats, getStories, getCategories, getAuthors, getReports, getChaptersByStory,
  createStory, updateStory, deleteStory,
  createCategory, updateCategory, deleteCategory,
  createChapter, updateChapter, deleteChapter,
  updateReportStatus
} from '../services/api';
import api from '../services/api';

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState({});
  const [stories, setStories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Story Forms
  const [showStoryForm, setShowStoryForm] = useState(false);
  const [storyForm, setStoryForm] = useState({ title: '', description: '', status: 'ONGOING', coverImage: '', categoryIds: [], authorIds: [] });
  const [editStoryId, setEditStoryId] = useState(null);

  // Category Forms
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [editCategoryId, setEditCategoryId] = useState(null);

  // Author Forms
  const [showAuthorForm, setShowAuthorForm] = useState(false);
  const [authorForm, setAuthorForm] = useState({ name: '', description: '' });
  const [editAuthorId, setEditAuthorId] = useState(null);

  // Chapter Forms
  const [showChapterForm, setShowChapterForm] = useState(false);
  const [chapterForm, setChapterForm] = useState({ storyId: '', chapterNumber: 1, title: '', content: '' });
  const [editChapterId, setEditChapterId] = useState(null);
  const [selectedStoryChapters, setSelectedStoryChapters] = useState([]);
  const [selectedStoryId, setSelectedStoryId] = useState('');

  useEffect(() => {
    if (!user || !isAdmin()) { navigate('/'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, storiesRes, catsRes, authorsRes, reportsRes] = await Promise.all([
        getAdminStats(), getStories(), getCategories(), getAuthors(), getReports()
      ]);
      setStats(statsRes.data);
      setStories(storiesRes.data);
      setCategories(catsRes.data);
      setAuthors(authorsRes.data);
      setReports(reportsRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // ===== STORY HANDLERS =====
  const handleSaveStory = async () => {
    try {
      if (editStoryId) { await updateStory(editStoryId, storyForm); }
      else { await createStory(storyForm); }
      setShowStoryForm(false); setEditStoryId(null);
      setStoryForm({ title: '', description: '', status: 'ONGOING', coverImage: '', categoryIds: [], authorIds: [] });
      loadData();
    } catch (e) { alert('Lỗi: ' + (e.response?.data?.message || e.message)); }
  };

  const handleEditStory = (s) => {
    setStoryForm({
      title: s.title, description: s.description || '', status: s.status,
      coverImage: s.coverImage || '',
      categoryIds: s.categories?.map(c => c.id) || [],
      authorIds: s.authors?.map(a => a.id) || []
    });
    setEditStoryId(s.id); setShowStoryForm(true);
  };

  const handleDeleteStory = async (id) => {
    if (confirm('Bạn có chắc muốn xóa truyện này?')) { await deleteStory(id); loadData(); }
  };

  // ===== CATEGORY HANDLERS =====
  const handleSaveCategory = async () => {
    try {
      if (editCategoryId) { await updateCategory(editCategoryId, categoryForm); }
      else { await createCategory(categoryForm); }
      setShowCategoryForm(false); setEditCategoryId(null);
      setCategoryForm({ name: '', description: '' }); loadData();
    } catch (e) { alert('Lỗi: ' + (e.response?.data?.message || e.message)); }
  };

  const handleDeleteCategory = async (id) => {
    if (confirm('Xóa thể loại này?')) { await deleteCategory(id); loadData(); }
  };

  // ===== AUTHOR HANDLERS =====
  const handleSaveAuthor = async () => {
    try {
      if (editAuthorId) { await api.put(`/authors/${editAuthorId}`, authorForm); }
      else { await api.post('/authors', authorForm); }
      setShowAuthorForm(false); setEditAuthorId(null);
      setAuthorForm({ name: '', description: '' }); loadData();
    } catch (e) { alert('Lỗi: ' + (e.response?.data?.message || e.message)); }
  };

  const handleDeleteAuthor = async (id) => {
    if (confirm('Xóa tác giả này?')) { await api.delete(`/authors/${id}`); loadData(); }
  };

  // ===== CHAPTER HANDLERS =====
  const handleLoadChapters = async (storyId) => {
    setSelectedStoryId(storyId);
    const res = await getChaptersByStory(storyId);
    setSelectedStoryChapters(res.data);
  };

  const handleSaveChapter = async () => {
    try {
      if (editChapterId) { await updateChapter(editChapterId, chapterForm); }
      else { await createChapter(chapterForm); }
      setShowChapterForm(false); setEditChapterId(null);
      setChapterForm({ storyId: '', chapterNumber: 1, title: '', content: '' });
      if (selectedStoryId) handleLoadChapters(selectedStoryId);
      loadData();
    } catch (e) { alert('Lỗi: ' + (e.response?.data?.message || e.message)); }
  };

  const handleDeleteChapter = async (id) => {
    if (confirm('Xóa chương này?')) {
      await deleteChapter(id);
      if (selectedStoryId) handleLoadChapters(selectedStoryId);
    }
  };

  // ===== REPORT HANDLERS =====
  const handleReportStatus = async (id, status) => {
    await updateReportStatus(id, status); loadData();
  };

  if (loading) return <div className="loading"><div className="spinner" />Đang tải...</div>;

  return (
    <div className="container">
      <h1 className="page-title">⚙️ Quản trị hệ thống</h1>

      <div className="tabs">
        {['dashboard', 'stories', 'categories', 'authors', 'chapters', 'reports'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'dashboard' && '📊 Dashboard'}
            {t === 'stories' && `📚 Truyện (${stories.length})`}
            {t === 'categories' && `📁 Thể loại (${categories.length})`}
            {t === 'authors' && `✍️ Tác giả (${authors.length})`}
            {t === 'chapters' && '📖 Chương'}
            {t === 'reports' && `⚠️ Báo lỗi (${reports.filter(r => r.status === 'PENDING').length})`}
          </button>
        ))}
      </div>

      {/* ===== DASHBOARD ===== */}
      {tab === 'dashboard' && (
        <div>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-value">{stats.totalStories || 0}</div><div className="stat-label">Truyện</div></div>
            <div className="stat-card"><div className="stat-value">{stats.totalUsers || 0}</div><div className="stat-label">Người dùng</div></div>
            <div className="stat-card"><div className="stat-value">{stats.totalChapters || 0}</div><div className="stat-label">Chương</div></div>
            <div className="stat-card"><div className="stat-value">{stats.totalComments || 0}</div><div className="stat-label">Bình luận</div></div>
            <div className="stat-card"><div className="stat-value">{stats.pendingReports || 0}</div><div className="stat-label">Báo lỗi chờ</div></div>
          </div>
        </div>
      )}

      {/* ===== STORIES ===== */}
      {tab === 'stories' && (
        <div>
          <button className="btn btn-primary" onClick={() => { setShowStoryForm(true); setEditStoryId(null); setStoryForm({ title: '', description: '', status: 'ONGOING', coverImage: '', categoryIds: [], authorIds: [] }); }}
            style={{ marginBottom: '1rem' }}>+ Thêm truyện</button>
          <div className="table-container">
            <table>
              <thead><tr><th>Tên truyện</th><th>Trạng thái</th><th>Lượt xem</th><th>Đánh giá</th><th>Hành động</th></tr></thead>
              <tbody>
                {stories.map(s => (
                  <tr key={s.id}>
                    <td>{s.title}</td>
                    <td><span className={`status-badge status-${s.status}`}>{s.status}</span></td>
                    <td>{s.views}</td>
                    <td>⭐ {s.averageRating || 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => handleEditStory(s)}>Sửa</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteStory(s.id)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== CATEGORIES ===== */}
      {tab === 'categories' && (
        <div>
          <button className="btn btn-primary" onClick={() => { setShowCategoryForm(true); setEditCategoryId(null); setCategoryForm({ name: '', description: '' }); }}
            style={{ marginBottom: '1rem' }}>+ Thêm thể loại</button>
          <div className="table-container">
            <table>
              <thead><tr><th>Tên</th><th>Mô tả</th><th>Hành động</th></tr></thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.description || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => { setCategoryForm({ name: c.name, description: c.description || '' }); setEditCategoryId(c.id); setShowCategoryForm(true); }}>Sửa</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteCategory(c.id)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== AUTHORS ===== */}
      {tab === 'authors' && (
        <div>
          <button className="btn btn-primary" onClick={() => { setShowAuthorForm(true); setEditAuthorId(null); setAuthorForm({ name: '', description: '' }); }}
            style={{ marginBottom: '1rem' }}>+ Thêm tác giả</button>
          <div className="table-container">
            <table>
              <thead><tr><th>Tên tác giả</th><th>Mô tả</th><th>Hành động</th></tr></thead>
              <tbody>
                {authors.map(a => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>{a.description || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => { setAuthorForm({ name: a.name, description: a.description || '' }); setEditAuthorId(a.id); setShowAuthorForm(true); }}>Sửa</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteAuthor(a.id)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== CHAPTERS ===== */}
      {tab === 'chapters' && (
        <div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
            <select className="form-control" style={{ maxWidth: '300px' }} value={selectedStoryId}
              onChange={e => { setSelectedStoryId(e.target.value); if (e.target.value) handleLoadChapters(e.target.value); }}>
              <option value="">Chọn truyện...</option>
              {stories.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            {selectedStoryId && (
              <button className="btn btn-primary" onClick={() => {
                setShowChapterForm(true); setEditChapterId(null);
                setChapterForm({ storyId: selectedStoryId, chapterNumber: selectedStoryChapters.length + 1, title: '', content: '' });
              }}>+ Thêm chương</button>
            )}
          </div>
          {selectedStoryId && (
            <div className="card">
              {selectedStoryChapters.length > 0 ? (
                <ul className="chapter-list">
                  {selectedStoryChapters.map(ch => (
                    <li key={ch.id} className="chapter-item">
                      <span className="chapter-title">Chương {ch.chapterNumber}: {ch.title}</span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => {
                          setChapterForm({ storyId: ch.storyId, chapterNumber: ch.chapterNumber, title: ch.title, content: ch.content });
                          setEditChapterId(ch.id); setShowChapterForm(true);
                        }}>Sửa</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteChapter(ch.id)}>Xóa</button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <div className="empty-state"><p>Chưa có chương nào.</p></div>}
            </div>
          )}
        </div>
      )}

      {/* ===== REPORTS ===== */}
      {tab === 'reports' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Truyện</th><th>Lý do</th><th>Trạng thái</th><th>Ngày</th><th>Hành động</th></tr></thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id}>
                  <td>{stories.find(s => s.id === r.storyId)?.title || r.storyId}</td>
                  <td>{r.reason}</td>
                  <td><span className={`status-badge status-${r.status === 'PENDING' ? 'ONGOING' : r.status === 'RESOLVED' ? 'COMPLETED' : 'DROPPED'}`}>{r.status}</span></td>
                  <td>{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td>
                    {r.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-sm btn-primary" onClick={() => handleReportStatus(r.id, 'RESOLVED')}>Xử lý</button>
                        <button className="btn btn-sm btn-outline" onClick={() => handleReportStatus(r.id, 'DISMISSED')}>Bỏ qua</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== STORY FORM MODAL ===== */}
      {showStoryForm && (
        <div className="modal-overlay" onClick={() => setShowStoryForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2>{editStoryId ? 'Sửa truyện' : 'Thêm truyện mới'}</h2>
            <div className="form-group"><label>Tên truyện *</label>
              <input className="form-control" value={storyForm.title} onChange={e => setStoryForm({ ...storyForm, title: e.target.value })} /></div>
            <div className="form-group"><label>Mô tả</label>
              <textarea className="form-control" value={storyForm.description} onChange={e => setStoryForm({ ...storyForm, description: e.target.value })} /></div>
            <div className="form-group"><label>Ảnh bìa (URL)</label>
              <input className="form-control" value={storyForm.coverImage} onChange={e => setStoryForm({ ...storyForm, coverImage: e.target.value })} placeholder="https://..." /></div>
            <div className="form-group"><label>Trạng thái</label>
              <select className="form-control" value={storyForm.status} onChange={e => setStoryForm({ ...storyForm, status: e.target.value })}>
                <option value="ONGOING">Đang tiến hành</option><option value="COMPLETED">Hoàn thành</option><option value="DROPPED">Ngừng</option>
              </select></div>
            <div className="form-group"><label>Thể loại</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {categories.map(c => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.6rem', background: storyForm.categoryIds.includes(c.id) ? 'var(--accent)' : 'var(--bg-glass)', borderRadius: '16px', cursor: 'pointer', fontSize: '0.8rem', color: 'white' }}>
                    <input type="checkbox" checked={storyForm.categoryIds.includes(c.id)} onChange={e => {
                      const ids = e.target.checked ? [...storyForm.categoryIds, c.id] : storyForm.categoryIds.filter(id => id !== c.id);
                      setStoryForm({ ...storyForm, categoryIds: ids });
                    }} style={{ display: 'none' }} />{c.name}
                  </label>
                ))}
              </div></div>
            <div className="form-group"><label>Tác giả</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {authors.map(a => (
                  <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.6rem', background: storyForm.authorIds.includes(a.id) ? 'var(--success)' : 'var(--bg-glass)', borderRadius: '16px', cursor: 'pointer', fontSize: '0.8rem', color: 'white' }}>
                    <input type="checkbox" checked={storyForm.authorIds.includes(a.id)} onChange={e => {
                      const ids = e.target.checked ? [...storyForm.authorIds, a.id] : storyForm.authorIds.filter(id => id !== a.id);
                      setStoryForm({ ...storyForm, authorIds: ids });
                    }} style={{ display: 'none' }} />{a.name}
                  </label>
                ))}
              </div></div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowStoryForm(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSaveStory}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CATEGORY FORM MODAL ===== */}
      {showCategoryForm && (
        <div className="modal-overlay" onClick={() => setShowCategoryForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editCategoryId ? 'Sửa thể loại' : 'Thêm thể loại'}</h2>
            <div className="form-group"><label>Tên *</label>
              <input className="form-control" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} /></div>
            <div className="form-group"><label>Mô tả</label>
              <textarea className="form-control" value={categoryForm.description} onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} /></div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowCategoryForm(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSaveCategory}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== AUTHOR FORM MODAL ===== */}
      {showAuthorForm && (
        <div className="modal-overlay" onClick={() => setShowAuthorForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editAuthorId ? 'Sửa tác giả' : 'Thêm tác giả'}</h2>
            <div className="form-group"><label>Tên tác giả *</label>
              <input className="form-control" value={authorForm.name} onChange={e => setAuthorForm({ ...authorForm, name: e.target.value })} /></div>
            <div className="form-group"><label>Mô tả</label>
              <textarea className="form-control" value={authorForm.description} onChange={e => setAuthorForm({ ...authorForm, description: e.target.value })} /></div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowAuthorForm(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSaveAuthor}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CHAPTER FORM MODAL ===== */}
      {showChapterForm && (
        <div className="modal-overlay" onClick={() => setShowChapterForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <h2>{editChapterId ? 'Sửa chương' : 'Thêm chương mới'}</h2>
            <div className="form-group"><label>Số chương</label>
              <input className="form-control" type="number" value={chapterForm.chapterNumber}
                onChange={e => setChapterForm({ ...chapterForm, chapterNumber: Number(e.target.value) })} /></div>
            <div className="form-group"><label>Tiêu đề *</label>
              <input className="form-control" value={chapterForm.title} onChange={e => setChapterForm({ ...chapterForm, title: e.target.value })} /></div>
            <div className="form-group"><label>Nội dung *</label>
              <textarea className="form-control" style={{ minHeight: '300px' }} value={chapterForm.content}
                onChange={e => setChapterForm({ ...chapterForm, content: e.target.value })} /></div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowChapterForm(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSaveChapter}>Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
