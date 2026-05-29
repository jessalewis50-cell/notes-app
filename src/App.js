/* global HandwritingStroke */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';

const FONT_FAMILIES = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Comic Sans MS'];
const FONT_SIZES = [
  { label: '10pt', value: '1' }, { label: '13pt', value: '2' }, { label: '16pt', value: '3' },
  { label: '18pt', value: '4' }, { label: '24pt', value: '5' }, { label: '32pt', value: '6' }, { label: '48pt', value: '7' },
];
const HW_LINE_H = 64;
const HW_LINES = 3;
const HW_BASELINE = 0.72;

function makeNote() {
  return { id: Date.now(), title: 'Untitled', content: '', updatedAt: new Date().toISOString() };
}
function stripHtml(h) { return h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso), now = new Date();
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function tbtn(active) { return `tbtn${active ? ' active' : ''}`; }

export default function App() {
  const [notes, setNotes] = useState(() => {
    try { const p = JSON.parse(localStorage.getItem('notes-v2')); if (Array.isArray(p) && p.length) return p; } catch {}
    return [makeNote()];
  });
  const [activeId, setActiveId] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notes-active')); } catch { return null; }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hwMode, setHwMode] = useState(false);
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);
  const [formats, setFormats] = useState({});
  const [color, setColor] = useState('#000000');
  const [lined, setLined] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notes-lined')) || false; } catch { return false; }
  });

  const eid = (activeId && notes.find(n => n.id === activeId)) ? activeId : notes[0]?.id;
  const activeNote = notes.find(n => n.id === eid) || notes[0];

  useEffect(() => { localStorage.setItem('notes-v2', JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem('notes-active', JSON.stringify(eid)); }, [eid]);
  useEffect(() => { localStorage.setItem('notes-lined', JSON.stringify(lined)); }, [lined]);

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = activeNote?.content || '';
  }, [eid]); // eslint-disable-line react-hooks/exhaustive-deps

  const newNote = useCallback(() => {
    const n = makeNote(); setNotes(p => [n, ...p]); setActiveId(n.id); setSidebarOpen(false);
  }, []);

  const openNote = useCallback((id) => { setActiveId(id); setSidebarOpen(false); }, []);

  const deleteNote = useCallback((id, e) => {
    e.stopPropagation();
    setNotes(prev => {
      const rest = prev.filter(n => n.id !== id);
      if (!rest.length) { const n = makeNote(); setActiveId(n.id); return [n]; }
      if (id === eid) setActiveId(rest[0].id);
      return rest;
    });
  }, [eid]);

  const setTitle = useCallback((title) => {
    setNotes(p => p.map(n => n.id === eid ? { ...n, title, updatedAt: new Date().toISOString() } : n));
  }, [eid]);

  const onEditorInput = useCallback(() => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    setNotes(p => p.map(n => n.id === eid ? { ...n, content, updatedAt: new Date().toISOString() } : n));
  }, [eid]);

  const saveRange = useCallback(() => {
    const sel = window.getSelection();
    if (sel?.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode))
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
  }, []);

  const restoreRange = useCallback(() => {
    if (savedRangeRef.current) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(savedRangeRef.current); }
    editorRef.current?.focus();
  }, []);

  const refreshFormats = useCallback(() => {
    try {
      setFormats({
        bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'), strikeThrough: document.queryCommandState('strikeThrough'),
        justifyLeft: document.queryCommandState('justifyLeft'), justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
      });
    } catch {}
  }, []);

  useEffect(() => {
    const h = () => { if (document.activeElement === editorRef.current) { saveRange(); refreshFormats(); } };
    document.addEventListener('selectionchange', h);
    return () => document.removeEventListener('selectionchange', h);
  }, [saveRange, refreshFormats]);

  const execBtn = useCallback((e, cmd, val = null) => {
    e.preventDefault(); document.execCommand(cmd, false, val); editorRef.current?.focus(); refreshFormats();
  }, [refreshFormats]);

  const applyFont  = useCallback((e) => { restoreRange(); document.execCommand('fontName', false, e.target.value); editorRef.current?.focus(); }, [restoreRange]);
  const applySize  = useCallback((e) => { restoreRange(); document.execCommand('fontSize', false, e.target.value); editorRef.current?.focus(); }, [restoreRange]);
  const applyColor = useCallback((e) => { const c = e.target.value; setColor(c); restoreRange(); document.execCommand('foreColor', false, c); editorRef.current?.focus(); }, [restoreRange]);

  const insertText = useCallback((text) => {
    editorRef.current?.focus(); restoreRange();
    document.execCommand('insertText', false, text + ' ');
    onEditorInput();
  }, [restoreRange, onEditorInput]);

  return (
    <div className="app">
      <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sb-head">
          <span className="sb-heading">Notes</span>
          <button className="sb-new" onPointerDown={newNote} title="New note">＋</button>
        </div>
        <div className="sb-list">
          {notes.map(n => (
            <div key={n.id} className={`sb-note${n.id === eid ? ' active' : ''}`} onPointerDown={() => openNote(n.id)}>
              <div className="sb-note-title">{n.title || 'Untitled'}</div>
              <div className="sb-note-preview">{stripHtml(n.content).slice(0, 55) || 'No content'}</div>
              <div className="sb-note-foot">
                <span className="sb-date">{formatDate(n.updatedAt)}</span>
                <button className="sb-del" onPointerDown={e => deleteNote(n.id, e)} title="Delete">×</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {sidebarOpen && <div className="sb-overlay" onPointerDown={() => setSidebarOpen(false)} />}

      <div className="main">
        <div className="topbar">
          <button className="tbtn" onPointerDown={() => setSidebarOpen(s => !s)} title="All notes"><MenuIcon /></button>
          <input className="title-input" value={activeNote?.title || ''} onChange={e => setTitle(e.target.value)} placeholder="Untitled" />
          <button className={`tbtn${hwMode ? ' active' : ''}`} onPointerDown={() => setHwMode(m => !m)} title={hwMode ? 'Keyboard' : 'Handwrite'}>
            {hwMode ? <KeyboardIcon /> : <PenIcon />}
          </button>
        </div>

        <div className="toolbar" role="toolbar">
          <div className="toolbar-group">
            <select className="tb-select font-select" defaultValue="Arial" onFocus={saveRange} onChange={applyFont}>
              {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select className="tb-select size-select" defaultValue="3" onFocus={saveRange} onChange={applySize}>
              {FONT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <span className="tb-div" />
          <div className="toolbar-group">
            <button className={tbtn(formats.bold)}         onPointerDown={e => execBtn(e,'bold')}         title="Bold"><b>B</b></button>
            <button className={tbtn(formats.italic)}       onPointerDown={e => execBtn(e,'italic')}       title="Italic"><i>I</i></button>
            <button className={tbtn(formats.underline)}    onPointerDown={e => execBtn(e,'underline')}    title="Underline"><u>U</u></button>
            <button className={tbtn(formats.strikeThrough)}onPointerDown={e => execBtn(e,'strikeThrough')}title="Strikethrough"><s>S</s></button>
          </div>
          <span className="tb-div" />
          <div className="toolbar-group">
            <label className="tbtn color-btn" title="Text color">
              <span className="color-a" style={{ '--c': color }}>A</span>
              <input type="color" value={color} onFocus={saveRange} onChange={applyColor} className="sr-only" />
            </label>
          </div>
          <span className="tb-div" />
          <div className="toolbar-group">
            <button className={tbtn(formats.justifyLeft)}  onPointerDown={e => execBtn(e,'justifyLeft')}  title="Left"><AlignLeftIcon /></button>
            <button className={tbtn(formats.justifyCenter)}onPointerDown={e => execBtn(e,'justifyCenter')}title="Center"><AlignCenterIcon /></button>
            <button className={tbtn(formats.justifyRight)} onPointerDown={e => execBtn(e,'justifyRight')} title="Right"><AlignRightIcon /></button>
          </div>
          <span className="tb-div" />
          <div className="toolbar-group">
            <button className={tbtn(formats.insertUnorderedList)}onPointerDown={e => execBtn(e,'insertUnorderedList')}title="Bullets"><BulletListIcon /></button>
            <button className={tbtn(formats.insertOrderedList)}  onPointerDown={e => execBtn(e,'insertOrderedList')}  title="Numbers"><span className="list-num">1.</span></button>
          </div>
          <span className="tb-div" />
          <div className="toolbar-group">
            <button className="tbtn" onPointerDown={e => execBtn(e,'outdent')} title="Decrease indent"><OutdentIcon /></button>
            <button className="tbtn" onPointerDown={e => execBtn(e,'indent')}  title="Increase indent"><IndentIcon /></button>
          </div>
          <span className="tb-div" />
          <div className="toolbar-group">
            <button className={tbtn(lined)} onPointerDown={() => setLined(l => !l)} title={lined ? 'Plain page' : 'Lined page'}><LinesIcon /></button>
          </div>
        </div>

        <div className="editor-scroll">
          <div
            ref={editorRef}
            className={`editor${lined ? ' lined' : ''}`}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            data-placeholder="Start typing your note…"
            onInput={onEditorInput}
            onBlur={saveRange}
          />
        </div>

        {hwMode && <HandwritingCanvas onText={insertText} onClose={() => setHwMode(false)} />}
      </div>
    </div>
  );
}

// ── Handwriting Canvas ──────────────────────────────────────────────────────────

function HandwritingCanvas({ onText, onClose }) {
  const canvasRef   = useRef(null);
  const ctxRef      = useRef(null);
  const recognizer  = useRef(null);
  const drawing     = useRef(null);
  const strokes     = useRef([]);
  const live        = useRef(null);
  const timer       = useRef(null);
  const [status,    setStatus]    = useState('idle');   // idle | drawing | recognizing
  const [supported, setSupported] = useState(null);     // null | true | false
  const H = HW_LINES * HW_LINE_H + 24;

  // Init recognizer
  useEffect(() => {
    (async () => {
      if (!('handwriting' in navigator)) { setSupported(false); return; }
      try {
        recognizer.current = await navigator.handwriting.createRecognizer({ languages: ['en'] });
        resetDrawing();
        setSupported(true);
      } catch { setSupported(false); }
    })();
    return () => clearTimeout(timer.current);
  }, []); // eslint-disable-line

  // Init canvas with ResizeObserver so it stays crisp on resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function setup() {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      if (!w || !h) return;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctxRef.current = ctx;
      paintAll();
    }
    setup();
    const ro = new ResizeObserver(setup);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []); // eslint-disable-line

  function resetDrawing() {
    if (!recognizer.current) return;
    try { drawing.current = recognizer.current.startDrawing({ hints: { recognitionType: 'text', inputType: 'touch' } }); } catch {}
  }

  function paintBg(ctx, w) {
    ctx.fillStyle = '#fdfdf5';
    ctx.fillRect(0, 0, w, H);
    for (let i = 0; i < HW_LINES; i++) {
      const top  = 12 + i * HW_LINE_H;
      const base = 12 + (i + HW_BASELINE) * HW_LINE_H;
      // Cap-height guide
      ctx.strokeStyle = '#ddeef8'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, top + HW_LINE_H * 0.14); ctx.lineTo(w, top + HW_LINE_H * 0.14); ctx.stroke();
      // Baseline
      ctx.strokeStyle = '#a8c8e8'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, base); ctx.lineTo(w, base); ctx.stroke();
    }
  }

  function paintInk(ctx, list) {
    ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 2.5;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const pts of list) {
      if (pts.length < 2) continue;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i+1].x) / 2, my = (pts[i].y + pts[i+1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      ctx.lineTo(pts[pts.length-1].x, pts[pts.length-1].y); ctx.stroke();
    }
  }

  function paintAll() {
    const canvas = canvasRef.current, ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    paintBg(ctx, w);
    paintInk(ctx, [...strokes.current, ...(live.current ? [live.current] : [])]);
  }

  // Soft-snap Y to nearest ruled line so strokes stay orderly and don't droop
  function snapY(rawY) {
    const lineIdx = Math.max(0, Math.min(HW_LINES - 1, Math.floor((rawY - 12) / HW_LINE_H)));
    const baseline = 12 + (lineIdx + HW_BASELINE) * HW_LINE_H;
    const dev = rawY - baseline;
    const cap = HW_LINE_H * 0.47;
    return baseline + Math.tanh(dev / (cap * 0.65)) * cap;
  }

  function getPoint(e) {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: snapY(e.clientY - r.top), t: Date.now() };
  }

  function onDown(e) {
    canvasRef.current.setPointerCapture(e.pointerId);
    clearTimeout(timer.current);
    live.current = [getPoint(e)];
    setStatus('drawing');
  }

  function onMove(e) {
    if (!live.current) return;
    live.current = [...live.current, getPoint(e)];
    paintAll();
  }

  function onUp() {
    if (!live.current) return;
    const pts = live.current;
    if (pts.length > 1) {
      strokes.current = [...strokes.current, pts];
      if (drawing.current && typeof HandwritingStroke !== 'undefined') {
        try { const s = new HandwritingStroke(); pts.forEach(p => s.addPoint({ x: p.x, y: p.y, t: p.t })); drawing.current.addStroke(s); } catch {}
      }
    }
    live.current = null;
    paintAll();
    setStatus('idle');
    if (strokes.current.length > 0) timer.current = setTimeout(recognize, 1500);
  }

  async function recognize() {
    if (!drawing.current || !strokes.current.length) return;
    setStatus('recognizing');
    try {
      const results = await drawing.current.getPrediction();
      const text = results?.[0]?.text;
      if (text) { onText(text); clearAll(); return; }
    } catch (err) { console.warn('HW recognition:', err); }
    setStatus('idle');
  }

  function clearAll() {
    strokes.current = []; live.current = null;
    clearTimeout(timer.current);
    resetDrawing(); paintAll(); setStatus('idle');
  }

  const hasStrokes = strokes.current.length > 0 || status === 'drawing';
  const hint = status === 'recognizing' ? 'Converting…'
             : status === 'drawing'     ? 'Writing…'
             : hasStrokes               ? 'Pause to auto-convert, or tap Convert'
             :                           'Write on the lines below';

  return (
    <div className="hw-panel">
      <div className="hw-bar">
        <span className="hw-hint">{hint}</span>
        <div className="hw-btns">
          {hasStrokes && <button className="hw-btn primary" onPointerDown={recognize}>Convert</button>}
          <button className="hw-btn" onPointerDown={clearAll} disabled={!hasStrokes}>Clear</button>
          <button className="hw-btn close-hw" onPointerDown={onClose}>✕</button>
        </div>
      </div>

      {supported === false ? (
        <div className="hw-unsupported">
          <strong>Handwriting recognition not available</strong>
          <p>Requires Chrome 99+ on Windows 10/11 or Android with the system handwriting service enabled.</p>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="hw-canvas"
          style={{ height: H }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
      )}
    </div>
  );
}

// ── Icons ───────────────────────────────────────────────────────────────────────

function MenuIcon() {
  return <svg width="20" height="16" viewBox="0 0 20 16" fill="currentColor" aria-hidden="true">
    <rect x="0" y="0"    width="20" height="2.5" rx="1.25"/>
    <rect x="0" y="6.75" width="20" height="2.5" rx="1.25"/>
    <rect x="0" y="13.5" width="20" height="2.5" rx="1.25"/>
  </svg>;
}
function PenIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
    <path d="M13 2l3 3-9 9H4v-3L13 2z"/><line x1="11" y1="4" x2="14" y2="7"/>
  </svg>;
}
function KeyboardIcon() {
  return <svg width="20" height="14" viewBox="0 0 20 14" fill="currentColor" aria-hidden="true">
    <rect x="0" y="0" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    {[0,1,2,3].map(i => <rect key={i} x={2.5+i*4} y="2.5" width="2.5" height="2.5" rx="0.5"/>)}
    {[0,1,2,3].map(i => <rect key={i} x={2.5+i*4} y="7"   width="2.5" height="2.5" rx="0.5"/>)}
    <rect x="5" y="11" width="10" height="2" rx="1"/>
  </svg>;
}
function AlignLeftIcon() {
  return <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor" aria-hidden="true">
    <rect x="0" y="0"  width="18" height="2" rx="1"/><rect x="0" y="4"  width="13" height="2" rx="1"/>
    <rect x="0" y="8"  width="16" height="2" rx="1"/><rect x="0" y="12" width="10" height="2" rx="1"/>
  </svg>;
}
function AlignCenterIcon() {
  return <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor" aria-hidden="true">
    <rect x="0"   y="0"  width="18" height="2" rx="1"/><rect x="2.5" y="4"  width="13" height="2" rx="1"/>
    <rect x="1"   y="8"  width="16" height="2" rx="1"/><rect x="4"   y="12" width="10" height="2" rx="1"/>
  </svg>;
}
function AlignRightIcon() {
  return <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor" aria-hidden="true">
    <rect x="0" y="0"  width="18" height="2" rx="1"/><rect x="5" y="4"  width="13" height="2" rx="1"/>
    <rect x="2" y="8"  width="16" height="2" rx="1"/><rect x="8" y="12" width="10" height="2" rx="1"/>
  </svg>;
}
function BulletListIcon() {
  return <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor" aria-hidden="true">
    <circle cx="1.5" cy="1"  r="1.5"/><rect x="5" y="0"  width="13" height="2" rx="1"/>
    <circle cx="1.5" cy="7"  r="1.5"/><rect x="5" y="6"  width="13" height="2" rx="1"/>
    <circle cx="1.5" cy="13" r="1.5"/><rect x="5" y="12" width="13" height="2" rx="1"/>
  </svg>;
}
function IndentIcon() {
  return <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor" aria-hidden="true">
    <rect x="7" y="0"  width="11" height="2" rx="1"/>
    <rect x="7" y="6"  width="11" height="2" rx="1"/>
    <rect x="7" y="12" width="11" height="2" rx="1"/>
    <path d="M0 3L5 7L0 11Z"/>
  </svg>;
}
function OutdentIcon() {
  return <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor" aria-hidden="true">
    <rect x="7" y="0"  width="11" height="2" rx="1"/>
    <rect x="7" y="6"  width="11" height="2" rx="1"/>
    <rect x="7" y="12" width="11" height="2" rx="1"/>
    <path d="M5 3L0 7L5 11Z"/>
  </svg>;
}
function LinesIcon() {
  return <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor" aria-hidden="true">
    <rect x="0" y="0"  width="18" height="1.5" rx="0.75"/>
    <rect x="0" y="4"  width="18" height="1.5" rx="0.75"/>
    <rect x="0" y="8"  width="18" height="1.5" rx="0.75"/>
    <rect x="0" y="12" width="18" height="1.5" rx="0.75"/>
  </svg>;
}
