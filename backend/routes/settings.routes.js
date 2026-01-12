import express from 'express';
import { SettingsService } from '../services/settings.service.js';
import logger from '../utils/logger.js';

const router = express.Router();
const settingsService = new SettingsService();

/**
 * GET /api/settings
 * 現在の設定を取得（APIキーはマスク表示）
 */
router.get('/', async (req, res) => {
  try {
    const settings = await settingsService.getSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error('Failed to get settings', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get settings',
      message: error.message
    });
  }
});

/**
 * POST /api/settings
 * 設定を保存
 */
router.post('/', async (req, res) => {
  try {
    const settings = req.body;
    await settingsService.saveSettings(settings);
    
    // 更新後の設定を取得して返す
    const updatedSettings = await settingsService.getSettings();
    
    res.json({
      success: true,
      message: 'Settings saved successfully',
      data: updatedSettings
    });
  } catch (error) {
    logger.error('Failed to save settings', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to save settings',
      message: error.message
    });
  }
});

/**
 * GET /api/settings/status
 * 各サービスの接続状態を確認
 */
router.get('/status', async (req, res) => {
  try {
    const status = await settingsService.getConnectionStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get connection status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get connection status',
      message: error.message
    });
  }
});

/**
 * POST /api/settings/test/:service
 * 特定サービスの接続テスト
 */
router.post('/test/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const testSettings = req.body;
    
    const result = await settingsService.testConnection(service, testSettings);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Connection test failed', { 
      service: req.params.service,
      error: error.message 
    });
    res.status(500).json({
      success: false,
      error: 'Connection test failed',
      message: error.message
    });
  }
});

export default router;
