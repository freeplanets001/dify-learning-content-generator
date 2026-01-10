import { useState, useEffect } from 'react';
import * as dashboardApi from '../services/dashboard.api';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await dashboardApi.getStats();
      setStats(res.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="spinner w-12 h-12"></div></div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">ダッシュボード</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card"><div className="flex items-center justify-between"><div><p className="text-sm text-secondary-600">総収集数</p><p className="text-3xl font-bold text-primary-600">{stats?.articles?.total || 0}</p></div><div className="text-4xl">📚</div></div></div>
        <div className="card"><div className="flex items-center justify-between"><div><p className="text-sm text-secondary-600">未処理</p><p className="text-3xl font-bold text-yellow-600">{stats?.articles?.unprocessed || 0}</p></div><div className="text-4xl">⏳</div></div></div>
        <div className="card"><div className="flex items-center justify-between"><div><p className="text-sm text-secondary-600">生成済み</p><p className="text-3xl font-bold text-green-600">{stats?.contents?.total || 0}</p></div><div className="text-4xl">✅</div></div></div>
        <div className="card"><div className="flex items-center justify-between"><div><p className="text-sm text-secondary-600">本日の収集</p><p className="text-3xl font-bold text-blue-600">{stats?.articles?.today || 0}</p></div><div className="text-4xl">🆕</div></div></div>
      </div>
    </div>
  );
}
export default Dashboard;
