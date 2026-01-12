import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as contentApi from '../services/content.api';

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  wrapper: { maxWidth: '1100px', margin: '0 auto' },
  header: { marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: '800', color: '#fff', margin: 0 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginTop: '4px' },
  card: { background: 'rgba(255,255,255,0.95)', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', overflow: 'hidden' },
  cardHeader: { padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' },
  cardBody: { padding: '20px' },
  btn: { padding: '8px 14px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s' },
  btnPrimary: { background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff' },
  btnBlue: { background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', color: '#fff' },
  btnPurple: { background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', color: '#fff' },
  btnRed: { background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', color: '#fff' },
  btnGray: { background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' },
  btnSmall: { padding: '5px 10px', fontSize: '12px' },
  select: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '13px', background: '#fff' },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: '#fff', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '700px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' },
  textarea: { width: '100%', minHeight: '300px', padding: '16px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '14px', lineHeight: '1.7', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' },
  toast: { position: 'fixed', top: '20px', right: '20px', padding: '14px 20px', borderRadius: '10px', color: '#fff', fontWeight: '600', zIndex: 1001, boxShadow: '0 6px 20px rgba(0,0,0,0.2)' },
  contentCard: { background: '#F9FAFB', borderRadius: '12px', padding: '16px', border: '1px solid #E5E7EB', marginBottom: '12px' },
  badge: { padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', color: '#fff' },
  filterBar: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }
};

const TEMPLATES = [
  { id: 'tutorial', name: 'チュートリアル記事', icon: '📚' },
  { id: 'note-article', name: 'note記事', icon: '📝' },
  { id: 'threads-post', name: 'SNS投稿', icon: '🧵' },
  { id: 'slide-outline', name: 'スライド構成', icon: '📊' },
  { id: 'blog-post', name: 'ブログ記事', icon: '✍️' },
  { id: 'summary', name: '要約', icon: '💡' },
];

const STATUS_OPTIONS = [
  { id: 'all', name: 'すべて' },
  { id: 'pending_approval', name: '保留中' },
  { id: 'approved', name: '承認済み' },
  { id: 'rejected', name: '却下' }
];

function Content() {
  const location = useLocation();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingContents, setLoadingContents] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters
  const [filterTemplate, setFilterTemplate] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Edit Modal
  const [editModal, setEditModal] = useState(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  // Expand
  const [expandedIds, setExpandedIds] = useState(new Set());

  useEffect(() => {
    if (location.state?.article) {
      setArticle(location.state.article);
    } else {
      loadContents();
    }
  }, [location]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadContents = async () => {
    setLoadingContents(true);
    try {
      const res = await contentApi.getContents({ limit: 50, orderBy: 'created_at', order: 'DESC' });
      const data = Array.isArray(res?.data) ? res.data : (res?.data?.contents || []);
      setContents(data);
    } catch { /* ignore */ }
    finally { setLoadingContents(false); }
  };

  // Filtered contents
  const filteredContents = contents.filter(c => {
    if (filterTemplate !== 'all' && c.template_type !== filterTemplate) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  });

  // Delete
  const handleDelete = async (id) => {
    if (!window.confirm('このコンテンツを削除しますか？')) return;
    try {
      await contentApi.deleteContent(id);
      setContents(prev => prev.filter(c => c.id !== id));
      showToast('削除しました');
    } catch { showToast('削除に失敗しました', 'error'); }
  };

  // Approve
  const handleApprove = async (id) => {
    try {
      await contentApi.approveContent(id);
      setContents(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' } : c));
      showToast('承認しました ✅');
    } catch { showToast('承認に失敗しました', 'error'); }
  };

  // Reject
  const handleReject = async (id) => {
    try {
      await contentApi.rejectContent(id);
      setContents(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' } : c));
      showToast('却下しました');
    } catch { showToast('却下に失敗しました', 'error'); }
  };

  // Regenerate
  const handleRegenerate = async (id) => {
    if (!window.confirm('再生成しますか？（新しいコンテンツが追加されます）')) return;
    setLoading(true);
    try {
      const res = await contentApi.regenerateContent(id);
      if (res?.data?.content) {
        setContents(prev => [res.data.content, ...prev]);
        showToast('再生成しました 🔄');
      }
    } catch (e) {
      console.error('Regenerate Error:', e);
      showToast('再生成失敗: ' + (e.message || 'Unknown error'), 'error');
    }
    finally { setLoading(false); }
  };

  // Edit
  const openEdit = (c) => { setEditModal(c); setEditText(c.content || ''); };
  const closeEdit = () => { setEditModal(null); setEditText(''); };
  const saveEdit = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      await contentApi.updateContent(editModal.id, { content: editText });
      setContents(prev => prev.map(c => c.id === editModal.id ? { ...c, content: editText } : c));
      showToast('保存しました 💾');
      closeEdit();
    } catch { showToast('保存に失敗しました', 'error'); }
    finally { setSaving(false); }
  };

  // Export
  const handleExport = (c, format = 'md') => {
    const content = c.content || '';
    const filename = `${(c.title || 'content').replace(/[^a-zA-Z0-9ぁ-んァ-ン一-龥]/g, '_')}.${format === 'md' ? 'md' : 'txt'}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    showToast(`${format.toUpperCase()}でダウンロード 📥`);
  };

  // Copy
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    showToast('コピーしました 📋');
  };

  // Toggle expand
  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      return newSet;
    });
  };

  // Status badge color
  const getStatusBadge = (status) => {
    const colors = { approved: '#10B981', pending_approval: '#F59E0B', rejected: '#EF4444' };
    const labels = { approved: '承認済み', pending_approval: '保留中', rejected: '却下' };
    return { color: colors[status] || '#6B7280', label: labels[status] || status };
  };

  // Article selected view (generation)
  if (article) {
    return (
      <div style={styles.container}>
        <div style={styles.wrapper}>
          <div style={styles.header}>
            <button style={{ ...styles.btn, ...styles.btnGray, marginBottom: '12px' }} onClick={() => navigate('/collector')}>← 収集画面へ戻る</button>
            <h1 style={styles.title}>✨ コンテンツ生成</h1>
            <p style={styles.subtitle}>元記事: {article.title}</p>
          </div>
          <div style={styles.card}>
            <div style={styles.cardBody}>
              <p style={{ marginBottom: '16px', color: '#4B5563' }}>テンプレートを選択してコンテンツを生成します</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {TEMPLATES.map(t => (
                  <button key={t.id} style={{ ...styles.btn, ...styles.btnPrimary, padding: '16px', flexDirection: 'column' }} onClick={async () => {
                    setLoading(true);
                    try {
                      const res = await contentApi.generateContent({ articleId: article.id, templateType: t.id, useDify: true });
                      if (res?.data) {
                        showToast('生成完了！');
                        setArticle(null);
                        navigate('/content', { replace: true, state: null });
                        // loadContents will affect 'contents' state, which is used in the list view
                        loadContents();
                      }
                    } catch (e) {
                      console.error('Generation Error:', e);
                      showToast('生成失敗: ' + (e.message || 'Unknown error'), 'error');
                    }
                    finally { setLoading(false); }
                  }}>
                    <span style={{ fontSize: '24px' }}>{t.icon}</span>
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {loading && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, color: '#fff' }}><div style={{ textAlign: 'center' }}><div style={{ width: '48px', height: '48px', border: '4px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div><p>AI生成中...</p></div></div>}
        {toast && <div style={{ ...styles.toast, background: toast.type === 'error' ? '#EF4444' : '#10B981' }}>{toast.msg}</div>}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Content list view
  return (
    <div style={styles.container}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {toast && <div style={{ ...styles.toast, background: toast.type === 'error' ? '#EF4444' : '#10B981' }}>{toast.msg}</div>}

      <div style={styles.wrapper}>
        <div style={styles.header}>
          <h1 style={styles.title}>✨ コンテンツ管理</h1>
          <p style={styles.subtitle}>生成されたコンテンツの管理・編集・エクスポート</p>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>📚 生成済みコンテンツ ({filteredContents.length}件)</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ ...styles.btn, ...styles.btnBlue }} onClick={() => navigate('/collector')}>📡 収集画面</button>
              <button style={{ ...styles.btn, ...styles.btnGray }} onClick={loadContents}>🔄 更新</button>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ ...styles.cardBody, borderBottom: '1px solid #E5E7EB', paddingBottom: '16px' }}>
            <div style={styles.filterBar}>
              <div>
                <label style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>テンプレート</label>
                <select style={styles.select} value={filterTemplate} onChange={e => setFilterTemplate(e.target.value)}>
                  <option value="all">すべて</option>
                  {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>ステータス</label>
                <select style={styles.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={styles.cardBody}>
            {loadingContents ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>読み込み中...</div>
            ) : filteredContents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                <p style={{ fontSize: '40px', marginBottom: '12px' }}>📭</p>
                <p>コンテンツがありません</p>
              </div>
            ) : (
              <div>
                {filteredContents.map(c => {
                  const expanded = expandedIds.has(c.id);
                  const sb = getStatusBadge(c.status);
                  return (
                    <div key={c.id} style={styles.contentCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '600', color: '#1F2937' }}>
                            {c.title || '無題'}
                            {c.metadata?.combined && <span style={{ ...styles.badge, background: '#8B5CF6', marginLeft: '6px' }}>結合</span>}
                          </h3>
                          <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#6B7280', flexWrap: 'wrap' }}>
                            <span>📝 {TEMPLATES.find(t => t.id === c.template_type)?.name || c.template_type}</span>
                            <span>📅 {c.created_at ? new Date(c.created_at).toLocaleDateString('ja-JP') : '-'}</span>
                            <span style={{ ...styles.badge, background: sb.color }}>{sb.label}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          <button style={{ ...styles.btn, ...styles.btnSmall, ...styles.btnGray }} onClick={() => toggleExpand(c.id)}>{expanded ? '▲ 閉じる' : '▼ 展開'}</button>
                          <button style={{ ...styles.btn, ...styles.btnSmall, ...styles.btnGray }} onClick={() => handleCopy(c.content)}>📋</button>
                          <button style={{ ...styles.btn, ...styles.btnSmall, ...styles.btnBlue }} onClick={() => openEdit(c)}>✏️</button>
                          {c.status !== 'approved' && <button style={{ ...styles.btn, ...styles.btnSmall, ...styles.btnPrimary }} onClick={() => handleApprove(c.id)}>✅</button>}
                          {c.status !== 'rejected' && <button style={{ ...styles.btn, ...styles.btnSmall, ...styles.btnGray }} onClick={() => handleReject(c.id)}>✖️</button>}
                          <button style={{ ...styles.btn, ...styles.btnSmall, ...styles.btnPurple }} onClick={() => handleRegenerate(c.id)}>🔄</button>
                          <button style={{ ...styles.btn, ...styles.btnSmall, ...styles.btnGray }} onClick={() => handleExport(c, 'md')}>📤 MD</button>
                          <button style={{ ...styles.btn, ...styles.btnSmall, ...styles.btnRed }} onClick={() => handleDelete(c.id)}>🗑️</button>
                        </div>
                      </div>
                      <div style={{ background: '#fff', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#374151', whiteSpace: 'pre-wrap', border: '1px solid #E5E7EB', maxHeight: expanded ? 'none' : '100px', overflow: expanded ? 'auto' : 'hidden' }}>
                        {expanded ? c.content : (c.content || '').substring(0, 400) + ((c.content || '').length > 400 ? '...' : '')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div style={styles.modal} onClick={closeEdit}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>✏️ コンテンツを編集</h3>
            <textarea style={styles.textarea} value={editText} onChange={e => setEditText(e.target.value)} />
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button style={{ ...styles.btn, ...styles.btnPrimary, flex: 1 }} onClick={saveEdit} disabled={saving}>{saving ? '保存中...' : '💾 保存'}</button>
              <button style={{ ...styles.btn, ...styles.btnGray, flex: 1 }} onClick={closeEdit}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {loading && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, color: '#fff' }}><div style={{ textAlign: 'center' }}><div style={{ width: '48px', height: '48px', border: '4px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div><p>処理中...</p></div></div>}
    </div>
  );
}

export default Content;
