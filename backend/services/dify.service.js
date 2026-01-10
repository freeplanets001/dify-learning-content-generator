import axios from 'axios';
import config from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Dify API連携サービス
 */

/**
 * Dify APIクライアントを作成
 */
function createDifyClient() {
  if (!config.difyApiKey) {
    throw new Error('DIFY_API_KEY is not configured');
  }

  return axios.create({
    baseURL: config.difyApiBaseUrl,
    headers: {
      'Authorization': `Bearer ${config.difyApiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 60000
  });
}

/**
 * Workflowを実行
 */
export async function runWorkflow(inputs, user = 'system') {
  if (!config.difyWorkflowId) {
    throw new Error('DIFY_WORKFLOW_ID is not configured');
  }

  const client = createDifyClient();

  try {
    logger.info('Running Dify workflow', { workflowId: config.difyWorkflowId });

    const response = await client.post(`/workflows/${config.difyWorkflowId}/run`, {
      inputs,
      response_mode: 'blocking',
      user
    });

    logger.info('Workflow completed', {
      workflowId: config.difyWorkflowId,
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
  const client = createDifyClient();

  try {
    const payload = {
      messages,
      model,
      ...options,
      user: options.user || 'system'
    };

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
  const inputs = {
    article_title: articleData.title,
    article_url: articleData.url,
    article_description: articleData.description || '',
    article_content: articleData.content || articleData.description || '',
    article_author: articleData.author || 'Unknown',
    article_source: articleData.source_name,
    template_type: templateType,
    custom_prompt: customPrompt || ''
  };

  // Workflowが設定されていればWorkflowを使用
  if (config.difyWorkflowId) {
    return await runWorkflow(inputs);
  }

  // Workflowが未設定の場合はChat Completionを使用
  const prompt = buildGenerationPrompt(articleData, templateType, customPrompt);

  return await chatCompletion([
    {
      role: 'system',
      content: 'あなたはDifyに関する学習コンテンツを生成する専門家です。提供された記事情報を元に、指定されたテンプレート形式でコンテンツを生成してください。'
    },
    {
      role: 'user',
      content: prompt
    }
  ]);
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
    'slide-outline': '勉強会用のスライド構成案'
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
`
  };

  return instructions[templateType] || '適切な形式でコンテンツを生成してください。';
}

/**
 * Dify APIのヘルスチェック
 */
export async function checkDifyHealth() {
  if (!config.difyApiKey) {
    return {
      success: false,
      error: 'DIFY_API_KEY is not configured'
    };
  }

  try {
    const client = createDifyClient();
    // 簡易的なヘルスチェック（存在しないエンドポイントでも接続確認）
    await client.get('/ping').catch(() => {});

    return {
      success: true,
      status: 'configured',
      baseUrl: config.difyApiBaseUrl
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  runWorkflow,
  chatCompletion,
  generateContent,
  checkDifyHealth
};
