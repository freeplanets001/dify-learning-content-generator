/**
 * api-adapter.js
 * GAS Web App バックエンドとの通信を行うアダプター
 */

const GAS_URL_KEY = 'dify_content_generator_gas_url';

/**
 * GAS APIクライアント
 */
class GasClient {
    constructor() {
        this.baseUrl = localStorage.getItem(GAS_URL_KEY) || '';
    }

    /**
     * GAS URLを設定
     */
    setBaseUrl(url) {
        this.baseUrl = url;
        localStorage.setItem(GAS_URL_KEY, url);
    }

    /**
     * GAS URLを取得
     */
    getBaseUrl() {
        return this.baseUrl;
    }

    /**
     * APIリクエスト実行
     * @param {string} action アクション名 (例: 'getArticles')
     * @param {object} params パラメータ
     */
    async request(action, params = {}) {
        if (!this.baseUrl) {
            throw new Error('GAS Web App URL is not configured');
        }

        try {
            // POSTリクエスト (CORS回避のため text/plain で送信する場合が多いが、
            // 最近のGASは application/json も受け取れる場合がある)
            // ここでは安定性の高い text/plain (JSON文字列) で送信
            // GAS URLの確認
            console.log(`Sending request to: ${this.baseUrl} with action: ${action}`);

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({ action, params }),
                redirect: 'follow' // GASのリダイレクト追跡
            });

            if (!response.ok) {
                console.error('GAS HTTP Error:', response.status, response.statusText);
                throw new Error(`HTTP Error: ${response.status}`);
            }

            // GASはリダイレクト後に text/plain で返すことがあるため、
            // 一度テキストとして取得してからJSONパースを試みる
            const textData = await response.text();
            console.log('Raw GAS Response:', textData); // Correctly locate this log

            let data;
            try {
                data = JSON.parse(textData);
            } catch (e) {
                console.error('JSON Parse Error:', e, textData);
                throw new Error('Invalid JSON response from GAS');
            }

            console.log(`GAS API Response (${action}):`, data); // Debug log

            if (data.success === false) {
                console.error('GAS API Error:', data.error);
                throw new Error(data.error || 'Unknown API Error');
            }

            return data.data;

        } catch (error) {
            console.error(`GAS API Error (${action}):`, error);
            throw error;
        }
    }
}

export const gasClient = new GasClient();

/**
 * 既存のAPIサービス互換レイヤー
 */
export default {
    // 収集関連
    collector: {
        trigger: (params) => gasClient.request('collectRss', params), // params is ignored in current impl
        url: (url, sourceName) => gasClient.request('collectUrl', { url, sourceName }),
        getArticles: (params) => gasClient.request('getArticles', params),
        getArticle: (id) => gasClient.request('getArticle', { id }),
        deleteArticle: (id) => gasClient.request('deleteArticle', { id }),
        getRssSources: () => gasClient.request('getRssSources'),
        saveRssSource: (data) => gasClient.request('saveRssSource', data),
        deleteRssSource: (id) => gasClient.request('deleteRssSource', { id }),
    },

    // コンテンツ生成関連
    content: {
        generate: (articleId, templateId) => gasClient.request('generateContent', { articleId, templateId }),
        generateCombined: (articleIds, templateId) => gasClient.request('generateCombinedContent', { articleIds, templateId }),
        getList: (params) => gasClient.request('getContents', params),
    },

    // 設定関連
    settings: {
        get: () => gasClient.request('getSettings'),
        save: (data) => gasClient.request('saveSettings', data),
    },

    // Obsidian関連
    obsidian: {
        save: (filename, content, path) => gasClient.request('saveToObsidian', { filename, content, path }),
        generateDailyNote: () => gasClient.request('generateDailyNote'),
    },

    // 画像生成関連
    image: {
        generate: (prompt) => gasClient.request('generateImage', { prompt }),
    }
};
