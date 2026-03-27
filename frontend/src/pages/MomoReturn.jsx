import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTopUpStatus } from '../services/api';

export default function MomoReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const orderId = searchParams.get('orderId') || '';
  const fallbackPath = localStorage.getItem('momo_return_path') || '/profile';

  useEffect(() => {
    if (!orderId || !user) {
      setLoading(false);
      return;
    }

    const loadStatus = async () => {
      try {
        const response = await getTopUpStatus(orderId);
        setResult(response.data);
        if (typeof response.data?.walletBalance === 'number') {
          updateUser({ walletBalance: response.data.walletBalance });
        }
      } catch (error) {
        setResult({
          status: 'FAILED',
          message: error.response?.data?.message || error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, [orderId, user, updateUser]);

  if (loading) {
    return <div className="loading"><div className="spinner" />Đang xác nhận thanh toán...</div>;
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="card" style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '0.75rem' }}>Kết quả nạp tiền MoMo</h1>
        {!orderId && <p>Không tìm thấy mã giao dịch MoMo.</p>}
        {orderId && (
          <>
            <p style={{ color: 'var(--text-secondary)' }}>Mã đơn: {orderId}</p>
            <h2 style={{ marginBottom: '0.5rem' }}>
              {result?.status === 'SUCCESS' ? 'Nạp tiền thành công' : result?.status === 'PENDING' ? 'Giao dịch đang xử lý' : 'Nạp tiền thất bại'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {result?.message || 'Vui lòng kiểm tra lại trạng thái giao dịch.'}
            </p>
            {typeof result?.amount === 'number' && (
              <p style={{ marginBottom: '0.35rem' }}>Số tiền: {Number(result.amount).toLocaleString('vi-VN')}đ</p>
            )}
            {typeof result?.walletBalance === 'number' && (
              <p style={{ marginBottom: '1rem' }}>Số dư hiện tại: {Number(result.walletBalance).toLocaleString('vi-VN')}đ</p>
            )}
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate(fallbackPath)}>
            Quay lại
          </button>
          <Link to="/profile" className="btn btn-outline">Mở hồ sơ</Link>
        </div>
      </div>
    </div>
  );
}
