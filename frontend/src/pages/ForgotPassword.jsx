import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetLink, setResetLink] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setResetLink('');
    try {
      const res = await forgotPassword(email);
      const msg = res.data?.message || '';
      // Check if message contains a reset link (dev mode - SendGrid failed)
      const linkMatch = msg.match(/(http:\/\/localhost:\d+\/reset-password\?token=[^\s]+)/);
      if (linkMatch) {
        setResetLink(linkMatch[1]);
        setSuccess('Email gửi thất bại (SendGrid), nhưng bạn có thể đặt lại mật khẩu trực tiếp:');
      } else {
        setSuccess(msg || 'Email đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra hộp thư.');
      }
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại!');
    }
    setLoading(false);
  };

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
            boxShadow: '0 8px 24px var(--accent-glow)',
            animation: 'float 3s ease-in-out infinite'
          }}>
            🔑
          </div>
        </div>
        <h2>Quên mật khẩu</h2>
        <p style={{
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          marginBottom: '1.5rem',
          marginTop: '-1rem'
        }}>
          Nhập email đã đăng ký để nhận link đặt lại mật khẩu
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && (
          <div className="alert alert-success" style={{ flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>✅</span>
              <span>{success}</span>
            </div>
            {resetLink && (
              <a
                href={resetLink}
                className="btn btn-primary"
                style={{ textAlign: 'center', marginTop: '0.5rem' }}
              >
                🔐 Đặt lại mật khẩu ngay
              </a>
            )}
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>📧 Email</label>
              <input
                className="form-control"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
              disabled={loading}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span className="spinner" style={{ width: '18px', height: '18px', margin: 0, borderWidth: '2px' }}></span>
                  Đang gửi...
                </span>
              ) : '📨 Gửi link đặt lại mật khẩu'}
            </button>
          </form>
        )}

        {success && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              className="btn btn-outline"
              onClick={() => { setSuccess(''); setError(''); setResetLink(''); }}
              style={{ marginRight: '0.5rem' }}
            >
              Gửi lại
            </button>
          </div>
        )}

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
