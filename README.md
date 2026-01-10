# Dify Learning Content Generator

学習コンテンツ自動生成プラットフォーム - Difyに関する情報を自動収集し、学習コンテンツを生成するシステム

## 概要

このプラットフォームは、Difyに関する最新情報を複数のソースから自動収集し、Obsidian連携やコンテンツ生成機能を提供します。

### 主要機能

- **情報収集エンジン**: 複数のデータソースから自動収集
  - Dify公式ブログ (RSS)
  - YouTube動画情報
  - Qiita/Zenn記事
  - X/Twitter投稿

- **Obsidian統合**: ローカルVaultへのDaily Note自動生成

- **教材生成エンジン**: Dify APIを使った多様な形式のコンテンツ生成
  - チュートリアル
  - note記事
  - Threads投稿
  - スライド構成案

- **ダッシュボードUI**: リアルタイムモニタリングと管理

## 技術スタック

### バックエンド
- **Node.js + Express.js**: RESTful APIサーバー
- **SQLite**: データベース（PostgreSQL移行可能）
- **Winston**: ログ管理
- **Axios**: HTTP通信

### フロントエンド
- **React 18**: UIライブラリ
- **Vite**: ビルドツール
- **TailwindCSS**: スタイリング
- **React Router**: ルーティング

### 外部連携
- **Google Apps Script**: 情報収集エンジン
- **Dify API**: コンテンツ生成
- **Google Sheets API**: データ管理
- **RSS Feeds**: 各種ブログ・メディア
- **Twitter/X API**: ソーシャルメディア

## プロジェクト構造

\`\`\`
dify-learning-content-generator/
├── backend/              # バックエンドサーバー
│   ├── server.js        # メインサーバー
│   ├── models/          # データモデル
│   ├── routes/          # APIルート
│   ├── services/        # ビジネスロジック
│   ├── utils/           # ユーティリティ
│   └── config/          # 設定
├── frontend/            # フロントエンド
│   └── src/
│       ├── components/  # Reactコンポーネント
│       ├── pages/       # ページコンポーネント
│       ├── services/    # APIクライアント
│       └── styles/      # スタイル
├── gas/                 # Google Apps Script
├── templates/           # コンテンツテンプレート
└── docs/                # ドキュメント
\`\`\`

## セットアップ

### 1. 依存関係のインストール

\`\`\`bash
npm install
\`\`\`

### 2. 環境変数の設定

\`.env.example\`を\`.env\`にコピーし、必要な値を設定します。

\`\`\`bash
cp .env.example .env
\`\`\`

### 3. データベースの初期化

\`\`\`bash
npm run db:init
\`\`\`

### 4. 開発サーバーの起動

\`\`\`bash
# バックエンドとフロントエンドを同時起動
npm run dev

# または個別に起動
npm run server:dev  # バックエンドのみ
npm run client:dev  # フロントエンドのみ
\`\`\`

### 5. アクセス

- **フロントエンド**: http://localhost:5173
- **バックエンドAPI**: http://localhost:3000
- **ヘルスチェック**: http://localhost:3000/health

## 使い方

### 情報収集の開始

1. ダッシュボードから「情報収集」ページへ移動
2. データソースを設定・有効化
3. 「全ソース収集開始」ボタンをクリック

### Obsidian連携

1. 「Obsidian連携」ページでVaultパスを設定
2. 「今日のDaily Noteを生成」をクリック
3. 指定したVaultに自動でMarkdownファイルが生成されます

### コンテンツ生成

1. 「コンテンツ生成」ページでテンプレートを選択
2. 元記事を選択してプレビュー
3. 生成後、承認キューで内容を確認・編集
4. 承認して公開

## API仕様

詳細は[API.md](./docs/API.md)を参照してください。

主要なエンドポイント:

- \`GET /health\` - ヘルスチェック
- \`GET /api/collector/articles\` - 記事一覧取得
- \`POST /api/collector/trigger\` - 収集トリガー
- \`POST /api/content/generate\` - コンテンツ生成
- \`GET /api/dashboard/stats\` - 統計情報取得

## 開発ロードマップ

### Phase 1: プロジェクト基盤構築 ✅
- [x] プロジェクト初期化
- [x] データベース設計（sql.js）
- [x] バックエンドサーバー構築
- [x] フロントエンド基本構造

### Phase 2: 情報収集エンジン ✅
- [x] GAS連携実装
- [x] RSS/APIデータソース統合
- [x] 重複排除ロジック
- [x] 収集API実装（15エンドポイント）
- [x] ダッシュボードAPI実装

### Phase 3: Obsidian連携 ✅
- [x] ファイルシステム操作
- [x] Daily Note生成
- [x] 個別記事Note生成
- [x] Vault設定API

### Phase 4: コンテンツ生成エンジン ✅
- [x] Dify API連携
- [x] テンプレート管理（4種類）
- [x] プレビュー機能
- [x] 承認フロー
- [x] バッチ生成

### Phase 5: フロントエンド完成 ✅
- [x] APIクライアント実装
- [x] ダッシュボードUI強化
- [x] 統合テスト完了

## ライセンス

MIT

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## サポート

問題が発生した場合は、GitHubのissueを作成してください。
