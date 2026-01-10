# API仕様書

Dify Learning Content Generator REST API ドキュメント

## ベースURL

\`\`\`
開発環境: http://localhost:3000
\`\`\`

## 共通仕様

### レスポンス形式

#### 成功レスポンス

\`\`\`json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
\`\`\`

#### エラーレスポンス

\`\`\`json
{
  "success": false,
  "error": "Error Type",
  "message": "Error message",
  "errors": ["Validation error 1", "Validation error 2"]
}
\`\`\`

### HTTPステータスコード

- \`200 OK\`: 成功
- \`201 Created\`: リソース作成成功
- \`400 Bad Request\`: バリデーションエラー
- \`404 Not Found\`: リソースが見つからない
- \`429 Too Many Requests\`: レート制限超過
- \`500 Internal Server Error\`: サーバーエラー

### レート制限

- ウィンドウ: 15分
- 最大リクエスト数: 100回/IP

## システムAPI

### ヘルスチェック

サーバーの稼働状況を確認

\`\`\`
GET /health
\`\`\`

**レスポンス:**

\`\`\`json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
\`\`\`

### API情報

\`\`\`
GET /api
\`\`\`

**レスポンス:**

\`\`\`json
{
  "name": "Dify Learning Content Generator API",
  "version": "1.0.0",
  "description": "学習コンテンツ自動生成プラットフォーム",
  "endpoints": {
    "health": "/health",
    "collector": "/api/collector",
    "obsidian": "/api/obsidian",
    "content": "/api/content",
    "dashboard": "/api/dashboard"
  }
}
\`\`\`

## 情報収集API

### 記事一覧取得

収集した記事の一覧を取得

\`\`\`
GET /api/collector/articles
\`\`\`

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| status | string | No | フィルター: unprocessed, processing, processed, error |
| source_type | string | No | ソースタイプでフィルター |
| source_name | string | No | ソース名でフィルター |
| limit | number | No | 取得件数（デフォルト: 50, 最大: 100） |
| offset | number | No | オフセット（デフォルト: 0） |
| orderBy | string | No | ソートフィールド（デフォルト: collected_date） |
| order | string | No | ソート順序: ASC, DESC（デフォルト: DESC） |

**レスポンス例:**

\`\`\`json
{
  "success": true,
  "data": {
    "articles": [
      {
        "id": 1,
        "source_type": "rss",
        "source_name": "Dify Blog",
        "title": "New Feature Announcement",
        "url": "https://dify.ai/blog/new-feature",
        "description": "Description text...",
        "author": "Dify Team",
        "published_date": "2024-01-01T00:00:00.000Z",
        "collected_date": "2024-01-01T12:00:00.000Z",
        "status": "unprocessed",
        "tags": ["feature", "announcement"],
        "metadata": {}
      }
    ],
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
\`\`\`

### 記事詳細取得

\`\`\`
GET /api/collector/articles/:id
\`\`\`

**レスポンス:**

\`\`\`json
{
  "success": true,
  "data": {
    "id": 1,
    "source_type": "rss",
    "source_name": "Dify Blog",
    "title": "Article Title",
    "url": "https://example.com/article",
    "description": "Description...",
    "content": "Full article content...",
    "status": "unprocessed",
    "tags": ["tag1", "tag2"],
    "metadata": {}
  }
}
\`\`\`

### 収集トリガー

データソースからの情報収集を開始

\`\`\`
POST /api/collector/trigger
\`\`\`

**リクエストボディ:**

\`\`\`json
{
  "sourceId": 1,  // オプション: 特定のソースのみ収集
  "force": false  // オプション: 強制再収集
}
\`\`\`

**レスポンス:**

\`\`\`json
{
  "success": true,
  "data": {
    "jobId": "job_123",
    "status": "started",
    "sources": ["Dify Blog", "Qiita Dify"]
  },
  "message": "Collection job started"
}
\`\`\`

### データソース一覧

\`\`\`
GET /api/collector/sources
\`\`\`

**レスポンス:**

\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Dify Blog",
      "type": "rss",
      "url": "https://dify.ai/blog/rss.xml",
      "enabled": true,
      "last_collected_at": "2024-01-01T12:00:00.000Z",
      "collection_count": 150,
      "error_count": 2,
      "config": {
        "category": "official",
        "language": "en"
      }
    }
  ]
}
\`\`\`

### データソース更新

\`\`\`
PATCH /api/collector/sources/:id
\`\`\`

**リクエストボディ:**

\`\`\`json
{
  "enabled": true,
  "url": "https://new-url.com/rss",
  "config": {
    "category": "community"
  }
}
\`\`\`

## Obsidian連携API

### Daily Note生成

\`\`\`
POST /api/obsidian/daily-note
\`\`\`

**リクエストボディ:**

\`\`\`json
{
  "date": "2024-01-01",  // オプション: デフォルトは今日
  "includeUnprocessed": true  // 未処理記事を含める
}
\`\`\`

**レスポンス:**

\`\`\`json
{
  "success": true,
  "data": {
    "filePath": "/path/to/vault/Daily Notes/2024-01-01.md",
    "articleCount": 15,
    "categories": {
      "official": 5,
      "community": 10
    }
  },
  "message": "Daily note created successfully"
}
\`\`\`

### Vault設定取得

\`\`\`
GET /api/obsidian/config
\`\`\`

**レスポンス:**

\`\`\`json
{
  "success": true,
  "data": {
    "vaultPath": "/Users/yourname/Documents/ObsidianVault",
    "dailyNotePath": "Daily Notes",
    "enabled": true
  }
}
\`\`\`

### Vault設定更新

\`\`\`
POST /api/obsidian/config
\`\`\`

**リクエストボディ:**

\`\`\`json
{
  "vaultPath": "/path/to/vault",
  "dailyNotePath": "Daily Notes"
}
\`\`\`

## コンテンツ生成API

### コンテンツ生成

\`\`\`
POST /api/content/generate
\`\`\`

**リクエストボディ:**

\`\`\`json
{
  "articleId": 1,
  "templateType": "tutorial",  // tutorial, note-article, threads-post, slide-outline
  "customPrompt": "Optional custom instructions"
}
\`\`\`

**レスポンス:**

\`\`\`json
{
  "success": true,
  "data": {
    "id": 1,
    "articleId": 1,
    "templateType": "tutorial",
    "title": "Generated Content Title",
    "content": "# Generated Markdown Content\\n\\n...",
    "status": "pending_approval",
    "version": 1,
    "created_at": "2024-01-01T12:00:00.000Z"
  },
  "message": "Content generated successfully"
}
\`\`\`

### コンテンツ一覧取得

\`\`\`
GET /api/content
\`\`\`

**クエリパラメータ:**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| status | string | draft, pending_approval, approved, rejected, published |
| templateType | string | tutorial, note-article, threads-post, slide-outline |
| limit | number | 取得件数 |
| offset | number | オフセット |

**レスポンス:**

\`\`\`json
{
  "success": true,
  "data": {
    "contents": [
      {
        "id": 1,
        "articleId": 1,
        "templateType": "tutorial",
        "title": "Content Title",
        "status": "pending_approval",
        "version": 1,
        "created_at": "2024-01-01T12:00:00.000Z"
      }
    ],
    "total": 50
  }
}
\`\`\`

### コンテンツ詳細取得

\`\`\`
GET /api/content/:id
\`\`\`

### コンテンツ更新

\`\`\`
PATCH /api/content/:id
\`\`\`

**リクエストボディ:**

\`\`\`json
{
  "title": "Updated Title",
  "content": "Updated content...",
  "status": "approved"
}
\`\`\`

### コンテンツ承認

\`\`\`
POST /api/content/:id/approve
\`\`\`

**リクエストボディ:**

\`\`\`json
{
  "approvedBy": "user_name"
}
\`\`\`

### コンテンツ却下

\`\`\`
POST /api/content/:id/reject
\`\`\`

**リクエストボディ:**

\`\`\`json
{
  "reason": "Rejection reason"
}
\`\`\`

## ダッシュボードAPI

### 統計情報取得

\`\`\`
GET /api/dashboard/stats
\`\`\`

**レスポンス:**

\`\`\`json
{
  "success": true,
  "data": {
    "articles": {
      "total": 500,
      "unprocessed": 50,
      "processing": 10,
      "processed": 430,
      "error": 10,
      "today": 25
    },
    "contents": {
      "total": 100,
      "draft": 20,
      "pending_approval": 15,
      "approved": 50,
      "rejected": 5,
      "published": 10,
      "today": 5
    },
    "sources": {
      "total": 5,
      "enabled": 4,
      "lastCollection": "2024-01-01T12:00:00.000Z"
    }
  }
}
\`\`\`

### アクティビティログ取得

\`\`\`
GET /api/dashboard/activity
\`\`\`

**クエリパラメータ:**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| category | string | collection, generation, api, system |
| limit | number | 取得件数（デフォルト: 50） |

**レスポンス:**

\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "level": "info",
      "category": "collection",
      "message": "Collection from Dify Blog: success (10 items)",
      "details": {
        "sourceName": "Dify Blog",
        "count": 10
      },
      "created_at": "2024-01-01T12:00:00.000Z"
    }
  ]
}
\`\`\`

## エラーコード

| コード | 説明 |
|-------|------|
| VALIDATION_ERROR | バリデーションエラー |
| NOT_FOUND | リソースが見つからない |
| DUPLICATE_ENTRY | 重複エントリ |
| EXTERNAL_API_ERROR | 外部API呼び出しエラー |
| DATABASE_ERROR | データベースエラー |
| FILE_SYSTEM_ERROR | ファイルシステムエラー |
| RATE_LIMIT_EXCEEDED | レート制限超過 |

## 実装予定のエンドポイント

Phase 2以降で実装予定:

- \`POST /api/collector/gas/trigger\` - GASスクリプト実行
- \`GET /api/collector/sources/:id/test\` - データソーステスト
- \`POST /api/content/:id/publish\` - コンテンツ公開
- \`GET /api/content/templates\` - テンプレート一覧

## バージョニング

現在のバージョン: v1.0.0

将来的にはURLパスにバージョンを含める予定:
- \`/api/v1/...\`
- \`/api/v2/...\`
