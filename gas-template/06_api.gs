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
        
      case 'deleteArticlesBatch':
        // deleteArticlesBatch は 02_rss.gs に定義
        result = deleteArticlesBatch(params.ids, params.deleteAll);
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

      case 'deleteContent':
        // deleteGeneratedContent は 03_dify.gs に定義
        result = deleteGeneratedContent(params.id);
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
        if (params.obsidianVaultPath) saveSetting(SETTINGS_KEYS.OBSIDIAN_VAULT_PATH, params.obsidianVaultPath);
        if (params.obsidianDailyNotePath) saveSetting(SETTINGS_KEYS.OBSIDIAN_DAILY_NOTE_PATH, params.obsidianDailyNotePath);
        // 画像生成設定
        if (params.imageGenApiKey) saveSetting(SETTINGS_KEYS.IMAGE_GEN_API_KEY, params.imageGenApiKey);
        if (params.imageGenBaseUrl) saveSetting(SETTINGS_KEYS.IMAGE_GEN_BASE_URL, params.imageGenBaseUrl);
        if (params.imageGenWorkflowId) saveSetting(SETTINGS_KEYS.IMAGE_GEN_WORKFLOW_ID, params.imageGenWorkflowId);
        
        result = { success: true };
        break;

      case 'getConnectionStatus':
        // getConnectionStatus は 01_config.gs に定義
        result = getConnectionStatus();
        break;

      case 'getDashboardStats':
        result = getDashboardStats();
        break;
        
      case 'getRssSources':
        // getRssSources は 02_rss.gs に定義
        result = getRssSources();
        break;
        
      case 'saveRssSource':
        // saveRssSource は 02_rss.gs に定義 (引数はオブジェクト)
        result = saveRssSource({
          id: params.id,  // ID を渡す (更新時に必要)
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
        
      case 'generateDailyNote':
        result = generateDailyNote();
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

/**
 * ダッシュボード用統計情報を取得
 */
function getDashboardStats() {
  const stats = {
    articles: { total: 0, unprocessed: 0, today: 0 },
    contents: { total: 0, approved: 0, today: 0 },
    statusDistribution: {}
  };

  const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  // Articles
  try {
    const sheet = getOrCreateSheet(SHEET_NAMES.ARTICLES);
    const data = sheet.getDataRange().getValues();
    // Header除く
    if (data.length > 1) {
      const rows = data.slice(1);
      stats.articles.total = rows.length;

      // Index: 4=CollectedAt, 6=Status (要確認: 02_rss.gs参照)
      // id, title, url, summary, collectedAt, source, status
      // 0,  1,     2,   3,       4,           5,      6
      
      rows.forEach(row => {
        const collectedAt = row[4];
        const status = row[6] || 'unprocessed';
        
        if (status === 'unprocessed') stats.articles.unprocessed++;
        
        // Status Distribution
        stats.statusDistribution[status] = (stats.statusDistribution[status] || 0) + 1;

        if (collectedAt) {
           const d = collectedAt instanceof Date ? collectedAt : new Date(collectedAt);
           if (!isNaN(d.getTime())) {
             const dateStr = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
             if (dateStr === todayStr) stats.articles.today++;
           }
        }
      });
    }
  } catch (e) {
    console.warn('Stats: Articles sheet error', e);
  }

  // Contents
  try {
    const sheet = getOrCreateSheet(SHEET_NAMES.CONTENTS);
    const data = sheet.getDataRange().getValues();
    if (data.length > 1) {
      const rows = data.slice(1);
      stats.contents.total = rows.length;

      // Index: 3=CreatedAt, 6=Status (要確認: 03_dify.gs参照)
      // id, articleId, content, createdAt, templateType, metadata, status
      // 0,  1,         2,       3,         4,            5,        6
      
      rows.forEach(row => {
        const createdAt = row[3];
        const status = row[6] || 'generated';
        
        if (status === 'approved') stats.contents.approved++;

        if (createdAt) {
           const d = createdAt instanceof Date ? createdAt : new Date(createdAt);
           if (!isNaN(d.getTime())) {
             const dateStr = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
             if (dateStr === todayStr) stats.contents.today++;
           }
        }
      });
    }
  } catch (e) {
    console.warn('Stats: Contents sheet error', e);
  }

  return stats;
}
