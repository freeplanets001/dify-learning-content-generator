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
  console.log('📡 Found RSS Sources:', JSON.stringify(sources));
  let totalCollected = 0;
  const results = [];
  
  // Dify設定を取得 (RSS要約などに使えるかもしれないが、現状は未使用)
  // const config = getDifyConfig();
  
  for (const source of sources) {
    try {
      const articles = fetchRssFeed(source.url);
      console.log(`📰 Fetched from ${source.name}: ${articles.length} articles`);
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
    const options = {
      'headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      'muteHttpExceptions': true
    };
    const response = UrlFetchApp.fetch(url, options);
    const html = response.getContentText();
    
    // タイトル抽出
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : url;
    
    // ヘルパー: メタタグ抽出 (属性順序を問わない)
    const extractMeta = (html, propName, attrName = 'property') => {
      const regex1 = new RegExp(`<meta[^>]*${attrName}=["']${propName}["'][^>]*content=["']([^"']*)["']`, 'i');
      const match1 = html.match(regex1);
      if (match1) return match1[1];
      
      const regex2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attrName}=["']${propName}["']`, 'i');
      const match2 = html.match(regex2);
      if (match2) return match2[1];
      
      return null;
    };
    
    // 要約・詳細抽出
    let summary = extractMeta(html, 'og:description') || 
                  extractMeta(html, 'description', 'name') || 
                  '';
    
    // 画像抽出
    let imageUrl = extractMeta(html, 'og:image');
    
    // 画像があればMarkdown形式で先頭に追加
    if (imageUrl) {
      summary = `![Image](${imageUrl})\n\n${summary}`;
    }
    
    // 本文抽出 (簡易スクレイピング: pタグの連結)
    const extractBodyText = (html) => {
       // スクリプト、スタイル除去
       let clean = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
                       .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
                       .replace(/<!--[\s\S]*?-->/g, "");
       
       const pMatches = clean.match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi);
       if (!pMatches) return "";
       
       return pMatches.map(p => p.replace(/<[^>]+>/g, "").trim())
                      .filter(t => t.length > 40) // ある程度長い文章のみ
                      .join("\n\n");
    };
    
    const bodyText = extractBodyText(html);
    
    // 要約と本文を結合
    let fullContent = summary;
    if (bodyText) {
        // 本文がある場合は区切り線を入れて追加
        fullContent += "\n\n#### 📖 本文抜粋\n" + bodyText;
    }
    
    if (!summary && !bodyText) fullContent = 'Web Page Import (No content found)';
    
    const article = {
      title: title,
      url: url,
      source: sourceName,
      summary: fullContent,
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
    const enabled = row[3];
    // 有効フラグは boolean, 文字列 "TRUE", または truthy な値を許容
    const isEnabled = enabled === true || enabled === 'TRUE' || enabled === 'true' || enabled === 1;
    if (row[2] && isEnabled) {
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
/**
 * RssParserのような機能 (XMLパース)
 * GASのXmlServiceを使用
 */
function fetchRssFeed(feedUrl) {
  const articles = [];
  try {
    const options = {
      'headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      'muteHttpExceptions': true
    };
    const response = UrlFetchApp.fetch(feedUrl, options);
    const xml = response.getContentText();
    
    // エラーレスポンスの場合
    if (response.getResponseCode() !== 200) {
      console.warn(`RSS Fetch Error (${feedUrl}): ${response.getResponseCode()}`);
      return [];
    }
    
    const document = XmlService.parse(xml);
    const root = document.getRootElement();
    const namespace = root.getNamespace();
    const contentNs = XmlService.getNamespace('content', 'http://purl.org/rss/1.0/modules/content/');
    const mediaNs = XmlService.getNamespace('media', 'http://search.yahoo.com/mrss/');
    
    const entries = [];
    
    if (root.getName() === 'feed') {
      // Atom
      const atomEntries = root.getChildren('entry', namespace);
      for (const entry of atomEntries) {
        const title = entry.getChild('title', namespace).getText();
        const linkElem = entry.getChild('link', namespace);
        const link = linkElem ? linkElem.getAttribute('href').getValue() : '';
        const summary = entry.getChild('summary', namespace)?.getText() || entry.getChild('content', namespace)?.getText() || '';
        
        // Atom Image extraction (less standard)
        // Check for link rel="enclosure"
        let imageUrl = '';
        const links = entry.getChildren('link', namespace);
        for (const l of links) {
          if (l.getAttribute('rel')?.getValue() === 'enclosure' && l.getAttribute('type')?.getValue().startsWith('image')) {
            imageUrl = l.getAttribute('href').getValue();
            break;
          }
        }

        if (title && link) {
          const formattedContent = formatArticleContent(summary, imageUrl);
          articles.push({ title, link, summary: formattedContent });
        }
      }
    } else {
      // RSS 2.0
      const channel = root.getChild('channel');
      if (channel) {
        const rssItems = channel.getChildren('item');
        for (const item of rssItems) {
          const title = item.getChild('title')?.getText();
          const link = item.getChild('link')?.getText();
          
          // Try to get full content
          const description = item.getChild('description')?.getText() || '';
          const contentEncoded = item.getChild('encoded', contentNs)?.getText();
          const fullContent = contentEncoded || description;
          
          // Image Extraction
          let imageUrl = '';
          const enclosure = item.getChild('enclosure');
          if (enclosure && enclosure.getAttribute('type')?.getValue().startsWith('image')) {
            imageUrl = enclosure.getAttribute('url').getValue();
          }
          // Try media:content
          if (!imageUrl && mediaNs) {
            const media = item.getChild('content', mediaNs);
            if (media && media.getAttribute('url')) {
              imageUrl = media.getAttribute('url').getValue();
            }
            const thumbnail = item.getChild('thumbnail', mediaNs);
            if (!imageUrl && thumbnail && thumbnail.getAttribute('url')) {
              imageUrl = thumbnail.getAttribute('url').getValue();
            }
          }
          // Try regex on content
          if (!imageUrl) {
            const imgMatch = fullContent.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (imgMatch) {
              imageUrl = imgMatch[1];
            }
          }

          if (title && link) {
             const formattedContent = formatArticleContent(fullContent, imageUrl);
             articles.push({ title, link, summary: formattedContent });
          }
        }
      } else {
        // RSS 1.0 (RDF) - items are direct children of root
        const rssNs = XmlService.getNamespace('http://purl.org/rss/1.0/');
        const rdfItems = root.getChildren('item', rssNs);
        console.log(`📋 RSS 1.0 (RDF) items found: ${rdfItems.length}`);
        
        for (const item of rdfItems) {
          const title = item.getChild('title', rssNs)?.getText();
          const link = item.getChild('link', rssNs)?.getText();
          const description = item.getChild('description', rssNs)?.getText() || '';
          
          if (title && link) {
            const formattedContent = formatArticleContent(description, '');
            articles.push({ title, link, summary: formattedContent });
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
 * 記事コンテンツを整形 (HTML -> Markdown + Image)
 */
function formatArticleContent(html, imageUrl) {
  let text = html || '';
  
  // 基本的なHTMLタグ変換 (簡易Markdown化)
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<li>/gi, '- ');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // タグ除去
  text = text.replace(/<[^>]+>/g, '');
  
  // エンティティデコード
  text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  
  // 空行整理
  text = text.trim();
  
  // 画像があれば先頭に追加 (Markdown形式)
  if (imageUrl) {
    return `![Image](${imageUrl})\n\n${text}`;
  }
  
  return text;
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

    // IDが存在するかチェック (0も許可)
    if (row[0] !== undefined && row[0] !== '') {
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
  const data = sheet.getDataRange().getValues();
  
  console.log('📝 saveRssSource called with:', JSON.stringify(source));
  
  // 既存ソースの更新チェック
  if (source.id !== undefined && source.id !== null && source.id !== '') {
    const sourceId = String(source.id);
    for (let i = 1; i < data.length; i++) {
      const rowId = String(data[i][0]);
      if (rowId === sourceId) {
        console.log(`✅ Found existing source at row ${i + 1}, updating...`);
        // 既存行を更新
        sheet.getRange(i + 1, 2).setValue(source.name || data[i][1]);
        sheet.getRange(i + 1, 3).setValue(source.url || data[i][2]);
        sheet.getRange(i + 1, 4).setValue(source.enabled !== undefined ? source.enabled : data[i][3]);
        SpreadsheetApp.flush();
        return { success: true, id: source.id, updated: true };
      }
    }
    console.log(`⚠️ Source ID ${sourceId} not found in existing data`);
  }
  
  // 新規追加
  const lastRow = sheet.getLastRow();
  const newId = lastRow;
  
  const rowData = [
    newId,
    source.name,
    source.url,
    source.enabled !== undefined ? source.enabled : true,
    '' // lastCollected
  ];
  
  sheet.getRange(lastRow + 1, 1, 1, 5).setValues([rowData]);
  SpreadsheetApp.flush();
  return { success: true, id: newId, created: true };
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
    // IDが存在するかチェック (0も許可)
    if (row[0] !== undefined && row[0] !== '') {
      // ステータスフィルタなどはここに追加可能
      articles.push({
        id: row[0],
        title: row[1],
        url: row[2],
        source: row[3],
        collectedAt: row[4] instanceof Date ? row[4].toISOString() : row[4],
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
  const targetId = String(id);
  
  console.log('🗑️ deleteArticle called with id:', targetId);
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === targetId) {
      console.log(`✅ Found article at row ${i + 1}, deleting...`);
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  console.log('⚠️ Article not found with id:', targetId);
  return { success: false, message: 'Article not found' };
}

/**
 * 記事一括削除
 * @param {Array} ids - 削除する記事IDの配列
 * @param {boolean} deleteAll - trueの場合、全記事を削除
 */
function deleteArticlesBatch(ids, deleteAll = false) {
  const sheet = getOrCreateSheet(SHEET_NAMES.ARTICLES);
  const data = sheet.getDataRange().getValues();
  
  console.log('🗑️ deleteArticlesBatch called:', deleteAll ? 'ALL' : `${ids?.length || 0} items`);
  
  // 削除対象の行番号を収集（1-indexed）
  const rowsToDelete = [];
  
  if (deleteAll) {
    // 全削除: ヘッダー以外のすべての行
    for (let i = 1; i < data.length; i++) {
      rowsToDelete.push(i + 1);
    }
  } else if (ids && ids.length > 0) {
    // 選択削除: IDに一致する行
    const idsSet = new Set(ids.map(id => String(id)));
    for (let i = 1; i < data.length; i++) {
      if (idsSet.has(String(data[i][0]))) {
        rowsToDelete.push(i + 1);
      }
    }
  }
  
  // 逆順で削除（行番号がずれないように）
  rowsToDelete.sort((a, b) => b - a);
  for (const row of rowsToDelete) {
    sheet.deleteRow(row);
  }
  
  SpreadsheetApp.flush();
  console.log(`✅ Deleted ${rowsToDelete.length} articles`);
  return { success: true, deleted: rowsToDelete.length };
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

/**
 * テスト用: saveRssSource の動作確認
 * GASエディタから直接実行してログを確認
 */
function testSaveRssSourceUpdate() {
  // 既存ソースのIDを指定してテスト（ID=1 を使用）
  const testSource = {
    id: 1,
    name: 'TEST_UPDATE',
    url: 'https://example.com/test',
    enabled: false
  };
  
  console.log('🧪 Testing saveRssSource with:', JSON.stringify(testSource));
  const result = saveRssSource(testSource);
  console.log('📋 Result:', JSON.stringify(result));
  
  return result;
}
