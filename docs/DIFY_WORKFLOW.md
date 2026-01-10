# Dify Workflow 設定ガイド

このガイドでは、コンテンツ生成用のDify Workflowを設定する方法を説明します。

## 前提条件

- [Dify](https://dify.ai/)のアカウント
- API Keyの取得

## Workflow概要

このプロジェクトで使用するWorkflowは、記事情報を入力として受け取り、指定されたテンプレート形式でコンテンツを生成します。

### 入力変数

| 変数名 | 型 | 説明 |
|--------|-----|------|
| `article_title` | String | 記事のタイトル |
| `article_url` | String | 記事のURL |
| `article_description` | String | 記事の説明 |
| `article_content` | String | 記事の本文（抜粋） |
| `article_author` | String | 記事の著者 |
| `article_source` | String | 記事のソース名 |
| `template_type` | String | テンプレートタイプ（tutorial/note-article/threads-post/slide-outline） |
| `custom_prompt` | String | カスタムプロンプト（オプション） |

### 出力変数

| 変数名 | 型 | 説明 |
|--------|-----|------|
| `content` | String | 生成されたコンテンツ |
| `metadata` | Object | メタデータ（オプション） |

## Workflow作成手順

### 1. Difyにログイン

https://cloud.dify.ai/ にアクセスしてログイン

### 2. 新しいワークフローを作成

1. 「Studio」→「Create」→「Workflow」を選択
2. ワークフロー名: `Content Generator for Learning Materials`
3. 説明: `Dify学習コンテンツ自動生成ワークフロー`

### 3. 入力ノードを設定

**Start ノード**を開き、以下の変数を追加：

```json
{
  "article_title": {
    "type": "string",
    "required": true,
    "description": "記事のタイトル"
  },
  "article_url": {
    "type": "string",
    "required": true,
    "description": "記事のURL"
  },
  "article_description": {
    "type": "string",
    "required": false,
    "description": "記事の説明"
  },
  "article_content": {
    "type": "string",
    "required": false,
    "description": "記事の本文"
  },
  "article_author": {
    "type": "string",
    "required": false,
    "description": "著者名"
  },
  "article_source": {
    "type": "string",
    "required": true,
    "description": "ソース名（例: Dify Blog）"
  },
  "template_type": {
    "type": "select",
    "required": true,
    "options": ["tutorial", "note-article", "threads-post", "slide-outline"],
    "description": "テンプレートタイプ"
  },
  "custom_prompt": {
    "type": "string",
    "required": false,
    "description": "カスタムプロンプト"
  }
}
```

### 4. 条件分岐ノードを追加

**Condition ノード**を追加してテンプレートタイプで分岐：

- 条件1: `template_type == "tutorial"`
- 条件2: `template_type == "note-article"`
- 条件3: `template_type == "threads-post"`
- 条件4: `template_type == "slide-outline"`

### 5. LLMノードを各分岐に追加

#### Tutorial用LLMノード

**System Prompt:**
```
あなたはDifyに関する技術記事を書く専門家です。
初心者でも理解できる、詳細で実践的なチュートリアル記事を作成してください。
```

**User Prompt:**
```
以下の記事情報を元に、初心者向けの詳細なチュートリアル記事を日本語で生成してください。

【記事情報】
タイトル: {{article_title}}
URL: {{article_url}}
説明: {{article_description}}
著者: {{article_author}}
ソース: {{article_source}}

{{#if article_content}}
内容:
{{article_content}}
{{/if}}

{{#if custom_prompt}}
【追加指示】
{{custom_prompt}}
{{/if}}

【生成フォーマット】
# タイトル

## 概要
（この記事で学べることを3-4行で説明）

## 前提知識
- 必要な知識1
- 必要な知識2
- 必要な知識3

## 手順

### ステップ1: （タイトル）
（詳細な説明）

コード例があれば：
\`\`\`
（コード）
\`\`\`

**ポイント:**
- 重要な点1
- 重要な点2

### ステップ2: （タイトル）
（以下同様）

## トラブルシューティング
よくある問題と解決方法

## まとめ
- 学んだこと1
- 学んだこと2
- 次のステップ

---
参照元: [{{article_title}}]({{article_url}})
```

**Model:** `gpt-4` または `claude-3-5-sonnet`

**Temperature:** `0.7`

**Max Tokens:** `2000`

#### Note Article用LLMノード

**User Prompt:**
```
以下の記事情報を元に、noteプラットフォーム向けの読みやすい記事を日本語で生成してください。

【記事情報】
タイトル: {{article_title}}
URL: {{article_url}}
説明: {{article_description}}

{{#if custom_prompt}}
【追加指示】
{{custom_prompt}}
{{/if}}

【生成フォーマット】
# タイトル

（キャッチーな導入文）

## 背景
（なぜこの記事を書くのか）

## 本題
（メインコンテンツ - 3つの章に分けて）

## 実践例
（具体的な使用例）

## まとめ
（要点のまとめ）

---
参照: [{{article_title}}]({{article_url}})

#Dify #AI #NoCode
```

#### Threads Post用LLMノード

**User Prompt:**
```
以下の記事情報を元に、Threadsでの短文投稿（300文字以内）を日本語で生成してください。

【記事情報】
タイトル: {{article_title}}
URL: {{article_url}}
説明: {{article_description}}

【生成フォーマット】
（絵文字）（キャッチーなタイトル）

（要点を2-3行で）

詳細はこちら👇
{{article_url}}

#Dify #AI #NoCode
```

**Max Tokens:** `200`

#### Slide Outline用LLMノード

**User Prompt:**
```
以下の記事情報を元に、勉強会用のスライド構成案を日本語で生成してください。

【記事情報】
タイトル: {{article_title}}
URL: {{article_url}}
説明: {{article_description}}

【生成フォーマット】
# スライドタイトル

## スライド1: タイトル
- タイトル: （タイトル）
- サブタイトル: （サブタイトル）

## スライド2: アジェンダ
1. （項目1）
2. （項目2）
3. （項目3）

## スライド3-5: メインコンテンツ
（各スライドの内容）

## スライド6: まとめ
- 要点1
- 要点2

## スライド7: 参考資料
- 元記事: {{article_url}}
```

### 6. 出力ノードを設定

各LLMノードの出力を**End ノード**に接続：

```json
{
  "content": "{{llm.output}}",
  "metadata": {
    "template_type": "{{template_type}}",
    "source_url": "{{article_url}}",
    "generated_at": "{{now}}"
  }
}
```

### 7. ワークフローを公開

1. 「Publish」ボタンをクリック
2. バージョン名を入力（例: `v1.0.0`）
3. 公開完了

### 8. API Keyを取得

1. 「Settings」→「API Access」
2. 「Create API Key」をクリック
3. API Keyをコピー

### 9. Workflow IDを取得

1. ワークフロー画面のURLから取得
2. 例: `https://cloud.dify.ai/app/[WORKFLOW_ID]/workflow`

## 環境変数に設定

`.env`ファイルに以下を追加：

```env
DIFY_API_KEY=app-xxxxxxxxxxxxx
DIFY_WORKFLOW_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
DIFY_API_BASE_URL=https://api.dify.ai/v1
```

## テスト

### APIから直接テスト

```bash
curl -X POST 'https://api.dify.ai/v1/workflows/YOUR_WORKFLOW_ID/run' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {
      "article_title": "Difyの新機能紹介",
      "article_url": "https://dify.ai/blog/new-feature",
      "article_description": "Difyに追加された新機能について",
      "article_source": "Dify Blog",
      "template_type": "tutorial",
      "custom_prompt": "初心者でも分かるように説明してください"
    },
    "response_mode": "blocking",
    "user": "test-user"
  }'
```

### アプリケーションからテスト

```bash
curl -X POST 'http://localhost:3000/api/content/preview' \
  -H 'Content-Type: application/json' \
  -d '{
    "articleId": 1,
    "templateType": "tutorial",
    "useDify": true
  }'
```

## トラブルシューティング

### API Keyが無効

- Difyダッシュボードで新しいAPI Keyを生成
- `.env`ファイルを更新

### Workflow IDが見つからない

- ワークフローが公開されているか確認
- IDが正しいか再確認

### タイムアウトエラー

- `backend/services/dify.service.js`の`timeout`を増やす
- LLMノードの`Max Tokens`を減らす

## 参考リンク

- [Dify公式ドキュメント](https://docs.dify.ai/)
- [Dify API Reference](https://docs.dify.ai/api-reference)
- [Workflow Examples](https://docs.dify.ai/workflow)

## サンプルワークフロー

プロジェクトには`/examples/dify-workflow-sample.json`にサンプルワークフローのエクスポートファイルが含まれています。
これをDifyにインポートして使用できます。
