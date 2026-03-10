"use client";

import { indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { keymap } from "@codemirror/view";
import { EditorView, basicSetup } from "codemirror";
import { Code, RefreshCw, RotateCcw, SkipForward, Trash2, Type } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* ── Types ───────────────────────────────────────────────────────── */
interface PyodideExtAPI {
    runPythonAsync: (code: string) => Promise<unknown>;
    version: string;
}
declare global {
    interface Window {
        loadPyodide?: (cfg: { indexURL: string }) => Promise<PyodideExtAPI>;
        _pyodideInstance?: PyodideExtAPI;
    }
}

type OutputItem =
    | { kind: "stdout" | "stderr"; text: string }
    | { kind: "image"; src: string };

interface NbCell {
    id: string;
    type: "markdown" | "code";
    source: string;
    output: OutputItem[];
    execCount: number | null;
    running: boolean;
}

export interface JupyterNotebookProps {
    cells: { type: "markdown" | "code"; source: string }[];
}

/* ── Pyodide singleton loader ──────────────────────────────────── */
const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/";
let _nbLoadPromise: Promise<PyodideExtAPI> | null = null;

function ensureNbPyodide(): Promise<PyodideExtAPI> {
    if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
    if (window._pyodideInstance) return Promise.resolve(window._pyodideInstance);
    if (_nbLoadPromise) return _nbLoadPromise;
    _nbLoadPromise = (async () => {
        if (!window.loadPyodide) {
            await new Promise<void>((resolve, reject) => {
                const s = document.createElement("script");
                s.src = `${PYODIDE_CDN}pyodide.js`;
                s.onload = () => resolve();
                s.onerror = () => reject(new Error("Không tải được Pyodide. Kiểm tra kết nối mạng."));
                document.head.appendChild(s);
            });
        }
        const py = await window.loadPyodide!({ indexURL: PYODIDE_CDN });
        window._pyodideInstance = py;
        return py;
    })();
    _nbLoadPromise.catch(() => { _nbLoadPromise = null; });
    return _nbLoadPromise;
}

/* ── CodeMirror cell editor (auto-height) ──────────────────────── */
const CellEditor: React.FC<{
    value: string;
    onChange: (v: string) => void;
    onRun: () => void;
}> = ({ value, onChange, onRun }) => {
    const hostRef  = useRef<HTMLDivElement>(null);
    const viewRef  = useRef<EditorView | null>(null);
    const onRunRef = useRef(onRun);
    const onChgRef = useRef(onChange);
    useEffect(() => { onRunRef.current = onRun; },    [onRun]);
    useEffect(() => { onChgRef.current = onChange; }, [onChange]);

    useEffect(() => {
        if (!hostRef.current) return;
        const view = new EditorView({
            state: EditorState.create({
                doc: value,
                extensions: [
                    basicSetup,
                    python(),
                    oneDark,
                    keymap.of([indentWithTab]),
                    keymap.of([{
                        key: "Shift-Enter",
                        run: () => { onRunRef.current(); return true; },
                    }]),
                    EditorView.updateListener.of(u => {
                        if (u.docChanged) onChgRef.current(u.state.doc.toString());
                    }),
                    EditorView.theme({
                        // height:auto + overflow:auto → editor grows to full content, no cm-gap
                        "&": { background: "#1e1e2e", height: "auto" },
                        ".cm-scroller": { overflow: "auto", height: "auto", flex: "none", fontFamily: "'JetBrains Mono','Fira Code',Consolas,monospace", fontSize: "13px", lineHeight: "1.65" },
                        ".cm-content": { padding: "10px 0", minHeight: "52px" },
                        ".cm-gutters": { background: "#181825", border: "none", color: "#45475a", position: "sticky", left: 0, zIndex: 1 },
                        ".cm-activeLine": { background: "#2a2a3c" },
                        ".cm-activeLineGutter": { background: "#2a2a3c" },
                        ".cm-cursor": { borderLeftColor: "#cba6f7" },
                    }),
                ],
            }),
            parent: hostRef.current,
        });
        viewRef.current = view;
        return () => { view.destroy(); viewRef.current = null; };
    }, []); // eslint-disable-line

    useEffect(() => {
        const v = viewRef.current;
        if (!v) return;
        const cur = v.state.doc.toString();
        if (cur === value) return;
        v.dispatch({ changes: { from: 0, to: cur.length, insert: value } });
    }, [value]);

    return <div ref={hostRef} style={{ width: "100%" }} />;
};

/* ── AddCellDivider ─────────────────────────────────────────────── */
const AddCellDivider: React.FC<{
    onAddCode: () => void;
    onAddText: () => void;
}> = ({ onAddCode, onAddText }) => {
    const [hover, setHover] = useState(false);
    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                height: hover ? 32 : 14,
                display: "flex",
                alignItems: "center",
                padding: "0 14px",
                transition: "height .12s ease",
                overflow: "hidden",
            }}
        >
            {hover ? (
                <div style={{ display: "flex", alignItems: "center", width: "100%", gap: 0 }}>
                    <div style={{ flex: 1, height: 1, background: "#dadce0" }} />
                    <button
                        onClick={onAddCode}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", fontSize: 11, fontWeight: 500, borderRadius: 12, border: "1px solid #dadce0", background: "#fff", color: "#3c4043", cursor: "pointer", whiteSpace: "nowrap", margin: "0 4px", lineHeight: 1.4 }}
                    >
                        <Code size={9} /> + Code
                    </button>
                    <button
                        onClick={onAddText}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", fontSize: 11, fontWeight: 500, borderRadius: 12, border: "1px solid #dadce0", background: "#fff", color: "#3c4043", cursor: "pointer", whiteSpace: "nowrap", margin: "0 4px", lineHeight: 1.4 }}
                    >
                        <Type size={9} /> + Text
                    </button>
                    <div style={{ flex: 1, height: 1, background: "#dadce0" }} />
                </div>
            ) : (
                <div style={{ width: "100%", height: 1, background: "#f1f3f4" }} />
            )}
        </div>
    );
};

/* ── JupyterNotebook ─────────────────────────────────────────────── */
export const JupyterNotebook: React.FC<JupyterNotebookProps> = ({ cells: initCells }) => {
    const [cells, setCells] = useState<NbCell[]>(() =>
        initCells.map((c, i) => ({
            id: `nbc_${i}`,
            type: c.type,
            source: c.source.trim(),
            output: [],
            execCount: null,
            running: false,
        }))
    );
    const [pyStatus, setPyStatus]   = useState<"idle" | "loading" | "ready" | "error">("idle");
    const [loadPct,  setLoadPct]    = useState(0);
    const [pkgStatus, setPkgStatus] = useState<"pending" | "loading" | "ready">("pending");

    const [focusedCell, setFocusedCell] = useState<string | null>(null);
    const [hoveredCell, setHoveredCell] = useState<string | null>(null);

    const pyRef         = useRef<PyodideExtAPI | null>(null);
    const cellsRef      = useRef(cells);
    const execCountRef  = useRef(0);
    const nsKey         = useRef(`__nb_${Math.random().toString(36).slice(2)}_ns__`);

    useEffect(() => { cellsRef.current = cells; }, [cells]);

    const addCell = (afterIdx: number, type: "code" | "markdown") => {
        setCells(prev => {
            const newCell: NbCell = {
                id: `nbc_${Date.now()}`,
                type,
                source: "",
                output: [],
                execCount: null,
                running: false,
            };
            const next = [...prev];
            next.splice(afterIdx + 1, 0, newCell);
            return next;
        });
    };

    const deleteCell = (cellId: string) => {
        setCells(prev => prev.filter(c => c.id !== cellId));
    };

    /* ── Boot Pyodide + load packages ────────────────────────────── */
    useEffect(() => {
        if (window?._pyodideInstance) {
            pyRef.current = window._pyodideInstance;
            setPyStatus("ready");
            setLoadPct(100);
            initPackages(window._pyodideInstance);
            return;
        }
        let cancelled = false;
        setPyStatus("loading");
        const ticker = setInterval(() => setLoadPct(p => Math.min(p + 4, 85)), 600);

        ensureNbPyodide()
            .then(py => {
                clearInterval(ticker);
                if (cancelled) return;
                pyRef.current = py;
                setLoadPct(100);
                setPyStatus("ready");
                initPackages(py);
            })
            .catch(() => {
                clearInterval(ticker);
                if (!cancelled) setPyStatus("error");
            });
        return () => { cancelled = true; };
    }, []); // eslint-disable-line

    const initPackages = async (py: PyodideExtAPI) => {
        setPkgStatus("loading");
        try {
            await (py as any).loadPackage?.(['numpy', 'matplotlib', 'pandas']);
            await py.runPythonAsync(`
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as _nb_plt_init
`);
        } catch { /* packages might not be available; cells will show ImportError */ }
        setPkgStatus("ready");
        // Init shared namespace
        const k = nsKey.current;
        await py.runPythonAsync(`
import builtins as _bi
if not hasattr(_bi, '${k}'):
    setattr(_bi, '${k}', {})
`).catch(() => {});
    };

    /* ── Run single cell ─────────────────────────────────────────── */
    const runCell = async (cellId: string) => {
        const py = pyRef.current;
        if (!py || pyStatus !== "ready") return;
        const cell = cellsRef.current.find(c => c.id === cellId);
        if (!cell || cell.type !== "code" || !cell.source.trim()) return;

        const execN = ++execCountRef.current;
        setCells(prev => prev.map(c => c.id === cellId ? { ...c, running: true, output: [], execCount: execN } : c));

        try {
            const k   = nsKey.current;
            const src = JSON.stringify(cell.source);

            // Run code — capture stdout/stderr via StringIO, return as JSON
            const runScript = `
import sys, io, traceback, builtins as _bi, json as _json
_nb_ns = getattr(_bi, '${k}', {})
__nb_out = io.StringIO()
__nb_err = io.StringIO()
_orig_out, _orig_err = sys.stdout, sys.stderr
sys.stdout, sys.stderr = __nb_out, __nb_err
try:
    import matplotlib.pyplot as _mpl_plt; _mpl_plt.show = lambda **kw: None
except ImportError:
    pass
try:
    exec(compile(${src}, '<cell[${execN}]>', 'exec'), _nb_ns)
except SystemExit:
    pass
except BaseException:
    traceback.print_exc()
finally:
    sys.stdout, sys.stderr = _orig_out, _orig_err
_json.dumps([__nb_out.getvalue(), __nb_err.getvalue()])`;

            const resJson = await py.runPythonAsync(runScript);
            const [stdout, stderr] = JSON.parse(resJson as string) as [string, string];

            // Extract matplotlib figures as base64 PNG
            const figScript = `
import json as _json, io as _io, base64 as _b64
try:
    import matplotlib.pyplot as _nb_plt
    _figs = []
    for _fn in _nb_plt.get_fignums():
        _fig = _nb_plt.figure(_fn)
        _buf = _io.BytesIO()
        _fig.savefig(_buf, format='png', bbox_inches='tight', dpi=96, facecolor='white')
        _buf.seek(0)
        _figs.append('data:image/png;base64,' + _b64.b64encode(_buf.read()).decode())
    _nb_plt.close('all')
    _json.dumps(_figs)
except Exception:
    _json.dumps([])`;
            const figsJson = await py.runPythonAsync(figScript);
            const figImages = JSON.parse(figsJson as string) as string[];

            const output: OutputItem[] = [];
            if (stdout.trim()) output.push({ kind: "stdout", text: stdout });
            if (stderr.trim()) output.push({ kind: "stderr", text: stderr });
            figImages.forEach(src => output.push({ kind: "image", src }));
            if (output.length === 0) output.push({ kind: "stdout", text: "✓ Chạy thành công (không có output)" });

            setCells(prev => prev.map(c => c.id === cellId ? { ...c, running: false, output, execCount: execN } : c));
        } catch (e: any) {
            setCells(prev => prev.map(c =>
                c.id === cellId ? { ...c, running: false, output: [{ kind: "stderr", text: e.message || String(e) }], execCount: execN } : c
            ));
        }
    };

    /* ── Run all code cells sequentially ─────────────────────────── */
    const runAll = async () => {
        for (const cell of cellsRef.current) {
            if (cell.type === "code") await runCell(cell.id);
        }
    };

    /* ── Reset kernel ─────────────────────────────────────────────── */
    const resetKernel = async () => {
        const py = pyRef.current;
        if (!py) return;
        const k = nsKey.current;
        await py.runPythonAsync(`
import builtins as _bi
setattr(_bi, '${k}', {})
`).catch(() => {});
        execCountRef.current = 0;
        setCells(prev => prev.map(c => ({ ...c, output: [], execCount: null })));
    };

    /* ── Render ──────────────────────────────────────────────────── */
    const isReady = pyStatus === "ready" && pkgStatus === "ready";

    return (
        <div style={{
            border: "1px solid #e0e4ea",
            borderRadius: 10,
            overflow: "hidden",
            margin: "14px 0 20px",
            background: "#ffffff",
            boxShadow: "0 2px 10px rgba(0,0,0,.07), 0 0 0 0.5px rgba(0,0,0,.03)",
            fontFamily: "system-ui,-apple-system,sans-serif",
        }}>
            {/* ── Toolbar ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#f8f9fa", borderBottom: "1px solid #e8eaed" }}>
                <span style={{ fontSize: 15 }}>🐍</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#202124", letterSpacing: "-.01em" }}>Jupyter Notebook</span>

                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, marginLeft: 2 }}>
                    {pyStatus === "loading" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <div style={{ width: 72, height: 3, background: "#e0e4ea", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ width: `${loadPct}%`, height: "100%", background: "linear-gradient(90deg,#4285f4,#34a853)", transition: "width .5s ease", borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 11, color: "#80868b" }}>Đang tải Python {Math.round(loadPct)}%…</span>
                        </div>
                    )}
                    {pyStatus === "ready" && pkgStatus === "loading" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <RefreshCw size={11} className="animate-spin" color="#4285f4" />
                            <span style={{ fontSize: 11, color: "#80868b" }}>Đang tải thư viện…</span>
                        </div>
                    )}
                    {isReady && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#34a853", flexShrink: 0, boxShadow: "0 0 0 2px #e6f4ea" }} />
                            <span style={{ fontSize: 11, color: "#137333", fontWeight: 600 }}>Python 3.12 · numpy · matplotlib · pandas</span>
                        </div>
                    )}
                    {pyStatus === "error" && (
                        <span style={{ fontSize: 11, color: "#c5221f", fontWeight: 600 }}>⚠ Lỗi tải Python</span>
                    )}
                </div>

                <button
                    onClick={runAll}
                    disabled={!isReady}
                    title="Chạy tất cả cells theo thứ tự"
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", cursor: !isReady ? "not-allowed" : "pointer", background: !isReady ? "#f1f3f4" : "#1a73e8", color: !isReady ? "#bdc1c6" : "#fff", transition: "background .15s", lineHeight: 1 }}
                >
                    <SkipForward size={12} /> Chạy tất cả
                </button>
                <button
                    onClick={resetKernel}
                    disabled={!isReady}
                    title="Xóa toàn bộ biến, reset kernel"
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 12, fontWeight: 500, borderRadius: 6, border: "1px solid #dadce0", cursor: !isReady ? "not-allowed" : "pointer", background: "#fff", color: "#3c4043", transition: "background .12s", lineHeight: 1 }}
                >
                    <RotateCcw size={12} /> Reset
                </button>
            </div>

            {/* ── Top add-cell divider ── */}
            <AddCellDivider onAddCode={() => addCell(-1, "code")} onAddText={() => addCell(-1, "markdown")} />

            {/* ── Cells ── */}
            {cells.map((cell, idx) => (
                <React.Fragment key={cell.id}>
                    {cell.type === "markdown" ? (
                        /* ── Markdown cell ── */
                        <div
                            tabIndex={0}
                            onFocus={() => setFocusedCell(cell.id)}
                            onBlur={() => setFocusedCell(null)}
                            onMouseEnter={() => setHoveredCell(cell.id)}
                            onMouseLeave={() => setHoveredCell(null)}
                            style={{
                                position: "relative",
                                outline: "none",
                                borderLeft: focusedCell === cell.id
                                    ? "3px solid #1a73e8"
                                    : hoveredCell === cell.id
                                        ? "3px solid #dadce0"
                                        : "3px solid transparent",
                                transition: "border-color .1s",
                            }}
                        >
                            {(hoveredCell === cell.id || focusedCell === cell.id) && (
                                <div style={{ position: "absolute", top: 6, right: 8, display: "flex", gap: 2, zIndex: 2 }}>
                                    <button
                                        onClick={() => deleteCell(cell.id)}
                                        title="Xóa cell"
                                        style={{ background: "rgba(255,255,255,.92)", border: "1px solid #e0e4ea", cursor: "pointer", color: "#5f6368", padding: "3px 6px", display: "flex", alignItems: "center", borderRadius: 5, boxShadow: "0 1px 3px rgba(0,0,0,.08)" }}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            )}
                            <div style={{ padding: "12px 52px 12px 56px" }}>
                                <div className="prose prose-sm max-w-none" style={{ lineHeight: 1.75, color: "#202124" }}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{cell.source}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ── Code cell ── */
                        <div
                            tabIndex={0}
                            onFocus={() => setFocusedCell(cell.id)}
                            onBlur={() => setFocusedCell(null)}
                            onMouseEnter={() => setHoveredCell(cell.id)}
                            onMouseLeave={() => setHoveredCell(null)}
                            style={{
                                position: "relative",
                                outline: "none",
                                borderLeft: focusedCell === cell.id
                                    ? "3px solid #1a73e8"
                                    : hoveredCell === cell.id
                                        ? "3px solid #5585c4"
                                        : "3px solid transparent",
                                transition: "border-color .1s",
                            }}
                        >
                            {/* Input row: gutter + editor */}
                            <div style={{ display: "flex", alignItems: "stretch" }}>
                                {/* Gutter — dark, matches editor bg */}
                                <div style={{
                                    width: 52, flexShrink: 0,
                                    background: "#1e1e2e",
                                    display: "flex", flexDirection: "column", alignItems: "center",
                                    paddingTop: 10, paddingBottom: 8, gap: 5,
                                    userSelect: "none",
                                }}>
                                    <button
                                        onClick={() => runCell(cell.id)}
                                        disabled={cell.running || !isReady}
                                        title="Chạy cell (Shift+Enter)"
                                        style={{
                                            width: 26, height: 26, borderRadius: "50%",
                                            border: "1.5px solid",
                                            borderColor: (cell.running || !isReady) ? "#3d3d5c" : "#5585c4",
                                            background: cell.running ? "rgba(85,133,196,.2)" : (!isReady ? "transparent" : "rgba(85,133,196,.1)"),
                                            cursor: (cell.running || !isReady) ? "not-allowed" : "pointer",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            color: (cell.running || !isReady) ? "#45475a" : "#7eb3f7",
                                            transition: "all .12s",
                                            flexShrink: 0,
                                        }}
                                    >
                                        {cell.running
                                            ? <RefreshCw size={11} className="animate-spin" />
                                            : <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21" /></svg>
                                        }
                                    </button>
                                    <span style={{ fontFamily: "monospace", fontSize: 9, color: "#45475a", letterSpacing: "-.02em", lineHeight: 1 }}>
                                        {cell.execCount != null ? `[${cell.execCount}]` : "[ ]"}
                                    </span>
                                </div>

                                {/* Editor */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <CellEditor
                                        value={cell.source}
                                        onChange={src => setCells(prev => prev.map(c => c.id === cell.id ? { ...c, source: src } : c))}
                                        onRun={() => runCell(cell.id)}
                                    />
                                </div>
                            </div>

                            {/* Hover delete button */}
                            {(hoveredCell === cell.id || focusedCell === cell.id) && (
                                <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 2, zIndex: 2 }}>
                                    <button
                                        onClick={() => deleteCell(cell.id)}
                                        title="Xóa cell"
                                        style={{ background: "rgba(30,30,46,.85)", border: "1px solid #3d3d5c", cursor: "pointer", color: "#9ea0b0", padding: "3px 6px", display: "flex", alignItems: "center", borderRadius: 5, boxShadow: "0 1px 4px rgba(0,0,0,.2)" }}
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            )}

                            {/* Output */}
                            {cell.output.length > 0 && (
                                <div style={{
                                    marginLeft: 52,
                                    borderTop: "1px solid #2a2a3c",
                                    background: "#13131f",
                                    maxHeight: 360,
                                    overflowY: "auto",
                                    padding: "8px 12px 10px 12px",
                                }}>
                                    {cell.output.map((o, oi) =>
                                        o.kind === "image"
                                            ? <img key={oi} src={o.src} alt={`plot-${oi}`} style={{ maxWidth: "100%", borderRadius: 6, margin: "6px 0", display: "block", boxShadow: "0 2px 8px rgba(0,0,0,.3)" }} />
                                            : (
                                                <pre key={oi} style={{
                                                    margin: "1px 0",
                                                    padding: "2px 0 2px 10px",
                                                    borderLeft: `2px solid ${o.kind === "stderr" ? "#ea4335" : "#34a853"}`,
                                                    fontFamily: "'JetBrains Mono',Consolas,monospace",
                                                    fontSize: 12.5, lineHeight: 1.65,
                                                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                                                    color: o.kind === "stderr" ? "#f28b82" : "#e8eaed",
                                                    background: o.kind === "stderr" ? "rgba(234,67,53,.06)" : "transparent",
                                                }}>{o.text}</pre>
                                            )
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    <AddCellDivider onAddCode={() => addCell(idx, "code")} onAddText={() => addCell(idx, "markdown")} />
                </React.Fragment>
            ))}
        </div>
    );
};
