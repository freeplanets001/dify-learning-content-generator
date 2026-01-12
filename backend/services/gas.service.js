import axios from 'axios';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import SettingsService from './settings.service.js';

/**
 * Google Apps Script Web Appとの連携サービス
 */

/**
 * GAS Web Appにリクエストを送信
 */
export async function callGasWebApp(action, params = {}) {
  // 設定ファイルから最新のURLを取得
  const settingsService = new SettingsService();
  const settings = await settingsService.getRawSettings();
  const gasUrl = settings.gasWebAppUrl || config.gasWebAppUrl;

  if (!gasUrl) {
    throw new Error('GAS_WEB_APP_URL is not configured');
  }

  try {
    logger.info(`Calling GAS Web App: ${action}`);

    const response = await axios.post(
      gasUrl,
      {
        action,
        ...params
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(config.gasApiKey && { 'Authorization': `Bearer ${config.gasApiKey}` })
        },
        timeout: 30000
      }
    );

    logger.info(`GAS Web App response: ${action}`, {
      success: response.data.success,
      status: response.status
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    logger.error(`GAS Web App error: ${action}`, {
      error: error.message,
      response: error.response?.data
    });

    return {
      success: false,
      error: error.message,
      details: error.response?.data
    };
  }
}

/**
 * 全ソースから情報収集（GAS経由）
 */
export async function triggerCollectAll() {
  return await callGasWebApp('collect_all');
}

/**
 * Difyブログから収集（GAS経由）
 */
export async function triggerCollectDifyBlog() {
  return await callGasWebApp('collect_dify_blog');
}

/**
 * YouTubeから収集（GAS経由）
 */
export async function triggerCollectYouTube() {
  return await callGasWebApp('collect_youtube');
}

/**
 * Qiitaから収集（GAS経由）
 */
export async function triggerCollectQiita() {
  return await callGasWebApp('collect_qiita');
}

/**
 * Zennから収集（GAS経由）
 */
export async function triggerCollectZenn() {
  return await callGasWebApp('collect_zenn');
}

/**
 * スライド生成（GAS経由）
 * @param {Array} slides - スライドデータの配列
 * @param {Object} metadata - メタデータ（タイトル等）
 */
export async function generateSlides(slides, metadata) {
  return await callGasWebApp('create_slides', { slides, metadata });
}

/**
 * GAS Web Appのヘルスチェック
 */
export async function checkGasHealth() {
  const gasUrl = config.gasWebAppUrl;

  if (!gasUrl) {
    return {
      success: false,
      error: 'GAS_WEB_APP_URL is not configured'
    };
  }

  try {
    const response = await axios.get(gasUrl, { timeout: 10000 });

    return {
      success: true,
      status: 'online',
      message: response.data?.message || 'OK'
    };
  } catch (error) {
    return {
      success: false,
      status: 'offline',
      error: error.message
    };
  }
}

/**
 * カスタムアクションを実行
 */
export async function executeCustomAction(action, params) {
  return await callGasWebApp(action, params);
}

/**
 * 記事データをGASへ同期（保存）
 */
export async function syncArticlesToGas(articles) {
  if (!articles || articles.length === 0) {
    return { success: true, message: 'No articles to sync' };
  }

  // GAS側で扱いやすい形式に変換
  const payload = articles.map(article => ({
    title: article.title,
    url: article.url,
    description: article.description || '',
    source_name: article.source_name,
    source_type: article.source_type,
    author: article.author || '',
    published_date: article.published_date,
    collected_date: new Date().toISOString()
  }));

  // GASへ送信
  // GAS側で 'save_articles' アクションを実装する必要がある
  return await callGasWebApp('save_articles', { articles: payload });
}

export default {
  callGasWebApp,
  triggerCollectAll,
  triggerCollectDifyBlog,
  triggerCollectYouTube,
  triggerCollectQiita,
  triggerCollectZenn,
  checkGasHealth,
  executeCustomAction,
  syncArticlesToGas
};
