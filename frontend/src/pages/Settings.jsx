import { useState, useEffect } from 'react';
import * as settingsApi from '../services/settings.api';

// サービス設定の定義
const SERVICE_CONFIGS = [
    {
        id: 'dify',
        name: 'Dify API',
        icon: '🤖',
        color: '#8B5CF6',
        fields: [
            { key: 'difyApiBaseUrl', label: 'API Base URL', type: 'url', placeholder: 'https://api.dify.ai/v1' },
            { key: 'difyApiKey', label: 'API Key', type: 'password', placeholder: 'app-xxxxxxxx' },
            { key: 'difyWorkflowId', label: 'Workflow ID', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }
        ]
    },
    {
        id: 'obsidian',
        name: 'Obsidian連携',
        icon: '📝',
        color: '#6366F1',
        fields: [
            { key: 'obsidianVaultPath', label: 'Vault Path', type: 'text', placeholder: '/path/to/your/obsidian/vault' },
            { key: 'obsidianDailyNotePath', label: 'Daily Note Path', type: 'text', placeholder: 'Daily Notes' }
        ]
    },
    {
        id: 'imageGen',
        name: '画像生成 (Nanobanana)',
        icon: '🎨',
        color: '#EC4899',
        fields: [
            { key: 'imageGenApiKey', label: 'Nanobanana API Key', type: 'password', placeholder: 'app-xxxxxxxx (空の場合はDify API Keyを使用)' },
            { key: 'imageGenBaseUrl', label: 'API Base URL', type: 'url', placeholder: 'https://api.dify.ai/v1 (デフォルト)' },
            { key: 'imageGenWorkflowId', label: 'Workflow ID', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }
        ]
    }
];

// Inline Styles
const styles = {
    container: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '32px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    wrapper: {
        maxWidth: '900px',
        margin: '0 auto'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    saveButton: {
        padding: '14px 32px',
        background: 'linear-gradient(135deg, #fff 0%, #f0f0f0 100%)',
        color: '#6366F1',
        border: 'none',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    card: {
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '20px',
        marginBottom: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease'
    },
    cardHeader: (color) => ({
        background: `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)`,
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer'
    }),
    cardHeaderLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
    },
    cardIcon: {
        fontSize: '32px',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
    },
    cardTitle: {
        color: '#fff',
        fontSize: '18px',
        fontWeight: '700',
        margin: 0
    },
    cardSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: '13px',
        margin: '4px 0 0 0'
    },
    badge: (configured) => ({
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        background: configured ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    }),
    badgeDot: (configured) => ({
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: configured ? '#4ADE80' : 'rgba(255,255,255,0.5)',
        boxShadow: configured ? '0 0 8px #4ADE80' : 'none'
    }),
    cardBody: {
        padding: '24px'
    },
    fieldGroup: {
        marginBottom: '20px'
    },
    label: {
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '8px'
    },
    input: {
        width: '100%',
        padding: '14px 18px',
        border: '2px solid #E5E7EB',
        borderRadius: '12px',
        fontSize: '15px',
        transition: 'all 0.2s ease',
        outline: 'none',
        boxSizing: 'border-box'
    },
    inputFocus: {
        borderColor: '#8B5CF6',
        boxShadow: '0 0 0 4px rgba(139, 92, 246, 0.1)'
    },
    testButton: {
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
        color: '#4B5563',
        border: 'none',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s ease'
    },
    toast: (type) => ({
        position: 'fixed',
        top: '24px',
        right: '24px',
        padding: '16px 24px',
        borderRadius: '12px',
        background: type === 'success'
            ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
            : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
        color: '#fff',
        fontWeight: '600',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        animation: 'slideIn 0.3s ease'
    }),
    infoBox: {
        marginTop: '32px',
        padding: '24px',
        background: 'rgba(255,255,255,0.15)',
        borderRadius: '16px',
        backdropFilter: 'blur(10px)'
    },
    infoTitle: {
        color: '#fff',
        fontSize: '16px',
        fontWeight: '700',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    infoList: {
        margin: 0,
        padding: 0,
        listStyle: 'none'
    },
    infoItem: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: '14px',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    loader: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        gap: '16px'
    },
    spinner: {
        width: '48px',
        height: '48px',
        border: '4px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    }
};

// 色を暗くする関数
function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function Settings() {
    const [settings, setSettings] = useState({});
    const [status, setStatus] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState({});
    const [message, setMessage] = useState(null);
    const [focusedInput, setFocusedInput] = useState(null);

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
            setSettings(settingsRes.data || {});
            setStatus(statusRes.data || {});
        } catch (error) {
            console.error('Failed to load settings:', error);
            showMessage('設定の読み込みに失敗しました', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await settingsApi.saveSettings(settings);
            showMessage('設定を保存しました ✨', 'success');
            const statusRes = await settingsApi.getConnectionStatus();
            setStatus(statusRes.data || {});
        } catch (error) {
            showMessage('設定の保存に失敗しました', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async (serviceId) => {
        try {
            setTesting(prev => ({ ...prev, [serviceId]: true }));
            const result = await settingsApi.testConnection(serviceId, settings);
            if (result.data?.success) {
                showMessage(`${serviceId}: 接続成功 ✅`, 'success');
            } else {
                showMessage(`${serviceId}: ${result.data?.message || '接続失敗'}`, 'error');
            }
        } catch (error) {
            showMessage(`${serviceId}: 接続テスト失敗`, 'error');
        } finally {
            setTesting(prev => ({ ...prev, [serviceId]: false }));
        }
    };

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 4000);
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <div style={styles.loader}>
                    <div style={styles.spinner}></div>
                    <p style={{ color: '#fff', fontWeight: '500' }}>設定を読み込み中...</p>
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
                    <span style={{ fontSize: '20px' }}>{message.type === 'success' ? '✓' : '⚠'}</span>
                    {message.text}
                </div>
            )}

            <div style={styles.wrapper}>
                {/* Header */}
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.title}>⚙️ 設定</h1>
                        <p style={styles.subtitle}>外部サービスとの連携設定を管理します</p>
                    </div>
                    <button
                        style={styles.saveButton}
                        onClick={handleSave}
                        disabled={saving}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        {saving ? '⏳ 保存中...' : '💾 全て保存'}
                    </button>
                </div>

                {/* Cards */}
                {SERVICE_CONFIGS.map(service => {
                    const isConfigured = status[service.id]?.configured;

                    return (
                        <div key={service.id} style={styles.card}>
                            <div style={styles.cardHeader(service.color)}>
                                <div style={styles.cardHeaderLeft}>
                                    <span style={styles.cardIcon}>{service.icon}</span>
                                    <div>
                                        <h3 style={styles.cardTitle}>{service.name}</h3>
                                        <p style={styles.cardSubtitle}>{service.fields.length}項目の設定</p>
                                    </div>
                                </div>
                                <div style={styles.badge(isConfigured)}>
                                    <div style={styles.badgeDot(isConfigured)}></div>
                                    {isConfigured ? '接続済み' : '未設定'}
                                </div>
                            </div>

                            <div style={styles.cardBody}>
                                {service.fields.map(field => (
                                    <div key={field.key} style={styles.fieldGroup}>
                                        <label style={styles.label}>{field.label}</label>
                                        <input
                                            type={field.type === 'password' ? 'password' : 'text'}
                                            value={settings[field.key] || ''}
                                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                                            placeholder={field.placeholder}
                                            style={{
                                                ...styles.input,
                                                ...(focusedInput === field.key ? styles.inputFocus : {})
                                            }}
                                            onFocus={() => setFocusedInput(field.key)}
                                            onBlur={() => setFocusedInput(null)}
                                        />
                                    </div>
                                ))}

                                {['dify', 'gas', 'obsidian'].includes(service.id) && (
                                    <button
                                        style={styles.testButton}
                                        onClick={() => handleTest(service.id)}
                                        disabled={testing[service.id]}
                                        onMouseOver={(e) => e.target.style.background = 'linear-gradient(135deg, #E5E7EB 0%, #D1D5DB 100%)'}
                                        onMouseOut={(e) => e.target.style.background = 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)'}
                                    >
                                        {testing[service.id] ? '⏳ テスト中...' : '⚡ 接続テスト'}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Info Box */}
                <div style={styles.infoBox}>
                    <div style={styles.infoTitle}>
                        <span>💡</span> ヒント
                    </div>
                    <ul style={styles.infoList}>
                        <li style={styles.infoItem}>
                            <span style={{ color: '#FBBF24' }}>●</span>
                            設定を保存後、サーバーを再起動すると新しい設定が反映されます
                        </li>
                        <li style={styles.infoItem}>
                            <span style={{ color: '#FBBF24' }}>●</span>
                            APIキーなどの機密情報はマスク表示されます
                        </li>
                        <li style={styles.infoItem}>
                            <span style={{ color: '#FBBF24' }}>●</span>
                            接続テストは現在入力中の値でテストを行います
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default Settings;
