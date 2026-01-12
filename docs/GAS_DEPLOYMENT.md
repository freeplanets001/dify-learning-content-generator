# Google Apps Script デプロイガイド

Google Apps Scriptを使った情報収集エンジンのデプロイ手順

## 概要

Google Apps Script (GAS)を使用して、以下のデータソースから情報を収集します:

- Dify公式ブログ (RSS)
- YouTube動画情報
- Qiita記事
- Zenn記事
- Twitter/X投稿

収集したデータはGoogle Sheetsに保存され、バックエンドAPIから読み取られます。

## 前提条件

- Googleアカウント
- Google Apps Scriptへのアクセス権限
- Google Sheetsの基本知識

## セットアップ手順

### 1. Google Sheetsの準備

#### 1.1 スプレッドシートの作成

1. [Google Sheets](https://sheets.google.com/)にアクセス
2. 新しいスプレッドシートを作成
3. 名前を「Dify Learning - Collection Data」などに変更

#### 1.2 シート構造の作成

以下のシートを作成:

**Sheet 1: Articles（収集記事）**

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| ID | Source Type | Source Name | Title | URL | Description | Author | Published Date | Collected Date |

**Sheet 2: Config（設定）**

| A | B |
|---|---|
| Key | Value |
| last_collection | 2024-01-01 12:00:00 |
| api_endpoint | https://your-backend.com/api/collector/webhook |

### 2. Apps Scriptプロジェクトの作成

#### 2.1 スクリプトエディタを開く

1. Google Sheetsで「拡張機能」→「Apps Script」をクリック
2. 新しいプロジェクトが作成されます

#### 2.2 プロジェクト名の設定

「無題のプロジェクト」→「Dify Learning Collector」に変更

### 3. スクリプトのデプロイ

#### 3.1 Code.gs の作成

```javascript
// メイン処理
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Dify Learning Collector API'
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action || 'collect_all';

    let result;
    switch(action) {
      case 'collect_all':
        result = collectAllSources();
        break;
      case 'collect_dify_blog':
        result = collectDifyBlog();
        break;
      case 'collect_youtube':
        result = collectYouTube();
        break;
      case 'collect_qiita':
        result = collectQiita();
        break;
      // [NEW] バックエンドからの記事保存用
      case 'save_articles':
        result = saveArticlesToSheet(params.articles);
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 記事データをシートに保存
function saveArticlesToSheet(articles) {
  if (!articles || !Array.isArray(articles)) {
    return { success: false, error: 'Invalid articles data' };
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Articles');
  let savedCount = 0;

  articles.forEach(article => {
    // 重複チェック (Frontend/Backendですでにされているが念のため)
    if (!isDuplicate(article.url)) {
      const row = [
        '', // ID
        article.source_type || 'manual',
        article.source_name || 'Unknown',
        article.title,
        article.url,
        article.description || '',
        article.author || '',
        article.published_date || '',
        article.collected_date || new Date().toISOString()
      ];

      sheet.appendRow(row);
      savedCount++;
    }
  });

  return {
    success: true,
    message: `Saved ${savedCount} articles`,
    saved_count: savedCount
  };
}

// 全ソース収集
function collectAllSources() {
  const results = {
    dify_blog: collectDifyBlog(),
    youtube: collectYouTube(),
    qiita: collectQiita(),
    zenn: collectZenn()
  };

  return {
    success: true,
    results: results,
    timestamp: new Date().toISOString()
  };
}

// 手動実行用（テスト用）
function testCollection() {
  const result = collectAllSources();
  Logger.log(result);
}
```

#### 3.2 collectors/difyBlog.gs の作成

新しいファイルを作成:「ファイル」→「新規」→「スクリプト」

\`\`\`javascript
// Difyブログの収集
function collectDifyBlog() {
  const RSS_URL = 'https://dify.ai/blog/rss.xml';

  try {
    const response = UrlFetchApp.fetch(RSS_URL);
    const xml = XmlService.parse(response.getContentText());
    const root = xml.getRootElement();
    const channel = root.getChild('channel');
    const items = channel.getChildren('item');

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Articles');
    const collected = [];

    items.forEach(item => {
      const title = item.getChildText('title');
      const link = item.getChildText('link');
      const description = item.getChildText('description') || '';
      const pubDate = item.getChildText('pubDate');

      // 重複チェック
      if (!isDuplicate(link)) {
        const row = [
          '', // ID（自動採番）
          'rss',
          'Dify Blog',
          title,
          link,
          description,
          'Dify Team',
          pubDate,
          new Date().toISOString()
        ];

        sheet.appendRow(row);
        collected.push({ title, link });
      }
    });

    return {
      success: true,
      source: 'Dify Blog',
      count: collected.length,
      items: collected
    };

  } catch(error) {
    return {
      success: false,
      source: 'Dify Blog',
      error: error.toString()
    };
  }
}
\`\`\`

#### 3.3 collectors/qiita.gs の作成

\`\`\`javascript
// Qiitaの収集
function collectQiita() {
  const RSS_URL = 'https://qiita.com/tags/dify/feed';

  try {
    const response = UrlFetchApp.fetch(RSS_URL);
    const xml = XmlService.parse(response.getContentText());
    const root = xml.getRootElement();
    const namespace = XmlService.getNamespace('http://www.w3.org/2005/Atom');
    const entries = root.getChildren('entry', namespace);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Articles');
    const collected = [];

    entries.forEach(entry => {
      const title = entry.getChild('title', namespace).getText();
      const link = entry.getChild('link', namespace).getAttribute('href').getValue();
      const summary = entry.getChild('summary', namespace)?.getText() || '';
      const author = entry.getChild('author', namespace)?.getChild('name', namespace)?.getText() || '';
      const published = entry.getChild('published', namespace).getText();

      if (!isDuplicate(link)) {
        const row = [
          '',
          'rss',
          'Qiita Dify',
          title,
          link,
          summary,
          author,
          published,
          new Date().toISOString()
        ];

        sheet.appendRow(row);
        collected.push({ title, link });
      }
    });

    return {
      success: true,
      source: 'Qiita',
      count: collected.length,
      items: collected
    };

  } catch(error) {
    return {
      success: false,
      source: 'Qiita',
      error: error.toString()
    };
  }
}
\`\`\`

#### 3.4 collectors/zenn.gs の作成

\`\`\`javascript
// Zennの収集
function collectZenn() {
  const RSS_URL = 'https://zenn.dev/topics/dify/feed';

  try {
    const response = UrlFetchApp.fetch(RSS_URL);
    const xml = XmlService.parse(response.getContentText());
    const root = xml.getRootElement();
    const channel = root.getChild('channel');
    const items = channel.getChildren('item');

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Articles');
    const collected = [];

    items.forEach(item => {
      const title = item.getChildText('title');
      const link = item.getChildText('link');
      const description = item.getChildText('description') || '';
      const creator = item.getChild('creator', XmlService.getNamespace('http://purl.org/dc/elements/1.1/'))?.getText() || '';
      const pubDate = item.getChildText('pubDate');

      if (!isDuplicate(link)) {
        const row = [
          '',
          'rss',
          'Zenn Dify',
          title,
          link,
          description,
          creator,
          pubDate,
          new Date().toISOString()
        ];

        sheet.appendRow(row);
        collected.push({ title, link });
      }
    });

    return {
      success: true,
      source: 'Zenn',
      count: collected.length,
      items: collected
    };

  } catch(error) {
    return {
      success: false,
      source: 'Zenn',
      error: error.toString()
    };
  }
}
\`\`\`

#### 3.5 utils.gs の作成

\`\`\`javascript
// ユーティリティ関数

// 重複チェック
function isDuplicate(url) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Articles');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][4] === url) { // E列（URL）
      return true;
    }
  }

  return false;
}

// 設定値の取得
function getConfigValue(key) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      return data[i][1];
    }
  }

  return null;
}

// 設定値の設定
function setConfigValue(key, value) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }

  // 存在しない場合は追加
  sheet.appendRow([key, value]);
}

// ログ記録
function logActivity(message, details) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Logs');
  if (!sheet) return;

  sheet.appendRow([
    new Date().toISOString(),
    message,
    JSON.stringify(details)
  ]);
}
\`\`\`

### 4. デプロイ

#### 4.1 Webアプリとしてデプロイ

1. 「デプロイ」→「新しいデプロイ」をクリック
2. 「種類の選択」→「ウェブアプリ」を選択
3. 設定:
   - 説明: Dify Learning Collector v1
   - 次のユーザーとして実行: 自分
   - アクセスできるユーザー: 全員
4. 「デプロイ」をクリック
5. **ウェブアプリのURL**をコピー（重要！）

#### 4.2 環境変数への設定

コピーしたURLを\`.env\`ファイルに設定:

\`\`\`env
GAS_WEB_APP_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
\`\`\`

### 5. トリガーの設定（自動実行）

#### 5.1 時間駆動型トリガーの作成

1. 「トリガー」アイコン（時計マーク）をクリック
2. 「トリガーを追加」
3. 設定:
   - 実行する関数: collectAllSources
   - イベントのソース: 時間主導型
   - 時間ベースのトリガータイプ: 日タイマー
   - 時刻: 午前8時〜9時
4. 「保存」

これで毎日自動的に情報収集が実行されます。

## テスト

### 手動テスト

1. Apps Scriptエディタで\`testCollection\`関数を選択
2. 「実行」ボタンをクリック
3. ログを確認: 「表示」→「ログ」

### Webhook テスト

\`\`\`bash
curl -X POST "YOUR_GAS_WEB_APP_URL" \\
  -H "Content-Type: application/json" \\
  -d '{"action": "collect_dify_blog"}'
\`\`\`

## トラブルシューティング

### 権限エラー

初回実行時に権限の承認が必要:
1. 「実行」→「承認が必要です」
2. Googleアカウントを選択
3. 「詳細」→「プロジェクト名（安全ではないページ）に移動」
4. 「許可」

### RSSフィードの取得エラー

- URLが正しいか確認
- フィードが有効か確認
- UrlFetchAppのタイムアウト設定を調整

### 重複データの挿入

- isDuplicate関数が正しく動作しているか確認
- URLカラムのインデックスを確認

## 次のステップ

1. YouTube API連携（Phase 2で実装）
2. Twitter API連携
3. エラー通知の実装
4. バックエンドへのWebhook通知

## 参考リンク

- [Google Apps Script ドキュメント](https://developers.google.com/apps-script)
- [UrlFetchApp](https://developers.google.com/apps-script/reference/url-fetch)
- [XmlService](https://developers.google.com/apps-script/reference/xml-service)
