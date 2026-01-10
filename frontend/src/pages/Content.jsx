function Content() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">コンテンツ生成</h1>

      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">テンプレート選択</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border-2 border-secondary-200 rounded-lg hover:border-primary-500 cursor-pointer transition-colors">
            <h3 className="font-semibold text-lg mb-2">📚 チュートリアル</h3>
            <p className="text-sm text-secondary-600">初心者向けの詳細なチュートリアル記事</p>
          </div>
          <div className="p-4 border-2 border-secondary-200 rounded-lg hover:border-primary-500 cursor-pointer transition-colors">
            <h3 className="font-semibold text-lg mb-2">📝 note記事</h3>
            <p className="text-sm text-secondary-600">noteプラットフォーム向けの記事下書き</p>
          </div>
          <div className="p-4 border-2 border-secondary-200 rounded-lg hover:border-primary-500 cursor-pointer transition-colors">
            <h3 className="font-semibold text-lg mb-2">🧵 Threads投稿</h3>
            <p className="text-sm text-secondary-600">速報・Tipsのための短文投稿</p>
          </div>
          <div className="p-4 border-2 border-secondary-200 rounded-lg hover:border-primary-500 cursor-pointer transition-colors">
            <h3 className="font-semibold text-lg mb-2">📊 スライド構成</h3>
            <p className="text-sm text-secondary-600">勉強会用のスライド構成案</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">承認キュー</h2>
        <div className="text-center text-secondary-500 py-8">
          承認待ちのコンテンツはありません
        </div>
      </div>
    </div>
  );
}

export default Content;
