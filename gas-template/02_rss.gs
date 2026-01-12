/**
 * 02_rss.gs - RSS収集ロジック
 * RSSフィードの取得、パース、記事の保存
 */

/**
 * すべての有効なRSSソースから記事を収集
 * (UIやAPIから呼び出し、または時間トリガー)
 */
function collectAllRss() {
  const sources = getEnabledRssSources();
  let totalCollected = 0;
  const results = [];
  
  // Dify設定を取得 (RSS要約などに使えるかもしれないが、現状は未使用)
  // const config = getDifyConfig();
  
  for (const source of sources) {
    try {
      const articles = fetchRssFeed(source.url);
      let count = 0;
      
      for (const article of articles) {
        // 重複チェック
        if (!isArticleExists(article.link)) {
          saveArticle({
            title: article.title,
            url: article.link,
            source: source.name,
            summary: article.summary, // RSSに含まれる概要
            status: 'new'
          });
          count++;
        }
      }
      
      totalCollected += count;
      results.push({ source: source.name, collected: count, success: true });
      
      // 最終収集日を更新
      updateRssSourceLastCollected(source.id);
    } catch (error) {
      console.error(`RSS収集エラー: ${source.name}`, error);
      results.push({ source: source.name, collected: 0, success: false, error: error.message });
    }
  }
  
  SpreadsheetApp.flush(); // 即時反映 (重要: 連続実行時の読み取り遅延を防ぐ)
  console.log(`RSS収集完了: ${totalCollected}件`);
  return { total: totalCollected, sources: sources.length, results: results };
}

/**
 * 指定URLの記事を収集 (単発インポート)
 */
function collectFromUrl(url, sourceName = 'Manual Import') {
  try {
    // スクレイピング (簡易的)
    // GASのUrlFetchAppでHTMLを取得
    const response = UrlFetchApp.fetch(url);
    const html = response.getContentText();
    
    // タイトル抽出 (正規表現で簡易抽出)
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1] : url;
    
    // 本文抽出などは高度なパースが必要だが、ここでは簡易的に保存
    const article = {
      title: title,
      url: url,
      source: sourceName,
      summary: 'Imported by URL',
      status: 'new'
    };
    
    // 重複チェック
    if (isArticleExists(url)) {
      return { success: false, error: 'この記事は既に収集済みです' };
    }
    
    saveArticle(article);
    SpreadsheetApp.flush(); // 即時反映 (重要)
    
    return { success: true, title: title };
  } catch (e) {
    console.error('URL収集エラー:', e);
    return { success: false, error: e.message };
  }
}

// === 内部関数 ===

/**
 * 有効なRSSソースを取得
 */
function getEnabledRssSources() {
  const sheet = getOrCreateSheet(SHEET_NAMES.RSS_SOURCES);
  const data = sheet.getDataRange().getValues();
  const sources = [];
  
  // ヘッダーを除外 (1行目から)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // ID, 名前, URL, 有効フラグ
    if (row[2] && row[3] === true) {
      sources.push({
        id: row[0],
        name: row[1],
        url: row[2]
      });
    }
  }
  return sources;
}

/**
 * RSSソースの最終収集日を更新
 */
function updateRssSourceLastCollected(id) {
  const sheet = getOrCreateSheet(SHEET_NAMES.RSS_SOURCES);
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.getRange(i + 1, 5).setValue(now);
      break;
    }
  }
}

/**
 * RssParserのような機能 (XMLパース)
 * GASのXmlServiceを使用
 */
function fetchRssFeed(feedUrl) {
  const articles = [];
  try {
    const xml = UrlFetchApp.fetch(feedUrl).getContentText();
    const document = XmlService.parse(xml);
    const root = document.getRootElement();
    
    // Atom vs RSS 2.0 対応
    let entries = [];
    const namespace = root.getNamespace();
    
    if (root.getName() === 'feed') {
      // Atom
      entries = root.getChildren('entry', namespace);
      for (const entry of entries) {
        const title = entry.getChild('title', namespace).getText();
        const link = entry.getChild('link', namespace).getAttribute('href').getValue();
        const summary = entry.getChild('summary', namespace)?.getText() || '';
        if (title && link) {
          articles.push({ title, link, summary });
        }
      }
    } else {
      // RSS 2.0
      const channel = root.getChild('channel');
      if (channel) {
        entries = channel.getChildren('item');
        for (const item of entries) {
          const title = item.getChild('title').getText();
          const link = item.getChild('link').getText();
          const description = item.getChild('description')?.getText() || '';
          if (title && link) {
            articles.push({ title, link, summary: description });
          }
        }
      }
    }
  } catch (e) {
    console.warn(`RSS Parse Error (${feedUrl}):`, e);
  }
  return articles;
}

/**
 * 記事が既にあるかチェック (URL一致)
 */
function isArticleExists(url) {
  const sheet = getOrCreateSheet(SHEET_NAMES.ARTICLES);
  const data = sheet.getDataRange().getValues();
  
  // URLは3列目 (index 2)
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === url) {
      return true;
    }
  }
  return false;
}

/**
 * 記事を保存
 */
function saveArticle(article) {
  const sheet = getOrCreateSheet(SHEET_NAMES.ARTICLES);
  const lastRow = sheet.getLastRow();
  const newId = lastRow; // 簡易ID (行番号-1の方が良いが、ここでは単純に行数)
  
  const rowData = [
    newId,
    article.title,
    article.url,
    article.source,
    new Date(),
    article.summary || '',
    article.status || 'new'
  ];
  
  sheet.getRange(lastRow + 1, 1, 1, 7).setValues([rowData]);
}

/**
 * RSSソースを取得
 */
function getRssSources() {
  const sheet = getOrCreateSheet(SHEET_NAMES.RSS_SOURCES);
  const data = sheet.getDataRange().getValues();
  const sources = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      sources.push({
        id: row[0],
        name: row[1],
        url: row[2],
        enabled: row[3],
        lastCollected: row[4]
      });
    }
  }
  return sources;
}

/**
 * IDで記事を取得
 */
function getArticleById(id) {
  const sheet = getOrCreateSheet(SHEET_NAMES.ARTICLES);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[0]) === String(id)) {
      return {
        id: row[0],
        title: row[1],
        url: row[2],
        source: row[3],
        collectedAt: row[4],
        summary: row[5],
        status: row[6]
      };
    }
  }
  return null;
}

/**
 * RSSソースを保存
 */
function saveRssSource(source) {
  const sheet = getOrCreateSheet(SHEET_NAMES.RSS_SOURCES);
  const lastRow = sheet.getLastRow();
  
  // 新規追加のみ対応 (編集はスプレッドシート直接で)
  const newId = lastRow;
  
  const rowData = [
    newId,
    source.name,
    source.url,
    true, // enabled
    '' // lastCollected
  ];
  
  sheet.getRange(lastRow + 1, 1, 1, 5).setValues([rowData]);
  SpreadsheetApp.flush();
  return { id: newId, ...source };
}

/**
 * 記事一覧を取得
 */
function getArticles(limit = 50) {
  const sheet = getOrCreateSheet(SHEET_NAMES.ARTICLES);
  const data = sheet.getDataRange().getValues();
  
  // ヘッダー除外
  const articles = [];
  // 新しい順に取得 (後ろから)
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    if (row[0]) {
      // ステータスフィルタなどはここに追加可能
      articles.push({
        id: row[0],
        title: row[1],
        url: row[2],
        source: row[3],
        collectedAt: row[4],
        summary: row[5],
        status: row[6]
      });
    }
    if (articles.length >= limit) break;
  }
  
  return articles;
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
