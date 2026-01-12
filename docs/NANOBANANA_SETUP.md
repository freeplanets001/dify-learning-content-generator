# Dify Nanobanana 画像生成ワークフロー設定ガイド

このガイドでは、スライド用画像を自動生成するDifyワークフローの設定方法を説明します。

## 前提条件

- Difyアカウント（Cloud版またはセルフホスト版）
- Nanobananaプラグインがインストール済み

---

## Step 1: 新しいワークフローを作成

1. Difyダッシュボードにログイン
2. **「アプリを作成」** をクリック
3. **「ワークフロー」** を選択
4. 名前を入力: `Slide Image Generator`
5. **「作成」** をクリック

---

## Step 2: 入力変数を設定

ワークフローエディタで:

1. **「開始」** ノードをクリック
2. **「入力変数を追加」** をクリック
3. 以下の変数を追加:

| 変数名 | タイプ | 必須 | 説明 |
|--------|--------|------|------|
| `prompt` | テキスト | ✅ | 画像生成プロンプト |
| `size` | テキスト | ❌ | size（デフォルト: 1024x768） |

---

## Step 3: Nanobananaノードを追加

1. **ツールバー**から **「ツール」** をドラッグ
2. **Nanobanana** を検索して選択
3. ノードを追加したら以下を設定:

### Nanobanana設定

- **モデル**: `NanoBanana Pro` または利用可能なモデル
- **プロンプト**: 
  ```
  {{#input.prompt#}}
  ```
- **サイズ**: 
  ```
  {{#input.size#}}
  ```
  または固定値 `1024x768`

---

## Step 4: 出力を設定

1. **「終了」** ノードをクリック
2. **「出力変数を追加」** をクリック
3. 以下を設定:

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `image` | `{{#nanobanana.image#}}` | 生成された画像URL |
| `result` | `{{#nanobanana.image#}}` | 互換性のための追加出力 |

---

## Step 5: ワークフローの動作確認

1. 右上の **「テスト実行」** をクリック
2. テストプロンプトを入力:
   ```
   professional business illustration showing cloud computing concept, modern minimalist style
   ```
3. **「実行」** をクリック
4. 画像URLが出力されることを確認

---

## Step 6: ワークフローを公開

1. 右上の **「公開」** をクリック
2. **「アプリを公開」** を選択
3. APIアクセスを有効化

---

## Step 7: Workflow IDを取得

1. **「監視」** または **「概要」** タブを開く
2. URLから**Workflow ID**をコピー:
   ```
   https://cloud.dify.ai/app/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX/...
                              ↑ これがWorkflow ID
   ```

または **「API参照」** から確認できます。

---

## Step 8: アプリに設定

1. このアプリの **「設定」** ページを開く
2. **「画像生成 (Nanobanana)」** セクションを展開
3. 以下を入力:
   - **Nanobanana API Key**: 空欄でOK（Dify API Keyを使用）
   - **Workflow ID**: コピーしたIDを貼り付け
4. **「保存」** をクリック

---

## トラブルシューティング

### エラー: "Image generation workflow ID not configured"
→ 設定ページでWorkflow IDを入力してください

### エラー: "Image generation API key is not configured"
→ 設定ページでDify API Keyが設定されていることを確認

### 画像が生成されない
1. Difyでワークフローが正常にテスト実行できるか確認
2. Nanobananaの利用制限を確認
3. サーバーログ (`logs/app.log`) でエラー詳細を確認

---

## ワークフロー図（参考）

```
┌─────────┐     ┌─────────────┐     ┌─────────┐
│  開始   │ ──► │ Nanobanana  │ ──► │  終了   │
│         │     │  (画像生成) │     │         │
│ prompt  │     │             │     │ image   │
│ size    │     │             │     │ result  │
└─────────┘     └─────────────┘     └─────────┘
```

---

## 次のステップ

設定が完了したら:
1. スライド生成画面で「🎨 AI画像を生成する」をONにする
2. スライドを生成
3. 各スライドに画像が追加されることを確認
