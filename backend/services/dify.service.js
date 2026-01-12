import axios from 'axios';
import { SettingsService } from './settings.service.js';
import logger from '../utils/logger.js';

const settingsService = new SettingsService();

/**
 * Dify API連携サービス
 */

/**
 * Dify APIクライアントを作成
 */
// センシティブな値をサニタイズ（不可視文字、改行、全角スペースなどを削除）
function sanitizeValue(value) {
  if (!value) return '';
  return value
    .replace(/\s/g, '') // 全ての空白文字（スペース、タブ、改行）を削除
    .replace(/['"]/g, '') // クォート削除
    .replace(/[^\x20-\x7E]/g, '') // 非ASCII文字削除
    .trim();
}

/**
 * Dify APIクライアントを作成
 */
async function createDifyClient() {
  const settings = await settingsService.getRawSettings();

  if (!settings.difyApiKey) {
    throw new Error('DIFY_API_KEY is not configured');
  }

  // APIキーのサニタイズ（ヘッダーインジェクション対策）
  const apiKey = sanitizeValue(settings.difyApiKey);

  logger.info('Creating Dify Client', {
    baseUrl: settings.difyApiBaseUrl,
    keyPrefix: apiKey.substring(0, 8) + '...',
    workflowIdConfigured: !!settings.difyWorkflowId
  });

  return axios.create({
    baseURL: settings.difyApiBaseUrl,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 180000
  });
}

/**
 * Workflowを実行
 */
export async function runWorkflow(inputs, user = 'system') {
  const settings = await settingsService.getRawSettings();

  if (!settings.difyWorkflowId) {
    throw new Error('DIFY_WORKFLOW_ID is not configured');
  }

  const workflowId = sanitizeValue(settings.difyWorkflowId);

  try {
    const client = await createDifyClient();
    logger.info('Running Dify workflow', { workflowId });

    const response = await client.post('/workflows/run', {
      inputs,
      response_mode: 'blocking',
      user
    });

    logger.info('Workflow completed', {
      workflowId: settings.difyWorkflowId,
      status: response.data.status
    });

    return {
      success: true,
      data: response.data.data,
      outputs: response.data.data?.outputs || {},
      status: response.data.status
    };
  } catch (error) {
    logger.error('Workflow execution failed', {
      error: error.message,
      response: error.response?.data
    });

    return {
      success: false,
      error: error.message,
      details: error.response?.data
    };
  }
}

/**
 * Chat Completionを実行（テキスト生成）
 */
export async function chatCompletion(messages, model = null, options = {}) {
  try {
    const client = await createDifyClient();

    const payload = {
      inputs: options.inputs || {},
      query: options.query || messages.find(m => m.role === 'user')?.content || '',
      response_mode: 'blocking',
      user: options.user || 'system'
    };

    if (options.conversation_id) {
      payload.conversation_id = options.conversation_id;
    }

    logger.info('Running chat completion');

    const response = await client.post('/chat-messages', payload);

    return {
      success: true,
      answer: response.data.answer,
      conversation_id: response.data.conversation_id,
      message_id: response.data.message_id
    };
  } catch (error) {
    logger.error('Chat completion failed', {
      error: error.message,
      response: error.response?.data
    });

    return {
      success: false,
      error: error.message,
      details: error.response?.data
    };
  }
}

/**
 * コンテンツ生成専用ヘルパー
 */
export async function generateContent(articleData, templateType, customPrompt = null) {
  // Dify Workflow の article_content 入力パラメータは1000文字制限
  const rawContent = articleData.content || articleData.description || '';
  const truncatedContent = rawContent.length > 1000
    ? rawContent.substring(0, 997) + '...'
    : rawContent;

  const inputs = {
    article_title: articleData.title,
    article_url: articleData.url,
    article_description: articleData.description || '',
    article_content: truncatedContent,
    article_author: articleData.author || 'Unknown',
    article_source: articleData.source_name,
    template_type: templateType,
    custom_prompt: customPrompt || ''
  };

  const settings = await settingsService.getRawSettings();

  // Workflowが設定されていればWorkflowを使用
  if (settings.difyWorkflowId) {
    return await runWorkflow(inputs);
  }

  // Workflowが未設定の場合はChat Completion (Chatflow含む) を使用

  // Chatflowの場合、入力変数はinputsに、ユーザー発言はqueryに渡す必要がある
  // ここではプロンプトを入力としても渡しつつ、トリガー用のテキストも query にセットする
  return await chatCompletion([], null, {
    inputs: inputs,
    query: 'コンテンツを生成してください', // Chatflowのトリガーとなる発言
    user: 'system'
  });
}

/**
 * 生成プロンプトを構築
 */
function buildGenerationPrompt(articleData, templateType, customPrompt) {
  let basePrompt = `
以下の記事情報を元に、${getTemplateDescription(templateType)}を生成してください。

【記事情報】
タイトル: ${articleData.title}
URL: ${articleData.url}
説明: ${articleData.description || 'なし'}
著者: ${articleData.author || '不明'}
ソース: ${articleData.source_name}

${articleData.content ? `内容:\n${articleData.content.substring(0, 1000)}...` : ''}
`;

  if (customPrompt) {
    basePrompt += `\n\n【追加指示】\n${customPrompt}`;
  }

  basePrompt += `\n\n${getTemplateInstructions(templateType)}`;

  return basePrompt;
}

/**
 * テンプレートの説明を取得
 */
function getTemplateDescription(templateType) {
  const descriptions = {
    'tutorial': '初心者向けの詳細なチュートリアル記事',
    'note-article': 'noteプラットフォーム向けの記事下書き',
    'threads-post': 'Threadsでの短文投稿（300文字程度）',
    'slide-outline': '勉強会用のスライド構成案',
    'blog-post': 'SEOを意識したブログ記事',
    'email-newsletter': '読者向けニュースレター',
    'summary': '要点まとめ',
    'tweet-thread': 'X(Twitter)用スレッド'
  };

  return descriptions[templateType] || 'コンテンツ';
}

/**
 * テンプレート別の生成指示を取得
 */
function getTemplateInstructions(templateType) {
  const instructions = {
    'tutorial': `
【生成フォーマット】
# タイトル

## 概要
（この記事で学べることを3行程度で説明）

## 前提知識
- 必要な知識1
- 必要な知識2

## 手順
### ステップ1: （タイトル）
（詳細な説明）

### ステップ2: （タイトル）
（詳細な説明）

## まとめ
（学んだことのまとめ）

---
参照元: [元記事タイトル](URL)
`,
    'note-article': `
【生成フォーマット】
# タイトル

（導入文：なぜこの記事を書くのか）

## 本題
（メインコンテンツ）

## 実践例
（具体例や使用方法）

## まとめ
（結論）

---
参照: [元記事](URL)
`,
    'threads-post': `
【生成フォーマット】
（絵文字）（キャッチーなタイトル）

（要点を2-3行で）

詳細はこちら👇
（URL）

#Dify #AI #NoCode
`,
    'slide-outline': `
【生成フォーマット】
# スライドタイトル

## スライド1: タイトルスライド
- タイトル: （タイトル）
- サブタイトル: （サブタイトル）

## スライド2: アジェンダ
1. （項目1）
2. （項目2）
3. （項目3）

## スライド3-5: メインコンテンツ
（各スライドの内容）

## スライド6: まとめ
- （要点1）
- （要点2）

## スライド7: 参考資料
- 元記事: （URL）
`,
    'blog-post': `
【生成フォーマット】
# タイトル（検索意図を意識した魅力的なもの）

## はじめに
（読者の共感を呼ぶ導入、この記事で解決できること）

## 見出しH2
（本文）

### 小見出しH3
（詳細）

## まとめ
（要点の振り返りとネクストアクション）
`,
    'email-newsletter': `
【生成フォーマット】
件名: （開封したくなる件名）

こんにちは、（名前）です。

（時候の挨拶や最近のトピック）

さて、今回は「（記事タイトル）」について紹介します。

## ポイント
1. （ポイント1）
2. （ポイント2）
3. （ポイント3）

詳細はこちらの記事をご覧ください👇
（記事URL）

それでは、また次回のメールでお会いしましょう！
`,
    'summary': `
【生成フォーマット】
# 記事要約: （タイトル）

## 💡 3行でまとめ
- （要点1）
- （要点2）
- （要点3）

## 🔑 キーワード
- （キーワード1）: （説明）
- （キーワード2）: （説明）

## 📝 詳細メモ
（重要なポイントを箇条書きで）
`,
    'tweet-thread': `
【生成フォーマット】
[1/5]
（フックとなる1ツイート目。興味を引く内容）
👇

[2/5]
（内容1）

[3/5]
（内容2）

[4/5]
（内容3）

[5/5]
まとめ：
・（要点1）
・（要点2）
・（要点3）

詳細はこちらの記事で解説しています！
（記事URL）
#タグ #タグ
`
  };

  return instructions[templateType] || '適切な形式でコンテンツを生成してください。';
}

/**
 * Dify APIのヘルスチェック
 */
export async function checkDifyHealth() {
  const settings = await settingsService.getRawSettings();

  if (!settings.difyApiKey) {
    return {
      success: false,
      error: 'DIFY_API_KEY is not configured'
    };
  }

  const client = await createDifyClient();

  // 接続テスト: アプリケーション情報の取得を試みる
  // Workflow AppとChat Appで共通して使える可能性が高いエンドポイント
  // または、設定に応じて使い分ける
  try {
    if (settings.difyWorkflowId) {
      // Workflowの場合、meta情報は取得できないことが多いので、パラメータチェックなどを試す
      // ただし、Workflow実行用トークンでは制限がきつい場合がある
      // ここでは簡易的に、401が返るかどうかだけで判断する実用的な実装にする
      await client.get('/parameters');
    } else {
      await client.get('/parameters');
    }
  } catch (e) {
    // 401/403は明確な設定ミス
    if (e.response && (e.response.status === 401 || e.response.status === 403)) {
      return {
        success: false,
        error: '認証に失敗しました。API Keyが正しいか確認してください。(401 Unauthorized)'
      };
    }
    // 404は「エンドポイントがない」だけなので、接続自体（認証）は成功しているとみなす場合もあるが、
    // Difyの場合は/parametersは存在するはず。
    // ただし、Workflow API Keyだと/parametersが見えない可能性があるため、
    // エラー内容を見て判断
    if (e.response && e.response.status === 404) {
      // 404なら一旦OKとする（認証は通っている可能性が高い）
    } else {
      throw e; // その他のエラーはそのまま投げる
    }
  }

  return {
    success: true,
    status: 'configured',
    baseUrl: settings.difyApiBaseUrl
  };
};


export default {
  runWorkflow,
  chatCompletion,
  generateContent,
  checkDifyHealth
};
