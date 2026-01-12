import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import logger from '../utils/logger.js';

/**
 * Scraper Service - 記事の全文を取得・抽出
 */

// Turndown設定（HTMLをMarkdownに変換）
const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    strongDelimiter: '**',
    emDelimiter: '*'
});

// 画像のdata-src属性も処理
turndownService.addRule('lazyImages', {
    filter: 'img',
    replacement: function (content, node) {
        const src = node.getAttribute('src') || node.getAttribute('data-src') ||
            node.getAttribute('data-original') || node.getAttribute('data-lazy-src');
        const alt = node.getAttribute('alt') || 'image';

        // data:URLやtiny placeholderはスキップ
        if (!src || src.startsWith('data:') || src.length < 20) {
            return '';
        }
        return `\n\n![${alt}](${src})\n\n`;
    }
});

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

/**
 * URLから記事の本文を取得
 */
export async function fetchArticleContent(url) {
    if (!url) return null;

    // YouTubeやPDFなどはスキップ
    if (isSkipUrl(url)) {
        return null;
    }

    try {
        logger.debug(`Fetching content: ${url}`);

        const response = await axios.get(url, {
            headers: { 'User-Agent': USER_AGENT },
            timeout: 10000 // 10秒タイムアウト
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // ベースURLを取得（相対パスを絶対パスに変換用）
        const baseUrl = new URL(url);

        // 全ての画像URLを絶対パスに変換
        $('img').each((i, img) => {
            const $img = $(img);
            let src = $img.attr('src');
            if (src) {
                // data:URLはスキップ
                if (src.startsWith('data:')) return;
                // 相対パスを絶対パスに変換
                if (!src.startsWith('http://') && !src.startsWith('https://')) {
                    if (src.startsWith('//')) {
                        src = baseUrl.protocol + src;
                    } else if (src.startsWith('/')) {
                        src = baseUrl.origin + src;
                    } else {
                        src = new URL(src, url).href;
                    }
                    $img.attr('src', src);
                }
            }
        });

        // OGP画像を取得（記事のサムネイルとして使用）
        const ogImage = $('meta[property="og:image"]').attr('content') ||
            $('meta[name="twitter:image"]').attr('content') ||
            $('article img').first().attr('src') ||
            '';

        // 不要な要素を削除
        $('script, style, nav, footer, iframe, form, noscript, .ad, .advertisement, #comments, .comments, aside, .sidebar').remove();
        $('[aria-hidden="true"]').remove(); // アイコンなどの非表示要素

        // メインコンテンツの推定（一般的によく使われるセレクタ + サイト固有）
        let $content = null;
        const selectors = [
            '.o-noteContentText', // note.com
            '.note-common-styles__textnote-body', // note.com alternative
            '.it-MdContent', // Qiita
            '.zenn-embedded-markdown', // Zenn
            'article .content',
            'article',
            '[role="main"]',
            '.post-content',
            '.entry-content',
            '.article-body',
            '.markdown-body',
            '#main-content',
            'main'
        ];

        for (const selector of selectors) {
            if ($(selector).length > 0) {
                $content = $(selector).first();
                break;
            }
        }

        // セレクタで見つからない場合はbodyを使う（最終手段）
        if (!$content) {
            logger.info('Content selector not found, using body');
            $content = $('body');
        } else {
            logger.info('Content selector found', { htmlLength: $content.html()?.length });
        }

        // HTMLをMarkdownに変換（turndown使用）
        const contentHtml = $content.html();
        const markdown = turndownService.turndown(contentHtml || '');

        logger.info('Markdown generated', { length: markdown.length, preview: markdown.substring(0, 100) });

        // 画像URLリストを抽出
        const images = [];
        $content.find('img').each((i, img) => {
            const src = $(img).attr('src');
            if (src && !src.startsWith('data:')) {
                images.push(src);
            }
        });

        // コンテンツとメタデータを返す
        return {
            content: markdown,
            images: images,
            ogImage: ogImage
        };

    } catch (error) {
        logger.warn(`Failed to scrape content: ${url}`, { error: error.message });
        return null; // 失敗してもcollection自体は止めない
    }
}

/**
 * HTMLをMarkdownに変換（簡易実装）
 */
function convertHtmlToMarkdown($, $element) {
    if (!$element) return '';

    let markdown = '';

    $element.contents().each((i, el) => {
        const type = el.type;
        const tagName = el.tagName;
        const $el = $(el);

        if (type === 'text') {
            markdown += $el.text();
            return;
        }

        if (type === 'tag') {
            // 要素ごとの処理
            switch (tagName) {
                case 'h1':
                case 'h2':
                case 'h3':
                case 'h4':
                case 'h5':
                case 'h6':
                    const level = parseInt(tagName.substring(1));
                    markdown += '\n\n' + '#'.repeat(level) + ' ' + $el.text().trim() + '\n\n';
                    break;

                case 'p':
                    const text = convertHtmlToMarkdown($, $el).trim();
                    if (text) markdown += '\n\n' + text + '\n\n';
                    break;

                case 'br':
                    markdown += '\n';
                    break;

                case 'ul':
                case 'ol':
                    markdown += '\n' + convertList($, $el, tagName === 'ol') + '\n';
                    break;

                case 'li':
                    // 親が処理するが、単体できた場合
                    markdown += '- ' + convertHtmlToMarkdown($, $el).trim() + '\n';
                    break;

                case 'pre':
                    // コードブロック
                    const codeContent = $el.text(); // preの中身は基本テキスト
                    markdown += '\n```\n' + codeContent + '\n```\n';
                    break;

                case 'code':
                    // インラインコード（preの中にある場合は親で処理されることが多いが簡易的に）
                    if ($el.parent().is('pre')) {
                        // 親がpreなら何もしない
                    } else {
                        markdown += ' `' + $el.text() + '` ';
                    }
                    break;

                case 'blockquote':
                    markdown += '\n> ' + convertHtmlToMarkdown($, $el).trim().replace(/\n/g, '\n> ') + '\n\n';
                    break;

                case 'a':
                    markdown += '[' + $el.text() + '](' + ($el.attr('href') || '') + ')';
                    break;

                case 'img':
                    const alt = $el.attr('alt') || 'image';
                    // 遅延読み込み画像も取得（data-src, data-original, data-lazy-src など）
                    let src = $el.attr('src') || $el.attr('data-src') || $el.attr('data-original') ||
                        $el.attr('data-lazy-src') || $el.attr('data-srcset')?.split(' ')[0] || '';
                    // data:URLやtiny placeholderはスキップ
                    if (src && !src.startsWith('data:') && src.length > 50) {
                        markdown += `\n\n![${alt}](${src})\n\n`;
                    }
                    break;

                case 'strong':
                case 'b':
                    markdown += '**' + convertHtmlToMarkdown($, $el) + '**';
                    break;

                case 'em':
                case 'i':
                    markdown += '*' + convertHtmlToMarkdown($, $el) + '*';
                    break;

                case 'div':
                case 'section':
                case 'article':
                case 'span':
                    // コンテナ要素は再帰的に処理
                    markdown += convertHtmlToMarkdown($, $el);
                    break;

                default:
                    // その他のタグも中身は処理する
                    markdown += convertHtmlToMarkdown($, $el);
            }
        }
    });

    return cleanText(markdown);
}

function convertList($, $list, isOrdered) {
    let output = '';
    $list.children('li').each((i, li) => {
        const content = convertHtmlToMarkdown($, $(li)).trim();
        if (isOrdered) {
            output += `${i + 1}. ${content}\n`;
        } else {
            output += `- ${content}\n`;
        }
    });
    return output;
}
/**
 * テキストのクリーニング
 */
function cleanText(text) {
    if (!text) return null;

    return text
        .replace(/null/g, '')  // 'null'文字列を削除
        .replace(/undefined/g, '')  // 'undefined'文字列を削除
        .replace(/\[(.*?)\]\(\)/g, '$1')  // 空リンクをテキストのみに
        .replace(/!\[.*?\]\(\)/g, '')  // src無しの画像タグを削除
        .replace(/\n\s+\n/g, '\n\n') // 空白のみの行を削除
        .replace(/\n{3,}/g, '\n\n') // 3つ以上の改行を2つに
        .replace(/\s{3,}/g, ' ')  // 3つ以上のスペースを1つに
        .trim();
}

/**
 * スキップすべきURLか判定
 */
function isSkipUrl(url) {
    const skipExtensions = ['.pdf', '.jpg', '.png', '.gif', '.mp4', '.mp3'];
    const skipDomains = ['youtube.com', 'youtu.be', 'twitter.com', 'x.com'];

    if (skipExtensions.some(ext => url.toLowerCase().endsWith(ext))) return true;
    if (skipDomains.some(domain => url.includes(domain))) return true;

    return false;
}

export default {
    fetchArticleContent
};
