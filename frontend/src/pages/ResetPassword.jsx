import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra. Token có thể đã hết hạn!');
    }
    setLoading(false);
  };

  // If no token provided
  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ marginBottom: '1rem' }}>Link không hợp lệ</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
          </p>
          <Link to="/forgot-password" className="btn btn-primary">
            Yêu cầu link mới
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{
            width: '72px',
            height: '72px',
            margin: '0 auto 1rem',
            borderRadius: '50%',
            background: 'rgba(0, 212, 170, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            border: '2px solid var(--success)',
            animation: 'scaleIn 0.4s ease-out'
          }}>
            ✅
          </div>
          <h2 style={{ marginBottom: '0.75rem' }}>Đổi mật khẩu thành công!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Mật khẩu của bạn đã được cập nhật. Hãy đăng nhập với mật khẩu mới.
          </p>
          <button
            className="btn btn-primary"
            style={{ padding: '0.75rem 2rem', fontSize: '0.95rem' }}
            onClick={() => navigate('/login')}
          >
            🔐 Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 1rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            boxShadow: '0 8px 24px var(--accent-glow)'
          }}>
            🔒
          </div>
        </div>
        <h2>Đặt lại mật khẩu</h2>
        <p style={{
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          marginBottom: '1.5rem',
          marginTop: '-1rem'
        }}>
          Nhập mật khẩu mới cho tài khoản của bạn
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>🔑 Mật khẩu mới</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                type={showPassword ? 'text' : 'password'}
                placeholder="Tối thiểu 6 ký tự"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={6}
                style={{ paddingRight: '3rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  padding: '0.2rem',
                  opacity: 0.7
                }}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>🔑 Xác nhận mật khẩu</label>
            <input
              className="form-control"
              type={showPassword ? 'text' : 'password'}
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.4rem' }}>
                ❌ Mật khẩu không khớp
              </p>
            )}
            {confirmPassword && newPassword === confirmPassword && (
              <p style={{ color: 'var(--success)', fontSize: '0.8rem', marginTop: '0.4rem' }}>
                ✅ Mật khẩu khớp
              </p>
            )}
          </div>

          {/* Password strength indicator */}
          {newPassword && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{
                display: 'flex',
                gap: '4px',
                marginBottom: '0.3rem'
              }}>
                {[1, 2, 3, 4].map(level => (
                  <div key={level} style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: newPassword.length >= level * 3
                      ? newPassword.length >= 12
                        ? 'var(--success)'
                        : newPassword.length >= 8
                          ? 'var(--warning)'
                          : 'var(--danger)'
                      : 'var(--border)',
                    transition: 'all 0.3s'
                  }} />
                ))}
              </div>
              <p style={{
                fontSize: '0.75rem',
                color: newPassword.length >= 12
                  ? 'var(--success)'
                  : newPassword.length >= 8
                    ? 'var(--warning)'
                    : 'var(--danger)'
              }}>
                {newPassword.length >= 12
                  ? '🛡️ Mật khẩu mạnh'
                  : newPassword.length >= 8
                    ? '⚡ Mật khẩu trung bình'
                    : '⚠️ Mật khẩu yếu'}
              </p>
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
            disabled={loading || newPassword !== confirmPassword}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span className="spinner" style={{ width: '18px', height: '18px', margin: 0, borderWidth: '2px' }}></span>
                Đang xử lý...
              </span>
            ) : '🔐 Đặt lại mật khẩu'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border)'
        }}>
          <Link to="/login" style={{
            fontSize: '0.9rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            ← Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
