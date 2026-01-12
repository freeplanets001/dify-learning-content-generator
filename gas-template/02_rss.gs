/**
 * 02_rss.gs - RSS収集
 * RSSフィードから記事を収集
 */

// === RSS収集 ===

/**
 * 全RSSソースから収集
 */
function collectAllRss() {
  const sources = getRssSources();
  const enabledSources = sources.filter(s => s.enabled);
  
  if (enabledSources.length === 0) {
    SpreadsheetApp.getUi().alert('⚠️ 有効なRSSソースがありません。\n\n「📡RSSソース」シートにRSSフィードを追加してください。');
    return { total: 0, sources: 0 };
  }
  
  let totalCollected = 0;
  const results = [];
  
  for (const source of enabledSources) {
    try {
      const collected = collectFromRssSource(source);
      totalCollected += collected;
      results.push({ source: source.name, collected: collected, success: true });
      
      // 最終収集日を更新
      updateRssSourceLastCollected(source.id);
    } catch (error) {
      console.error(`RSS収集エラー: ${source.name}`, error);
      results.push({ source: source.name, collected: 0, success: false, error: error.message });
    }
  }
  
  console.log(`RSS収集完了: ${totalCollected}件`);
  return { total: totalCollected, sources: enabledSources.length, results: results };
}

/**
 * 単一RSSソースから収集
 */
function collectFromRssSource(source) {
  const response = UrlFetchApp.fetch(source.url, {
    muteHttpExceptions: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RSS Reader/1.0)'
    }
  });
  
  if (response.getResponseCode() !== 200) {
    throw new Error(`HTTP Error: ${response.getResponseCode()}`);
  }
  
  const content = response.getContentText();
  const articles = parseRssFeed(content, source.name);
  
  // 重複チェックして保存
  let saved = 0;
  for (const article of articles) {
    if (!isArticleExists(article.url)) {
      saveArticle(article);
      saved++;
    }
  }
  
  return saved;
}

/**
 * RSSフィードをパース
 */
function parseRssFeed(xmlContent, sourceName) {
  const articles = [];
  
  try {
    const doc = XmlService.parse(xmlContent);
    const root = doc.getRootElement();
    
    // RSS 2.0 or Atom
    const ns = root.getNamespace();
    let items = [];
    
    if (root.getName() === 'rss') {
      // RSS 2.0
      const channel = root.getChild('channel');
      items = channel.getChildren('item');
      
      for (const item of items) {
        const title = item.getChildText('title') || '';
        const link = item.getChildText('link') || '';
        const description = item.getChildText('description') || '';
        const pubDate = item.getChildText('pubDate') || '';
        
        if (title && link) {
          articles.push({
            title: cleanText(title),
            url: link,
            source: sourceName,
            summary: cleanHtml(description).substring(0, 500),
            publishedAt: parseDate(pubDate),
            status: 'new'
          });
        }
      }
    } else if (root.getName() === 'feed') {
      // Atom
      const atomNs = XmlService.getNamespace('http://www.w3.org/2005/Atom');
      items = root.getChildren('entry', atomNs);
      
      for (const item of items) {
        const title = item.getChildText('title', atomNs) || '';
        const linkEl = item.getChild('link', atomNs);
        const link = linkEl ? linkEl.getAttribute('href').getValue() : '';
        const summary = item.getChildText('summary', atomNs) || item.getChildText('content', atomNs) || '';
        const updated = item.getChildText('updated', atomNs) || '';
        
        if (title && link) {
          articles.push({
            title: cleanText(title),
            url: link,
            source: sourceName,
            summary: cleanHtml(summary).substring(0, 500),
            publishedAt: parseDate(updated),
            status: 'new'
          });
        }
      }
    }
  } catch (error) {
    console.error('RSSパースエラー:', error);
    throw new Error(`RSSパースエラー: ${error.message}`);
  }
  
  return articles;
}

// === RSSソース管理 ===

/**
 * RSSソース一覧を取得
 */
function getRssSources() {
  const sheet = getOrCreateSheet(SHEET_NAMES.RSS_SOURCES);
  const data = sheet.getDataRange().getValues();
  const sources = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[1] && row[2]) {  // 名前とURLがあれば
      sources.push({
        id: row[0] || i,
        name: row[1],
        url: row[2],
        enabled: row[3] === true || row[3] === 'TRUE' || row[3] === '✓' || row[3] === 1,
        lastCollected: row[4]
      });
    }
  }
  
  return sources;
}

/**
 * RSSソースを追加
 */
function addRssSource(name, url, enabled = true) {
  const sheet = getOrCreateSheet(SHEET_NAMES.RSS_SOURCES);
  const lastRow = sheet.getLastRow();
  const newId = lastRow;
  
  sheet.appendRow([newId, name, url, enabled ? '✓' : '', '']);
  return newId;
}

/**
 * 最終収集日を更新
 */
function updateRssSourceLastCollected(sourceId) {
  const sheet = getOrCreateSheet(SHEET_NAMES.RSS_SOURCES);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == sourceId || i == sourceId) {
      sheet.getRange(i + 1, 5).setValue(new Date());
      break;
    }
  }
}

// === 記事管理 ===

/**
 * 記事が存在するかチェック
 */
function isArticleExists(url) {
  const sheet = getOrCreateSheet(SHEET_NAMES.ARTICLES);
  const data = sheet.getDataRange().getValues();
  
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
  const newId = lastRow;
  
  sheet.appendRow([
    newId,
    article.title,
    article.url,
    article.source,
    new Date(),
    article.summary || '',
    article.status || 'new'
  ]);
  
  return newId;
}

/**
 * 記事一覧を取得
 */
function getArticles(limit = 50) {
  const sheet = getOrCreateSheet(SHEET_NAMES.ARTICLES);
  const data = sheet.getDataRange().getValues();
  const articles = [];
  
  for (let i = Math.min(data.length - 1, limit); i >= 1; i--) {
    const row = data[i];
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
  
  return articles.reverse();
}

// === ユーティリティ ===

/**
 * HTMLタグを除去
 */
function cleanHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

/**
 * テキストをクリーン
 */
function cleanText(text) {
  if (!text) return '';
  return text.replace(/[\n\r\t]+/g, ' ').trim();
}

/**
 * 日付をパース
 */
function parseDate(dateStr) {
  if (!dateStr) return new Date();
  try {
    return new Date(dateStr);
  } catch (e) {
    return new Date();
  }
}

// === URL収集 ===

/**
 * URLから記事を収集
 */
function collectFromUrl(url, sourceName = 'URL Import') {
  try {
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ContentScraper/1.0)'
      }
    });
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`HTTP Error: ${response.getResponseCode()}`);
    }
    
    const html = response.getContentText();
    const title = extractTitle(html);
    const content = extractContent(html);
    
    if (isArticleExists(url)) {
      return { success: false, message: '既に収集済みです' };
    }
    
    const articleId = saveArticle({
      title: title,
      url: url,
      source: sourceName,
      summary: content.substring(0, 500),
      status: 'new'
    });
    
    return { success: true, articleId: articleId, title: title };
  } catch (error) {
    console.error('URL収集エラー:', error);
    return { success: false, message: error.message };
  }
}

/**
 * HTMLからタイトル抽出
 */
function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? cleanText(match[1]) : 'Untitled';
}

/**
 * HTMLからコンテンツ抽出 (簡易版)
 */
function extractContent(html) {
  // 本文っぽい部分を抽出
  let content = html;
  
  // script, style タグを除去
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // HTMLタグを除去
  content = cleanHtml(content);
  
  // 連続するスペースを整理
  content = content.replace(/\s+/g, ' ').trim();
  
  return content;
}
