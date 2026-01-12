import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import config from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 設定ファイルのパス
const SETTINGS_FILE = path.resolve(__dirname, '../../data/settings.json');

// マスクする必要のあるキー
const SENSITIVE_KEYS = [
    'gasApiKey',
    'difyApiKey',
    'twitterBearerToken',
    'threadsAccessToken',
    'googleServiceAccountKey',
    'imageGenApiKey'
];

/**
 * 設定管理サービス
 */
export class SettingsService {
    constructor() {
        this.ensureSettingsFile();
    }

    /**
     * 設定ファイルの存在を確認し、なければ作成
     */
    async ensureSettingsFile() {
        try {
            await fs.ensureDir(path.dirname(SETTINGS_FILE));
            if (!await fs.pathExists(SETTINGS_FILE)) {
                await fs.writeJson(SETTINGS_FILE, this.getDefaultSettings(), { spaces: 2 });
            }
        } catch (error) {
            console.error('Failed to ensure settings file:', error);
        }
    }

    /**
     * デフォルト設定を取得
     */
    getDefaultSettings() {
        return {
            // GAS連携
            gasWebAppUrl: config.gasWebAppUrl || '',
            gasApiKey: config.gasApiKey || '',

            // Dify API
            difyApiBaseUrl: config.difyApiBaseUrl || 'https://api.dify.ai/v1',
            difyApiKey: config.difyApiKey || '',
            difyWorkflowId: config.difyWorkflowId || '',

            // Obsidian
            obsidianVaultPath: config.obsidianVaultPath || '',
            obsidianDailyNotePath: config.obsidianDailyNotePath || 'Daily Notes',

            // Google Sheets
            googleSheetsId: config.googleSheetsId || '',
            googleServiceAccountKey: config.googleServiceAccountKey || '',

            // Twitter/X
            twitterBearerToken: config.twitterBearerToken || '',

            // Threads
            threadsAccessToken: '',

            // RSS Feeds
            difyBlogRss: config.difyBlogRss || 'https://dify.ai/blog/rss.xml',
            youtubeChannelRss: config.youtubeChannelRss || '',
            qiitaRss: 'https://qiita.com/tags/dify/feed',
            zennRss: 'https://zenn.dev/topics/dify/feed',
            hackerNewsRss: '',
            devToRss: '',
            redditMlRss: '',
            customRss1: '',
            customRss2: '',
            customRss3: ''
        };
    }

    /**
     * 現在の設定を取得（センシティブな値はマスク）
     */
    async getSettings() {
        try {
            const settings = await fs.readJson(SETTINGS_FILE);
            return this.maskSensitiveValues(settings);
        } catch (error) {
            console.error('Failed to read settings:', error);
            return this.maskSensitiveValues(this.getDefaultSettings());
        }
    }

    /**
     * 設定を保存（内部用、マスクなし）
     */
    async getRawSettings() {
        try {
            return await fs.readJson(SETTINGS_FILE);
        } catch (error) {
            return this.getDefaultSettings();
        }
    }

    /**
     * 設定を保存
     */
    async saveSettings(newSettings) {
        try {
            // 既存の設定を読み込み
            const currentSettings = await this.getRawSettings();

            // マスクされた値は更新しない
            const mergedSettings = { ...currentSettings };

            for (const [key, value] of Object.entries(newSettings)) {
                // マスクされた値（●を含む）は既存の値を保持
                if (typeof value === 'string' && value.includes('●')) {
                    continue;
                }

                // センシティブなキーやURLはホワイトスペースを削除
                let cleanValue = value;
                if (typeof value === 'string') {
                    if (SENSITIVE_KEYS.includes(key) || key.toLowerCase().includes('url')) {
                        cleanValue = value.trim();
                    }
                }

                mergedSettings[key] = cleanValue;
            }

            // 設定を保存
            await fs.writeJson(SETTINGS_FILE, mergedSettings, { spaces: 2 });

            return mergedSettings;
        } catch (error) {
            console.error('Failed to save settings:', error);
            throw error;
        }
    }

    /**
     * センシティブな値をマスク
     */
    maskSensitiveValues(settings) {
        const masked = { ...settings };

        for (const key of SENSITIVE_KEYS) {
            if (masked[key] && typeof masked[key] === 'string' && masked[key].length > 0) {
                // 最初の4文字だけ表示、残りはマスク
                const value = masked[key];
                if (value.length > 8) {
                    masked[key] = value.substring(0, 4) + '●'.repeat(Math.min(16, value.length - 4));
                } else {
                    masked[key] = '●'.repeat(value.length);
                }
            }
        }

        return masked;
    }

    /**
     * 各サービスの接続状態を取得
     */
    async getConnectionStatus() {
        const settings = await this.getRawSettings();

        return {
            gas: {
                configured: !!(settings.gasWebAppUrl && settings.gasApiKey),
                label: 'GAS連携'
            },
            dify: {
                configured: !!(settings.difyApiKey),
                label: 'Dify API'
            },
            obsidian: {
                configured: !!(settings.obsidianVaultPath),
                label: 'Obsidian連携'
            },
            googleSheets: {
                configured: !!(settings.googleSheetsId),
                label: 'Google Sheets'
            },
            imageGen: {
                configured: !!(settings.imageGenApiKey && settings.imageGenWorkflowId) || !!(settings.difyApiKey && settings.imageGenWorkflowId),
                label: '画像生成 (Nanobanana)'
            },
            rss: {
                configured: true,
                label: 'RSS Feeds'
            }
        };
    }

    /**
     * 接続テスト
     */
    async testConnection(service, testSettings = {}) {
        const settings = await this.getRawSettings();
        const mergedSettings = { ...settings, ...testSettings };

        switch (service) {
            case 'dify':
                return await this.testDifyConnection(mergedSettings);
            case 'gas':
                return await this.testGasConnection(mergedSettings);
            case 'obsidian':
                return await this.testObsidianConnection(mergedSettings);
            case 'twitter':
                return await this.testTwitterConnection(mergedSettings);
            default:
                throw new Error(`Unknown service: ${service}`);
        }
    }

    /**
     * Dify API接続テスト
     */
    async testDifyConnection(settings) {
        if (!settings.difyApiKey) {
            return { success: false, message: 'API Key is not configured' };
        }

        let apiKey = settings.difyApiKey || '';

        // マスクされた値（●を含む）なら、保存済みの設定から読み込む
        if (apiKey.includes('●')) {
            const savedSettings = await this.getRawSettings();
            apiKey = savedSettings.difyApiKey || '';
        }

        const cleanApiKey = apiKey
            .replace(/\s/g, '') // 全ての空白削除
            .replace(/['"]/g, '')
            .replace(/[^\x20-\x7E]/g, '')
            .trim();

        try {
            const response = await axios.get(`${settings.difyApiBaseUrl}/parameters`, {
                headers: {
                    'Authorization': `Bearer ${cleanApiKey}`
                },
                timeout: 10000
            });

            return {
                success: true,
                message: 'Dify API connection successful'
            };
        } catch (error) {
            return {
                success: false,
                message: `Connection failed: ${error.response?.data?.message || error.message}`
            };
        }
    }

    /**
     * GAS接続テスト
     */
    async testGasConnection(settings) {
        if (!settings.gasWebAppUrl) {
            return { success: false, message: 'GAS Web App URL is not configured' };
        }

        try {
            const response = await axios.get(settings.gasWebAppUrl, {
                params: { action: 'health' },
                timeout: 10000
            });

            return {
                success: true,
                message: 'GAS connection successful'
            };
        } catch (error) {
            return {
                success: false,
                message: `Connection failed: ${error.message}`
            };
        }
    }

    /**
     * Obsidian Vault接続テスト
     */
    async testObsidianConnection(settings) {
        if (!settings.obsidianVaultPath) {
            return { success: false, message: 'Vault path is not configured' };
        }

        try {
            const exists = await fs.pathExists(settings.obsidianVaultPath);
            if (!exists) {
                return {
                    success: false,
                    message: `Vault path does not exist: ${settings.obsidianVaultPath}`
                };
            }

            const stats = await fs.stat(settings.obsidianVaultPath);
            if (!stats.isDirectory()) {
                return {
                    success: false,
                    message: 'Vault path is not a directory'
                };
            }

            return {
                success: true,
                message: 'Obsidian vault found and accessible'
            };
        } catch (error) {
            return {
                success: false,
                message: `Vault check failed: ${error.message}`
            };
        }
    }

    /**
     * Twitter API接続テスト
     */
    async testTwitterConnection(settings) {
        if (!settings.twitterBearerToken) {
            return { success: false, message: 'Bearer token is not configured' };
        }

        try {
            const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
                params: { query: 'dify' },
                headers: {
                    'Authorization': `Bearer ${settings.twitterBearerToken}`
                },
                timeout: 10000
            });

            return {
                success: true,
                message: 'Twitter API connection successful'
            };
        } catch (error) {
            return {
                success: false,
                message: `Connection failed: ${error.response?.data?.detail || error.message}`
            };
        }
    }
}

export default SettingsService;
