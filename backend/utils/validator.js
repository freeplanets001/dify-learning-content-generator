/**
 * Validation Utilities - 入力バリデーション
 */

/**
 * URLの妥当性をチェック
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 必須フィールドのチェック
 */
export function validateRequiredFields(data, requiredFields) {
  const errors = [];

  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors.push(`Field '${field}' is required`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 記事データのバリデーション
 */
export function validateArticleData(articleData) {
  const errors = [];

  // 必須フィールド
  if (!articleData.source_type || articleData.source_type.trim() === '') {
    errors.push('source_type is required');
  }

  if (!articleData.source_name || articleData.source_name.trim() === '') {
    errors.push('source_name is required');
  }

  if (!articleData.title || articleData.title.trim() === '') {
    errors.push('title is required');
  }

  if (!articleData.url || articleData.url.trim() === '') {
    errors.push('url is required');
  } else if (!isValidUrl(articleData.url)) {
    errors.push('url must be a valid URL');
  }

  // ステータスの妥当性チェック
  const validStatuses = ['unprocessed', 'processing', 'processed', 'error', 'archived'];
  if (articleData.status && !validStatuses.includes(articleData.status)) {
    errors.push(`status must be one of: ${validStatuses.join(', ')}`);
  }

  // 優先度の妥当性チェック
  if (articleData.priority !== undefined) {
    const priority = parseInt(articleData.priority);
    if (isNaN(priority) || priority < 0 || priority > 10) {
      errors.push('priority must be a number between 0 and 10');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * コンテンツデータのバリデーション
 */
export function validateContentData(contentData) {
  const errors = [];

  // 必須フィールド
  if (!contentData.template_type || contentData.template_type.trim() === '') {
    errors.push('template_type is required');
  }

  if (!contentData.title || contentData.title.trim() === '') {
    errors.push('title is required');
  }

  if (!contentData.content || contentData.content.trim() === '') {
    errors.push('content is required');
  }

  // ステータスの妥当性チェック
  const validStatuses = ['draft', 'pending_approval', 'approved', 'rejected', 'published'];
  if (contentData.status && !validStatuses.includes(contentData.status)) {
    errors.push(`status must be one of: ${validStatuses.join(', ')}`);
  }

  // テンプレートタイプの妥当性チェック
  const validTemplateTypes = ['tutorial', 'note-article', 'threads-post', 'slide-outline'];
  if (contentData.template_type && !validTemplateTypes.includes(contentData.template_type)) {
    errors.push(`template_type must be one of: ${validTemplateTypes.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * データソースのバリデーション
 */
export function validateDataSource(sourceData) {
  const errors = [];

  // 必須フィールド
  if (!sourceData.name || sourceData.name.trim() === '') {
    errors.push('name is required');
  }

  if (!sourceData.type || sourceData.type.trim() === '') {
    errors.push('type is required');
  }

  // タイプの妥当性チェック
  const validTypes = ['rss', 'youtube', 'twitter', 'api', 'scraping'];
  if (sourceData.type && !validTypes.includes(sourceData.type)) {
    errors.push(`type must be one of: ${validTypes.join(', ')}`);
  }

  // URLの妥当性チェック（ある場合）
  if (sourceData.url && sourceData.url.trim() !== '' && !isValidUrl(sourceData.url)) {
    errors.push('url must be a valid URL');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * ページネーションパラメータのバリデーション
 */
export function validatePagination(limit, offset) {
  const errors = [];

  const parsedLimit = parseInt(limit);
  const parsedOffset = parseInt(offset);

  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    errors.push('limit must be a number between 1 and 100');
  }

  if (isNaN(parsedOffset) || parsedOffset < 0) {
    errors.push('offset must be a non-negative number');
  }

  return {
    isValid: errors.length === 0,
    errors,
    limit: parsedLimit,
    offset: parsedOffset
  };
}

/**
 * Obsidian Vault設定のバリデーション
 */
export function validateObsidianConfig(config) {
  const errors = [];

  if (!config.vaultPath || config.vaultPath.trim() === '') {
    errors.push('vaultPath is required');
  }

  if (!config.dailyNotePath || config.dailyNotePath.trim() === '') {
    errors.push('dailyNotePath is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 汎用サニタイズ関数
 */
export function sanitizeString(str, maxLength = 1000) {
  if (typeof str !== 'string') return '';

  return str
    .trim()
    .substring(0, maxLength)
    .replace(/[\x00-\x1F\x7F]/g, ''); // 制御文字を削除
}

/**
 * エラーレスポンスのフォーマット
 */
export function formatErrorResponse(errors) {
  return {
    success: false,
    errors: Array.isArray(errors) ? errors : [errors]
  };
}

/**
 * 成功レスポンスのフォーマット
 */
export function formatSuccessResponse(data, message = null) {
  const response = {
    success: true,
    data
  };

  if (message) {
    response.message = message;
  }

  return response;
}

export default {
  isValidUrl,
  validateRequiredFields,
  validateArticleData,
  validateContentData,
  validateDataSource,
  validatePagination,
  validateObsidianConfig,
  sanitizeString,
  formatErrorResponse,
  formatSuccessResponse
};
