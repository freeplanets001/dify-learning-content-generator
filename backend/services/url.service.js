import axios from 'axios';
import * as cheerio from 'cheerio';
import logger, { logCollectionActivity } from '../utils/logger.js';
import scraperService from './scraper.service.js';

/**
 * URL コンテンツ抽出サービス
 * 任意のURLからタイトル、説明、本文を抽出
 */

/**
 * URL コンテンツ抽出サービス
 * 任意のURLからタイトル、説明、本文を抽出
 */

/**
 * URLからコンテンツを取得・抽出
 */
export async function fetchUrlContent(url) {
    try {
        logger.info(`Fetching URL content: ${url}`);

        const response = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ja,en;q=0.9'
            },
            maxRedirects: 5
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // メタデータを抽出
        const title = extractTitle($);
        const description = extractDescription($);
        const content = await extractMainContent($, url);
        const author = extractAuthor($);
        const publishedDate = extractPublishedDate($);
        const tags = extractTags($);
        const image = extractImage($, url);

        return {
            success: true,
            data: {
                url,
                title,
                description,
                content,
                author,
                published_date: publishedDate,
                tags,
                image,
                metadata: {
                    fetched_at: new Date().toISOString(),
                    content_length: content?.length || 0
                }
            }
        };
    } catch (error) {
        logger.error(`Failed to fetch URL: ${url}`, { error: error.message });
        return {
            success: false,
            error: error.message,
            url
        };
    }
}

/**
 * タイトルを抽出
 */
function extractTitle($) {
    // 優先順位: og:title > twitter:title > title tag > h1
    return (
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('title').text().trim() ||
        $('h1').first().text().trim() ||
        'Untitled'
    );
}

/**
 * 説明を抽出
 */
function extractDescription($) {
    return (
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        $('meta[name="twitter:description"]').attr('content') ||
        $('p').first().text().trim().substring(0, 300) ||
        ''
    );
}

/**
 * メインコンテンツを抽出
 */
async function extractMainContent($, url) {
    if (!url) return '';

    // scraperServiceを使ってコンテンツを取得（Markdown形式）
    // 既存の$（cheerioインスタンス）は使わず、scraperService内で再取得する形になるが、
    // turndownなどのロジックを一元管理するため許容する。
    try {
        const result = await scraperService.fetchArticleContent(url);
        if (result && result.content) {
            return result.content;
        }
    } catch (e) {
        logger.warn(`Scraper service failed for ${url}, fallback to basic extraction: ${e.message}`);
    }

    // 不要な要素を削除
    $('script, style, nav, header, footer, aside, .sidebar, .navigation, .menu, .ad, .advertisement, .comment, .comments').remove();

    // フォールバック: bodyから抽出
    return cleanText($('body').text()).substring(0, 5000);
}

/**
 * 著者を抽出
 */
function extractAuthor($) {
    return (
        $('meta[name="author"]').attr('content') ||
        $('meta[property="article:author"]').attr('content') ||
        $('[rel="author"]').text().trim() ||
        $('.author').first().text().trim() ||
        null
    );
}

/**
 * 公開日を抽出
 */
function extractPublishedDate($) {
    const dateStr = (
        $('meta[property="article:published_time"]').attr('content') ||
        $('meta[name="date"]').attr('content') ||
        $('time[datetime]').attr('datetime') ||
        $('time').first().text().trim() ||
        null
    );

    if (dateStr) {
        try {
            return new Date(dateStr).toISOString();
        } catch {
            return dateStr;
        }
    }
    return null;
}

/**
 * タグ/キーワードを抽出
 */
function extractTags($) {
    const tags = [];

    // meta keywordsから
    const keywords = $('meta[name="keywords"]').attr('content');
    if (keywords) {
        tags.push(...keywords.split(',').map(k => k.trim()).filter(k => k));
    }

    // article:tagから
    $('meta[property="article:tag"]').each((_, el) => {
        const tag = $(el).attr('content');
        if (tag) tags.push(tag.trim());
    });

    return [...new Set(tags)].slice(0, 10);
}

/**
 * OGP画像を抽出
 */
function extractImage($, baseUrl) {
    const imagePath = (
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        $('img').first().attr('src') ||
        null
    );

    if (imagePath) {
        try {
            return new URL(imagePath, baseUrl).href;
        } catch {
            return imagePath;
        }
    }
    return null;
}

/**
 * テキストをクリーンアップ
 */
function cleanText(text) {
    return text
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();
}

/**
 * 複数URLをバッチ収集
 */
export async function fetchMultipleUrls(urls) {
    const results = [];

    for (const url of urls) {
        const result = await fetchUrlContent(url);
        results.push(result);

        // レート制限対策
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return {
        success: true,
        total: urls.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
    };
}

/**
 * URLを記事形式に変換
 */
export function normalizeUrlContent(data, sourceName = 'URL Import') {
    return {
        source_type: 'url',
        source_name: sourceName,
        title: data.title || 'Untitled',
        url: data.url,
        description: data.description || '',
        author: data.author || null,
        published_date: data.published_date || null,
        content: data.content || null,
        tags: data.tags || [],
        metadata: {
            ...data.metadata,
            image: data.image
        }
    };
}

export default {
    fetchUrlContent,
    fetchMultipleUrls,
    normalizeUrlContent
};
