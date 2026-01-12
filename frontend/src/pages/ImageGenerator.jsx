import { useState, useRef, useEffect, useCallback } from 'react';
import * as fabric from 'fabric';
import api from '../services/api-adapter';

// フォント
const FONTS = ['Arial', 'Roboto', 'Open Sans', 'Noto Sans JP', 'M PLUS Rounded 1c', 'Poppins', 'Montserrat', 'Playfair Display', 'Bebas Neue', 'Oswald'];

// アイコン
const ICONS = {
    '基本': ['⭐', '❤️', '🔥', '✨', '💡', '🎯', '🚀', '💎', '📌', '✅'],
    'ビジネス': ['📊', '📈', '📉', '💰', '🏆', '🎖️', '📋', '🔔', '⚡', '🔑'],
    '矢印': ['➡️', '⬆️', '⬇️', '↗️', '↘️', '↩️', '🔄', '➕', '➖', '✖️'],
    'UI': ['💬', '💭', '📢', '🔍', '⚙️', '🔒', '🔓', '📝', '📁', '🗂️'],
    '人物': ['👤', '👥', '🤝', '💪', '🧠', '👀', '👍', '👎', '🙌', '🎉'],
    '数字': ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']
};

// テンプレート
const TEMPLATES = [
    { id: 'blog', name: 'ブログ', width: 1200, height: 630 },
    { id: 'sns', name: 'SNS', width: 1080, height: 1080 },
    { id: 'yt', name: 'YouTube', width: 1280, height: 720 },
    { id: 'tw', name: 'Twitter', width: 1200, height: 675 },
    { id: 'insta', name: 'Instaストーリー', width: 1080, height: 1920 },
    { id: 'a4', name: 'A4縦', width: 595, height: 842 }
];

// バッジ
const BADGES = [
    { text: 'NEW', color: '#ff4757' },
    { text: 'POINT', color: '#2ed573' },
    { text: '重要', color: '#ffa502' },
    { text: 'SALE', color: '#e84393' },
    { text: 'FREE', color: '#00b894' }
];

// カラーパレット（拡張）
const COLORS = ['#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6', '#000000', '#212529', '#343a40', '#495057', '#ff4757', '#ff6b81', '#ffa502', '#eccc68', '#2ed573', '#7bed9f', '#1e90ff', '#70a1ff', '#5352ed', '#a55eea', '#e84393', '#fd79a8', '#00b894', '#55efc4', '#0984e3', '#74b9ff'];

// グラデーションプリセット
const GRADIENTS = [
    { name: 'サンセット', colors: ['#f093fb', '#f5576c'] },
    { name: 'オーシャン', colors: ['#667eea', '#764ba2'] },
    { name: 'ミント', colors: ['#11998e', '#38ef7d'] },
    { name: 'ピーチ', colors: ['#ee9ca7', '#ffdde1'] },
    { name: 'ナイト', colors: ['#0f2027', '#2c5364'] },
    { name: 'ゴールド', colors: ['#f7971e', '#ffd200'] }
];

// フィルタープリセット
const FILTERS = [
    { name: 'なし', filter: null },
    { name: 'グレースケール', filter: 'grayscale' },
    { name: 'セピア', filter: 'sepia' },
    { name: 'ヴィンテージ', filter: 'vintage' },
    { name: 'ブラー', filter: 'blur' }
];

// スタイル
const S = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', padding: '12px', fontFamily: 'system-ui, sans-serif', fontSize: '11px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 4px' },
    title: { fontSize: '22px', fontWeight: '800', color: '#fff', margin: 0 },
    grid: { display: 'grid', gridTemplateColumns: '240px 1fr 180px', gap: '12px', maxWidth: '1800px', margin: '0 auto' },
    panel: { background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px', border: '1px solid rgba(255,255,255,0.08)' },
    label: { color: '#888', fontSize: '9px', fontWeight: '600', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' },
    btn: { padding: '4px 7px', border: 'none', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: '#fff', transition: 'all 0.15s' },
    btnP: { background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)' },
    btnS: { padding: '3px 5px', fontSize: '9px' },
    textarea: { width: '100%', minHeight: '100px', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '12px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' },
    canvas: { background: '#0a0a0f', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '480px', position: 'relative', overflow: 'hidden' },
    row: { display: 'flex', gap: '3px', flexWrap: 'wrap', marginBottom: '5px' },
    iconGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '2px' },
    iconBtn: { padding: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '3px', fontSize: '12px', cursor: 'pointer', color: '#fff' },
    slider: { width: '100%', accentColor: '#8B5CF6', height: '3px' },
    select: { width: '100%', padding: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '10px' },
    colorPicker: { width: '20px', height: '20px', borderRadius: '3px', border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 },
    palette: { display: 'flex', gap: '2px', flexWrap: 'wrap' },
    pColor: { width: '14px', height: '14px', borderRadius: '2px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)' },
    tabs: { display: 'flex', gap: '2px', marginBottom: '5px' },
    tab: { padding: '3px 5px', fontSize: '8px', borderRadius: '3px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: '#888', border: 'none' },
    tabA: { background: 'rgba(139, 92, 246, 0.4)', color: '#fff' },
    layer: { padding: '5px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '9px', color: '#ccc' },
    layerA: { background: 'rgba(139, 92, 246, 0.3)', borderLeft: '2px solid #8B5CF6' },
    zoom: { position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.75)', padding: '5px 10px', borderRadius: '16px', display: 'flex', gap: '6px', alignItems: 'center' },
    spinner: { width: '28px', height: '28px', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#EC4899', borderRadius: '50%', animation: 'spin 1s linear infinite' },
    ruler: { position: 'absolute', background: 'rgba(30,30,40,0.9)', color: '#666', fontSize: '8px', display: 'flex', alignItems: 'center' },
    rulerH: { top: 0, left: '20px', right: 0, height: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
    rulerV: { top: '16px', left: 0, bottom: 0, width: '20px', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.1)' },
    gradBtn: { width: '100%', height: '20px', borderRadius: '4px', border: 'none', cursor: 'pointer', marginBottom: '3px' }
};

function ImageGenerator() {
    const containerRef = useRef(null);
    const fabricRef = useRef(null);
    const historyRef = useRef({ states: [], idx: -1 });
    const clipboardRef = useRef(null);
    const fileInputRef = useRef(null);
    const projectInputRef = useRef(null);

    const [prompt, setPrompt] = useState('');
    const [generating, setGenerating] = useState(false);
    const [imageUrl, setImageUrl] = useState(null);
    const [proxyUrl, setProxyUrl] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [zoom, setZoom] = useState(100);
    const [canvasSize, setCanvasSize] = useState({ w: 960, h: 540 });

    // Properties
    const [fill, setFill] = useState('#ffffff');
    const [stroke, setStroke] = useState('#000000');
    const [strokeW, setStrokeW] = useState(0);
    const [fontSize, setFontSize] = useState(48);
    const [fontFamily, setFontFamily] = useState('Arial');
    const [opacity, setOpacity] = useState(100);
    const [shadowBlur, setShadowBlur] = useState(4);
    const [brightness, setBrightness] = useState(0);
    const [contrast, setContrast] = useState(0);
    const [saturation, setSaturation] = useState(0);

    const [selected, setSelected] = useState(null);
    const [iconCat, setIconCat] = useState('基本');
    const [layers, setLayers] = useState([]);
    const [tool, setTool] = useState('select');
    const [brushSize, setBrushSize] = useState(5);
    const [showPanel, setShowPanel] = useState('tools');
    const [showRuler, setShowRuler] = useState(false);
    const [snapToGrid, setSnapToGrid] = useState(false);
    const [gridSize, setGridSize] = useState(20);

    // Export
    const [exportFormat, setExportFormat] = useState('png');
    const [exportQuality, setExportQuality] = useState(90);
    const [exportScale, setExportScale] = useState(2);

    // Canvas init
    useEffect(() => {
        if (!editMode) {
            if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null; }
            return;
        }
        if (containerRef.current && !fabricRef.current) {
            containerRef.current.innerHTML = '';
            const el = document.createElement('canvas');
            containerRef.current.appendChild(el);

            const canvas = new fabric.Canvas(el, {
                width: canvasSize.w,
                height: canvasSize.h,
                backgroundColor: '#1a1a2e',
                preserveObjectStacking: true,
                isDrawingMode: false,
                snapAngle: 15,
                snapThreshold: 10
            });
            fabricRef.current = canvas;

            canvas.on('selection:created', e => updateSelected(e.selected?.[0]));
            canvas.on('selection:updated', e => updateSelected(e.selected?.[0]));
            canvas.on('selection:cleared', () => setSelected(null));
            canvas.on('object:added', updateLayers);
            canvas.on('object:removed', updateLayers);
            canvas.on('object:modified', () => { saveHistory(); updateLayers(); });

            if (snapToGrid) {
                canvas.on('object:moving', (e) => {
                    const obj = e.target;
                    obj.set({ left: Math.round(obj.left / gridSize) * gridSize, top: Math.round(obj.top / gridSize) * gridSize });
                });
            }

            // Keyboard
            const onKey = (e) => {
                if (!fabricRef.current || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                const cmd = e.metaKey || e.ctrlKey;
                if (cmd && e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
                if (cmd && e.key === 'c') { e.preventDefault(); copy(); }
                if (cmd && e.key === 'v') { e.preventDefault(); paste(); }
                if (cmd && e.key === 'd') { e.preventDefault(); duplicate(); }
                if (cmd && e.key === 'a') { e.preventDefault(); selectAll(); }
                if (cmd && e.key === 'g') { e.preventDefault(); group(); }
                if (cmd && e.shiftKey && e.key === 'G') { e.preventDefault(); ungroup(); }
                if (e.key === 'Delete' || e.key === 'Backspace') { if (selected) { e.preventDefault(); remove(); } }
                if (e.key === 'Escape') { canvas.discardActiveObject(); canvas.renderAll(); }
                if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn(); }
                if (e.key === '-') { e.preventDefault(); zoomOut(); }
            };
            window.addEventListener('keydown', onKey);

            if (proxyUrl) loadBg(proxyUrl);
            saveHistory();
            updateLayers();

            return () => {
                window.removeEventListener('keydown', onKey);
                if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null; }
            };
        }
    }, [editMode, canvasSize, snapToGrid, gridSize]);

    useEffect(() => { if (editMode && fabricRef.current && proxyUrl) loadBg(proxyUrl); }, [proxyUrl]);

    useEffect(() => {
        if (fabricRef.current) {
            fabricRef.current.isDrawingMode = tool === 'draw' || tool === 'eraser';
            if (tool === 'draw') {
                fabricRef.current.freeDrawingBrush = new fabric.PencilBrush(fabricRef.current);
                fabricRef.current.freeDrawingBrush.color = fill;
                fabricRef.current.freeDrawingBrush.width = brushSize;
            } else if (tool === 'eraser') {
                fabricRef.current.freeDrawingBrush = new fabric.PencilBrush(fabricRef.current);
                fabricRef.current.freeDrawingBrush.color = '#1a1a2e';
                fabricRef.current.freeDrawingBrush.width = brushSize * 2;
            }
        }
    }, [tool, fill, brushSize]);

    const updateSelected = (obj) => {
        setSelected(obj);
        if (obj) {
            if (obj.fill && typeof obj.fill === 'string') setFill(obj.fill);
            if (obj.stroke) setStroke(obj.stroke);
            if (obj.strokeWidth !== undefined) setStrokeW(obj.strokeWidth);
            if (obj.fontSize) setFontSize(obj.fontSize);
            if (obj.fontFamily) setFontFamily(obj.fontFamily);
            if (obj.opacity !== undefined) setOpacity(Math.round(obj.opacity * 100));
        }
    };

    const updateLayers = () => {
        if (!fabricRef.current) return;
        const objs = fabricRef.current.getObjects().map((o, i) => ({
            id: i, type: o.type, name: o.type === 'i-text' ? (o.text?.substring(0, 8) || 'Text') : o.type,
            visible: o.visible !== false, locked: o.selectable === false, obj: o
        }));
        setLayers(objs.reverse());
    };

    const loadBg = async (url) => {
        if (!fabricRef.current) return;
        try {
            const img = await fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
            if (img && fabricRef.current) {
                const sx = canvasSize.w / img.width, sy = canvasSize.h / img.height;
                img.scale(Math.max(sx, sy));
                img.set({ originX: 'center', originY: 'center', left: canvasSize.w / 2, top: canvasSize.h / 2 });
                fabricRef.current.backgroundImage = img;
                fabricRef.current.renderAll();
            }
        } catch (e) { console.error(e); }
    };

    // History
    const saveHistory = useCallback(() => {
        if (!fabricRef.current) return;
        const h = historyRef.current;
        h.states = h.states.slice(0, h.idx + 1);
        h.states.push(fabricRef.current.toJSON());
        if (h.states.length > 40) h.states.shift();
        h.idx = h.states.length - 1;
    }, []);

    const restoreAfterLoad = () => {
        if (fabricRef.current) {
            fabricRef.current.renderAll();
            updateLayers();
            // 背景画像を再読み込み
            if (proxyUrl) {
                loadBg(proxyUrl);
            }
        }
    };

    const undo = () => {
        const h = historyRef.current;
        if (h.idx > 0) {
            h.idx--;
            fabricRef.current?.loadFromJSON(h.states[h.idx], restoreAfterLoad);
        }
    };

    const redo = () => {
        const h = historyRef.current;
        if (h.idx < h.states.length - 1) {
            h.idx++;
            fabricRef.current?.loadFromJSON(h.states[h.idx], restoreAfterLoad);
        }
    };

    // Clipboard
    const copy = () => { if (selected) selected.clone().then(c => clipboardRef.current = c); };
    const paste = () => { if (clipboardRef.current) clipboardRef.current.clone().then(c => { c.set({ left: c.left + 20, top: c.top + 20 }); fabricRef.current?.add(c); fabricRef.current?.setActiveObject(c); saveHistory(); }); };
    const duplicate = () => { if (selected) selected.clone().then(c => { c.set({ left: selected.left + 30, top: selected.top + 30 }); fabricRef.current?.add(c); fabricRef.current?.setActiveObject(c); saveHistory(); }); };
    const remove = () => { if (selected && fabricRef.current) { fabricRef.current.remove(selected); saveHistory(); } };
    const selectAll = () => { if (fabricRef.current) { const sel = new fabric.ActiveSelection(fabricRef.current.getObjects(), { canvas: fabricRef.current }); fabricRef.current.setActiveObject(sel); fabricRef.current.renderAll(); } };

    // Transform
    const flipH = () => { if (selected) { selected.set('flipX', !selected.flipX); fabricRef.current?.renderAll(); saveHistory(); } };
    const flipV = () => { if (selected) { selected.set('flipY', !selected.flipY); fabricRef.current?.renderAll(); saveHistory(); } };
    const rotate = (deg) => { if (selected) { selected.rotate((selected.angle || 0) + deg); fabricRef.current?.renderAll(); saveHistory(); } };

    // Align
    const align = (type) => {
        if (!selected || !fabricRef.current) return;
        const { w, h } = canvasSize;
        const bw = (selected.width || 0) * (selected.scaleX || 1);
        const bh = (selected.height || 0) * (selected.scaleY || 1);
        switch (type) {
            case 'left': selected.set({ left: bw / 2 }); break;
            case 'centerH': selected.set({ left: w / 2 }); break;
            case 'right': selected.set({ left: w - bw / 2 }); break;
            case 'top': selected.set({ top: bh / 2 }); break;
            case 'centerV': selected.set({ top: h / 2 }); break;
            case 'bottom': selected.set({ top: h - bh / 2 }); break;
        }
        selected.setCoords();
        fabricRef.current.renderAll();
        saveHistory();
    };

    // Zoom
    const handleZoom = (val) => { setZoom(val); if (fabricRef.current) { fabricRef.current.setZoom(val / 100); fabricRef.current.setDimensions({ width: canvasSize.w * val / 100, height: canvasSize.h * val / 100 }); } };
    const zoomFit = () => handleZoom(100);
    const zoomIn = () => handleZoom(Math.min(zoom + 25, 200));
    const zoomOut = () => handleZoom(Math.max(zoom - 25, 25));

    // Group
    const group = () => { const s = fabricRef.current?.getActiveObject(); if (s?.type === 'activeSelection') { s.toGroup(); fabricRef.current.renderAll(); saveHistory(); } };
    const ungroup = () => { if (selected?.type === 'group') { selected.toActiveSelection(); fabricRef.current?.renderAll(); saveHistory(); } };

    // Layer
    const toggleVis = (l) => { l.obj.set('visible', !l.visible); fabricRef.current?.renderAll(); updateLayers(); };
    const toggleLock = (l) => { l.obj.set('selectable', l.locked); l.obj.set('evented', l.locked); fabricRef.current?.renderAll(); updateLayers(); };
    const selectLayer = (l) => { fabricRef.current?.setActiveObject(l.obj); fabricRef.current?.renderAll(); };
    const moveLayer = (l, dir) => { if (dir === 'up') fabricRef.current?.bringObjectForward(l.obj); else fabricRef.current?.sendObjectBackwards(l.obj); fabricRef.current?.renderAll(); updateLayers(); saveHistory(); };

    // Apply prop
    const applyProp = (prop, val) => {
        if (!selected || !fabricRef.current) return;
        if (prop === 'opacity') selected.set('opacity', val / 100);
        else if (prop === 'shadow') selected.set('shadow', new fabric.Shadow({ color: 'rgba(0,0,0,0.5)', blur: shadowBlur, offsetX: 2, offsetY: 2 }));
        else selected.set(prop, val);
        fabricRef.current.renderAll();
        saveHistory();
    };

    // Gradient fill
    const applyGradient = (colors) => {
        if (!selected || !fabricRef.current) return;
        const grad = new fabric.Gradient({
            type: 'linear',
            coords: { x1: 0, y1: 0, x2: selected.width || 100, y2: selected.height || 100 },
            colorStops: [{ offset: 0, color: colors[0] }, { offset: 1, color: colors[1] }]
        });
        selected.set('fill', grad);
        fabricRef.current.renderAll();
        saveHistory();
    };

    // Add objects
    const addText = (txt = 'テキスト') => {
        if (!fabricRef.current) return;
        const t = new fabric.IText(txt, { left: canvasSize.w / 2, top: canvasSize.h / 2, originX: 'center', originY: 'center', fontFamily, fontSize, fontWeight: 'bold', fill, stroke, strokeWidth: strokeW, shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.5)', blur: shadowBlur, offsetX: 2, offsetY: 2 }) });
        fabricRef.current.add(t);
        fabricRef.current.setActiveObject(t);
        saveHistory();
    };

    const addShape = (type) => {
        if (!fabricRef.current) return;
        let s;
        const p = { left: canvasSize.w / 2, top: canvasSize.h / 2, originX: 'center', originY: 'center', fill, stroke, strokeWidth: strokeW };
        switch (type) {
            case 'rect': s = new fabric.Rect({ ...p, width: 160, height: 90, rx: 8, ry: 8 }); break;
            case 'circle': s = new fabric.Circle({ ...p, radius: 60 }); break;
            case 'triangle': s = new fabric.Triangle({ ...p, width: 120, height: 100 }); break;
            case 'line': s = new fabric.Line([0, 0, 160, 0], { ...p, stroke: fill, strokeWidth: 4 }); break;
            case 'star': s = new fabric.Polygon(createStar(5, 50, 25), { ...p }); break;
            case 'hexagon': s = new fabric.Polygon(createPolygon(6, 50), { ...p }); break;
            case 'arrow': s = createArrow(fill); break;
        }
        if (s) { s.set({ left: canvasSize.w / 2, top: canvasSize.h / 2, originX: 'center', originY: 'center' }); fabricRef.current.add(s); fabricRef.current.setActiveObject(s); saveHistory(); }
    };

    const createStar = (pts, outer, inner) => { const arr = []; for (let i = 0; i < pts * 2; i++) { const r = i % 2 === 0 ? outer : inner; const a = (Math.PI / pts) * i - Math.PI / 2; arr.push({ x: r * Math.cos(a), y: r * Math.sin(a) }); } return arr; };
    const createPolygon = (sides, r) => { const arr = []; for (let i = 0; i < sides; i++) { const a = (2 * Math.PI / sides) * i - Math.PI / 2; arr.push({ x: r * Math.cos(a), y: r * Math.sin(a) }); } return arr; };
    const createArrow = (col) => { const line = new fabric.Line([0, 0, 120, 0], { stroke: col, strokeWidth: 4, originX: 'center', originY: 'center' }); const head = new fabric.Triangle({ width: 20, height: 24, fill: col, left: 60, top: 0, angle: 90, originX: 'center', originY: 'center' }); return new fabric.Group([line, head]); };

    const addIcon = (icon) => { if (!fabricRef.current) return; const t = new fabric.IText(icon, { left: canvasSize.w / 2 + (Math.random() - 0.5) * 80, top: canvasSize.h / 2 + (Math.random() - 0.5) * 80, originX: 'center', originY: 'center', fontSize: 44 }); fabricRef.current.add(t); fabricRef.current.setActiveObject(t); saveHistory(); };

    const addBadge = (b) => { if (!fabricRef.current) return; const rect = new fabric.Rect({ width: 60, height: 24, fill: b.color, rx: 4, ry: 4, originX: 'center', originY: 'center' }); const txt = new fabric.Text(b.text, { fontSize: 12, fill: '#fff', fontWeight: 'bold', originX: 'center', originY: 'center' }); const g = new fabric.Group([rect, txt], { left: canvasSize.w / 2, top: 40, originX: 'center', originY: 'center' }); fabricRef.current.add(g); fabricRef.current.setActiveObject(g); saveHistory(); };

    const addBubble = () => { if (!fabricRef.current) return; const r = new fabric.Rect({ width: 160, height: 60, fill: '#fff', rx: 16, ry: 16, originX: 'center', originY: 'center' }); const tri = new fabric.Triangle({ width: 22, height: 16, fill: '#fff', left: 0, top: 38, angle: 180 }); const g = new fabric.Group([r, tri], { left: canvasSize.w / 2, top: canvasSize.h / 2, originX: 'center', originY: 'center' }); fabricRef.current.add(g); fabricRef.current.setActiveObject(g); saveHistory(); };

    // Image upload
    const handleUpload = (e) => { const f = e.target.files?.[0]; if (!f || !fabricRef.current) return; const r = new FileReader(); r.onload = async (ev) => { const img = await fabric.FabricImage.fromURL(ev.target.result); img.scaleToWidth(160); img.set({ left: canvasSize.w / 2, top: canvasSize.h / 2, originX: 'center', originY: 'center' }); fabricRef.current.add(img); fabricRef.current.setActiveObject(img); saveHistory(); }; r.readAsDataURL(f); e.target.value = ''; };

    // Template
    const applyTpl = (t) => { setCanvasSize({ w: t.width, h: t.height }); setEditMode(false); setTimeout(() => setEditMode(true), 50); };

    // Generate
    const generate = async () => {
        if (!prompt.trim()) return;
        setGenerating(true); setEditMode(false);
        try {
            // GAS API呼び出し
            const result = await api.image.generate(prompt);

            // GASからは { imageUrl: '...' } またはMarkdownなどが返ると想定
            const url = result?.imageUrl || result?.url;

            if (url) {
                const clean = url.replace(/^!\[\]\(/, '').replace(/\)$/, '');
                setImageUrl(clean);
                // GAS経由の場合はプロキシ不要（GAS側でbase64化するか、署名付きURLならそのまま使える）
                // とりあえずそのままセットしてみる
                setProxyUrl(clean);
            }
            else {
                alert('画像URLが取得できませんでした');
            }
        } catch (e) {
            console.error('Image Generation Error:', e);
            alert('生成失敗: ' + e.message);
        }
        finally { setGenerating(false); }
    };

    // Download
    const download = () => {
        if (!editMode || !fabricRef.current) { if (imageUrl) window.open(imageUrl, '_blank'); return; }
        try {
            const origZoom = fabricRef.current.getZoom();
            fabricRef.current.setZoom(1);
            fabricRef.current.setDimensions({ width: canvasSize.w, height: canvasSize.h });
            const url = fabricRef.current.toDataURL({ format: exportFormat, quality: exportQuality / 100, multiplier: exportScale });
            fabricRef.current.setZoom(origZoom);
            fabricRef.current.setDimensions({ width: canvasSize.w * zoom / 100, height: canvasSize.h * zoom / 100 });
            const a = document.createElement('a'); a.download = `image-${Date.now()}.${exportFormat}`; a.href = url; a.click();
        } catch (e) { console.error(e); alert('エクスポート失敗'); }
    };

    // Project
    const saveProject = () => { if (!fabricRef.current) return; const json = JSON.stringify({ canvas: fabricRef.current.toJSON(), size: canvasSize, imageUrl, proxyUrl }); const blob = new Blob([json], { type: 'application/json' }); const a = document.createElement('a'); a.download = `project-${Date.now()}.json`; a.href = URL.createObjectURL(blob); a.click(); };
    const loadProject = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { try { const data = JSON.parse(ev.target.result); if (data.size) setCanvasSize(data.size); if (data.imageUrl) setImageUrl(data.imageUrl); if (data.proxyUrl) setProxyUrl(data.proxyUrl); setEditMode(true); setTimeout(() => { if (fabricRef.current && data.canvas) { fabricRef.current.loadFromJSON(data.canvas, () => { fabricRef.current.renderAll(); updateLayers(); historyRef.current = { states: [data.canvas], idx: 0 }; }); } }, 100); } catch { alert('読み込み失敗'); } }; r.readAsText(f); e.target.value = ''; };

    // Ruler marks
    const renderRuler = (type) => {
        const marks = [];
        const max = type === 'h' ? canvasSize.w : canvasSize.h;
        for (let i = 0; i <= max; i += 50) {
            marks.push(<span key={i} style={{ position: 'absolute', [type === 'h' ? 'left' : 'top']: `${(i / max) * 100}%`, fontSize: '7px', color: '#666' }}>{i}</span>);
        }
        return marks;
    };

    return (
        <div style={S.container}>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}.hb:hover{background:rgba(255,255,255,0.15)!important;transform:scale(1.02)}`}</style>
            <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
            <input type="file" ref={projectInputRef} accept=".json" style={{ display: 'none' }} onChange={loadProject} />

            <div style={{ maxWidth: '1800px', margin: '0 auto' }}>
                <div style={S.header}>
                    <h1 style={S.title}>🎨 Pro Editor</h1>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        {editMode && <><button className="hb" style={S.btn} onClick={undo}>↶</button><button className="hb" style={S.btn} onClick={redo}>↷</button><span style={{ color: '#444' }}>|</span></>}
                        <button className="hb" style={S.btn} onClick={saveProject}>💾</button>
                        <button className="hb" style={S.btn} onClick={() => projectInputRef.current?.click()}>📂</button>
                        {imageUrl && <><button className="hb" style={S.btn} onClick={() => setEditMode(!editMode)}>{editMode ? '👁️' : '✏️'}</button><button className="hb" style={{ ...S.btn, ...S.btnP }} onClick={download}>⬇️</button></>}
                    </div>
                </div>

                <div style={S.grid}>
                    {/* Left */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: 'calc(100vh - 80px)' }}>
                        <div style={S.panel}>
                            <div style={S.label}>✨ 生成</div>
                            <textarea style={S.textarea} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="プロンプト..." />
                            <button className="hb" style={{ ...S.btn, ...S.btnP, width: '100%', marginTop: '4px' }} onClick={generate} disabled={generating}>{generating ? '⏳' : '🚀'}</button>
                        </div>

                        {editMode && <>
                            <div style={S.panel}>
                                <div style={S.label}>📏 テンプレート</div>
                                <div style={S.row}>{TEMPLATES.map(t => <button key={t.id} className="hb" style={{ ...S.btn, ...S.btnS }} onClick={() => applyTpl(t)}>{t.name}</button>)}</div>
                            </div>

                            <div style={S.panel}>
                                <div style={S.label}>🛠️ ツール</div>
                                <div style={S.row}>
                                    <button className="hb" style={{ ...S.btn, ...(tool === 'select' ? S.btnP : {}) }} onClick={() => setTool('select')}>↖️</button>
                                    <button className="hb" style={{ ...S.btn, ...(tool === 'draw' ? S.btnP : {}) }} onClick={() => setTool('draw')}>✏️</button>
                                    <button className="hb" style={{ ...S.btn, ...(tool === 'eraser' ? S.btnP : {}) }} onClick={() => setTool('eraser')}>🧹</button>
                                </div>
                                {(tool === 'draw' || tool === 'eraser') && <div style={{ marginTop: '4px' }}><span style={{ color: '#666', fontSize: '8px' }}>ブラシ: {brushSize}</span><input type="range" min="1" max="50" value={brushSize} onChange={e => setBrushSize(+e.target.value)} style={S.slider} /></div>}
                            </div>

                            <div style={S.panel}>
                                <div style={S.label}>✏️ テキスト</div>
                                <div style={S.row}><button className="hb" style={S.btn} onClick={() => addText()}>+ Text</button><button className="hb" style={S.btn} onClick={() => addText('見出し')}>+ H1</button></div>
                                <select style={{ ...S.select, marginTop: '3px' }} value={fontFamily} onChange={e => { setFontFamily(e.target.value); applyProp('fontFamily', e.target.value); }}>{FONTS.map(f => <option key={f} value={f}>{f}</option>)}</select>
                            </div>

                            <div style={S.panel}>
                                <div style={S.label}>🔷 図形</div>
                                <div style={S.row}>
                                    <button className="hb" style={S.btn} onClick={() => addShape('rect')}>▭</button>
                                    <button className="hb" style={S.btn} onClick={() => addShape('circle')}>○</button>
                                    <button className="hb" style={S.btn} onClick={() => addShape('triangle')}>△</button>
                                    <button className="hb" style={S.btn} onClick={() => addShape('star')}>★</button>
                                    <button className="hb" style={S.btn} onClick={() => addShape('hexagon')}>⬡</button>
                                    <button className="hb" style={S.btn} onClick={() => addShape('arrow')}>→</button>
                                    <button className="hb" style={S.btn} onClick={addBubble}>💬</button>
                                </div>
                                <div style={{ ...S.row, marginTop: '3px' }}>{BADGES.map((b, i) => <button key={i} className="hb" style={{ ...S.btn, ...S.btnS, background: b.color }} onClick={() => addBadge(b)}>{b.text}</button>)}</div>
                            </div>

                            <div style={S.panel}>
                                <div style={S.label}>😀 アイコン</div>
                                <div style={S.tabs}>{Object.keys(ICONS).map(c => <button key={c} style={{ ...S.tab, ...(iconCat === c ? S.tabA : {}) }} onClick={() => setIconCat(c)}>{c}</button>)}</div>
                                <div style={S.iconGrid}>{ICONS[iconCat]?.map((ic, i) => <button key={i} className="hb" style={S.iconBtn} onClick={() => addIcon(ic)}>{ic}</button>)}</div>
                            </div>

                            <div style={S.panel}>
                                <button className="hb" style={{ ...S.btn, width: '100%' }} onClick={() => fileInputRef.current?.click()}>🖼️ 画像追加</button>
                            </div>

                            <div style={S.panel}>
                                <div style={S.label}>⚙️ 設定</div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#888', fontSize: '9px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={showRuler} onChange={e => setShowRuler(e.target.checked)} /> ルーラー表示
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#888', fontSize: '9px', cursor: 'pointer', marginTop: '3px' }}>
                                    <input type="checkbox" checked={snapToGrid} onChange={e => setSnapToGrid(e.target.checked)} /> グリッドスナップ
                                </label>
                            </div>
                        </>}
                    </div>

                    {/* Canvas */}
                    <div style={S.panel}>
                        <div style={{ ...S.canvas, position: 'relative' }}>
                            {showRuler && editMode && <>
                                <div style={{ ...S.ruler, ...S.rulerH }}>{renderRuler('h')}</div>
                                <div style={{ ...S.ruler, ...S.rulerV }}>{renderRuler('v')}</div>
                            </>}
                            {generating ? <div style={{ textAlign: 'center', color: '#fff' }}><div style={S.spinner} /><p style={{ marginTop: '6px', fontSize: '10px' }}>生成中...</p></div>
                                : editMode ? <div ref={containerRef} style={{ width: canvasSize.w * zoom / 100, height: canvasSize.h * zoom / 100, marginLeft: showRuler ? '20px' : 0, marginTop: showRuler ? '16px' : 0 }} />
                                    : imageUrl ? <img src={imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: '460px', borderRadius: '5px' }} />
                                        : <p style={{ color: 'rgba(255,255,255,0.3)' }}>プロンプトを入力</p>}
                            {editMode && <div style={S.zoom}>
                                <button className="hb" style={{ ...S.btn, padding: '2px 5px' }} onClick={zoomOut}>−</button>
                                <span style={{ color: '#fff', fontSize: '10px', minWidth: '36px', textAlign: 'center' }}>{zoom}%</span>
                                <button className="hb" style={{ ...S.btn, padding: '2px 5px' }} onClick={zoomIn}>+</button>
                                <button className="hb" style={{ ...S.btn, padding: '2px 5px', marginLeft: '6px' }} onClick={zoomFit}>Fit</button>
                            </div>}
                        </div>
                    </div>

                    {/* Right */}
                    {editMode && <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: 'calc(100vh - 80px)' }}>
                        <div style={S.tabs}>
                            <button style={{ ...S.tab, ...(showPanel === 'tools' ? S.tabA : {}) }} onClick={() => setShowPanel('tools')}>プロパティ</button>
                            <button style={{ ...S.tab, ...(showPanel === 'layers' ? S.tabA : {}) }} onClick={() => setShowPanel('layers')}>レイヤー</button>
                            <button style={{ ...S.tab, ...(showPanel === 'export' ? S.tabA : {}) }} onClick={() => setShowPanel('export')}>書出し</button>
                        </div>

                        {showPanel === 'tools' && <>
                            <div style={S.panel}>
                                <div style={S.label}>🎨 色</div>
                                <div style={S.palette}>{COLORS.map(c => <div key={c} style={{ ...S.pColor, background: c }} onClick={() => { setFill(c); applyProp('fill', c); }} />)}</div>
                                <div style={{ ...S.row, marginTop: '4px' }}>
                                    <span style={{ color: '#666', fontSize: '8px' }}>塗り</span>
                                    <input type="color" value={fill} onChange={e => { setFill(e.target.value); applyProp('fill', e.target.value); }} style={S.colorPicker} />
                                    <span style={{ color: '#666', fontSize: '8px', marginLeft: '6px' }}>線</span>
                                    <input type="color" value={stroke} onChange={e => { setStroke(e.target.value); applyProp('stroke', e.target.value); }} style={S.colorPicker} />
                                </div>
                                <div style={{ marginTop: '3px' }}><span style={{ color: '#666', fontSize: '8px' }}>線幅</span><input type="range" min="0" max="20" value={strokeW} onChange={e => { setStrokeW(+e.target.value); applyProp('strokeWidth', +e.target.value); }} style={S.slider} /></div>
                            </div>

                            <div style={S.panel}>
                                <div style={S.label}>🌈 グラデーション</div>
                                {GRADIENTS.map(g => <button key={g.name} className="hb" style={{ ...S.gradBtn, background: `linear-gradient(90deg, ${g.colors[0]}, ${g.colors[1]})` }} onClick={() => applyGradient(g.colors)} />)}
                            </div>

                            <div style={S.panel}>
                                <div style={S.label}>✨ 効果</div>
                                <div><span style={{ color: '#666', fontSize: '8px' }}>透明度 {opacity}%</span><input type="range" min="0" max="100" value={opacity} onChange={e => { setOpacity(+e.target.value); applyProp('opacity', +e.target.value); }} style={S.slider} /></div>
                                <div><span style={{ color: '#666', fontSize: '8px' }}>影 {shadowBlur}</span><input type="range" min="0" max="30" value={shadowBlur} onChange={e => { setShadowBlur(+e.target.value); applyProp('shadow', null); }} style={S.slider} /></div>
                            </div>

                            <div style={S.panel}>
                                <div style={S.label}>📐 整列</div>
                                <div style={S.row}>
                                    <button className="hb" style={S.btn} onClick={() => align('left')}>⬅</button>
                                    <button className="hb" style={S.btn} onClick={() => align('centerH')}>⬌</button>
                                    <button className="hb" style={S.btn} onClick={() => align('right')}>➡</button>
                                    <button className="hb" style={S.btn} onClick={() => align('top')}>⬆</button>
                                    <button className="hb" style={S.btn} onClick={() => align('centerV')}>⬍</button>
                                    <button className="hb" style={S.btn} onClick={() => align('bottom')}>⬇</button>
                                </div>
                            </div>

                            <div style={S.panel}>
                                <div style={S.label}>🔄 変形</div>
                                <div style={S.row}>
                                    <button className="hb" style={S.btn} onClick={flipH}>↔</button>
                                    <button className="hb" style={S.btn} onClick={flipV}>↕</button>
                                    <button className="hb" style={S.btn} onClick={() => rotate(-90)}>↺</button>
                                    <button className="hb" style={S.btn} onClick={() => rotate(90)}>↻</button>
                                    <button className="hb" style={S.btn} onClick={() => rotate(-45)}>↺45</button>
                                    <button className="hb" style={S.btn} onClick={() => rotate(45)}>↻45</button>
                                </div>
                            </div>

                            <div style={S.panel}>
                                <div style={S.label}>⚙️ 操作</div>
                                <div style={S.row}>
                                    <button className="hb" style={S.btn} onClick={copy}>📋</button>
                                    <button className="hb" style={S.btn} onClick={paste}>📄</button>
                                    <button className="hb" style={S.btn} onClick={duplicate}>⊕</button>
                                    <button className="hb" style={S.btn} onClick={remove}>🗑️</button>
                                </div>
                                <div style={{ ...S.row, marginTop: '3px' }}>
                                    <button className="hb" style={S.btn} onClick={group}>G</button>
                                    <button className="hb" style={S.btn} onClick={ungroup}>U</button>
                                    <button className="hb" style={S.btn} onClick={selectAll}>All</button>
                                </div>
                            </div>
                        </>}

                        {showPanel === 'layers' && <div style={S.panel}>
                            <div style={S.label}>📚 レイヤー ({layers.length})</div>
                            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                                {layers.map(l => (
                                    <div key={l.id} style={{ ...S.layer, ...(selected === l.obj ? S.layerA : {}) }} onClick={() => selectLayer(l)}>
                                        <span style={{ opacity: l.visible ? 1 : 0.4 }}>{l.name}</span>
                                        <div style={{ display: 'flex', gap: '2px' }}>
                                            <button style={{ ...S.btn, padding: '1px 3px', fontSize: '8px' }} onClick={e => { e.stopPropagation(); toggleVis(l); }}>{l.visible ? '👁' : '👁‍🗨'}</button>
                                            <button style={{ ...S.btn, padding: '1px 3px', fontSize: '8px' }} onClick={e => { e.stopPropagation(); toggleLock(l); }}>{l.locked ? '🔒' : '🔓'}</button>
                                            <button style={{ ...S.btn, padding: '1px 3px', fontSize: '8px' }} onClick={e => { e.stopPropagation(); moveLayer(l, 'up'); }}>↑</button>
                                            <button style={{ ...S.btn, padding: '1px 3px', fontSize: '8px' }} onClick={e => { e.stopPropagation(); moveLayer(l, 'down'); }}>↓</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>}

                        {showPanel === 'export' && <div style={S.panel}>
                            <div style={S.label}>📦 書き出し</div>
                            <div style={{ marginBottom: '4px' }}><span style={{ color: '#666', fontSize: '8px' }}>形式</span>
                                <select style={S.select} value={exportFormat} onChange={e => setExportFormat(e.target.value)}>
                                    <option value="png">PNG</option>
                                    <option value="jpeg">JPEG</option>
                                    <option value="webp">WebP</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: '4px' }}><span style={{ color: '#666', fontSize: '8px' }}>品質 {exportQuality}%</span><input type="range" min="10" max="100" value={exportQuality} onChange={e => setExportQuality(+e.target.value)} style={S.slider} /></div>
                            <div style={{ marginBottom: '4px' }}><span style={{ color: '#666', fontSize: '8px' }}>倍率</span>
                                <select style={S.select} value={exportScale} onChange={e => setExportScale(+e.target.value)}>
                                    <option value={1}>1x</option>
                                    <option value={2}>2x</option>
                                    <option value={3}>3x</option>
                                    <option value={4}>4x</option>
                                </select>
                            </div>
                            <button className="hb" style={{ ...S.btn, ...S.btnP, width: '100%', marginTop: '4px' }} onClick={download}>⬇️ ダウンロード</button>
                        </div>}
                    </div>}
                </div>
            </div>
        </div>
    );
}

export default ImageGenerator;
