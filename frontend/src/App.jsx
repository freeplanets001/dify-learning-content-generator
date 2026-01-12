import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Collector from './pages/Collector';
import Obsidian from './pages/Obsidian';
import Content from './pages/Content';
import Settings from './pages/Settings';
import ImageGenerator from './pages/ImageGenerator';
import GasUrlConfig from './components/GasUrlConfig';
import { gasClient } from './services/api-adapter';

function App() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const url = gasClient.getBaseUrl();
    setIsConfigured(!!url);
    setChecking(false);
  }, []);

  if (checking) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;

  if (!isConfigured) {
    return <GasUrlConfig onConfigured={() => setIsConfigured(true)} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="collector" element={<Collector />} />
        <Route path="obsidian" element={<Obsidian />} />
        <Route path="content" element={<Content />} />
        <Route path="image-generator" element={<ImageGenerator />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;

