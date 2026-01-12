import * as rssService from './rss.service.js';
import * as gasService from './gas.service.js';
import * as articleModel from '../models/article.model.js';
import * as configModel from '../models/config.model.js';
import logger, { logCollectionActivity } from '../utils/logger.js';
import config from '../config/env.js';

/**
 * 収集オーケストレーター
 * 複数のソースから情報を収集し、データベースに保存
 */

/**
 * 全ソースから収集
 */
export async function collectFromAllSources() {
  logger.info('Starting collection from all sources');

  const dataSources = configModel.getAllDataSources(true); // 有効なソースのみ
  const results = [];

  for (const source of dataSources) {
    try {
      const result = await collectFromSource(source);
      results.push(result);

      // 収集情報を更新
      configModel.updateDataSourceCollection(source.id, result.success);
    } catch (error) {
      logger.error(`Failed to collect from ${source.name}`, { error: error.message });
      configModel.updateDataSourceCollection(source.id, false);

      results.push({
        success: false,
        source: source.name,
        error: error.message,
        saved: 0,
        duplicates: 0
      });
    }
  }

  const summary = {
    total_sources: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    total_collected: results.reduce((sum, r) => sum + (r.saved || 0), 0),
    total_duplicates: results.reduce((sum, r) => sum + (r.duplicates || 0), 0),
    results
  };

  logger.info('Collection completed', summary);

  return summary;
}

/**
 * 特定のソースから収集
 */
export async function collectFromSource(source) {
  logger.info(`Collecting from source: ${source.name} (${source.type})`);

  let articles = [];

  // ソースタイプに応じた収集処理
  switch (source.type) {
    case 'rss':
      articles = await collectFromRss(source);
      break;

    case 'youtube':
      articles = await collectFromYouTube(source);
      break;

    case 'gas':
      articles = await collectFromGas(source);
      break;

    default:
      throw new Error(`Unsupported source type: ${source.type}`);
  }

  // データベースに保存（重複チェック付き）
  const saveResult = await saveArticles(articles);

  return {
    success: true,
    source: source.name,
    type: source.type,
    collected: articles.length,
    saved: saveResult.saved,
    duplicates: saveResult.duplicates,
    errors: saveResult.errors
  };
}

/**
 * RSSソースから収集
 */
async function collectFromRss(source) {
  const result = await rssService.collectCustomFeed(
    source.url,
    source.name,
    source.type
  );

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.articles;
}

/**
 * YouTubeソースから収集
 */
async function collectFromYouTube(source) {
  const channelId = source.url?.split('channel_id=')[1] || source.config?.channelId;

  const result = await rssService.collectYouTube(channelId);

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.articles;
}

/**
 * GASソースから収集
 */
async function collectFromGas(source) {
  const action = source.config?.action || 'collect_all';

  const result = await gasService.executeCustomAction(action, {
    source: source.name
  });

  if (!result.success) {
    throw new Error(result.error || 'GAS execution failed');
  }

  // GASからの結果を標準形式に変換
  const articles = result.data?.items || result.data?.articles || [];

  return articles.map(item => ({
    source_type: 'gas',
    source_name: source.name,
    title: item.title,
    url: item.url || item.link,
    description: item.description || item.summary,
    author: item.author,
    published_date: item.published_date || item.pubDate,
    content: item.content,
    tags: item.tags || [],
    metadata: item.metadata || {}
  }));
}

/**
 * 記事をデータベースに保存（重複チェック付き）
 */
import * as obsidianService from './obsidian.service.js';
import * as scraperService from './scraper.service.js';

/**
 * 記事をデータベースに保存（重複チェック付き）
 */
async function saveArticles(articles) {
  let saved = 0;
  let duplicates = 0;
  const errors = [];
  const newArticles = []; // 新規保存された記事（同期用）

  for (const article of articles) {
    try {
      // 重複チェック
      const existing = articleModel.findArticleByUrl(article.url);

      if (existing) {
        duplicates++;
        logger.debug(`Duplicate article: ${article.url}`);
        continue;
      }

      // [New] 全文取得（スクレイピング）
      // コンテンツが空、または短すぎる場合（500文字未満）はスクレイピングを試みる
      if (!article.content || article.content.length < 500) {
        const scrapeResult = await scraperService.fetchArticleContent(article.url);
        // 取得したコンテンツが元のコンテンツより長い場合のみ更新
        if (scrapeResult) {
          const fullContent = scrapeResult.content || scrapeResult;
          if (typeof fullContent === 'string' && fullContent.length > (article.content?.length || 0)) {
            article.content = fullContent;
            // 画像情報も保存
            if (scrapeResult.images && scrapeResult.images.length > 0) {
              article.metadata = article.metadata || {};
              article.metadata.images = scrapeResult.images;
            }
            if (scrapeResult.ogImage) {
              article.metadata = article.metadata || {};
              article.metadata.ogImage = scrapeResult.ogImage;
            }
            logger.debug(`Enriched content for: ${article.title} (${fullContent.length} chars, ${scrapeResult.images?.length || 0} images)`);
          }
        }
      }

      // 新規記事を保存
      articleModel.createArticle(article);
      saved++;
      newArticles.push(article);

      logger.debug(`Saved article: ${article.title}`);
    } catch (error) {
      logger.error(`Failed to save article: ${article.title}`, {
        error: error.message
      });
      errors.push({
        title: article.title,
        url: article.url,
        error: error.message
      });
    }
  }

  // 同期処理（非同期で実行し、ユーザーへのレスポンスは待たせない）
  if (newArticles.length > 0) {
    (async () => {
      try {
        // 1. Google Sheetsへ同期
        // 設定はgasService内部で動的に読み込まれるため、ここでは常に呼び出す
        logger.info(`Syncing ${newArticles.length} articles to GAS...`);
        await gasService.syncArticlesToGas(newArticles);

        // 2. Obsidianへ同期 (Daily Note)
        const vaultConfig = await obsidianService.getVaultConfig();
        if (vaultConfig.enabled) {
          logger.info(`Syncing ${newArticles.length} articles to Obsidian...`);
          // 本日のDaily Noteを更新（新規記事を含む）
          const noteResult = await obsidianService.generateDailyNoteFile(null, {
            includeUnprocessed: true,
            includeProcessed: true,
            markAsProcessed: true // 同期後にステータスを処理済みに更新
          });

          logger.info(`Obsidian sync completed`, {
            date: noteResult.date,
            path: noteResult.filePath,
            items: noteResult.articleCount
          });
        }
      } catch (syncError) {
        logger.error('Background sync failed:', syncError);
      }
    })();
  }

  return { saved, duplicates, errors };
}

/**
 * 特定のソースIDから収集
 */
export async function collectFromSourceById(sourceId) {
  const source = configModel.getDataSource(sourceId);

  if (!source) {
    throw new Error(`Source not found: ${sourceId}`);
  }

  if (!source.enabled) {
    throw new Error(`Source is disabled: ${source.name}`);
  }

  return await collectFromSource(source);
}

/**
 * Difyブログから収集（直接）
 */
export async function collectDifyBlog() {
  const result = await rssService.collectDifyBlog(config.difyBlogRss);

  if (!result.success) {
    throw new Error(result.error);
  }

  const saveResult = await saveArticles(result.articles);

  return {
    success: true,
    source: 'Dify Blog',
    collected: result.count,
    ...saveResult
  };
}

/**
 * Qiitaから収集（直接）
 */
export async function collectQiita() {
  const result = await rssService.collectQiita();

  if (!result.success) {
    throw new Error(result.error);
  }

  const saveResult = await saveArticles(result.articles);

  return {
    success: true,
    source: 'Qiita',
    collected: result.count,
    ...saveResult
  };
}

/**
 * Zennから収集（直接）
 */
export async function collectZenn() {
  const result = await rssService.collectZenn();

  if (!result.success) {
    throw new Error(result.error);
  }

  const saveResult = await saveArticles(result.articles);

  return {
    success: true,
    source: 'Zenn',
    collected: result.count,
    ...saveResult
  };
}

/**
 * GASトリガー経由で全ソース収集
 */
export async function triggerGasCollection() {


  const result = await gasService.triggerCollectAll();

  if (!result.success) {
    throw new Error(result.error || 'GAS trigger failed');
  }

  return {
    success: true,
    message: 'GAS collection triggered',
    data: result.data
  };
}

/**
 * 収集ステータスを取得
 */
export function getCollectionStatus() {
  const sources = configModel.getAllDataSources();
  const stats = articleModel.getArticleStats();

  return {
    total_sources: sources.length,
    enabled_sources: sources.filter(s => s.enabled).length,
    articles: stats,
    sources: sources.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      enabled: s.enabled,
      last_collected: s.last_collected_at,
      collection_count: s.collection_count,
      error_count: s.error_count
    }))
  };
}

export default {
  collectFromAllSources,
  collectFromSource,
  collectFromSourceById,
  collectDifyBlog,
  collectQiita,
  collectZenn,
  triggerGasCollection,
  getCollectionStatus,
  saveArticles
};
