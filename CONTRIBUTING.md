# Contributing to Dify Learning Content Generator

Dify Learning Content Generatorへの貢献に興味を持っていただきありがとうございます！

## 貢献方法

### バグ報告

バグを発見した場合は、GitHubのIssuesで報告してください。

以下の情報を含めてください：
- バグの詳細な説明
- 再現手順
- 期待される動作
- 実際の動作
- 環境情報（OS、Node.jsバージョンなど）

### 機能提案

新機能の提案は大歓迎です！Issuesで提案してください。

### プルリクエスト

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### コーディング規約

- ESLintの設定に従う
- コミットメッセージは明確に
- 可能な限りテストを追加

### 開発環境のセットアップ

```bash
# リポジトリをクローン
git clone https://github.com/YOUR_USERNAME/dify-learning-content-generator.git
cd dify-learning-content-generator

# 依存関係をインストール
npm install

# データベースを初期化
npm run db:init

# 開発サーバーを起動
npm run dev
```

## コミュニティ

- GitHubのDiscussionsで質問や議論
- Issuesでバグ報告や機能提案

## ライセンス

貢献したコードはMITライセンスの下でライセンスされます。
