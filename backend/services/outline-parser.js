/**
 * スライド構成案パーサー
 * Markdown形式の構成案をスライド用JSON構造に変換
 */

/**
 * Markdown構成案をパースしてスライド構造に変換
 * @param {string} markdown - スライド構成案のMarkdown
 * @returns {Object} パース結果
 */
export function parseSlideOutline(markdown) {
    if (!markdown || typeof markdown !== 'string') {
        return { slides: [], metadata: {} };
    }

    const lines = markdown.split('\n');
    const slides = [];
    let currentSlide = null;
    let metadata = {
        title: '',
        author: '',
        date: new Date().toISOString().split('T')[0]
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // 空行はスキップ
        if (!line) continue;

        // メインタイトル (# タイトル)
        if (line.startsWith('# ') && !line.startsWith('## ')) {
            metadata.title = line.substring(2).trim();
            continue;
        }

        // スライドタイトル (## スライドN: タイトル)
        if (line.startsWith('## ')) {
            // 前のスライドを保存
            if (currentSlide) {
                slides.push(currentSlide);
            }

            const slideTitle = line.substring(3).trim();
            // "スライド1:" や "1." などのプレフィックスを除去
            const cleanTitle = slideTitle
                .replace(/^スライド\d+[：:]\s*/i, '')
                .replace(/^\d+\.\s*/, '')
                .trim();

            currentSlide = {
                id: slides.length + 1,
                type: detectSlideType(cleanTitle),
                title: cleanTitle,
                content: [],
                notes: '',
                imagePrompt: null
            };
            continue;
        }

        // スライド内のコンテンツ
        if (currentSlide) {
            // 箇条書き
            if (line.startsWith('- ') || line.startsWith('* ')) {
                const item = line.substring(2).trim();
                // キー: 値 形式の処理
                if (item.includes(':') || item.includes('：')) {
                    const [key, ...valueParts] = item.split(/[：:]/);
                    const value = valueParts.join(':').trim();
                    if (key && value) {
                        currentSlide.content.push({
                            type: 'keyValue',
                            key: key.trim(),
                            value: value
                        });
                    } else {
                        currentSlide.content.push({
                            type: 'bullet',
                            text: item
                        });
                    }
                } else {
                    currentSlide.content.push({
                        type: 'bullet',
                        text: item
                    });
                }
            }
            // 番号付きリスト
            else if (/^\d+\.\s/.test(line)) {
                const item = line.replace(/^\d+\.\s*/, '').trim();
                currentSlide.content.push({
                    type: 'numbered',
                    text: item
                });
            }
            // 括弧内のテキスト（説明文）
            else if (line.startsWith('（') || line.startsWith('(')) {
                currentSlide.content.push({
                    type: 'description',
                    text: line.replace(/^[（(]|[)）]$/g, '').trim()
                });
            }
            // その他のテキスト
            else if (!line.startsWith('#')) {
                currentSlide.content.push({
                    type: 'text',
                    text: line
                });
            }
        }
    }

    // 最後のスライドを追加
    if (currentSlide) {
        slides.push(currentSlide);
    }

    // 画像プロンプトを自動生成
    slides.forEach(slide => {
        slide.imagePrompt = generateImagePrompt(slide);
    });

    return {
        metadata,
        slides,
        slideCount: slides.length
    };
}

/**
 * スライドタイプを検出
 */
function detectSlideType(title) {
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('タイトル') || lowerTitle.includes('title')) {
        return 'title';
    }
    if (lowerTitle.includes('アジェンダ') || lowerTitle.includes('目次') || lowerTitle.includes('agenda')) {
        return 'agenda';
    }
    if (lowerTitle.includes('まとめ') || lowerTitle.includes('summary') || lowerTitle.includes('結論')) {
        return 'summary';
    }
    if (lowerTitle.includes('参考') || lowerTitle.includes('reference') || lowerTitle.includes('資料')) {
        return 'reference';
    }
    if (lowerTitle.includes('q&a') || lowerTitle.includes('質問')) {
        return 'qa';
    }

    return 'content';
}

/**
 * スライド内容から画像生成用プロンプトを生成
 */
function generateImagePrompt(slide) {
    const { type, title, content } = slide;

    // タイトルスライドや参考資料スライドは画像不要
    if (['title', 'reference', 'qa'].includes(type)) {
        return null;
    }

    // コンテンツからキーワードを抽出
    const keywords = [];
    keywords.push(title);

    content.forEach(item => {
        if (item.type === 'bullet' || item.type === 'text') {
            keywords.push(item.text);
        }
    });

    const keywordText = keywords.slice(0, 3).join(' ');

    return `Professional presentation illustration for: ${keywordText}. Modern, clean, minimalist style, suitable for business presentation, high quality, vector-like graphics`;
}

/**
 * スライド構造をバリデート
 */
export function validateSlideStructure(parsedData) {
    const errors = [];

    if (!parsedData.slides || parsedData.slides.length === 0) {
        errors.push('No slides found in the outline');
    }

    if (parsedData.slides.length > 30) {
        errors.push('Too many slides (max 30)');
    }

    parsedData.slides.forEach((slide, index) => {
        if (!slide.title) {
            errors.push(`Slide ${index + 1} has no title`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
}

export default {
    parseSlideOutline,
    validateSlideStructure
};
