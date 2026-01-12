import api from './api';

/**
 * スライド生成API
 */
const slideApi = {
    /**
     * 利用可能なテンプレート一覧を取得
     */
    async getTemplates() {
        return api.get('/api/slides/templates');
    },

    /**
     * スライド構成案をパース
     */
    async parseOutline(contentId, markdown = null) {
        return api.post('/api/slides/parse', { contentId, markdown });
    },

    /**
     * スライドを生成
     */
    async generateSlides(options) {
        const {
            contentId,
            markdown,
            outputFormat = 'pptx',
            template = 'modern',
            generateImages = true
        } = options;

        return api.post('/api/slides/generate', {
            contentId,
            markdown,
            outputFormat,
            template,
            options: { generateImages }
        });
    },

    /**
     * スライド情報を取得
     */
    async getSlide(id) {
        return api.get(`/api/slides/${id}`);
    },

    /**
     * スライドをダウンロード
     */
    getDownloadUrl(id, format = 'pptx') {
        return `/api/slides/download/${id}?format=${format}`;
    }
};

export default slideApi;
