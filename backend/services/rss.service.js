import Parser from 'rss-parser';
import axios from 'axios';
import dayjs from 'dayjs';
import logger, { logCollectionActivity } from '../utils/logger.js';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Dify-Learning-Collector/1.0'
  }
});

/**
 * RSSフィードを取得
 */
export async function fetchRssFeed(url) {
  try {
    logger.info(`Fetching RSS feed: ${url}`);
    const feed = await parser.parseURL(url);

    return {
      success: true,
      title: feed.title,
      description: feed.description,
      link: feed.link,
      items: feed.items || []
    };
  } catch (error) {
    logger.error(`Failed to fetch RSS feed: ${url}`, { error: error.message });
    return {
      success: false,
      error: error.message,
      items: []
    };
  }
}

/**
 * RSSアイテムを標準形式に変換
 */
export function normalizeRssItem(item, sourceName, sourceType = 'rss') {
  return {
    source_type: sourceType,
    source_name: sourceName,
    title: item.title || 'Untitled',
    url: item.link || item.guid,
    description: item.contentSnippet || item.description || '',
    author: item.creator || item.author || item['dc:creator'] || null,
    published_date: item.pubDate || item.isoDate || item.published || null,
    content: item.content || item['content:encoded'] || null,
    tags: extractTags(item),
    metadata: {
      categories: item.categories || [],
      guid: item.guid,
      enclosure: item.enclosure,
      itunes: item.itunes
    }
  };
}

/**
 * タグを抽出
 */
function extractTags(item) {
  const tags = [];

  // カテゴリからタグを抽出
  if (item.categories && Array.isArray(item.categories)) {
    tags.push(...item.categories);
  }

  // コンテンツからハッシュタグを抽出
  const content = item.content || item.description || '';
  const hashtagRegex = /#(\w+)/g;
  const hashtags = content.match(hashtagRegex);

  if (hashtags) {
    tags.push(...hashtags.map(tag => tag.substring(1)));
  }

  // 重複を削除
  return [...new Set(tags)];
}

/**
 * Dify公式ブログを収集
 */
export async function collectDifyBlog(url = 'https://dify.ai/blog/rss.xml') {
  try {
    const result = await fetchRssFeed(url);

    if (!result.success) {
      throw new Error(result.error);
    }

    const articles = result.items.map(item =>
      normalizeRssItem(item, 'Dify Blog', 'rss')
    );

    logCollectionActivity('Dify Blog', 'success', articles.length);

    return {
      success: true,
      source: 'Dify Blog',
      count: articles.length,
      articles
    };
  } catch (error) {
    logger.error('Failed to collect Dify Blog', { error: error.message });
    logCollectionActivity('Dify Blog', 'error', 0, { error: error.message });

    return {
      success: false,
      source: 'Dify Blog',
      error: error.message,
      count: 0,
      articles: []
    };
  }
}

/**
 * Qiita記事を収集
 */
export async function collectQiita(tag = 'dify') {
  const url = `https://qiita.com/tags/${tag}/feed`;

  try {
    const result = await fetchRssFeed(url);

    if (!result.success) {
      throw new Error(result.error);
    }

    const articles = result.items.map(item =>
      normalizeRssItem(item, 'Qiita Dify', 'rss')
    );

    logCollectionActivity('Qiita Dify', 'success', articles.length);

    return {
      success: true,
      source: 'Qiita Dify',
      count: articles.length,
      articles
    };
  } catch (error) {
    logger.error('Failed to collect Qiita', { error: error.message });
    logCollectionActivity('Qiita Dify', 'error', 0, { error: error.message });

    return {
      success: false,
      source: 'Qiita Dify',
      error: error.message,
      count: 0,
      articles: []
    };
  }
}

/**
 * Zenn記事を収集
 */
export async function collectZenn(topic = 'dify') {
  const url = `https://zenn.dev/topics/${topic}/feed`;

  try {
    const result = await fetchRssFeed(url);

    if (!result.success) {
      throw new Error(result.error);
    }

    const articles = result.items.map(item =>
      normalizeRssItem(item, 'Zenn Dify', 'rss')
    );

    logCollectionActivity('Zenn Dify', 'success', articles.length);

    return {
      success: true,
      source: 'Zenn Dify',
      count: articles.length,
      articles
    };
  } catch (error) {
    logger.error('Failed to collect Zenn', { error: error.message });
    logCollectionActivity('Zenn Dify', 'error', 0, { error: error.message });

    return {
      success: false,
      source: 'Zenn Dify',
      error: error.message,
      count: 0,
      articles: []
    };
  }
}

/**
 * YouTube RSSフィードを収集
 */
export async function collectYouTube(channelId) {
  if (!channelId || channelId === 'YOUR_CHANNEL_ID') {
    logger.warn('YouTube channel ID not configured');
    return {
      success: false,
      source: 'YouTube',
      error: 'Channel ID not configured',
      count: 0,
      articles: []
    };
  }

  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  try {
    const result = await fetchRssFeed(url);

    if (!result.success) {
      throw new Error(result.error);
    }

    const articles = result.items.map(item => {
      // YouTubeフィード特有の処理
      const videoId = item.id?.split(':').pop() || '';
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      return {
        source_type: 'youtube',
        source_name: 'Dify YouTube',
        title: item.title,
        url: videoUrl,
        description: item.contentSnippet || item.description || '',
        author: item.author || null,
        published_date: item.pubDate || item.isoDate,
        content: null,
        tags: ['youtube', 'video', 'dify'],
        metadata: {
          videoId,
          channelId,
          thumbnail: item.media?.thumbnail?.url
        }
      };
    });

    logCollectionActivity('YouTube', 'success', articles.length);

    return {
      success: true,
      source: 'YouTube',
      count: articles.length,
      articles
    };
  } catch (error) {
    logger.error('Failed to collect YouTube', { error: error.message });
    logCollectionActivity('YouTube', 'error', 0, { error: error.message });

    return {
      success: false,
      source: 'YouTube',
      error: error.message,
      count: 0,
      articles: []
    };
  }
}

/**
 * カスタムRSSフィードを収集
 */
export async function collectCustomFeed(url, sourceName, sourceType = 'rss') {
  try {
    const result = await fetchRssFeed(url);

    if (!result.success) {
      throw new Error(result.error);
    }

    const articles = result.items.map(item =>
      normalizeRssItem(item, sourceName, sourceType)
    );

    logCollectionActivity(sourceName, 'success', articles.length);

    return {
      success: true,
      source: sourceName,
      count: articles.length,
      articles
    };
  } catch (error) {
    logger.error(`Failed to collect ${sourceName}`, { error: error.message });
    logCollectionActivity(sourceName, 'error', 0, { error: error.message });

    return {
      success: false,
      source: sourceName,
      error: error.message,
      count: 0,
      articles: []
    };
  }
}

export default {
  fetchRssFeed,
  normalizeRssItem,
  collectDifyBlog,
  collectQiita,
  collectZenn,
  collectYouTube,
  collectCustomFeed
};
