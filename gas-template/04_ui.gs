/**
 * 04_ui.gs - UIメニュー & サイドバー
 * カスタムメニューとサイドバーUI
 */

// === メニュー ===

/**
 * スプレッドシートを開いた時に実行
 */
function onOpen() {
  createCustomMenu();
}

/**
 * カスタムメニューを作成
 */
function createCustomMenu() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('📚 コンテンツ生成ツール')
    .addItem('🔄 今すぐRSS収集', 'showCollectRssDialog')
    .addItem('🔗 URLから収集', 'showCollectUrlDialog')
    .addSeparator()
    .addItem('✨ コンテンツ生成', 'showGenerateContentSidebar')
    .addItem('📋 生成済み一覧', 'showContentsList')
    .addSeparator()
    .addItem('⚙️ 設定', 'showSettingsDialog')
    .addItem('⏰ 定期収集を設定', 'showTriggerSettings')
    .addSeparator()
    .addItem('📖 使い方', 'showReadme')
    .addItem('🔧 初期設定', 'initializeSpreadsheet')
    .addToUi();
}

// === ダイアログ ===

/**
 * RSS収集ダイアログを表示
 */
function showCollectRssDialog() {
  const ui = SpreadsheetApp.getUi();
  
  const sources = getRssSources();
  const enabledCount = sources.filter(s => s.enabled).length;
  
  if (enabledCount === 0) {
    ui.alert(
      '⚠️ RSSソースがありません',
      '「📡RSSソース」シートにRSSフィードを追加してから実行してください。\n\n例:\n名前: Tech Blog\nURL: https://example.com/feed.xml\n有効: ✓',
      ui.ButtonSet.OK
    );
    return;
  }
  
  const response = ui.alert(
    '🔄 RSS収集',
    `${enabledCount}件のRSSソースから記事を収集しますか？`,
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response !== ui.Button.OK) return;
  
  try {
    ui.alert('⏳ 収集中...', '収集が完了するまでお待ちください。', ui.ButtonSet.OK);
    
    const result = collectAllRss();
    
    ui.alert(
      '✅ 収集完了',
      `${result.sources}件のソースから${result.total}件の記事を収集しました。`,
      ui.ButtonSet.OK
    );
  } catch (error) {
    ui.alert('❌ エラー', `収集中にエラーが発生しました:\n${error.message}`, ui.ButtonSet.OK);
  }
}

/**
 * URL収集ダイアログを表示
 */
function showCollectUrlDialog() {
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h3 { margin-top: 0; }
      input, textarea { width: 100%; padding: 8px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
      textarea { height: 100px; }
      button { background: #4285f4; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px; }
      button:hover { background: #3367d6; }
      button.secondary { background: #f1f3f4; color: #5f6368; }
      button.secondary:hover { background: #e8eaed; }
      .note { font-size: 12px; color: #666; }
    </style>
    <h3>🔗 URLから記事を収集</h3>
    <p>収集したいWebページのURLを入力してください。</p>
    <p class="note">複数URLを入力する場合は改行で区切ってください。</p>
    <textarea id="urls" placeholder="https://example.com/article1&#10;https://example.com/article2"></textarea>
    <input type="text" id="sourceName" placeholder="ソース名 (オプション)" value="URL Import">
    <br><br>
    <button onclick="collect()">収集する</button>
    <button class="secondary" onclick="google.script.host.close()">キャンセル</button>
    <div id="result" style="margin-top: 16px;"></div>
    <script>
      function collect() {
        const urls = document.getElementById('urls').value.split('\\n').filter(u => u.trim());
        const sourceName = document.getElementById('sourceName').value || 'URL Import';
        
        if (urls.length === 0) {
          alert('URLを入力してください');
          return;
        }
        
        document.getElementById('result').innerHTML = '⏳ 収集中...';
        
        google.script.run
          .withSuccessHandler(function(result) {
            document.getElementById('result').innerHTML = '✅ ' + result.message;
          })
          .withFailureHandler(function(error) {
            document.getElementById('result').innerHTML = '❌ エラー: ' + error.message;
          })
          .collectFromUrls(urls, sourceName);
      }
    </script>
  `)
  .setWidth(400)
  .setHeight(350);
  
  SpreadsheetApp.getUi().showModalDialog(html, '🔗 URLから収集');
}

/**
 * 複数URLから収集
 */
function collectFromUrls(urls, sourceName) {
  let collected = 0;
  let errors = [];
  
  for (const url of urls) {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) continue;
    
    const result = collectFromUrl(trimmedUrl, sourceName);
    if (result.success) {
      collected++;
    } else {
      errors.push(`${trimmedUrl}: ${result.message}`);
    }
  }
  
  return {
    success: true,
    message: `${collected}件の記事を収集しました。` + (errors.length > 0 ? `\n\n失敗: ${errors.length}件` : ''),
    collected: collected,
    errors: errors
  };
}

/**
 * 設定ダイアログを表示
 */
function showSettingsDialog() {
  const settings = getSettings();
  const config = getDifyConfig();
  
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h3 { margin-top: 0; color: #4285f4; }
      label { font-weight: bold; display: block; margin-top: 16px; }
      input { width: 100%; padding: 10px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
      button { background: #4285f4; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px; margin-top: 16px; }
      button:hover { background: #3367d6; }
      button.secondary { background: #f1f3f4; color: #5f6368; }
      .help { font-size: 12px; color: #666; margin-top: 4px; }
      .status { padding: 8px; border-radius: 4px; margin-top: 16px; }
      .status.ok { background: #e6f4ea; color: #137333; }
      .status.warning { background: #fef7e0; color: #ea8600; }
    </style>
    <h3>⚙️ Dify API 設定</h3>
    
    <label>Dify API Key</label>
    <input type="password" id="apiKey" value="${config.apiKey}" placeholder="app-xxxxxxxx">
    <div class="help">Difyアプリの「公開」→「APIアクセス」から取得</div>
    
    <label>Dify Base URL</label>
    <input type="text" id="baseUrl" value="${config.baseUrl}" placeholder="https://api.dify.ai/v1">
    
    <label>Workflow ID</label>
    <input type="text" id="workflowId" value="${config.workflowId}" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
    <div class="help">URLの /workflow/xxxxx-... の部分</div>
    
    <div id="status" class="status ${config.apiKey && config.workflowId ? 'ok' : 'warning'}">
      ${config.apiKey && config.workflowId ? '✅ 設定済み' : '⚠️ APIキーとWorkflow IDを入力してください'}
    </div>
    
    <button onclick="save()">💾 保存</button>
    <button class="secondary" onclick="google.script.host.close()">キャンセル</button>
    
    <script>
      function save() {
        const apiKey = document.getElementById('apiKey').value;
        const baseUrl = document.getElementById('baseUrl').value;
        const workflowId = document.getElementById('workflowId').value;
        
        google.script.run
          .withSuccessHandler(function() {
            alert('✅ 設定を保存しました');
            google.script.host.close();
          })
          .withFailureHandler(function(error) {
            alert('❌ エラー: ' + error.message);
          })
          .saveAllSettings(apiKey, baseUrl, workflowId);
      }
    </script>
  `)
  .setWidth(450)
  .setHeight(450);
  
  SpreadsheetApp.getUi().showModalDialog(html, '⚙️ 設定');
}

/**
 * 全設定を保存
 */
function saveAllSettings(apiKey, baseUrl, workflowId) {
  saveSetting(SETTINGS_KEYS.DIFY_API_KEY, apiKey);
  saveSetting(SETTINGS_KEYS.DIFY_BASE_URL, baseUrl || 'https://api.dify.ai/v1');
  saveSetting(SETTINGS_KEYS.DIFY_WORKFLOW_ID, workflowId);
}

/**
 * コンテンツ生成サイドバーを表示
 */
function showGenerateContentSidebar() {
  const articles = getArticles(20);
  
  let articlesHtml = articles.map(a => `
    <div class="article">
      <input type="checkbox" id="article-${a.id}" value="${a.id}">
      <label for="article-${a.id}">
        <strong>${escapeHtml(a.title.substring(0, 50))}${a.title.length > 50 ? '...' : ''}</strong>
        <br><small>${a.source} - ${formatDate(a.collectedAt)}</small>
      </label>
    </div>
  `).join('');
  
  if (articles.length === 0) {
    articlesHtml = '<p>記事がありません。先にRSS収集を実行してください。</p>';
  }
  
  const templatesHtml = TEMPLATES.map(t => `
    <option value="${t.id}">${t.name}</option>
  `).join('');
  
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 16px; }
      h3 { color: #4285f4; margin-top: 0; }
      .article { padding: 8px; border-bottom: 1px solid #eee; display: flex; align-items: flex-start; gap: 8px; }
      .article label { flex: 1; cursor: pointer; }
      .article small { color: #666; }
      select, button { width: 100%; padding: 12px; margin: 8px 0; border-radius: 4px; box-sizing: border-box; }
      select { border: 1px solid #ddd; }
      button { background: #4285f4; color: white; border: none; cursor: pointer; font-size: 16px; }
      button:hover { background: #3367d6; }
      button:disabled { background: #ccc; }
      .section { margin-bottom: 16px; }
      #result { margin-top: 16px; padding: 12px; border-radius: 4px; }
      .success { background: #e6f4ea; color: #137333; }
      .error { background: #fce8e6; color: #c5221f; }
    </style>
    
    <h3>✨ コンテンツ生成</h3>
    
    <div class="section">
      <strong>記事を選択:</strong>
      <div style="max-height: 300px; overflow-y: auto; border: 1px solid #eee; border-radius: 4px;">
        ${articlesHtml}
      </div>
    </div>
    
    <div class="section">
      <strong>テンプレート:</strong>
      <select id="template">
        ${templatesHtml}
      </select>
    </div>
    
    <button onclick="generate()" id="generateBtn">🚀 生成する</button>
    
    <div id="result"></div>
    
    <script>
      function generate() {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
        const articleIds = Array.from(checkboxes).map(cb => cb.value);
        const template = document.getElementById('template').value;
        
        if (articleIds.length === 0) {
          alert('記事を選択してください');
          return;
        }
        
        document.getElementById('generateBtn').disabled = true;
        document.getElementById('generateBtn').textContent = '⏳ 生成中...';
        document.getElementById('result').innerHTML = '';
        
        google.script.run
          .withSuccessHandler(function(result) {
            document.getElementById('generateBtn').disabled = false;
            document.getElementById('generateBtn').textContent = '🚀 生成する';
            document.getElementById('result').className = 'success';
            document.getElementById('result').innerHTML = '✅ 生成完了！<br><strong>' + result.title + '</strong>';
          })
          .withFailureHandler(function(error) {
            document.getElementById('generateBtn').disabled = false;
            document.getElementById('generateBtn').textContent = '🚀 生成する';
            document.getElementById('result').className = 'error';
            document.getElementById('result').innerHTML = '❌ エラー: ' + error.message;
          })
          .generateFromSidebar(articleIds, template);
      }
    </script>
  `)
  .setTitle('コンテンツ生成')
  .setWidth(350);
  
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * サイドバーから生成
 */
function generateFromSidebar(articleIds, templateId) {
  const config = getDifyConfig();
  
  if (articleIds.length === 1) {
    // 単一記事
    if (config.apiKey && config.workflowId) {
      return generateContent(parseInt(articleIds[0]), templateId);
    } else {
      return generateContentLocal(parseInt(articleIds[0]), templateId);
    }
  } else {
    // 複数記事を結合
    if (config.apiKey && config.workflowId) {
      return generateCombinedContent(articleIds.map(id => parseInt(id)), templateId);
    } else {
      // ローカル結合生成
      const article = { title: `${articleIds.length}件のまとめ`, summary: '(結合生成)', source: 'Multiple', url: '' };
      return generateContentLocal(articleIds[0], templateId);
    }
  }
}

/**
 * 生成済みコンテンツ一覧を表示
 */
function showContentsList() {
  const sheet = getOrCreateSheet(SHEET_NAMES.CONTENTS);
  SpreadsheetApp.setActiveSheet(sheet);
}

/**
 * READMEを表示
 */
function showReadme() {
  const sheet = getOrCreateSheet(SHEET_NAMES.README);
  SpreadsheetApp.setActiveSheet(sheet);
}

// === ユーティリティ ===

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
