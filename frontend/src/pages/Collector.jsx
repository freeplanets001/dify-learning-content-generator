import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as collectorApi from '../services/collector.api';
import api from '../services/api';

// データソースタイプの定義
const SOURCE_TYPES = [
  { id: 'rss', name: 'RSS Feed', icon: '📡', color: '#F59E0B' },
  { id: 'qiita', name: 'Qiita', icon: '📗', color: '#55C500' },
  { id: 'zenn', name: 'Zenn', icon: '📘', color: '#3EA8FF' },
  { id: 'youtube', name: 'YouTube', icon: '🎬', color: '#FF0000' },
];

// 色調整関数
function adjustColor(color, amount) {
  let hex = color.replace('#', '');

  // 3桁の場合は6桁に拡張
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }

  const num = parseInt(hex, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Inline Styles
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
    padding: '32px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  wrapper: {
    maxWidth: '1200px',
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
    margin: 0
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '16px',
    marginTop: '8px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '32px'
  },
  card: {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '20px',
    marginBottom: '24px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    overflow: 'hidden'
  },
  cardHeader: (color) => ({
    background: color ? `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px'
  },
  button: (color = '#667eea') => ({
    padding: '14px 20px',
    background: `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)`,
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
  }),
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    borderBottom: '2px solid #E5E7EB',
    color: '#374151',
    fontWeight: '600',
    fontSize: '14px'
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #F3F4F6',
    fontSize: '14px',
    color: '#4B5563'
  },
  badge: (color) => ({
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    background: color,
    color: '#fff'
  }),
  statusBadge: (status) => {
    const colors = {
      'unprocessed': '#F59E0B',
      'processing': '#3B82F6',
      'processed': '#10B981',
      'error': '#EF4444',
      'archived': '#6B7280'
    };
    return {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      background: colors[status] || '#6B7280',
      color: '#fff'
    };
  },
  sourceItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: '#F9FAFB',
    borderRadius: '12px',
    marginBottom: '12px'
  },
  sourceInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  sourceIcon: {
    fontSize: '24px'
  },
  sourceName: {
    fontWeight: '600',
    color: '#374151'
  },
  sourceUrl: {
    fontSize: '12px',
    color: '#6B7280',
    marginTop: '4px'
  },
  toggle: (enabled) => ({
    width: '48px',
    height: '24px',
    borderRadius: '12px',
    background: enabled ? '#10B981' : '#D1D5DB',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background 0.2s ease'
  }),
  toggleKnob: (enabled) => ({
    position: 'absolute',
    top: '2px',
    left: enabled ? '26px' : '2px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#fff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    transition: 'left 0.2s ease'
  }),
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
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    color: '#6B7280'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #E5E7EB',
    borderRadius: '10px',
    fontSize: '14px',
    marginBottom: '12px',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #E5E7EB',
    borderRadius: '10px',
    fontSize: '14px',
    marginBottom: '12px',
    background: '#fff'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    background: '#fff',
    borderRadius: '20px',
    padding: '32px',
    width: '90%',
    maxWidth: '500px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  }
};

function Collector() {
  const navigate = useNavigate();
  const [collecting, setCollecting] = useState({});
  const [sources, setSources] = useState([]);
  const [articles, setArticles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [urlCollecting, setUrlCollecting] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState(new Set());
  const [message, setMessage] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', type: 'rss', url: '', enabled: true });

  const [urlInput, setUrlInput] = useState('');
  const [showCombinedModal, setShowCombinedModal] = useState(false);
  const [combinedGenerating, setCombinedGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('tutorial');
  const [editSource, setEditSource] = useState(null);

  // テンプレート一覧
  const TEMPLATES = [
    { id: 'tutorial', name: '📚 チュートリアル' },
    { id: 'note-article', name: '📝 note記事' },
    { id: 'threads-post', name: '🧵 Threads投稿' },
    { id: 'blog-post', name: '✍️ ブログ記事' },
    { id: 'summary', name: '💡 要約' },
    { id: 'slide-outline', name: '📊 スライド構成' }
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      // 個別にエラーハンドリングして、一部失敗でも他を表示できるようにする
      const [sourcesRes, articlesRes, statsRes] = await Promise.allSettled([
        collectorApi.getDataSources(),
        collectorApi.getArticles({ limit: 20, orderBy: 'collected_date', order: 'DESC' }),
        collectorApi.getStats()
      ]);

      // データソース
      if (sourcesRes.status === 'fulfilled' && sourcesRes.value) {
        const data = sourcesRes.value;
        setSources(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to load sources:', sourcesRes.reason || 'Invalid data');
        setSources([]);
      }

      // 記事
      if (articlesRes.status === 'fulfilled' && articlesRes.value) {
        const data = articlesRes.value;
        setArticles(Array.isArray(data) ? data : (data.articles || []));
      } else {
        console.error('Failed to load articles:', articlesRes.reason);
        setArticles([]);
      }

      // 統計
      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats(statsRes.value);
      } else {
        console.warn('Failed to load stats:', statsRes.reason);
        setStats(null);
      }

    } catch (error) {
      console.error('Failed to load data (unexpected):', error);
      // エラーでも画面は描画させる
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // setLoading(false);
  }, []);

  // メッセージ表示
  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // 収集トリガー
  const handleCollect = async (source) => {
    try {
      setCollecting(prev => ({ ...prev, [source]: true }));
      showMessage(`${source}の収集を開始しました...`, 'info');

      const params = source === 'all' ? {} : { source };
      const result = await collectorApi.triggerCollection(params);

      // result.dataがない場合やエラーの場合のハンドリング
      if (result && result.data) {
        showMessage(`収集完了！ ${result.data.total_collected || 0}件の情報を取得しました`, 'success');
        await loadData(); // データ再読み込み
      } else {
        throw new Error('No data returned');
      }
    } catch (error) {
      console.error('Collection failed:', error);
      showMessage(`${source}の収集に失敗しました`, 'error');
    } finally {
      setCollecting(prev => ({ ...prev, [source]: false }));
    }
  };

  // URL収集
  const handleCollectUrl = async () => {
    if (!urlInput.trim()) {
      showMessage('URLを入力してください', 'error');
      return;
    }

    // 複数URLに対応（改行区切り）
    const urls = urlInput.split('\n').map(u => u.trim()).filter(u => u && u.startsWith('http'));

    if (urls.length === 0) {
      showMessage('有効なURLを入力してください', 'error');
      return;
    }

    try {
      setUrlCollecting(true);
      showMessage(`${urls.length}件のURLから収集中...`, 'info');

      const result = urls.length === 1
        ? await collectorApi.collectFromUrl(urls[0])
        : await collectorApi.collectFromUrls(urls);

      if (result.data) {
        const { saved, duplicates, failed } = result.data;
        showMessage(`収集完了！ 保存: ${saved}件, 重複: ${duplicates}件, 失敗: ${failed}件`, 'success');
        setUrlInput('');
        await loadData();
      }
    } catch (error) {
      console.error('URL collection failed:', error);
      showMessage('URL収集に失敗しました', 'error');
    } finally {
      setUrlCollecting(false);
    }
  };

  // データソース切り替え
  const handleToggleSource = async (id) => {
    try {
      await collectorApi.toggleDataSource(id);
      await loadData();
      showMessage('データソースを更新しました', 'success');
    } catch (error) {
      showMessage('更新に失敗しました', 'error');
    }
  };

  // データソース追加
  const handleAddSource = async () => {
    if (!newSource.name || !newSource.url) {
      showMessage('名前とURLを入力してください', 'error');
      return;
    }

    try {
      await collectorApi.createDataSource(newSource);
      setShowAddModal(false);
      setNewSource({ name: '', type: 'rss', url: '', enabled: true });
      await loadData();
      showMessage('データソースを追加しました', 'success');
    } catch (error) {
      showMessage('追加に失敗しました', 'error');
    }
  };

  // データソース削除
  const handleDeleteSource = async (id) => {
    if (!window.confirm('このデータソースを削除しますか？')) return;

    try {
      await collectorApi.deleteDataSource(id);
      await loadData();
      showMessage('データソースを削除しました', 'success');
    } catch (error) {
      showMessage('削除に失敗しました', 'error');
    }
  };

  // データソース更新
  const handleUpdateSource = async () => {
    if (!editSource) return;

    try {
      await collectorApi.updateDataSource(editSource.id, {
        name: editSource.name,
        url: editSource.url,
        enabled: editSource.enabled
      });
      setEditSource(null);
      await loadData();
      showMessage('データソースを更新しました', 'success');
    } catch (error) {
      showMessage('更新に失敗しました', 'error');
    }
  };

  // コンテンツ生成へ移動
  const handleGenerate = (article) => {
    navigate('/content', { state: { article } });
  };

  // 結合生成
  const handleGenerateCombined = async () => {
    if (selectedArticles.size === 0) {
      showMessage('記事を選択してください', 'error');
      return;
    }

    setCombinedGenerating(true);
    try {
      const articleIds = Array.from(selectedArticles);
      const res = await api.post('/api/content/generate-combined', {
        articleIds,
        templateType: selectedTemplate,
        useDify: true
      });

      if (res.success) {
        showMessage(`✨ ${articleIds.length}件の記事から結合コンテンツを生成しました！「コンテンツ生成」ページで確認できます`, 'success');
        setShowCombinedModal(false);
        setSelectedArticles(new Set());
        // ページに留まり、ユーザーが手動でコンテンツページへ移動できるようにする
      } else {
        throw new Error(res.message || '生成に失敗しました');
      }
    } catch (error) {
      console.error('Combined generation failed:', error);
      showMessage(`結合生成に失敗しました: ${error.message}`, 'error');
    } finally {
      setCombinedGenerating(false);
    }
  };


  // 記事選択
  const handleSelect = (id) => {
    const newSelected = new Set(selectedArticles);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedArticles(newSelected);
  };

  // 全選択・解除
  const handleSelectAll = () => {
    if (selectedArticles.size === articles.length) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(articles.map(a => a.id)));
    }
  };

  // 選択削除
  const handleDeleteSelected = async () => {
    if (selectedArticles.size === 0) return;
    if (!window.confirm(`${selectedArticles.size}件の記事を削除しますか？`)) return;

    try {
      await collectorApi.deleteBatchArticles(Array.from(selectedArticles));
      setSelectedArticles(new Set());
      await loadData();
      showMessage('削除しました', 'success');
    } catch (error) {
      console.error(error);
      showMessage('削除に失敗しました', 'error');
    }
  };

  // 全削除
  const handleDeleteAll = async () => {
    if (!window.confirm('すべての記事を削除しますか？（元に戻せません）')) return;

    try {
      await collectorApi.deleteBatchArticles([], true); // all: true
      setSelectedArticles(new Set());
      await loadData();
      showMessage('全記事を削除しました', 'success');
    } catch (error) {
      console.error(error);
      showMessage('削除に失敗しました', 'error');
    }
  };

  // ステータス日本語変換
  const getStatusLabel = (status) => {
    const labels = {
      'unprocessed': '未処理',
      'processing': '処理中',
      'processed': '処理済み',
      'error': 'エラー',
      'archived': 'アーカイブ'
    };
    return labels[status] || status;
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
          <h1 style={styles.title}>📡 情報収集</h1>
          <p style={styles.subtitle}>RSS・API・GASから最新情報を収集します</p>
        </div>

        {/* 収集トリガー */}
        <div style={styles.card}>
          <div style={styles.cardHeader()}>
            <h2 style={styles.cardTitle}>
              <span>⚡</span> 収集トリガー
            </h2>
            {stats && (
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                総収集数: {stats.overall?.total || 0}件
              </span>
            )}
          </div>
          <div style={styles.cardBody}>
            <div style={styles.buttonGrid}>
              <button
                style={{
                  ...styles.button('#667eea'),
                  ...(collecting['all'] ? styles.buttonDisabled : {})
                }}
                onClick={() => handleCollect('all')}
                disabled={collecting['all']}
              >
                {collecting['all'] ? '⏳ 収集中...' : '🔄 全ソース収集'}
              </button>
            </div>
          </div>
        </div>

        {/* URL収集 */}
        <div style={styles.card}>
          <div style={styles.cardHeader('#F59E0B')}>
            <h2 style={styles.cardTitle}>
              <span>🔗</span> URLから収集
            </h2>
          </div>
          <div style={styles.cardBody}>
            <p style={{ marginBottom: '12px', color: '#4B5563', fontSize: '14px' }}>
              Web記事のURLを入力してコンテンツを収集・保存します（複数URLは改行区切り）
            </p>
            <textarea
              style={{ ...styles.input, height: '80px', fontFamily: 'monospace', resize: 'vertical' }}
              placeholder="https://example.com/article1&#13;&#10;https://example.com/article2"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                style={{
                  ...styles.button('#F59E0B'),
                  ...(urlCollecting ? styles.buttonDisabled : {})
                }}
                onClick={handleCollectUrl}
                disabled={urlCollecting}
              >
                {urlCollecting ? '⏳ 収集中...' : '📥 コンテンツを取得して保存'}
              </button>
            </div>
          </div>
        </div>

        {/* データソース管理 */}
        <div style={styles.card}>
          <div style={styles.cardHeader()}>
            <h2 style={styles.cardTitle}>
              <span>📋</span> データソース管理
            </h2>
            <button
              style={{ ...styles.button('#fff'), color: '#667eea', background: '#fff', padding: '10px 20px' }}
              onClick={() => setShowAddModal(true)}
            >
              ➕ 追加
            </button>
          </div>
          <div style={styles.cardBody}>
            {!Array.isArray(sources) || sources.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>📭</p>
                <p>データソースがありません</p>
                <p style={{ fontSize: '14px' }}>「追加」ボタンからRSSフィードなどを追加してください</p>
              </div>
            ) : (
              sources.map(source => {
                if (!source) return null;
                const sourceType = SOURCE_TYPES.find(t => t.id === source.type) || SOURCE_TYPES[0];
                return (
                  <div key={source.id} style={styles.sourceItem}>
                    <div style={styles.sourceInfo}>
                      <span style={styles.sourceIcon}>{sourceType.icon}</span>
                      <div>
                        <div style={styles.sourceName}>{source.name}</div>
                        <div style={styles.sourceUrl}>{source.url}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div
                        style={styles.toggle(source.enabled)}
                        onClick={() => handleToggleSource(source.id)}
                      >
                        <div style={styles.toggleKnob(source.enabled)}></div>
                      </div>
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', opacity: 0.7 }}
                        onClick={() => setEditSource({ ...source })}
                        title="編集"
                      >
                        ✏️
                      </button>
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', opacity: 0.6 }}
                        onClick={() => handleDeleteSource(source.id)}
                        title="削除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 収集済み記事一覧 */}
        <div style={styles.card}>
          <div style={styles.cardHeader()}>
            <h2 style={styles.cardTitle}>
              <span>📚</span> 収集済み記事（最新20件）
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {selectedArticles.size > 0 && (
                <>
                  <button
                    style={{ ...styles.button('#8B5CF6'), padding: '8px 16px', fontSize: '14px' }}
                    onClick={() => setShowCombinedModal(true)}
                  >
                    ✨ 選択した {selectedArticles.size} 件から結合生成
                  </button>
                  <button
                    style={{ ...styles.button('#EF4444'), padding: '8px 16px', fontSize: '14px' }}
                    onClick={handleDeleteSelected}
                  >
                    🗑️ 削除
                  </button>
                </>
              )}
              <button
                style={{ ...styles.button('#6B7280'), background: 'transparent', border: '1px solid #6B7280', color: '#6B7280', padding: '8px 16px', fontSize: '14px' }}
                onClick={handleDeleteAll}
              >
                全削除
              </button>
              <button
                style={{ ...styles.button('#fff'), color: '#667eea', background: '#fff', padding: '10px 20px' }}
                onClick={loadData}
              >
                🔄 更新
              </button>
            </div>
          </div>
          <div style={styles.cardBody}>
            {!Array.isArray(articles) || articles.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>📭</p>
                <p>収集された記事はまだありません</p>
                <p style={{ fontSize: '14px' }}>上のボタンから収集を実行してください</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={articles.length > 0 && selectedArticles.size === articles.length}
                          onChange={handleSelectAll}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th style={styles.th}>タイトル</th>
                      <th style={styles.th}>ソース</th>
                      <th style={styles.th}>ステータス</th>
                      <th style={styles.th}>収集日時</th>
                      <th style={styles.th}>アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map(article => (
                      <tr key={article.id} style={{ background: selectedArticles.has(article.id) ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedArticles.has(article.id)}
                            onChange={() => handleSelect(article.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={styles.td}>
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#3B82F6', textDecoration: 'none' }}
                          >
                            {article.title?.substring(0, 60)}{article.title?.length > 60 ? '...' : ''}
                          </a>
                        </td>
                        <td style={styles.td}>{article.source_name}</td>
                        <td style={styles.td}>
                          <span style={styles.statusBadge(article.status)}>
                            {getStatusLabel(article.status)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {article.collected_date ? new Date(article.collected_date).toLocaleDateString('ja-JP') : '-'}
                        </td>
                        <td style={styles.td}>
                          <button
                            style={{
                              ...styles.button('#8B5CF6'),
                              padding: '6px 12px',
                              fontSize: '12px',
                              boxShadow: 'none'
                            }}
                            onClick={() => handleGenerate(article)}
                          >
                            ⚡ 生成
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* データソース追加モーダル */}
      {showAddModal && (
        <div style={styles.modal} onClick={() => setShowAddModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700' }}>📡 データソースを追加</h3>

            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>名前</label>
            <input
              type="text"
              style={styles.input}
              placeholder="例: Tech Blog RSS"
              value={newSource.name}
              onChange={e => setNewSource({ ...newSource, name: e.target.value })}
            />

            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>タイプ</label>
            <select
              style={styles.select}
              value={newSource.type}
              onChange={e => setNewSource({ ...newSource, type: e.target.value })}
            >
              {SOURCE_TYPES.map(type => (
                <option key={type.id} value={type.id}>{type.icon} {type.name}</option>
              ))}
            </select>

            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>URL</label>
            <input
              type="url"
              style={styles.input}
              placeholder="https://example.com/rss.xml"
              value={newSource.url}
              onChange={e => setNewSource({ ...newSource, url: e.target.value })}
            />

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                style={{ ...styles.button('#667eea'), flex: 1 }}
                onClick={handleAddSource}
              >
                追加する
              </button>
              <button
                style={{ ...styles.button('#6B7280'), flex: 1 }}
                onClick={() => setShowAddModal(false)}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* データソース編集モーダル */}
      {editSource && (
        <div style={styles.modal} onClick={() => setEditSource(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700' }}>✏️ データソースを編集</h3>

            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>名前</label>
            <input
              type="text"
              style={styles.input}
              value={editSource.name}
              onChange={e => setEditSource({ ...editSource, name: e.target.value })}
            />

            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>URL</label>
            <input
              type="url"
              style={styles.input}
              value={editSource.url}
              onChange={e => setEditSource({ ...editSource, url: e.target.value })}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <label style={{ fontWeight: '600', color: '#374151' }}>有効</label>
              <div
                style={styles.toggle(editSource.enabled)}
                onClick={() => setEditSource({ ...editSource, enabled: !editSource.enabled })}
              >
                <div style={styles.toggleKnob(editSource.enabled)}></div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                style={{ ...styles.button('#667eea'), flex: 1 }}
                onClick={handleUpdateSource}
              >
                保存
              </button>
              <button
                style={{ ...styles.button('#6B7280'), flex: 1 }}
                onClick={() => setEditSource(null)}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 結合生成モーダル */}
      {showCombinedModal && (
        <div style={styles.modal} onClick={() => !combinedGenerating && setShowCombinedModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700' }}>✨ 結合コンテンツ生成</h3>

            <div style={{ background: '#F3F4F6', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ margin: 0, color: '#4B5563', fontSize: '14px' }}>
                <strong>{selectedArticles.size}件</strong>の記事を結合して1つのコンテンツを生成します
              </p>
              <ul style={{ margin: '12px 0 0 0', paddingLeft: '20px', color: '#6B7280', fontSize: '13px' }}>
                {articles.filter(a => selectedArticles.has(a.id)).slice(0, 5).map(a => (
                  <li key={a.id}>{a.title?.substring(0, 40)}{a.title?.length > 40 ? '...' : ''}</li>
                ))}
                {selectedArticles.size > 5 && <li>...他 {selectedArticles.size - 5} 件</li>}
              </ul>
            </div>

            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>テンプレート</label>
            <select
              style={styles.select}
              value={selectedTemplate}
              onChange={e => setSelectedTemplate(e.target.value)}
            >
              {TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                style={{ ...styles.button('#8B5CF6'), flex: 1, ...(combinedGenerating ? styles.buttonDisabled : {}) }}
                onClick={handleGenerateCombined}
                disabled={combinedGenerating}
              >
                {combinedGenerating ? '⌛️ 生成中...' : '🚀 結合生成'}
              </button>
              <button
                style={{ ...styles.button('#6B7280'), flex: 1, ...(combinedGenerating ? styles.buttonDisabled : {}) }}
                onClick={() => setShowCombinedModal(false)}
                disabled={combinedGenerating}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Collector;
