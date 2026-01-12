/**
 * 06_api.gs - Web API エントリーポイント
 * Webアプリからのリクエストを処理
 * 
 * 修正履歴:
 * - レスポンスをTEXT形式に変更 (CORS対策)
 * - 内部関数を各モジュール (01_config, 02_rss) に移動
 * - addRssSource -> saveRssSource に修正
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
    
    // JSONパース試行
    let request;
    try {
      request = JSON.parse(e.postData.contents);
    } catch (parseError) {
      console.warn('JSON Parse Error:', parseError);
      // fallback: postData自体がJSONオブジェクトの場合もある？(GAS仕様)
      // text/plain送信ならcontentsは文字列のはず
      return createErrorResponse('Invalid JSON payload');
    }
    
    const action = request.action;
    const params = request.params || {};
    
    console.log(`API Request: ${action}`, JSON.stringify(params));
    
    let result;
    
    switch (action) {
      // === 収集関連 (02_rss.gs) ===
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
        // getArticleById は 02_rss.gs に定義
        result = getArticleById(params.id);
        break;
        
      case 'deleteArticle':
        // deleteArticle は 02_rss.gs に定義
        result = deleteArticle(params.id);
        break;
        
      // === コンテンツ生成関連 (03_dify.gs) ===
      case 'generateContent':
        result = generateContent(params.articleId, params.templateId);
        break;
        
      case 'generateCombinedContent':
        result = generateCombinedContent(params.articleIds, params.templateId);
        break;
        
      case 'getContents':
        result = getContents(params.limit || 50);
        break;
        
      case 'generateImage':
        // generateImageFromDify は 03_dify.gs に定義
        result = generateImageFromDify(params.prompt);
        break;
        
      // === 設定関連 (01_config.gs, 02_rss.gs) ===
      case 'getSettings':
        // getPublicSettings は 01_config.gs に定義
        result = getPublicSettings();
        break;
        
      case 'saveSettings':
        // saveSetting は 01_config.gs に定義
        if (params.difyApiKey) saveSetting(SETTINGS_KEYS.DIFY_API_KEY, params.difyApiKey);
        if (params.difyBaseUrl) saveSetting(SETTINGS_KEYS.DIFY_BASE_URL, params.difyBaseUrl);
        if (params.difyWorkflowId) saveSetting(SETTINGS_KEYS.DIFY_WORKFLOW_ID, params.difyWorkflowId);
        result = { success: true };
        break;
        
      case 'getRssSources':
        // getRssSources は 02_rss.gs に定義
        result = getRssSources();
        break;
        
      case 'saveRssSource':
        // saveRssSource は 02_rss.gs に定義 (引数はオブジェクト)
        result = saveRssSource({
          name: params.name,
          url: params.url,
          enabled: params.enabled
        });
        break;
        
      case 'deleteRssSource':
        // deleteRssSource は 02_rss.gs に定義
        result = deleteRssSource(params.id);
        break;
        
      // === Obsidian連携 (07_obsidian.gs) ===
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
 * JSONレスポンスを作成 (TextOutputとして返す)
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * エラーレスポンスを作成
 */
function createErrorResponse(message) {
  return createJsonResponse({ success: false, error: message });
}
