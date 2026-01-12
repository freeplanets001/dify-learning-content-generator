# 📚 Dify学習コンテンツ生成ツール (SaaS版)

リッチなWeb UIで操作し、データはあなたのGoogle環境に保存する、新しいタイプのツールです。
WebアプリからRSS収集、コンテンツ生成、Obsidian同期（Google Drive経由）が可能です。

## ✨ 特徴
- **�️ リッチなUI**: モダンで使いやすいWebインターフェース
- **☁️ サーバーレス**: あなたのGoogle Apps Script (GAS) がバックエンド
- **🔒 セキュア**: データは全てあなたのGoogleスプレッドシートとDriveに保存
- **📝 Obsidian連携**: Google Drive経由でローカルのObsidianと同期

## 🚀 利用開始ステップ

### 1. GASバックエンドの準備
1. フォルダ内の `01_config.gs` 〜 `07_obsidian.gs` の内容を、新規GASプロジェクトにコピーします。
2. 初回のみ `01_config.gs` の `initializeSpreadsheet` 関数を実行して初期設定を行います。
3. エディタ右上の「デプロイ」→「新しいデプロイ」をクリックします。
4. **種類の選択**: 「ウェブアプリ」
5. **アクセスできるユーザー**: **「全員」** を選択
   > ⚠️ Webアプリからアクセスするために必要です。URLを知っている人だけがアクセスできますが、取り扱いには注意してください。
6. 「デプロイ」をクリックし、発行された **ウェブアプリURL** をコピーします。

### 2. Webアプリに接続
1. 公開されているWebアプリ（URLは配布者から取得）にアクセスします。
2. セットアップ画面で、先ほどコピーした **GAS Web App URL** を入力します。
3. 「開始する」をクリックします。

### 3. Dify APIの設定
1. Webアプリの「Settings」ページを開きます。
2. Difyの API Key と Workflow ID を入力して保存します。

これで準備完了です！🎉

---

## 📂 Obsidian連携について

「Obsidianに保存」機能を使うと、Google Driveのルートに `Dify_Sync_Vault/Daily Notes/` フォルダが作成され、そこにMarkdownファイルが保存されます。

**同期方法:**
1. Google Drive デスクトップ版をインストールします。
2. PC上のObsidianで、Google Drive内の `Dify_Sync_Vault` フォルダを保管庫（Vault）として開きます。
3. これで、Webアプリで保存した内容が即座にローカルのObsidianに反映されます。

## 📦 ファイル構成 (GAS)
- `01_config.gs`: 設定管理
- `02_rss.gs`: RSS収集ロジック
- `03_dify.gs`: Dify連携ロジック
- `04_ui.gs`: (Web版では未使用だがデバッグ用に利用可能)
- `05_triggers.gs`: 定期実行トリガー
- `06_api.gs`: **Web API エントリーポイント**
- `07_obsidian.gs`: **Google Drive連携**
