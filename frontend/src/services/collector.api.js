import api from './api-adapter';

/**
 * 収集API (GAS Backend Adapter)
 */

// 収集ステータスを取得 (GAS版は常にready)
export const getCollectionStatus = () => Promise.resolve({ data: { status: 'ready' } });

// 収集をトリガー
export const triggerCollection = (params = {}) => {
  // params: { source: 'all' | 'url', url: '...' }
  if (params.url) {
    // URL収集
    return api.collector.url(params.url, params.sourceName)
      .then(data => ({ data: { success: true, count: 1, ...data } }));
  } else {
    // RSS収集
    return api.collector.trigger(params)
      .then(data => ({ data: { success: true, ...data } }));
  }
};

// 記事一覧を取得
export const getArticles = (params = {}) => api.collector.getArticles(params)
  .then(data => ({ data: data })); // Adapter returns data directly, but UI expects response.data

// 記事詳細を取得
export const getArticle = (id) => api.collector.getArticle(id)
  .then(data => ({ data: data }));

// 記事ステータスを更新 (GAS未実装: dummy)
export const updateArticleStatus = (id, status) => Promise.resolve({ data: { success: true } });

// 記事を削除
export const deleteArticle = (id) => api.collector.deleteArticle(id)
  .then(data => ({ data: data }));

// 記事を一括削除 (GAS一括削除APIを使用)
export const deleteBatchArticles = async (ids, deleteAll = false) => {
  const result = await api.collector.deleteArticlesBatch(ids, deleteAll);
  return { data: result };
};

// データソース一覧を取得
export const getDataSources = (enabled = null) => api.collector.getRssSources()
  .then(data => {
    // enabledフィルタリング
    const sources = enabled !== null
      ? data.filter(s => s.enabled === (enabled === 'true' || enabled === true))
      : data;
    return { data: sources };
  });

// データソース詳細を取得 (一括取得からフィルタ)
export const getDataSource = (id) => api.collector.getRssSources()
  .then(data => {
    const source = data.find(s => s.id == id);
    return { data: source };
  });

// データソースを作成
export const createDataSource = (data) => api.collector.saveRssSource(data)
  .then(res => ({ data: res }));

// データソースを更新 (作成と同じ)
export const updateDataSource = (id, data) => api.collector.saveRssSource(data)
  .then(res => ({ data: res }));

// データソースを切り替え (enabled を反転させて保存)
export const toggleDataSource = async (id) => {
  console.log('🔄 toggleDataSource called with id:', id);

  // 現在のソースを取得して enabled を反転
  const sources = await api.collector.getRssSources();
  console.log('📡 Current sources:', sources);

  const source = sources.find(s => String(s.id) === String(id));
  if (source) {
    // 現在の enabled 値を確認し、明示的に反転
    const currentEnabled = source.enabled === true || source.enabled === 'TRUE' || source.enabled === 'true';
    const newEnabled = !currentEnabled;

    console.log(`🔧 Toggling source ${source.name}: ${currentEnabled} -> ${newEnabled}`);

    // 必要なフィールドのみを送信
    const updateData = {
      id: source.id,
      name: source.name,
      url: source.url,
      enabled: newEnabled
    };

    return api.collector.saveRssSource(updateData).then(res => ({ data: res }));
  }
  console.error('❌ Source not found for id:', id);
  return Promise.resolve({ data: { success: false } });
};

// データソースを削除
export const deleteDataSource = (id) => api.collector.deleteRssSource(id)
  .then(res => ({ data: res }));

// 統計情報を取得 (GAS未実装: dummy)
export const getStats = () => Promise.resolve({
  data: {
    total_articles: 0,
    collected_today: 0,
    sources_count: 0
  }
});

// URLからコンテンツを収集
export const collectFromUrl = (url, sourceName = 'URL Import') =>
  api.collector.url(url, sourceName).then(data => ({ data }));

// 複数URLからコンテンツを収集 (ループで対応)
export const collectFromUrls = async (urls, sourceName = 'URL Import') => {
  const results = [];
  for (const url of urls) {
    const res = await api.collector.url(url, sourceName);
    results.push(res);
  }
  return { data: results };
};

// URLコンテンツをプレビュー (保存と同じ処理)
export const previewUrl = (url) => collectFromUrl(url);

export default {
  getCollectionStatus,
  triggerCollection,
  getArticles,
  getArticle,
  updateArticleStatus,
  deleteArticle,
  deleteBatchArticles,
  getDataSources,
  getDataSource,
  createDataSource,
  updateDataSource,
  toggleDataSource,
  deleteDataSource,
  getStats,
  collectFromUrl,
  collectFromUrls,
  previewUrl
};

