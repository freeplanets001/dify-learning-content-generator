import express from 'express';
import * as obsidianService from '../services/obsidian.service.js';
import { formatSuccessResponse, formatErrorResponse, validateObsidianConfig } from '../utils/validator.js';
import { logApiError } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/obsidian/config
 * Vault設定を取得
 */
router.get('/config', (req, res) => {
  try {
    const config = obsidianService.getVaultConfig();
    res.json(formatSuccessResponse(config));
  } catch (error) {
    logApiError('/api/obsidian/config', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * POST /api/obsidian/config
 * Vault設定を更新
 */
router.post('/config', (req, res) => {
  try {
    const { vaultPath, dailyNotePath } = req.body;

    // バリデーション
    const validation = validateObsidianConfig({ vaultPath, dailyNotePath });
    if (!validation.isValid) {
      return res.status(400).json(formatErrorResponse(validation.errors));
    }

    const config = obsidianService.updateVaultConfig(vaultPath, dailyNotePath);
    res.json(formatSuccessResponse(config, 'Configuration updated'));
  } catch (error) {
    logApiError('/api/obsidian/config', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * POST /api/obsidian/check-vault
 * Vaultの存在確認
 */
router.post('/check-vault', (req, res) => {
  try {
    const { vaultPath } = req.body;

    if (!vaultPath) {
      return res.status(400).json(formatErrorResponse('vaultPath is required'));
    }

    const result = obsidianService.checkVaultExists(vaultPath);
    res.json(formatSuccessResponse(result));
  } catch (error) {
    logApiError('/api/obsidian/check-vault', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * POST /api/obsidian/daily-note
 * Daily Noteを生成
 */
router.post('/daily-note', async (req, res) => {
  try {
    const {
      date = null,
      includeUnprocessed = true,
      includeProcessed = false,
      sourceTypes = null,
      markAsProcessed = false
    } = req.body;

    const result = await obsidianService.generateDailyNoteFile(date, {
      includeUnprocessed,
      includeProcessed,
      sourceTypes,
      markAsProcessed
    });

    res.json(formatSuccessResponse(result, 'Daily note created'));
  } catch (error) {
    logApiError('/api/obsidian/daily-note', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * POST /api/obsidian/article-note/:id
 * 個別記事のNoteを生成
 */
router.post('/article-note/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { templateType = 'default' } = req.body;

    const result = await obsidianService.generateArticleNote(parseInt(id), templateType);
    res.json(formatSuccessResponse(result, 'Article note created'));
  } catch (error) {
    logApiError(`/api/obsidian/article-note/${req.params.id}`, error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * GET /api/obsidian/daily-notes
 * Daily Notesの一覧を取得
 */
router.get('/daily-notes', (req, res) => {
  try {
    const { limit = 30 } = req.query;
    const notes = obsidianService.listDailyNotes(parseInt(limit));
    res.json(formatSuccessResponse(notes));
  } catch (error) {
    logApiError('/api/obsidian/daily-notes', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

export default router;
