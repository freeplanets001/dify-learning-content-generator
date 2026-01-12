import { marked } from 'marked';

/**
 * Markdown処理ユーティリティ
 */

/**
 * MarkdownをHTMLに変換
 */
export function markdownToHtml(markdown) {
  return marked.parse(markdown);
}

/**
 * Obsidian用のフロントマターを生成
 */
export function generateFrontmatter(data) {
  const frontmatter = ['---'];

  Object.keys(data).forEach(key => {
    const value = data[key];

    if (Array.isArray(value)) {
      frontmatter.push(`${key}:`);
      value.forEach(item => {
        frontmatter.push(`  - ${item}`);
      });
    } else if (typeof value === 'object' && value !== null) {
      frontmatter.push(`${key}:`);
      Object.keys(value).forEach(subKey => {
        frontmatter.push(`  ${subKey}: ${value[subKey]}`);
      });
    } else {
      frontmatter.push(`${key}: ${value}`);
    }
  });

  frontmatter.push('---');
  return frontmatter.join('\n');
}

/**
 * Daily Note用のMarkdownを生成
 */
export function generateDailyNote(date, articles) {
  const frontmatter = generateFrontmatter({
    date: date,
    tags: ['dify', 'daily-note', 'auto-generated'],
    type: 'daily-collection'
  });

  const sections = [];
  sections.push(frontmatter);
  sections.push('');
  sections.push(`# Dify Learning - ${date}`);
  sections.push('');

  // カテゴリ別に記事を分類
  const categorized = {
    'official': [],
    'tutorial': [],
    'community': [],
    'news': [],
    'other': []
  };

  articles.forEach(article => {
    const category = article.metadata?.category || 'other';
    if (categorized[category]) {
      categorized[category].push(article);
    } else {
      categorized.other.push(article);
    }
  });

  // 各カテゴリのセクションを生成
  const categoryTitles = {
    'official': '## 📢 公式情報',
    'tutorial': '## 📚 チュートリアル',
    'community': '## 💬 コミュニティ',
    'news': '## 📰 ニュース',
    'other': '## 📌 その他'
  };

  Object.keys(categorized).forEach(category => {
    const items = categorized[category];
    if (items.length > 0) {
      sections.push(categoryTitles[category]);
      sections.push('');

      items.forEach(article => {
        // タイトルをリンク付きで表示
        sections.push(`### [${article.title}](${article.url})`);
        sections.push('');

        // 画像を表示（複数のソースをチェック）
        const imageUrl = article.metadata?.ogImage || article.metadata?.image || article.image || article.metadata?.images?.[0];
        if (imageUrl) {
          sections.push(`![](${imageUrl})`);
          sections.push('');
        }

        // メタ情報をシンプルに
        const metaInfo = [];
        metaInfo.push(`📌 **${article.source_name}**`);
        if (article.author) metaInfo.push(`✍️ ${article.author}`);
        if (article.published_date) metaInfo.push(`📅 ${article.published_date}`);
        sections.push(metaInfo.join(' | '));
        sections.push('');

        // 概要
        if (article.description) {
          sections.push('> ' + article.description.replace(/\n/g, ' '));
          sections.push('');
        }

        // 全文（フォーマット改善）
        if (article.content) {
          sections.push('#### 📖 本文');
          sections.push('');

          // 長すぎる場合は最初の30000文字のみ
          let contentPreview = article.content.length > 30000
            ? article.content.substring(0, 30000) + '\n\n*(...続きはリンク先で)*'
            : article.content;

          // 改行を適度に整理
          const formattedContent = contentPreview
            // 3つ以上の連続する改行を2つに
            .replace(/\n{3,}/g, '\n\n')
            .trim();

          sections.push(formattedContent);
          sections.push('');
        }

        if (article.tags && article.tags.length > 0) {
          sections.push(`**Tags**: ${article.tags.map(tag => `#${tag}`).join(' ')}`);
          sections.push('');
        }

        sections.push('---');
        sections.push('');
      });
    }
  });

  // 統計情報
  sections.push('## 📊 収集統計');
  sections.push('');
  sections.push(`- 総収集数: ${articles.length}`);

  Object.keys(categorized).forEach(category => {
    const count = categorized[category].length;
    if (count > 0) {
      sections.push(`- ${categoryTitles[category].replace('## ', '')}: ${count}`);
    }
  });

  return sections.join('\n');
}

/**
 * 記事用のMarkdownテンプレートを生成
 */
export function generateArticleTemplate(article, templateType) {
  const templates = {
    'tutorial': generateTutorialTemplate(article),
    'note-article': generateNoteArticleTemplate(article),
    'threads-post': generateThreadsPostTemplate(article),
    'slide-outline': generateSlideOutlineTemplate(article)
  };

  return templates[templateType] || generateDefaultTemplate(article);
}

/**
 * チュートリアルテンプレート
 */
function generateTutorialTemplate(article) {
  return `# ${article.title}

## 概要
${article.description || ''}

## 参照元
- URL: ${article.url}
- ソース: ${article.source_name}
${article.author ? `- 著者: ${article.author}` : ''}

## 目次
1. はじめに
2. 前提知識
3. 手順
4. まとめ

## はじめに
[ここに導入文を記述]

## 前提知識
- [必要な知識1]
- [必要な知識2]

## 手順

### ステップ1: [タイトル]
[説明]

\`\`\`
[コード例]
\`\`\`

### ステップ2: [タイトル]
[説明]

## まとめ
[まとめを記述]

---
${article.tags ? `Tags: ${article.tags.map(t => `#${t}`).join(' ')}` : ''}
`;
}

/**
 * note記事テンプレート
 */
function generateNoteArticleTemplate(article) {
  return `# ${article.title}

${article.description || ''}

## 背景
[なぜこの記事を書くのか]

## 本題
[メインコンテンツ]

## 実践例
[具体的な例]

## まとめ
[結論]

---
参照: [${article.source_name}](${article.url})
`;
}

/**
 * Threads投稿テンプレート
 */
function generateThreadsPostTemplate(article) {
  const content = `🔥 ${article.title}

${article.description ? article.description.substring(0, 200) + '...' : ''}

詳細はこちら👇
${article.url}

#Dify #AI #NoCode`;

  return content;
}

/**
 * スライド構成案テンプレート
 */
function generateSlideOutlineTemplate(article) {
  return `# ${article.title}
## スライド構成案

### スライド1: タイトル
- タイトル: ${article.title}
- サブタイトル: [サブタイトル]

### スライド2: アジェンダ
1. [項目1]
2. [項目2]
3. [項目3]

### スライド3: 背景・課題
- [背景説明]
- [課題]

### スライド4-6: メインコンテンツ
[各スライドの内容]

### スライド7: まとめ
- [要点1]
- [要点2]
- [要点3]

### スライド8: 参考資料
- 元記事: ${article.url}
- ソース: ${article.source_name}

---
作成日: ${new Date().toISOString().split('T')[0]}
`;
}

/**
 * デフォルトテンプレート
 */
function generateDefaultTemplate(article) {
  return `# ${article.title}

${article.description || ''}

**ソース**: ${article.source_name}
**URL**: ${article.url}
${article.author ? `**著者**: ${article.author}` : ''}
${article.published_date ? `**公開日**: ${article.published_date}` : ''}

---

${article.content || '[コンテンツを追加]'}

${article.tags ? `\nTags: ${article.tags.map(t => `#${t}`).join(' ')}` : ''}
`;
}

export default {
  markdownToHtml,
  generateFrontmatter,
  generateDailyNote,
  generateArticleTemplate
};
