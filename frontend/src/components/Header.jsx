import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../services/api';

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef();
  const notifRef = useRef();

  useEffect(() => {
    if (user) {
      getUnreadCount().then(r => setUnreadCount(r.data.count)).catch(() => {});
      getNotifications().then(r => setNotifications(r.data)).catch(() => {});
    }
  }, [user, location]);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNotifClick = async (n) => {
    if (!n.isRead) {
      await markAsRead(n.id);
      setUnreadCount(c => Math.max(0, c - 1));
    }
    setShowNotif(false);
    if (n.storyId) navigate(`/story/${n.storyId}`);
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">📖 TruyệnHub</Link>

        <button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
          <span /><span /><span />
        </button>

        <nav className={`nav-links ${mobileOpen ? 'open' : ''}`}>
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}>Trang chủ</Link>
          <Link to="/stories" className={`nav-link ${location.pathname === '/stories' ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}>Danh sách truyện</Link>
          {isAdmin() && (
            <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}>Quản trị</Link>
          )}
        </nav>

        <div className="nav-actions">
          {user ? (
            <>
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button className="btn-icon" onClick={() => setShowNotif(!showNotif)}>
                  🔔
                  {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                </button>
                {showNotif && (
                  <div className="notification-dropdown">
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.9rem' }}>Thông báo</strong>
                      {unreadCount > 0 && <button className="btn btn-sm btn-outline" onClick={handleMarkAll}>Đọc tất cả</button>}
                    </div>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Không có thông báo</div>
                    ) : (
                      notifications.slice(0, 20).map(n => (
                        <div key={n.id} className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                          onClick={() => handleNotifClick(n)}>
                          <div>{n.message}</div>
                          <small style={{ color: 'var(--text-secondary)' }}>{new Date(n.createdAt).toLocaleDateString('vi-VN')}</small>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div ref={menuRef} className="user-menu">
                <button className="user-menu-btn" onClick={() => setShowMenu(!showMenu)}>
                  <span className="user-avatar">{user.username?.[0]?.toUpperCase()}</span>
                  {user.username}
                </button>
                {showMenu && (
                  <div className="user-dropdown">
                    <Link to="/profile" onClick={() => setShowMenu(false)}>👤 Hồ sơ</Link>
                    <Link to="/profile?tab=bookmarks" onClick={() => setShowMenu(false)}>📑 Bookmark</Link>
                    <Link to="/profile?tab=history" onClick={() => setShowMenu(false)}>📚 Lịch sử đọc</Link>
                    <button onClick={handleLogout}>🚪 Đăng xuất</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm">Đăng nhập</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Đăng ký</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
