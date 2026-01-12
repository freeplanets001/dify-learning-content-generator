# ☁️ Cloudflare Pages へのデプロイガイド

このガイドでは、Dify学習コンテンツ生成ツールのフロントエンド（Webアプリ）を Cloudflare Pages にデプロイして公開する手順を説明します。無料で簡単にホスティングできます。

## 📋 前提条件
- GitHub アカウント
- Cloudflare アカウント
- このプロジェクトのコードが GitHub リポジトリ等のGitリポジトリにプッシュされていること

## 🚀 手順

### 1. GitHubにリポジトリを作成・プッシュ
まだGitHubにコードがない場合は、リポジトリを作成してプッシュしてください。
(あなたのPC上のターミナルで実行)

```bash
git init
git add .
git commit -m "Initial commit"
# GitHubで新規リポジトリを作成し、そのURLを設定
git remote add origin https://github.com/YourUsername/your-repo-name.git
git branch -M main
git push -u origin main
```

### 2. Cloudflare Pages プロジェクト作成

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログインします。
2. 左メニューから **Workers & Pages** を選択します。
3. **Overview** タブで「Create application」ボタンをクリックします。
4. **Pages** タブを選択し、「Connect to Git」をクリックします。
5. GitHubアカウントを接続し、先ほど作成したリポジトリを選択して「Begin setup」をクリックします。

### 3. ビルド設定

セットアップ画面で以下の設定を入力します。

| 設定項目 | 値 |
|---|---|
| **Project name** | 任意（例: `dify-content-generator`） |
| **Production branch** | `main` |
| **Framework preset** | `Vite` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `/` (空欄でOK) |

#### 環境変数の設定 (推奨)
「Environment variables (optional)」を開き、Node.jsのバージョンを指定しておくと安定します。

| 変数名 | 値 |
|---|---|
| `NODE_VERSION` | `18` |

### 4. デプロイ実行

「Save and Deploy」ボタンをクリックします。
Cloudflareが自動的にコードを取得し、ビルドを開始します。

- ⏳ **処理中**: "Building application..." と表示されます（数分かかります）。
- ✅ **完了**: "Success! Your site is deployed at..." と表示され、URL（例: `https://dify-content-generator.pages.dev`）が発行されます。

### 5. 動作確認

発行されたURLをクリックしてWebアプリを開きます。

1. **GAS URL設定**: 初回アクセス時に設定画面が表示されるので、GASのウェブアプリURLを入力します。
2. **Dify設定**: SettingsページでDifyのAPIキーを設定します。

これで、あなただけのSaaSアプリとしてインターネット上から利用できるようになりました！🎉

---

## ⚠️ 更新手順

コードを修正した場合は、GitHubの `main` ブランチにプッシュするだけで、Cloudflare Pagesが自動検知して再デプロイを行います。
