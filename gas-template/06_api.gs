/**
 * 06_api.gs - Web API エントリーポイント
 * Webアプリからのリクエストを処理
 */

// === Web API エントリーポイント ===

/**
 * GETリクエスト処理 (動作確認用)
 */
function doGet(e) {
  return createJsonResponse({ status: 'ok', message: 'GAS API Server is running' });
}

/**
 * POSTリクエスト処理 (メイン処理)
 */
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return createErrorResponse('No post data received');
    }
    
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const params = request.params || {};
    
    console.log(`API Request: ${action}`, JSON.stringify(params));
    
    let result;
    
    switch (action) {
      // === 収集関連 ===
      case 'collectRss':
        result = collectAllRss();
        break;
        
      case 'collectUrl':
        result = collectFromUrl(params.url, params.sourceName);
        break;
        
      case 'getArticles':
        result = getArticles(params.limit || 50);
        break;
        
      case 'getArticle':
        result = getArticleById(params.id);
        break;
        
      case 'deleteArticle':
        result = deleteArticle(params.id);
        break;
        
      // === コンテンツ生成関連 ===
      case 'generateContent':
        result = generateContent(params.articleId, params.templateId);
        break;
        
      case 'generateCombinedContent':
        result = generateCombinedContent(params.articleIds, params.templateId);
        break;
        
      case 'getContents':
        result = getContents(params.limit || 50);
        break;
        
      // === 設定関連 ===
      case 'getSettings':
        result = getPublicSettings();
        break;
        
      case 'saveSettings':
        if (params.difyApiKey) saveSetting(SETTINGS_KEYS.DIFY_API_KEY, params.difyApiKey);
        if (params.difyBaseUrl) saveSetting(SETTINGS_KEYS.DIFY_BASE_URL, params.difyBaseUrl);
        if (params.difyWorkflowId) saveSetting(SETTINGS_KEYS.DIFY_WORKFLOW_ID, params.difyWorkflowId);
        result = { success: true };
        break;
        
      case 'getRssSources':
        result = getRssSources();
        break;
        
      case 'saveRssSource':
        result = addRssSource(params.name, params.url, params.enabled);
        break;
        
      case 'deleteRssSource':
        result = deleteRssSource(params.id);
        break;
        
      // === Obsidian連携 ===
      case 'saveToObsidian':
        result = saveToObsidian(params.filename, params.content, params.path);
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    return createJsonResponse({ success: true, data: result });
    
  } catch (error) {
    console.error('API Error:', error);
    return createErrorResponse(error.message);
  }
}

// === ヘルパー関数 ===

/**
 * JSONレスポンスを作成
 */
function createJsonResponse(data) {
  // MimeType.JSONだとブラウザによっては厳格なCORSチェックやパースエラーになることがあるため、
  // TEXTとして返してフロントエンドでパースする方が安定する
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * エラーレスポンスを作成
 */
function createErrorResponse(message) {
  return createJsonResponse({ success: false, error: message });
}

/**
 * 公開設定のみ取得 (APIキーなどは隠す)
 */
function getPublicSettings() {
  const settings = getSettings();
  return {
    difyBaseUrl: settings[SETTINGS_KEYS.DIFY_BASE_URL],
    difyWorkflowId: settings[SETTINGS_KEYS.DIFY_WORKFLOW_ID],
    // APIキーはセキュリティのため返さない、またはマスキングする
    isDifyConfigured: !!settings[SETTINGS_KEYS.DIFY_API_KEY]
  };
}

/**
 * 記事削除
 */
function deleteArticle(id) {
  const sheet = getOrCreateSheet(SHEET_NAMES.ARTICLES);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: 'Article not found' };
}

/**
 * RSSソース削除
 */
function deleteRssSource(id) {
  const sheet = getOrCreateSheet(SHEET_NAMES.RSS_SOURCES);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: 'Source not found' };
}
