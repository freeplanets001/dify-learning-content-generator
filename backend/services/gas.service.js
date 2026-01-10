import axios from 'axios';
import config from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Google Apps Script Web Appとの連携サービス
 */

/**
 * GAS Web Appにリクエストを送信
 */
export async function callGasWebApp(action, params = {}) {
  const gasUrl = config.gasWebAppUrl;

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

export default {
  callGasWebApp,
  triggerCollectAll,
  triggerCollectDifyBlog,
  triggerCollectYouTube,
  triggerCollectQiita,
  triggerCollectZenn,
  checkGasHealth,
  executeCustomAction
};
