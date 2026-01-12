import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as obsidianApi from '../services/obsidian.api';
import * as settingsApi from '../services/settings.api';

// Inline Styles
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    padding: '32px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  wrapper: {
    maxWidth: '800px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '32px'
  },
  title: {
    fontSize: '36px',
    fontWeight: '800',
    color: '#fff',
    textShadow: '0 2px 10px rgba(0,0,0,0.2)',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '16px',
    marginTop: '8px'
  },
  card: {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '20px',
    marginBottom: '24px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    overflow: 'hidden'
  },
  cardHeader: (color = '#6366F1') => ({
    background: `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)`,
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }),
  cardTitle: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: '700',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  cardBody: {
    padding: '24px'
  },
  button: (color = '#6366F1') => ({
    padding: '14px 28px',
    background: `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)`,
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
  }),
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  toast: (type) => ({
    position: 'fixed',
    top: '24px',
    right: '24px',
    padding: '16px 24px',
    borderRadius: '12px',
    background: type === 'success'
      ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
      : type === 'error'
        ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
        : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    color: '#fff',
    fontWeight: '600',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    animation: 'slideIn 0.3s ease'
  }),
  noteList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  noteItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: '#F9FAFB',
    borderRadius: '12px',
    marginBottom: '12px'
  },
  noteInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  noteIcon: {
    fontSize: '24px'
  },
  noteName: {
    fontWeight: '600',
    color: '#374151'
  },
  noteDate: {
    fontSize: '13px',
    color: '#6B7280'
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    color: '#6B7280'
  },
  alertBox: {
    background: 'rgba(254, 243, 199, 0.95)',
    border: '2px solid #F59E0B',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#92400E',
    boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
    backdropFilter: 'blur(10px)'
  },
  alertContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  alertIcon: {
    fontSize: '32px'
  },
  alertTitle: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '4px',
    display: 'block'
  },
  alertDesc: {
    fontSize: '14px',
    opacity: 0.9
  },
  alertButton: {
    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
    transition: 'all 0.2s ease',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  }
};

// 色調整関数
function adjustColor(color, amount) {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function Obsidian() {
  const navigate = useNavigate();
  const [vaultPath, setVaultPath] = useState('');
  const [dailyNotePath, setDailyNotePath] = useState('Daily Notes');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState(null);
  const [recentNotes, setRecentNotes] = useState([]);

  // 初回読み込み
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [settingsRes, statusRes] = await Promise.all([
        settingsApi.getSettings(),
        settingsApi.getConnectionStatus()
      ]);

      const settings = settingsRes.data || {};
      setVaultPath(settings.obsidianVaultPath || '');
      setDailyNotePath(settings.obsidianDailyNotePath || 'Daily Notes');
      setIsConnected(statusRes.data?.obsidian?.configured || false);

      // Daily Notes一覧を取得
      try {
        const notesRes = await obsidianApi.getDailyNotes(10);
        setRecentNotes(notesRes.data || []);
      } catch (e) {
        // エラーは無視（Vault未設定時など）
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      showMessage('設定の読み込みに失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  // メッセージ表示
  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // Daily Note生成
  const handleGenerateDailyNote = async () => {
    if (!vaultPath) {
      showMessage('先に設定画面でVault パスを設定してください', 'error');
      return;
    }

    try {
      setGenerating(true);
      showMessage('Daily Noteを生成中...', 'info');

      const result = await obsidianApi.generateDailyNote({
        vaultPath,
        dailyNotePath,
        includeCollectedArticles: true
      });

      if (result.data?.success) {
        showMessage(`Daily Noteを生成しました: ${result.data.filePath || ''}`, 'success');
        loadSettings(); // 一覧更新
      } else {
        showMessage(`生成に失敗: ${result.data?.message || 'エラーが発生しました'}`, 'error');
      }
    } catch (error) {
      console.error('Failed to generate daily note:', error);
      showMessage('Daily Noteの生成に失敗しました', 'error');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: '#fff', marginTop: '16px' }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Toast */}
      {message && (
        <div style={styles.toast(message.type)}>
          <span style={{ fontSize: '20px' }}>
            {message.type === 'success' ? '✓' : message.type === 'error' ? '⚠' : 'ℹ'}
          </span>
          {message.text}
        </div>
      )}

      <div style={styles.wrapper}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>
            <span>📝</span> Obsidian連携
          </h1>
          <p style={styles.subtitle}>収集した情報をObsidianのDaily Noteとして自動生成します</p>
        </div>

        {/* 設定警告 (未接続時のみ表示) */}
        {!isConnected && (
          <div style={styles.alertBox}>
            <div style={styles.alertContent}>
              <span style={styles.alertIcon}>⚠️</span>
              <div>
                <span style={styles.alertTitle}>設定が必要です</span>
                <span style={styles.alertDesc}>Daily Noteを生成するには、まずObsidianのVault設定を行ってください。</span>
              </div>
            </div>
            <button
              style={styles.alertButton}
              onClick={() => navigate('/settings')}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              設定画面へ →
            </button>
          </div>
        )}

        {/* Daily Note生成 */}
        <div style={styles.card}>
          <div style={styles.cardHeader('#10B981')}>
            <h2 style={styles.cardTitle}>
              <span>📅</span> Daily Note生成
            </h2>
          </div>
          <div style={styles.cardBody}>
            <p style={{ color: '#6B7280', marginBottom: '20px' }}>
              収集した最新情報を含むDaily Noteを生成します。
              既存のノートがある場合は追記されます。
            </p>
            <button
              style={{
                ...styles.button('#10B981'),
                ...(generating || !isConnected ? styles.buttonDisabled : {})
              }}
              onClick={handleGenerateDailyNote}
              disabled={generating || !isConnected}
            >
              {generating ? '⏳ 生成中...' : '📝 今日のDaily Noteを生成'}
            </button>
            {!isConnected && (
              <p style={{ color: '#DC2626', marginTop: '12px', fontSize: '14px' }}>
                ※ 生成するには設定が必要です
              </p>
            )}
          </div>
        </div>

        {/* 最近のDaily Notes */}
        <div style={styles.card}>
          <div style={styles.cardHeader('#3B82F6')}>
            <h2 style={styles.cardTitle}>
              <span>📚</span> 最近のDaily Notes
            </h2>
          </div>
          <div style={styles.cardBody}>
            {recentNotes.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>📭</p>
                <p>生成されたDaily Noteはまだありません</p>
              </div>
            ) : (
              <ul style={styles.noteList}>
                {recentNotes.map((note, index) => (
                  <li key={index} style={styles.noteItem}>
                    <div style={styles.noteInfo}>
                      <span style={styles.noteIcon}>📄</span>
                      <div>
                        <div style={styles.noteName}>{note.name || note.filename}</div>
                        <div style={styles.noteDate}>{note.createdAt || note.date}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Obsidian;
