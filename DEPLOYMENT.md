# デプロイガイド

## GitHub公開手順

### 1. Gitリポジトリを初期化

```bash
cd /Users/t_u/Desktop/dify-learning-frontend

# Gitを初期化
git init

# すべてのファイルをステージング
git add .

# 初回コミット
git commit -m "Initial commit: Dify Learning Content Generator v1.0.0

- ✅ Phase 1-5 完全実装
- ✅ 40+ API endpoints
- ✅ 情報収集エンジン
- ✅ Obsidian連携
- ✅ コンテンツ生成（Dify API）
- ✅ ダッシュボードUI

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### 2. GitHubリポジトリを作成

1. https://github.com/new にアクセス
2. リポジトリ名: `dify-learning-content-generator`
3. 説明: `学習コンテンツ自動生成プラットフォーム - Dify情報収集とObsidian連携`
4. Public または Private を選択
5. 「Create repository」をクリック

### 3. リモートリポジトリに接続

```bash
# リモートを追加（YOUR_USERNAMEを実際のユーザー名に置き換え）
git remote add origin https://github.com/YOUR_USERNAME/dify-learning-content-generator.git

# メインブランチの名前を確認/変更
git branch -M main

# プッシュ
git push -u origin main
```

### 4. リポジトリ設定

#### About設定
- Description: `学習コンテンツ自動生成プラットフォーム - Dify情報収集とObsidian連携`
- Website: デモサイトのURL（あれば）
- Topics: `dify`, `obsidian`, `content-generator`, `nodejs`, `react`, `ai`

#### Branch Protection（推奨）
Settings → Branches → Add rule:
- Branch name pattern: `main`
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging

## 本番環境デプロイ

### Docker デプロイ

#### Dockerfileを作成

```bash
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
RUN npm ci --only=production

# アプリケーションファイルをコピー
COPY . .

# フロントエンドをビルド
RUN npm run build

# データディレクトリを作成
RUN mkdir -p /app/data /app/logs

# ポートを公開
EXPOSE 3000

# 環境変数
ENV NODE_ENV=production

# データベース初期化とサーバー起動
CMD ["sh", "-c", "npm run db:init && npm run server:start"]
EOF
```

#### docker-compose.yml

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_PATH=/app/data/content.db
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./obsidian-vault:/app/obsidian-vault:ro
    env_file:
      - .env.production
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./dist:/usr/share/nginx/html:ro
    depends_on:
      - app
    restart: unless-stopped
EOF
```

#### デプロイ実行

```bash
# イメージをビルド
docker-compose build

# コンテナを起動
docker-compose up -d

# ログを確認
docker-compose logs -f
```

### Vercel デプロイ（フロントエンドのみ）

```bash
# Vercel CLIをインストール
npm install -g vercel

# ログイン
vercel login

# デプロイ
vercel

# 本番環境にデプロイ
vercel --prod
```

### Railway デプロイ（フルスタック）

1. https://railway.app/ にアクセス
2. 「New Project」→「Deploy from GitHub repo」
3. リポジトリを選択
4. 環境変数を設定:
   - `NODE_ENV=production`
   - `DIFY_API_KEY=your_key`
   - その他の環境変数

### Render デプロイ

1. https://render.com/ にアクセス
2. 「New」→「Web Service」
3. リポジトリを接続
4. 設定:
   - Build Command: `npm install && npm run build && npm run db:init`
   - Start Command: `npm run server:start`
   - Environment Variables: `.env`の内容を設定

## 環境変数の設定

本番環境用の`.env.production`を作成:

```bash
cat > .env.production << 'EOF'
# Server
PORT=3000
NODE_ENV=production

# Database
DATABASE_PATH=/app/data/content.db

# Google Apps Script
GAS_WEB_APP_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
GAS_API_KEY=your_production_gas_api_key

# Dify API
DIFY_API_BASE_URL=https://api.dify.ai/v1
DIFY_API_KEY=your_production_dify_api_key
DIFY_WORKFLOW_ID=your_workflow_id

# Obsidian
OBSIDIAN_VAULT_PATH=/app/obsidian-vault
OBSIDIAN_DAILY_NOTE_PATH=Daily Notes

# Logging
LOG_LEVEL=warn
LOG_FILE_PATH=/app/logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
```

**重要:** `.env.production`は`.gitignore`に含めること！

## CI/CD設定

GitHub Actionsが既に設定されています（`.github/workflows/ci.yml`）。

### デプロイアクションを追加

```bash
cat > .github/workflows/deploy.yml << 'EOF'
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Deploy to Production
      env:
        DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
      run: |
        # デプロイスクリプトを実行
        ./deploy.sh
EOF
```

## セキュリティチェックリスト

- [ ] `.env`ファイルが`.gitignore`に含まれている
- [ ] APIキーが環境変数で管理されている
- [ ] レート制限が設定されている
- [ ] CORS設定が適切
- [ ] 本番環境でログレベルが`warn`以上
- [ ] データベースファイルのバックアップ設定
- [ ] HTTPS/TLSが有効

## モニタリング

### ログ確認

```bash
# Dockerの場合
docker-compose logs -f app

# PM2の場合
pm2 logs dify-learning

# ファイルから直接
tail -f logs/app.log
```

### ヘルスチェック

```bash
# ヘルスチェックエンドポイント
curl https://your-domain.com/health

# API情報
curl https://your-domain.com/api
```

## バックアップ

### データベースバックアップ

```bash
# 手動バックアップ
cp data/content.db data/content.db.backup.$(date +%Y%m%d)

# 自動バックアップ（cron）
0 2 * * * cp /app/data/content.db /app/backups/content.db.$(date +\%Y\%m\%d)
```

### 設定バックアップ

```bash
# .envファイルのバックアップ（暗号化推奨）
tar -czf config-backup.tar.gz .env .env.production
```

## トラブルシューティング

### データベースエラー

```bash
# データベースを再初期化
npm run db:init
```

### ポート競合

```bash
# 使用中のポートを確認
lsof -i :3000

# プロセスを終了
kill -9 <PID>
```

### メモリ不足

```bash
# Node.jsのメモリ上限を増やす
NODE_OPTIONS="--max-old-space-size=4096" npm run server:start
```

## スケーリング

### 水平スケーリング

- Dockerコンテナを複数起動
- ロードバランサー（Nginx/HAProxy）を設定
- データベースを共有ストレージに配置

### 垂直スケーリング

- サーバーのCPU/メモリを増強
- Node.jsのワーカープロセスを増やす

## 参考リンク

- [Express.js本番環境ベストプラクティス](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Docker公式ドキュメント](https://docs.docker.com/)
- [Vercelデプロイガイド](https://vercel.com/docs)
