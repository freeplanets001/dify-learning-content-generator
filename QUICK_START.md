# クイックスタートガイド

5分でDify Learning Content Generatorを起動！

## 📋 前提条件

- Node.js 18以上
- npm 9以上

## 🚀 起動手順

### 1. プロジェクトをクローン

```bash
git clone https://github.com/YOUR_USERNAME/dify-learning-content-generator.git
cd dify-learning-content-generator
```

### 2. 依存関係をインストール

```bash
npm install
```

### 3. 環境変数を設定

```bash
# .env.exampleをコピー
cp .env.example .env

# .envファイルを編集（必要に応じて）
nano .env
```

**最小限の設定で起動可能です！**

### 4. データベースを初期化

```bash
npm run db:init
```

### 5. サーバーを起動

```bash
npm run dev
```

**起動完了！** 🎉

- フロントエンド: http://localhost:5173
- バックエンドAPI: http://localhost:3000

## 🎯 最初の操作

### 1. ダッシュボードを確認

ブラウザで http://localhost:5173 を開く

### 2. データソースを確認

```bash
curl http://localhost:3000/api/collector/sources | jq
```

### 3. 情報収集を実行

```bash
curl -X POST http://localhost:3000/api/collector/trigger \
  -H "Content-Type: application/json" \
  -d '{"source": "qiita"}'
```

### 4. 統計情報を確認

```bash
curl http://localhost:3000/api/dashboard/stats | jq
```

## ⚙️ オプション設定

### Dify API連携（コンテンツ生成）

1. [Dify](https://dify.ai/)でアカウント作成
2. ワークフローを作成（[詳細ガイド](docs/DIFY_WORKFLOW.md)）
3. `.env`に設定:

```env
DIFY_API_KEY=app-xxxxxxxxxxxxx
DIFY_WORKFLOW_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Obsidian連携

1. `.env`に設定:

```env
OBSIDIAN_VAULT_PATH=/path/to/your/vault
```

2. Daily Noteを生成:

```bash
curl -X POST http://localhost:3000/api/obsidian/daily-note
```

## 📚 次のステップ

- [完全セットアップガイド](docs/SETUP.md)
- [API仕様書](docs/API.md)
- [Difyワークフロー設定](docs/DIFY_WORKFLOW.md)
- [GASデプロイガイド](docs/GAS_DEPLOYMENT.md)

## 🐛 トラブルシューティング

### ポートが使用中

```bash
# ポート3000を使用しているプロセスを確認
lsof -i :3000

# 別のポートで起動
PORT=3001 npm run server:dev
```

### データベースエラー

```bash
# データベースを再初期化
rm -rf data/content.db
npm run db:init
```

### 依存関係エラー

```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

## 💡 ヒント

- `npm run server:dev` - バックエンドのみ起動
- `npm run client:dev` - フロントエンドのみ起動
- `npm run build` - フロントエンドをビルド

## 🆘 サポート

問題が発生した場合:
1. [ドキュメント](docs/)を確認
2. [GitHubのIssues](https://github.com/YOUR_USERNAME/dify-learning-content-generator/issues)で検索
3. 新しいIssueを作成
