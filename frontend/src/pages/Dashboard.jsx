import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as dashboardApi from '../services/dashboard.api';

// スタイル定義
const styles = {
  container: {
    padding: '24px 32px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: '"SF Pro JP", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif',
    color: '#374151',
    animation: 'fadeIn 0.5s ease-out',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
    marginBottom: '24px'
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid #F3F4F6',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'default'
  },
  cardHover: {
    cursor: 'pointer',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: '8px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#111827'
  },
  statIcon: {
    fontSize: '40px',
    opacity: 0.8
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '24px',
    marginBottom: '32px'
  },
  actionBtn: {
    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px'
  }
};

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getStats();
      setStats(res.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const s = stats || { articles: {}, contents: {}, statusDistribution: {} };

  if (loading && !stats) {
    return (
      <div style={styles.container}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #E5E7EB', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: '#6B7280', marginTop: '16px' }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .hover-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={styles.title}>📊 ダッシュボード</h1>
          <p style={styles.subtitle}>コンテンツ生成の状況と統計</p>
        </div>
        <button
          style={{ ...styles.actionBtn, background: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB' }}
          onClick={loadStats}
        >
          🔄 更新
        </button>
      </div>

      {/* Stats Grid */}
      <div style={styles.grid}>
        {/* Total Articles */}
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={styles.statLabel}>収集記事総数</p>
              <p style={{ ...styles.statValue, color: '#3B82F6' }}>{s.articles.total || 0}</p>
              <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                今日: <span style={{ color: '#10B981', fontWeight: '600' }}>+{s.articles.today || 0}</span>
              </p>
            </div>
            <span style={styles.statIcon}>📡</span>
          </div>
        </div>

        {/* Unprocessed */}
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={styles.statLabel}>未処理記事</p>
              <p style={{ ...styles.statValue, color: '#F59E0B' }}>{s.articles.unprocessed || 0}</p>
              <button
                style={{ fontSize: '12px', color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '4px', textDecoration: 'underline' }}
                onClick={() => navigate('/collector')}
              >
                処理する →
              </button>
            </div>
            <span style={styles.statIcon}>⏳</span>
          </div>
        </div>

        {/* Generated Contents */}
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={styles.statLabel}>生成コンテンツ</p>
              <p style={{ ...styles.statValue, color: '#10B981' }}>{s.contents.total || 0}</p>
              <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                今日: <span style={{ color: '#10B981', fontWeight: '600' }}>+{s.contents.today || 0}</span>
              </p>
            </div>
            <span style={styles.statIcon}>📝</span>
          </div>
        </div>

        {/* Approved */}
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={styles.statLabel}>承認済み</p>
              <p style={{ ...styles.statValue, color: '#8B5CF6' }}>{s.contents.approved || 0}</p>
            </div>
            <span style={styles.statIcon}>✅</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>🚀 クイックアクション</h2>
      <div style={styles.grid}>
        <div className="hover-card" style={{ ...styles.card, cursor: 'pointer' }} onClick={() => navigate('/collector')}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#111827' }}>📡 記事を収集・選択</h3>
          <p style={{ fontSize: '13px', color: '#6B7280' }}>RSSから最新記事を取得し、AI生成の対象を選択します。</p>
        </div>
        <div className="hover-card" style={{ ...styles.card, cursor: 'pointer' }} onClick={() => navigate('/content')}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#111827' }}>📝 コンテンツ管理</h3>
          <p style={{ fontSize: '13px', color: '#6B7280' }}>生成されたコンテンツの確認・編集・Obsidianへの保存を行います。</p>
        </div>
        <div className="hover-card" style={{ ...styles.card, cursor: 'pointer' }} onClick={() => navigate('/settings')}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#111827' }}>⚙️ 設定</h3>
          <p style={{ fontSize: '13px', color: '#6B7280' }}>Dify連携、Obsidianパス、RSSソースの管理を行います。</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
