import React, { useState } from 'react';
import { gasClient } from '../services/api-adapter';

/**
 * GAS Web App URL 設定画面
 * 初回起動時または設定変更時に表示
 */
const GasUrlConfig = ({ onConfigured }) => {
    const [url, setUrl] = useState(gasClient.getBaseUrl());
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!url.startsWith('https://script.google.com/macros/s/')) {
            setError('無効なURL形式です。https://script.google.com/macros/s/... で始まる必要があります。');
            return;
        }

        setLoading(true);
        try {
            // 保存
            gasClient.setBaseUrl(url);

            // 疎通確認 (GETリクエスト)
            const response = await fetch(url + '?action=ping', { method: 'GET' });
            const data = await response.json();

            if (data.status === 'ok') {
                onConfigured();
            } else {
                throw new Error('GASからの応答が不正です');
            }
        } catch (err) {
            console.error(err);
            setError('接続に失敗しました。URLを確認するか、GASを「全員（匿名ユーザーを含む）」で公開しているか確認してください。');
            // 開発中はエラーでも強制保存できるようにするオプションがあっても良いが、
            // ここでは厳密にチェックする
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>🚀 セットアップ</h1>
                <p style={styles.description}>
                    このアプリを使用するには、ご自身のGoogle Apps Script (GAS) Web App URLが必要です。
                </p>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <label style={styles.label}>GAS Web App URL</label>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/..."
                        style={styles.input}
                        required
                    />

                    {error && <div style={styles.error}>{error}</div>}

                    <button type="submit" disabled={loading} style={styles.button}>
                        {loading ? '接続中...' : '開始する'}
                    </button>
                </form>

                <div style={styles.help}>
                    <h3>設定方法</h3>
                    <ol>
                        <li>配布された `gas-template` のコードをGASプロジェクトにコピー</li>
                        <li>GASエディタで「デプロイ」→「新しいデプロイ」</li>
                        <li>「種類の選択」→「ウェブアプリ」</li>
                        <li>アクセスできるユーザー: <strong>「全員」</strong>を選択</li>
                        <li>発行されたURLをここに貼り付け</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f3f4f6',
        padding: '20px'
    },
    card: {
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        maxWidth: '500px',
        width: '100%'
    },
    title: {
        margin: '0 0 16px 0',
        fontSize: '24px',
        textAlign: 'center',
        color: '#111827'
    },
    description: {
        margin: '0 0 24px 0',
        color: '#4b5563',
        textAlign: 'center',
        lineHeight: '1.5'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    label: {
        fontWeight: '600',
        color: '#374151'
    },
    input: {
        padding: '12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '16px'
    },
    button: {
        padding: '12px',
        background: '#2563eb',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background 0.2s'
    },
    error: {
        color: '#dc2626',
        fontSize: '14px',
        background: '#fee2e2',
        padding: '10px',
        borderRadius: '6px'
    },
    help: {
        marginTop: '32px',
        borderTop: '1px solid #e5e7eb',
        paddingTop: '24px',
        fontSize: '14px',
        color: '#4b5563'
    }
};

export default GasUrlConfig;
