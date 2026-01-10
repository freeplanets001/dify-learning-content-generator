# セットアップガイド

Dify Learning Content Generatorの詳細なセットアップ手順です。

## 前提条件

- **Node.js**: v18.0.0以上
- **npm**: v9.0.0以上
- **Git**: バージョン管理用

## インストール手順

### 1. リポジトリのクローン

\`\`\`bash
git clone <repository-url>
cd dify-learning-content-generator
\`\`\`

### 2. 依存パッケージのインストール

\`\`\`bash
npm install
\`\`\`

### 3. 環境変数の設定

#### 3.1 基本設定

\`.env.example\`を\`.env\`にコピー:

\`\`\`bash
cp .env.example .env
\`\`\`

#### 3.2 必須設定項目

\`.env\`ファイルを編集し、以下の項目を設定:

\`\`\`env
# サーバーポート（デフォルト: 3000）
PORT=3000

# データベースパス
DATABASE_PATH=./data/content.db

# Obsidian Vaultのパス（絶対パス推奨）
OBSIDIAN_VAULT_PATH=/Users/yourname/Documents/ObsidianVault
OBSIDIAN_DAILY_NOTE_PATH=Daily Notes
\`\`\`

#### 3.3 オプション設定（機能を有効化する場合）

**Google Apps Script連携:**

\`\`\`env
GAS_WEB_APP_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
GAS_API_KEY=your_gas_api_key
\`\`\`

**Dify API（コンテンツ生成用）:**

\`\`\`env
DIFY_API_KEY=your_dify_api_key
DIFY_WORKFLOW_ID=your_workflow_id
\`\`\`

**Google Sheets連携:**

\`\`\`env
GOOGLE_SHEETS_ID=your_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_KEY=./config/service-account-key.json
\`\`\`

**Twitter/X API:**

\`\`\`env
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
\`\`\`

### 4. データベースの初期化

\`\`\`bash
npm run db:init
\`\`\`

これにより以下が実行されます:
- SQLiteデータベースファイルの作成
- テーブルスキーマの作成
- デフォルトデータソースの登録

### 5. ディレクトリ構造の確認

必要なディレクトリが自動作成されますが、手動で作成する場合:

\`\`\`bash
mkdir -p data logs config templates
\`\`\`

## Google Sheets連携の設定（オプション）

### 1. サービスアカウントの作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを作成または選択
3. 「APIとサービス」→「認証情報」
4. 「認証情報を作成」→「サービスアカウント」
5. サービスアカウントを作成し、JSONキーをダウンロード

### 2. キーファイルの配置

\`\`\`bash
mkdir -p config
mv ~/Downloads/service-account-key.json ./config/
\`\`\`

### 3. Google Sheets APIの有効化

1. Google Cloud Consoleで「APIとサービス」→「ライブラリ」
2. "Google Sheets API"を検索して有効化

### 4. スプレッドシートの共有

作成したサービスアカウントのメールアドレスに、対象のスプレッドシートの編集権限を付与

## Google Apps Scriptの設定（オプション）

詳細は[GAS_DEPLOYMENT.md](./GAS_DEPLOYMENT.md)を参照してください。

## Obsidian連携の設定

### 1. Vaultパスの確認

Obsidian Vaultの絶対パスを確認:

**macOS/Linux:**
\`\`\`bash
# Obsidianでvaultを開き、ターミナルで確認
cd /path/to/your/vault
pwd
\`\`\`

**Windows:**
\`\`\`cmd
cd C:\\Users\\YourName\\Documents\\ObsidianVault
cd
\`\`\`

### 2. Daily Noteフォルダの作成

Obsidian Vault内に、Daily Note用のフォルダを作成:

\`\`\`
YourVault/
└── Daily Notes/
\`\`\`

### 3. 環境変数に設定

\`\`\`.env
OBSIDIAN_VAULT_PATH=/Users/yourname/Documents/ObsidianVault
OBSIDIAN_DAILY_NOTE_PATH=Daily Notes
\`\`\`

## 開発サーバーの起動

### フルスタック起動（推奨）

\`\`\`bash
npm run dev
\`\`\`

これにより以下が同時起動します:
- バックエンドサーバー（ポート3000）
- フロントエンド開発サーバー（ポート5173）

### 個別起動

**バックエンドのみ:**
\`\`\`bash
npm run server:dev
\`\`\`

**フロントエンドのみ:**
\`\`\`bash
npm run client:dev
\`\`\`

## 動作確認

### 1. ヘルスチェック

\`\`\`bash
curl http://localhost:3000/health
\`\`\`

成功レスポンス:
\`\`\`json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
\`\`\`

### 2. フロントエンドアクセス

ブラウザで http://localhost:5173 を開く

### 3. データベース確認

\`\`\`bash
sqlite3 data/content.db ".tables"
\`\`\`

以下のテーブルが存在することを確認:
- articles
- contents
- configs
- logs
- data_sources

## トラブルシューティング

### ポートが既に使用されている

**エラー:** "Port 3000 is already in use"

**解決策:**
\`\`\`bash
# 使用中のプロセスを確認
lsof -i :3000

# または別のポートを使用
PORT=3001 npm run server:dev
\`\`\`

### データベースが作成されない

**解決策:**
\`\`\`bash
# dataディレクトリの権限を確認
ls -la data/

# 手動で作成
mkdir -p data
npm run db:init
\`\`\`

### Obsidian連携が動作しない

**確認事項:**
1. Vaultパスが正しいか
2. ディレクトリの書き込み権限があるか
3. パスに日本語や特殊文字が含まれていないか

### ログの確認

\`\`\`bash
# アプリケーションログを確認
tail -f logs/app.log

# エラーログのみ
tail -f logs/app.log | grep ERROR
\`\`\`

## 本番環境デプロイ

### 環境変数の変更

\`\`\`.env
NODE_ENV=production
LOG_LEVEL=warn
\`\`\`

### ビルド

\`\`\`bash
npm run build
\`\`\`

### 起動

\`\`\`bash
npm run server:start
\`\`\`

### プロセス管理（PM2推奨）

\`\`\`bash
npm install -g pm2
pm2 start backend/server.js --name dify-learning
pm2 startup
pm2 save
\`\`\`

## 次のステップ

- [API仕様](./API.md)を確認
- [GASデプロイガイド](./GAS_DEPLOYMENT.md)でデータ収集を設定
- ダッシュボードからデータソースを設定

## サポート

問題が発生した場合は、以下を確認してください:
1. Node.jsのバージョン（v18以上）
2. 環境変数の設定
3. ログファイル（logs/app.log）
4. データベースファイルの存在

それでも解決しない場合は、GitHubでissueを作成してください。
