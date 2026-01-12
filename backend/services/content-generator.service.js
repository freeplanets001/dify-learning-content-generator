import * as difyService from './dify.service.js';
import * as articleModel from '../models/article.model.js';
import * as contentModel from '../models/content.model.js';
import { generateArticleTemplate } from '../utils/markdown.js';
import logger, { logGenerationActivity } from '../utils/logger.js';

/**
 * コンテンツ生成サービス
 */

/**
 * 記事からコンテンツを生成
 */
export async function generateContentFromArticle(articleId, templateType, options = {}) {
  const {
    customPrompt = null,
    useDify = true,
    autoApprove = false,
    generatedBy = 'system'
  } = options;

  // 記事を取得
  const article = articleModel.getArticleById(articleId);

  if (!article) {
    throw new Error('Article not found');
  }

  logger.info('Generating content', {
    articleId,
    title: article.title,
    templateType
  });

  let generatedContent;
  let method = 'template';

  try {
    if (useDify) {
      // Dify APIを使用してコンテンツ生成
      const result = await difyService.generateContent(article, templateType, customPrompt);

      if (!result.success) {
        throw new Error(result.error || 'Dify generation failed');
      }

      generatedContent = result.answer || result.outputs?.result || result.outputs?.content || result.data;
      method = 'dify';

      if (!generatedContent) {
        logger.error('No content found in Dify response', { outputs: result.outputs, data: result.data });
        throw new Error('Dify returned no content');
      }

      logger.info('Content generated via Dify', {
        articleId,
        templateType,
        contentLength: generatedContent.length
      });
    } else {
      // テンプレートベースで生成
      generatedContent = generateArticleTemplate(article, templateType);
      method = 'template';

      logger.info('Content generated via template', {
        articleId,
        templateType
      });
    }

    // コンテンツをデータベースに保存
    const content = contentModel.createContent({
      article_id: articleId,
      template_type: templateType,
      title: article.title,
      content: generatedContent,
      status: autoApprove ? 'approved' : 'pending_approval',
      version: 1,
      generated_by: generatedBy,
      metadata: {
        method,
        custom_prompt: customPrompt,
        generated_at: new Date().toISOString()
      }
    });

    // 記事のステータスを更新
    if (article.status === 'unprocessed') {
      articleModel.updateArticleStatus(articleId, 'processing');
    }

    logGenerationActivity(templateType, 'success', {
      contentId: content.id,
      articleId,
      method
    });

    return {
      success: true,
      content,
      method
    };
  } catch (error) {
    logger.error('Content generation failed', {
      articleId,
      templateType,
      error: error.message
    });

    logGenerationActivity(templateType, 'error', {
      articleId,
      error: error.message
    });

    throw error;
  }
}

/**
 * バッチ生成（複数記事）
 */
export async function batchGenerateContent(articleIds, templateType, options = {}) {
  const results = [];

  for (const articleId of articleIds) {
    try {
      const result = await generateContentFromArticle(articleId, templateType, options);
      results.push({
        articleId,
        success: true,
        contentId: result.content.id
      });
    } catch (error) {
      results.push({
        articleId,
        success: false,
        error: error.message
      });
    }
  }

  const summary = {
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };

  logger.info('Batch generation completed', summary);

  return summary;
}

/**
 * 複数記事を結合して1つのコンテンツを生成
 */
export async function generateCombinedContent(articleIds, templateType, options = {}) {
  const {
    customPrompt = null,
    useDify = true,
    autoApprove = false,
    generatedBy = 'system',
    combinedTitle = null
  } = options;

  if (!articleIds || articleIds.length === 0) {
    throw new Error('No articles provided');
  }

  // 複数記事を取得
  const articles = articleIds.map(id => articleModel.getArticleById(id)).filter(a => a);

  if (articles.length === 0) {
    throw new Error('No valid articles found');
  }

  logger.info('Generating combined content', {
    articleCount: articles.length,
    articleIds,
    templateType
  });

  // 記事情報を結合
  const combinedArticle = {
    id: articleIds[0], // 主記事ID
    title: combinedTitle || articles.map(a => a.title).join(' + '),
    content: articles.map(a => `
## ${a.title}
${a.content || a.summary || ''}
URL: ${a.url || ''}
`).join('\n\n---\n\n'),
    summary: articles.map(a => a.summary || '').join('\n\n'),
    url: articles[0].url,
    source_name: '結合記事',
    source_type: 'combined',
    article_source: articles.map(a => a.source_name || a.source_type || 'web').join(', '),
    metadata: {
      source_articles: articles.map(a => ({ id: a.id, title: a.title, url: a.url })),
      combined_at: new Date().toISOString()
    }
  };

  let generatedContent;
  let method = 'template';

  try {
    if (useDify) {
      // Dify APIを使用してコンテンツ生成
      const result = await difyService.generateContent(combinedArticle, templateType, customPrompt);

      if (!result.success) {
        throw new Error(result.error || 'Dify generation failed');
      }

      generatedContent = result.answer || result.outputs?.result || result.outputs?.content || result.data;
      method = 'dify';

      if (!generatedContent) {
        throw new Error('Dify returned no content');
      }

      logger.info('Combined content generated via Dify', {
        articleCount: articles.length,
        templateType,
        contentLength: generatedContent.length
      });
    } else {
      // テンプレートベースで生成
      generatedContent = generateArticleTemplate(combinedArticle, templateType);
      method = 'template';
    }

    // コンテンツをデータベースに保存
    const content = contentModel.createContent({
      article_id: articleIds[0], // 主記事ID
      template_type: templateType,
      title: combinedArticle.title,
      content: generatedContent,
      status: autoApprove ? 'approved' : 'pending_approval',
      version: 1,
      generated_by: generatedBy,
      metadata: {
        method,
        combined: true,
        source_article_ids: articleIds,
        source_articles: articles.map(a => ({ id: a.id, title: a.title })),
        custom_prompt: customPrompt,
        generated_at: new Date().toISOString()
      }
    });

    // 記事のステータスを更新
    for (const article of articles) {
      if (article.status === 'unprocessed') {
        articleModel.updateArticleStatus(article.id, 'processing');
      }
    }

    logGenerationActivity(templateType, 'success', {
      contentId: content.id,
      articleIds,
      method,
      combined: true
    });

    return {
      success: true,
      content,
      method,
      sourceArticles: articles.length
    };
  } catch (error) {
    logger.error('Combined content generation failed', {
      articleIds,
      templateType,
      error: error.message
    });

    logGenerationActivity(templateType, 'error', {
      articleIds,
      error: error.message,
      combined: true
    });

    throw error;
  }
}

/**
 * コンテンツを再生成
 */
export async function regenerateContent(contentId, options = {}) {
  const existingContent = contentModel.getContentById(contentId);

  if (!existingContent) {
    throw new Error('Content not found');
  }

  // 元の記事から再生成
  const result = await generateContentFromArticle(
    existingContent.article_id,
    existingContent.template_type,
    {
      ...options,
      generatedBy: options.generatedBy || 'system'
    }
  );

  // 古いコンテンツを削除（オプション）
  if (options.replaceOld) {
    contentModel.deleteContent(contentId);
  }

  return result;
}

/**
 * コンテンツをプレビュー（保存せず生成のみ）
 */
export async function previewContent(articleId, templateType, options = {}) {
  const article = articleModel.getArticleById(articleId);

  if (!article) {
    throw new Error('Article not found');
  }

  const { customPrompt = null, useDify = true } = options;

  let generatedContent;
  let method = 'template';

  if (useDify) {
    const result = await difyService.generateContent(article, templateType, customPrompt);

    if (!result.success) {
      throw new Error(result.error || 'Dify generation failed');
    }

    generatedContent = result.answer || result.outputs?.result || result.outputs?.content || result.data;
    method = 'dify';
  } else {
    generatedContent = generateArticleTemplate(article, templateType);
    method = 'template';
  }

  return {
    success: true,
    preview: generatedContent,
    method,
    article: {
      id: article.id,
      title: article.title,
      url: article.url
    }
  };
}

/**
 * テンプレート一覧を取得
 */
export function getAvailableTemplates() {
  return [
    {
      id: 'tutorial',
      name: 'チュートリアル',
      description: '初心者向けの詳細なチュートリアル記事',
      icon: '📚',
      recommendedFor: ['technical', 'how-to']
    },
    {
      id: 'note-article',
      name: 'note記事',
      description: 'noteプラットフォーム向けの記事下書き',
      icon: '📝',
      recommendedFor: ['general', 'opinion']
    },
    {
      id: 'threads-post',
      name: 'Threads投稿',
      description: '速報・Tipsのための短文投稿',
      icon: '🧵',
      recommendedFor: ['news', 'tips']
    },
    {
      id: 'slide-outline',
      name: 'スライド構成',
      description: '勉強会用のスライド構成案',
      icon: '📊',
      recommendedFor: ['presentation', 'workshop']
    },
    {
      id: 'blog-post',
      name: 'ブログ記事',
      description: 'SEOを意識したブログ記事',
      icon: '✍️',
      recommendedFor: ['marketing', 'seo']
    },
    {
      id: 'email-newsletter',
      name: 'メルマガ',
      description: '読者を引きつけるニュースレター',
      icon: '📧',
      recommendedFor: ['marketing', 'communication']
    },
    {
      id: 'summary',
      name: '要約',
      description: '長文記事のポイント要約',
      icon: '💡',
      recommendedFor: ['learning', 'review']
    },
    {
      id: 'tweet-thread',
      name: 'X (Twitter) スレッド',
      description: '連続投稿用の短文構成',
      icon: '🐦',
      recommendedFor: ['social', 'viral']
    }
  ];
}

/**
 * 生成統計を取得
 */
export function getGenerationStats() {
  const contentStats = contentModel.getContentStats();
  const byTemplate = contentModel.getContentsByTemplate();

  return {
    overall: contentStats,
    by_template: byTemplate,
    templates: getAvailableTemplates()
  };
}

export default {
  generateContentFromArticle,
  batchGenerateContent,
  generateCombinedContent,
  regenerateContent,
  previewContent,
  getAvailableTemplates,
  getGenerationStats
};
