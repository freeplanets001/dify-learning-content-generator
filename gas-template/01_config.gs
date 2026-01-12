/**
 * 01_config.gs - 設定管理
 * スプレッドシートから設定を読み込み・保存
 */

// === 定数 ===
const SHEET_NAMES = {
  SETTINGS: '⚙️設定',
  RSS_SOURCES: '📡RSSソース',
  ARTICLES: '📰収集記事',
  CONTENTS: '✍️生成コンテンツ',
  README: '📖使い方'
};

const SETTINGS_KEYS = {
  DIFY_API_KEY: 'Dify API Key',
  DIFY_BASE_URL: 'Dify Base URL',
  DIFY_WORKFLOW_ID: 'Dify Workflow ID',
  AUTO_COLLECT_INTERVAL: '自動収集間隔（時間）'
};

// === ユーティリティ ===

/**
 * スプレッドシートを取得
 */
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * シートを取得（なければ作成）
 */
function getOrCreateSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

// === 設定管理 ===

/**
 * 設定を取得
 */
function getSettings() {
  const sheet = getOrCreateSheet(SHEET_NAMES.SETTINGS);
  const data = sheet.getDataRange().getValues();
  const settings = {};
  
  for (let i = 0; i < data.length; i++) {
    const key = data[i][0];
    const value = data[i][1];
    if (key) {
      settings[key] = value;
    }
  }
  
  return settings;
}

/**
 * 設定を保存
 */
function saveSetting(key, value) {
  const sheet = getOrCreateSheet(SHEET_NAMES.SETTINGS);
  const data = sheet.getDataRange().getValues();
  
  let found = false;
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      found = true;
      break;
    }
  }
  
  if (!found) {
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, 1, 2).setValues([[key, value]]);
  }
}

/**
 * Dify API設定を取得
 */
function getDifyConfig() {
  const settings = getSettings();
  return {
    apiKey: settings[SETTINGS_KEYS.DIFY_API_KEY] || '',
    baseUrl: settings[SETTINGS_KEYS.DIFY_BASE_URL] || 'https://api.dify.ai/v1',
    workflowId: settings[SETTINGS_KEYS.DIFY_WORKFLOW_ID] || ''
  };
}

/**
 * 設定が有効かチェック
 */
function isConfigured() {
  const config = getDifyConfig();
  return !!(config.apiKey && config.workflowId);
}

// === 初期設定・権限 ===

/**
 * 全機能の権限をリクエスト
 * (UrlFetchApp, DriveAppなどをダミーで呼び出し、ユーザーに承認させる)
 */
function authorizeScopes() {
  // 外部通信
  const response = UrlFetchApp.fetch('https://www.google.com');
  // Google Drive
  const files = DriveApp.getFiles();
  // Spreadsheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  SpreadsheetApp.getUi().alert('✅ 全ての権限が承認されました。Webアプリからこれらの機能を利用できます。');
}

/**
 * スプレッドシートを初期化
 */
function initializeSpreadsheet() {
  const ss = getSpreadsheet();
  
  // 設定シート
  initSettingsSheet();
  
  // RSSソースシート
  initRssSourcesSheet();
  
  // 収集記事シート
  initArticlesSheet();
  
  // 生成コンテンツシート
  initContentsSheet();
  
  // READMEシート
  initReadmeSheet();
  
  // メニューを追加
  createCustomMenu();
  
  SpreadsheetApp.getUi().alert('✅ 初期設定が完了しました！\n\n【重要】\nメニュー「📚コンテンツ生成ツール」→「🔧機能の権限承認」を実行して、外部通信とGoogle Driveへのアクセスを許可してください。\n\nその後、Dify APIキーを設定してください。');
}

/**
 * スプレッドシートOpen時の処理
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
    .addItem('🔧 機能の権限承認', 'authorizeScopes') // Add this line
    .addSeparator()
    .addItem('📖 使い方', 'showReadme')
    .addItem('🔧 初期設定', 'initializeSpreadsheet')
    .addToUi();
}

/**
 * 設定シートを初期化
 */
function initSettingsSheet() {
  const sheet = getOrCreateSheet(SHEET_NAMES.SETTINGS);
  sheet.clear();
  
  const settingsData = [
    ['設定項目', '値'],
    [SETTINGS_KEYS.DIFY_API_KEY, ''],
    [SETTINGS_KEYS.DIFY_BASE_URL, 'https://api.dify.ai/v1'],
    [SETTINGS_KEYS.DIFY_WORKFLOW_ID, ''],
    [SETTINGS_KEYS.AUTO_COLLECT_INTERVAL, 6]
  ];
  
  sheet.getRange(1, 1, settingsData.length, 2).setValues(settingsData);
  
  // スタイリング
  sheet.getRange(1, 1, 1, 2).setBackground('#4285f4').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 400);
}

/**
 * RSSソースシートを初期化
 */
function initRssSourcesSheet() {
  const sheet = getOrCreateSheet(SHEET_NAMES.RSS_SOURCES);
  sheet.clear();
  
  const headers = [['ID', '名前', 'URL', '有効', '最終収集日']];
  sheet.getRange(1, 1, 1, 5).setValues(headers);
  sheet.getRange(1, 1, 1, 5).setBackground('#34a853').setFontColor('#ffffff').setFontWeight('bold');
  
  sheet.setColumnWidth(1, 50);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 400);
  sheet.setColumnWidth(4, 60);
  sheet.setColumnWidth(5, 150);
}

/**
 * 収集記事シートを初期化
 */
function initArticlesSheet() {
  const sheet = getOrCreateSheet(SHEET_NAMES.ARTICLES);
  sheet.clear();
  
  const headers = [['ID', 'タイトル', 'URL', 'ソース', '収集日', '要約', 'ステータス']];
  sheet.getRange(1, 1, 1, 7).setValues(headers);
  sheet.getRange(1, 1, 1, 7).setBackground('#fbbc04').setFontColor('#000000').setFontWeight('bold');
  
  sheet.setColumnWidth(1, 50);
  sheet.setColumnWidth(2, 300);
  sheet.setColumnWidth(3, 300);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 400);
  sheet.setColumnWidth(7, 80);
}

/**
 * 生成コンテンツシートを初期化
 */
function initContentsSheet() {
  const sheet = getOrCreateSheet(SHEET_NAMES.CONTENTS);
  sheet.clear();
  
  const headers = [['ID', '記事ID', 'テンプレート', 'タイトル', 'コンテンツ', '生成日', 'ステータス']];
  sheet.getRange(1, 1, 1, 7).setValues(headers);
  sheet.getRange(1, 1, 1, 7).setBackground('#ea4335').setFontColor('#ffffff').setFontWeight('bold');
  
  sheet.setColumnWidth(1, 50);
  sheet.setColumnWidth(2, 60);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 300);
  sheet.setColumnWidth(5, 500);
  sheet.setColumnWidth(6, 150);
  sheet.setColumnWidth(7, 80);
}

/**
 * READMEシートを初期化
 */
function initReadmeSheet() {
  const sheet = getOrCreateSheet(SHEET_NAMES.README);
  sheet.clear();
  
  const content = [
    ['📚 Dify学習コンテンツ生成ツール - 使い方'],
    [''],
    ['▶️ セットアップ'],
    ['1. メニュー「📚コンテンツ生成ツール」→「⚙️設定」を開く'],
    ['2. Dify API Key を入力'],
    ['3. Dify Workflow ID を入力'],
    ['4. 「保存」をクリック'],
    [''],
    ['▶️ 重要: 権限承認'],
    ['メニュー「📚コンテンツ生成ツール」→「🔧機能の権限承認」を必ず実行してください。'],
    ['これを行わないと、Webアプリからの収集や保存が機能しません。'],
    [''],
    ['▶️ RSS収集'],
    ['1. 「📡RSSソース」シートにRSSフィードを追加'],
    ['2. メニュー「📚コンテンツ生成ツール」→「🔄今すぐRSS収集」'],
    [''],
    ['▶️ コンテンツ生成'],
    ['1. 「📰収集記事」シートで生成したい記事を確認'],
    ['2. メニュー「📚コンテンツ生成ツール」→「✨コンテンツ生成」'],
    ['3. テンプレートを選択して生成'],
    [''],
    ['▶️ 定期収集'],
    ['1. メニュー「📚コンテンツ生成ツール」→「⏰定期収集を設定」'],
    ['2. 指定時間ごとに自動でRSSを収集します'],
    [''],
    ['📖 Dify APIキーの取得方法'],
    ['1. https://dify.ai にログイン'],
    ['2. ワークフローアプリを作成'],
    ['3. 「公開」→「APIアクセス」からAPIキーをコピー'],
    ['4. Workflow IDはURLから取得 (例: /workflow/xxxxxx-xxxx...)']
  ];
  
  sheet.getRange(1, 1, content.length, 1).setValues(content);
  sheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
  sheet.setColumnWidth(1, 600);
}
