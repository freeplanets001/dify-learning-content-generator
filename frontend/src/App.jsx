import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Collector from './pages/Collector';
import Obsidian from './pages/Obsidian';
import Content from './pages/Content';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="collector" element={<Collector />} />
        <Route path="obsidian" element={<Obsidian />} />
        <Route path="content" element={<Content />} />
      </Route>
    </Routes>
  );
}

export default App;
