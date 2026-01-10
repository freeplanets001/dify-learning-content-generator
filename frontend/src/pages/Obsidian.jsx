function Obsidian() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Obsidian連携</h1>

      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">Vault設定</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Vault パス
            </label>
            <input
              type="text"
              className="input"
              placeholder="/path/to/your/obsidian/vault"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Daily Note パス
            </label>
            <input
              type="text"
              className="input"
              placeholder="Daily Notes"
            />
          </div>
          <button className="btn btn-primary">
            設定を保存
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Daily Note生成</h2>
        <p className="text-secondary-600 mb-4">
          収集した情報をObsidianのDaily Noteとして自動生成します
        </p>
        <button className="btn btn-success">
          今日のDaily Noteを生成
        </button>
      </div>
    </div>
  );
}

export default Obsidian;
