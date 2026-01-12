import api from './api-adapter';

// 設定取得
export const getSettings = () => api.settings.get()
    .then(data => ({ data: data }));

// 設定更新
export const updateSettings = (data) => api.settings.save(data)
    .then(res => ({ data: res }));

// 設定保存 (互換用)
export const saveSettings = (data) => updateSettings(data);

// 接続確認 (GASへの疎通確認 - 設定取得で代用)
export const verifyConnection = () => api.settings.get()
    .then(() => ({ data: { success: true } }))
    .catch(() => ({ data: { success: false } }));

// 接続テスト (互換用 - dummy)
export const testConnection = (service, settings = {}) =>
    Promise.resolve({ data: { success: true, message: 'Connection test simulated (GAS)' } });

// 接続状態取得 (互換用)
// 接続状態取得
export const getConnectionStatus = () => api.settings.get()
    .then(settings => ({
        data: {
            dify: { configured: settings.isDifyConfigured },
            obsidian: { configured: !!settings.obsidianVaultPath },
            gas: { configured: true }
        }
    }))
    .catch(() => ({ data: {} }));

export default {
    getSettings,
    updateSettings,
    saveSettings,
    verifyConnection,
    testConnection,
    getConnectionStatus
};
