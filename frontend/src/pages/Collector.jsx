function Collector() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">情報収集</h1>

      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">収集トリガー</h2>
        <div className="flex gap-4">
          <button className="btn btn-primary">
            全ソース収集開始
          </button>
          <button className="btn btn-secondary">
            GASスクリプト実行
          </button>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">データソース管理</h2>
        <div className="text-center text-secondary-500 py-8">
          データソースの設定機能は実装中です
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">収集済み記事一覧</h2>
        <div className="text-center text-secondary-500 py-8">
          収集された記事はここに表示されます
        </div>
      </div>
    </div>
  );
}

export default Collector;
