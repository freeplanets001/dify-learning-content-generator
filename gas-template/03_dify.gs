/**
 * 03_dify.gs - Dify API連携
 * コンテンツ生成ワークフロー呼び出し
 */

// === テンプレート定義 ===
const TEMPLATES = [
  { id: 'tutorial', name: '📚 チュートリアル', description: '初心者向け詳細ガイド' },
  { id: 'note-article', name: '📝 note記事', description: 'note向けの記事' },
  { id: 'threads-post', name: '🧵 Threads投稿', description: '短文投稿用' },
  { id: 'blog-post', name: '✍️ ブログ記事', description: 'SEO対応ブログ記事' },
  { id: 'summary', name: '💡 要約', description: 'ポイント要約' },
  { id: 'slide-outline', name: '📊 スライド構成', description: 'プレゼン用' }
];

// === Dify API ===

/**
 * Dify Workflow APIを呼び出し
 */
function callDifyWorkflow(inputs) {
  const config = getDifyConfig();
  
  if (!config.apiKey || !config.workflowId) {
    throw new Error('Dify APIが設定されていません。設定シートでAPIキーとWorkflow IDを入力してください。');
  }
  
  const url = `${config.baseUrl}/workflows/run`;
  
  const payload = {
    inputs: inputs,
    response_mode: 'blocking',
    user: 'gas-user'
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();
  
  if (responseCode !== 200) {
    console.error('Dify API Error:', responseCode, responseText);
    throw new Error(`Dify API Error: ${responseCode} - ${responseText}`);
  }
  
  const result = JSON.parse(responseText);
  console.log('Dify Response:', JSON.stringify(result)); // Debug log
  
  if (result.data && result.data.outputs) {
    return result.data.outputs;
  }
  
  // ワークフローのステータスチェック
  if (result.data && result.data.status !== 'succeeded') {
     console.warn('Dify Workflow Status:', result.data.status);
  }

  throw new Error('Dify APIから有効な出力がありませんでした: ' + JSON.stringify(result));
}

// === コンテンツ生成 ===

/**
 * 記事からコンテンツを生成
 */
function generateContent(articleId, templateId) {
  console.log(`generateContent called: articleId=${articleId}, templateId=${templateId}`);
  
  const article = getArticleById(articleId);
  
  if (!article) {
    console.error(`Article not found: id=${articleId}`);
    throw new Error(`記事が見つかりません (ID: ${articleId})`);
  }
  console.log('Article found:', article.title);
  
  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  
  // Dify Workflow入力を構築
  const inputs = {
    article_title: article.title,
    article_url: article.url,
    article_content: article.summary || '',
    source_name: article.source,
    template_type: templateId,
    template_name: template.name
  };
  
  // Dify API呼び出し
  const outputs = callDifyWorkflow(inputs);
  
  // 生成されたコンテンツを取得
  const generatedTitle = outputs.title || outputs.generated_title || article.title;
  const generatedContent = outputs.content || outputs.generated_content || outputs.text || '';
  
  // 保存
  const contentId = saveContent({
    articleId: articleId,
    templateId: templateId,
    title: generatedTitle,
    content: generatedContent
  });
  
  return {
    success: true,
    contentId: contentId,
    title: generatedTitle,
    content: generatedContent
  };
}

/**
 * 複数記事を結合してコンテンツ生成
 */
function generateCombinedContent(articleIds, templateId) {
  const articles = articleIds.map(id => getArticleById(id)).filter(a => a);
  
  if (articles.length === 0) {
    throw new Error('記事が見つかりません');
  }
  
  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  
  // 結合記事情報を構築
  const combinedContent = articles.map(a => `【${a.title}】\n${a.summary || ''}`).join('\n\n---\n\n');
  const sourcesList = [...new Set(articles.map(a => a.source))].join(', ');
  
  const inputs = {
    article_title: `${articles.length}件の記事まとめ`,
    article_url: articles[0].url,
    article_content: combinedContent,
    source_name: sourcesList,
    template_type: templateId,
    template_name: template.name,
    is_combined: 'true',
    article_count: articles.length.toString()
  };
  
  const outputs = callDifyWorkflow(inputs);
  
  const generatedTitle = outputs.title || outputs.generated_title || `${articles.length}件のまとめ`;
  const generatedContent = outputs.content || outputs.generated_content || outputs.text || '';
  
  const contentId = saveContent({
    articleId: articleIds.join(','),
    templateId: templateId,
    title: generatedTitle,
    content: generatedContent
  });
  
  return {
    success: true,
    contentId: contentId,
    title: generatedTitle,
    content: generatedContent,
    articleCount: articles.length
  };
}

// === コンテンツ管理 ===

/**
 * コンテンツを保存
 */
function saveContent(content) {
  const sheet = getOrCreateSheet(SHEET_NAMES.CONTENTS);
  const lastRow = sheet.getLastRow();
  const newId = lastRow;
  
  sheet.appendRow([
    newId,
    content.articleId,
    content.templateId,
    content.title,
    content.content,
    new Date(),
    'draft'
  ]);
  
  return newId;
}

/**
 * コンテンツ一覧を取得
 */
function getContents(limit = 50) {
  const sheet = getOrCreateSheet(SHEET_NAMES.CONTENTS);
  const data = sheet.getDataRange().getValues();
  const contents = [];
  
  for (let i = data.length - 1; i >= 1 && contents.length < limit; i--) {
    const row = data[i];
    contents.push({
      id: row[0],
      articleId: row[1],
      templateId: row[2],
      title: row[3],
      content: row[4],
      createdAt: row[5],
      status: row[6]
    });
  }
  
  return contents;
}

/**
 * 記事をIDで取得
 */
function getArticleById(articleId) {
  const sheet = getOrCreateSheet(SHEET_NAMES.ARTICLES);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == articleId) {
      return {
        id: data[i][0],
        title: data[i][1],
        url: data[i][2],
        source: data[i][3],
        collectedAt: data[i][4],
        summary: data[i][5],
        status: data[i][6]
      };
    }
  }
  
  return null;
}

// === ローカル生成 (Dify無し) ===

/**
 * Difyを使わずにローカルで生成（フォールバック）
 */
function generateContentLocal(articleId, templateId) {
  const article = getArticleById(articleId);
  
  if (!article) {
    throw new Error('記事が見つかりません');
  }
  
  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  
  let generatedContent = '';
  
  switch (templateId) {
    case 'summary':
      generatedContent = `## ${article.title}\n\n**ソース**: ${article.source}\n**URL**: ${article.url}\n\n### 要約\n${article.summary || '(要約なし)'}\n\n---\n生成日: ${new Date().toLocaleDateString('ja-JP')}`;
      break;
      
    case 'threads-post':
      generatedContent = `🧵 ${article.title}\n\n${(article.summary || '').substring(0, 200)}...\n\n👉 続きはこちら: ${article.url}`;
      break;
      
    default:
      generatedContent = `# ${article.title}\n\n${article.summary || ''}\n\n---\n**参考**: ${article.url}`;
  }
  
  const contentId = saveContent({
    articleId: articleId,
    templateId: templateId,
    title: article.title,
    content: generatedContent
  });
  
  return {
    success: true,
    contentId: contentId,
    title: article.title,
    content: generatedContent,
    usedDify: false
  };
}

/**
 * 画像生成 (Difyワークフロー経由)
 */
function generateImageFromDify(prompt) {
  // 画像生成用の入力を構築
  const inputs = {
    prompt: prompt,
    mode: 'image_generation' // ワークフロー側で分岐させるためのフラグ
  };
  
  try {
    const outputs = callDifyWorkflow(inputs);
    
    // 出力から画像URLを探す
    let imageUrl = outputs.image || outputs.image_url || outputs.url || '';
    
    // テキスト出力に含まれている場合も考慮 (Markdown)
    if (!imageUrl && (outputs.text || outputs.answer || outputs.content)) {
      const text = outputs.text || outputs.answer || outputs.content || '';
      const match = text.match(/!\[.*?\]\((.*?)\)/);
      if (match) {
        imageUrl = match[1];
      } else if (text.startsWith('http')) {
        imageUrl = text;
      }
    }
    
    if (!imageUrl) {
      // ダミー画像 (テスト用)
      // imageUrl = 'https://via.placeholder.com/1024x1024.png?text=' + encodeURIComponent(prompt);
      throw new Error('Difyから有効な画像URLが返されませんでした');
    }
    
    return { success: true, imageUrl: imageUrl };
    
  } catch (e) {
    console.error('Image Gen Error:', e);
    throw e;
  }
}
