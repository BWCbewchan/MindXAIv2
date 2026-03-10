"use client";

import { indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { keymap } from "@codemirror/view";
import { EditorView, basicSetup } from "codemirror";
import {
    AlertTriangle, BookOpen, CheckCircle2,
    ChevronDown, ChevronUp,
    ClipboardCopy, Download, FilePlus,
    Maximize2, Minimize2, Play, RefreshCw, RotateCcw, Terminal, Trash2, X,
} from "lucide-react";
import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

/* ─── Pyodide global types ──────────────────────────────────────────── */
declare global {
    interface Window {
        loadPyodide?: (cfg: { indexURL: string }) => Promise<PyodideAPI>;
        _pyodideInstance?: PyodideAPI;
    }
}

interface PyodideAPI {
    runPythonAsync: (code: string) => Promise<unknown>;
    version: string;
}

/* ─── Local types ───────────────────────────────────────────────────── */
interface OutputLine { type: "stdout" | "stderr" | "result" | "info" | "image"; text: string; }
interface PyFile { id: string; name: string; code: string; }
export interface PythonRunnerHandle {
    applyCode: (code: string) => void;
    setProjectFiles: (files: { name: string; code: string }[]) => void;
    getProjectFiles: () => { name: string; code: string }[];
}

interface PythonRunnerProps {
    initialCode?: string;
    initialStdin?: string;
    initialFiles?: { name: string; code: string }[];
    initialCells?: { type: "markdown" | "code"; source: string }[];
    fillHeight?: boolean;
    onCodeChange?: (code: string) => void;
}

/* ─── Singleton Pyodide loader ──────────────────────────────────────── */
const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/";
let _loadingPromise: Promise<PyodideAPI> | null = null;

function ensurePyodide(): Promise<PyodideAPI> {
    if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
    if (window._pyodideInstance) return Promise.resolve(window._pyodideInstance);
    if (_loadingPromise) return _loadingPromise;

    _loadingPromise = (async () => {
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

    _loadingPromise.catch(() => { _loadingPromise = null; }); // allow retry after failure
    return _loadingPromise;
}

/* ─── Scientific package auto-loader ──────────────────────────────── */
const SCI_PKGS: Record<string, string> = {
    numpy: "numpy", matplotlib: "matplotlib", pandas: "pandas",
    scipy: "scipy", sympy: "sympy",
};
function detectSciPkgs(code: string): string[] {
    return Object.entries(SCI_PKGS)
        .filter(([n]) => new RegExp(`\\bimport\\s+${n}\\b|\\bfrom\\s+${n}\\b`).test(code))
        .map(([, pkg]) => pkg);
}

/* ─── Notebook (.ipynb) types + helpers ────────────────────────────── */
interface NbOutput { kind: "stdout" | "stderr" | "image"; text: string; }
interface NbCellState {
    id: string;
    type: "code" | "markdown";
    source: string;
    outputs: NbOutput[];
    execCount: number | null;
    running: boolean;
}

function parseIpynb(json: string): { type: "code" | "markdown"; source: string }[] {
    try {
        const nb = JSON.parse(json);
        return (nb.cells ?? []).map((c: any) => ({
            type: c.cell_type === "markdown" ? "markdown" as const : "code" as const,
            source: Array.isArray(c.source) ? c.source.join("") : String(c.source ?? ""),
        }));
    } catch { return [{ type: "code", source: "" }]; }
}

function ipynbFromSources(cells: Pick<NbCellState, "type" | "source">[]): string {
    return JSON.stringify({
        nbformat: 4, nbformat_minor: 5,
        metadata: { kernelspec: { display_name: "Python 3 (Pyodide)", language: "python", name: "python3" } },
        cells: cells.map(c => ({
            cell_type: c.type,
            source: c.source.split("\n").map((l, i, a) => i < a.length - 1 ? l + "\n" : l),
            metadata: {}, outputs: [],
            ...(c.type === "code" ? { execution_count: null } : {}),
        })),
    }, null, 2);
}

function extractNotebookPython(json: string): string {
    return parseIpynb(json).filter(c => c.type === "code").map(c => c.source).join("\n");
}

/* ─── Notebook cell code editor (Shift-Enter to run) ──────────────── */
const NbCellEditor: React.FC<{
    value: string;
    onChange: (v: string) => void;
    onRun: () => void;
}> = ({ value, onChange, onRun }) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onRunRef = useRef(onRun);
    const onChgRef = useRef(onChange);
    useEffect(() => { onRunRef.current = onRun; }, [onRun]);
    useEffect(() => { onChgRef.current = onChange; }, [onChange]);

    useEffect(() => {
        if (!hostRef.current) return;
        const view = new EditorView({
            state: EditorState.create({
                doc: value,
                extensions: [
                    basicSetup, python(), oneDark,
                    keymap.of([indentWithTab]),
                    keymap.of([{ key: "Shift-Enter", run: () => { onRunRef.current(); return true; } }]),
                    EditorView.updateListener.of(u => { if (u.docChanged) onChgRef.current(u.state.doc.toString()); }),
                    EditorView.theme({
                        // height:auto on editor + height:auto+overflow:auto on scroller
                        // → scroller grows to fit all content (scrollHeight===clientHeight)
                        // → CM6 viewport = full content → no cm-gap virtual rendering
                        "&": { background: "#1e1e2e", height: "auto" },
                        ".cm-scroller": { overflow: "auto", height: "auto", flex: "none", fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: "13px", lineHeight: "1.65" },
                        ".cm-content": { padding: "8px 0", minHeight: "60px" },
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
        // Trigger re-measure on next frame so CM6 expands viewport to full content (no cm-gap)
        requestAnimationFrame(() => view.requestMeasure());
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

/* ─── Notebook View (Jupyter-like, runs on shared Pyodide) ───────── */
const NotebookView: React.FC<{
    value: string;
    onChange: (v: string) => void;
    pyRef: React.RefObject<PyodideAPI | null>;
    pyStatus: "idle" | "loading" | "ready" | "error";
    isRunning: boolean;
    setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
    onRunAllRef: React.MutableRefObject<(() => Promise<void>) | null>;
}> = ({ value, onChange, pyRef, pyStatus, isRunning, setIsRunning, onRunAllRef }) => {
    const [cells, setCells] = useState<NbCellState[]>(() =>
        parseIpynb(value).map((c, i) => ({
            id: `nbc_${i}_${Date.now()}`,
            type: c.type, source: c.source,
            outputs: [], execCount: null, running: false,
        }))
    );
    const cellsRef = useRef(cells);
    const execCountRef = useRef(0);
    const nsKeyRef = useRef(`__ipynb_${Math.random().toString(36).slice(2)}__`);
    const prevSourceRef = useRef("");
    useEffect(() => { cellsRef.current = cells; }, [cells]);

    // Sync cell sources → parent (don’t serialize outputs)
    useEffect(() => {
        const sig = cells.map(c => `${c.type}::${c.source}`).join("|||");
        if (sig === prevSourceRef.current) return;
        prevSourceRef.current = sig;
        onChange(ipynbFromSources(cells));
    }, [cells, onChange]);

    const updateSource = (idx: number, src: string) =>
        setCells(prev => prev.map((c, i) => i === idx ? { ...c, source: src } : c));

    const runCell = async (idx: number) => {
        const py = pyRef.current;
        if (!py || pyStatus !== "ready") return;
        const cell = cellsRef.current[idx];
        if (cell.type !== "code" || !cell.source.trim()) return;

        const pkgs = detectSciPkgs(cell.source);
        const usesMpl = /\bimport\s+matplotlib\b|\bfrom\s+matplotlib\b/.test(cell.source);
        if (pkgs.length > 0) { try { await (py as any).loadPackage?.(pkgs); } catch { /* ignore */ } }
        if (usesMpl) { try { await py.runPythonAsync(`import matplotlib; matplotlib.use('Agg')`); } catch { /* ignore */ } }

        const nsKey = nsKeyRef.current;
        await py.runPythonAsync(`import builtins as _bi\nif not hasattr(_bi, '${nsKey}'): setattr(_bi, '${nsKey}', {})`);

        setCells(prev => prev.map((c, i) => i === idx ? { ...c, running: true, outputs: [] } : c));
        try {
            const src = JSON.stringify(cell.source);
            const script = [
                "import sys, io, traceback, builtins as _bi",
                `_ns = getattr(_bi, '${nsKey}', {})`,
                "__out = io.StringIO(); __err = io.StringIO()",
                "__orig = (sys.stdout, sys.stderr)",
                "sys.stdout, sys.stderr = __out, __err",
                "try: import matplotlib.pyplot as _mpl_plt; _mpl_plt.show = lambda **kw: None",
                "except ImportError: pass",
                "try:",
                `    exec(compile(${src}, '<cell-${idx + 1}>', 'exec'), _ns)`,
                "except SystemExit: pass",
                "except BaseException: traceback.print_exc()",
                "finally:",
                "    sys.stdout, sys.stderr = __orig",
            ].join("\n");
            await py.runPythonAsync(script);

            const stdout = String((await py.runPythonAsync("__out.getvalue()")) ?? "");
            const stderr = String((await py.runPythonAsync("__err.getvalue()")) ?? "");
            await py.runPythonAsync("del __out, __err, __orig");

            let figImages: string[] = [];
            if (usesMpl) {
                try {
                    figImages = JSON.parse(String(await py.runPythonAsync(
                        `import json as _j, io as _io, base64 as _b64
try:
    import matplotlib.pyplot as _plt
    _figs = []
    for _fn in _plt.get_fignums():
        _f = _plt.figure(_fn); _buf = _io.BytesIO()
        _f.savefig(_buf, format='png', bbox_inches='tight', dpi=100)
        _plt.close(_f); _buf.seek(0)
        _figs.append(_b64.b64encode(_buf.read()).decode())
    _plt.close('all')
except: _figs = []
_j.dumps(_figs)`) ?? "[]"));
                } catch { /* ignore */ }
            }

            execCountRef.current += 1;
            const n = execCountRef.current;
            const outputs: NbOutput[] = [];
            if (stdout.trim()) outputs.push({ kind: "stdout", text: stdout });
            if (stderr.trim()) outputs.push({ kind: "stderr", text: stderr });
            for (const s of figImages) outputs.push({ kind: "image", text: s });
            setCells(prev => prev.map((c, i) => i === idx ? { ...c, running: false, execCount: n, outputs } : c));
        } catch (e: any) {
            setCells(prev => prev.map((c, i) => i === idx
                ? { ...c, running: false, outputs: [{ kind: "stderr", text: e.message ?? String(e) }] }
                : c));
        }
    };

    const runAll = async () => {
        if (isRunning) return;
        setIsRunning(true);
        execCountRef.current = 0;
        const py = pyRef.current;
        const nsKey = nsKeyRef.current;
        if (py) { try { await py.runPythonAsync(`import builtins as _bi; setattr(_bi, '${nsKey}', {})`); } catch { /* ignore */ } }
        setCells(prev => prev.map(c => ({ ...c, outputs: [], execCount: null })));
        for (let i = 0; i < cellsRef.current.length; i++) {
            if (cellsRef.current[i].type === "code" && cellsRef.current[i].source.trim()) {
                await runCell(i);
            }
        }
        setIsRunning(false);
    };

    const resetKernel = async () => {
        const py = pyRef.current;
        const nsKey = nsKeyRef.current;
        if (py) { try { await py.runPythonAsync(`import builtins as _bi; setattr(_bi, '${nsKey}', {})`); } catch { /* ignore */ } }
        execCountRef.current = 0;
        setCells(prev => prev.map(c => ({ ...c, outputs: [], execCount: null, running: false })));
    };

    const addCell = (type: "code" | "markdown") =>
        setCells(prev => [...prev, { id: `nbc_${Date.now()}`, type, source: type === "markdown" ? "## New" : "", outputs: [], execCount: null, running: false }]);

    const deleteCell = (idx: number) => {
        if (cells.length <= 1) return;
        setCells(prev => prev.filter((_, i) => i !== idx));
    };

    // Expose runAll to the parent header button (updates every render to stay fresh)
    useEffect(() => { onRunAllRef.current = runAll; });

    const [hoveredCell, setHoveredCell] = useState<string | null>(null);
    const disabled = isRunning || pyStatus !== "ready";

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#1e1e2e" }}>
            {/* ── Toolbar */}
            <div style={{ display: "flex", gap: 4, padding: "6px 10px", borderBottom: "1px solid #313244", background: "#181825", flexShrink: 0, alignItems: "center" }}>
                <button
                    onClick={runAll}
                    disabled={disabled}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", fontSize: 11.5, fontWeight: 700, borderRadius: 6, border: "none", cursor: disabled ? "not-allowed" : "pointer", background: disabled ? "#313244" : "#a6e3a1", color: disabled ? "#6c7086" : "#1e1e2e", transition: "all .12s", lineHeight: 1 }}
                >
                    {isRunning ? <RefreshCw size={11} className="animate-spin" /> : <Play size={11} />}
                    {isRunning ? "Đang chạy…" : "Chạy tất cả"}
                </button>
                <button onClick={resetKernel}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", fontSize: 11.5, fontWeight: 500, borderRadius: 6, border: "1px solid #313244", cursor: "pointer", background: "transparent", color: "#cba6f7", lineHeight: 1 }}
                >
                    <RotateCcw size={11} /> Reset
                </button>
                <div style={{ flex: 1 }} />
                <button onClick={() => addCell("code")}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", fontSize: 11, borderRadius: 6, border: "1px solid #313244", cursor: "pointer", background: "transparent", color: "#89b4fa", lineHeight: 1 }}
                >+ Code</button>
                <button onClick={() => addCell("markdown")}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", fontSize: 11, borderRadius: 6, border: "1px solid #313244", cursor: "pointer", background: "transparent", color: "#f9e2af", lineHeight: 1 }}
                >+ MD</button>
            </div>

            {/* ── Cells */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", overscrollBehavior: "contain" }}>
                {cells.map((cell, idx) => (
                    <div
                        key={cell.id}
                        onMouseEnter={() => setHoveredCell(cell.id)}
                        onMouseLeave={() => setHoveredCell(null)}
                        style={{
                            position: "relative",
                            borderLeft: cell.running
                                ? "3px solid #cba6f7"
                                : hoveredCell === cell.id
                                    ? `3px solid ${cell.type === "markdown" ? "#f9e2af" : "#89b4fa"}`
                                    : "3px solid transparent",
                            transition: "border-color .1s",
                            borderBottom: "1px solid #181825",
                        }}
                    >
                        {cell.type === "code" ? (
                            /* ── Code cell ── */
                            <>
                                <div style={{ display: "flex", alignItems: "stretch" }}>
                                    {/* Left gutter */}
                                    <div style={{
                                        width: 48, flexShrink: 0,
                                        background: "#11111b",
                                        display: "flex", flexDirection: "column", alignItems: "center",
                                        paddingTop: 10, paddingBottom: 8, gap: 5,
                                        userSelect: "none",
                                    }}>
                                        <button
                                            onClick={() => runCell(idx)}
                                            disabled={disabled}
                                            title="Chạy cell (Shift+Enter)"
                                            style={{
                                                width: 24, height: 24, borderRadius: "50%",
                                                border: `1.5px solid ${(cell.running || disabled) ? "#313244" : "#a6e3a1"}`,
                                                background: cell.running ? "rgba(166,227,161,.15)" : "transparent",
                                                cursor: disabled ? "not-allowed" : "pointer",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                color: (cell.running || disabled) ? "#45475a" : "#a6e3a1",
                                                transition: "all .12s",
                                                flexShrink: 0,
                                            }}
                                        >
                                            {cell.running
                                                ? <RefreshCw size={10} className="animate-spin" />
                                                : <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21" /></svg>
                                            }
                                        </button>
                                        <span style={{ fontFamily: "monospace", fontSize: 9, color: "#45475a", letterSpacing: "-.02em", lineHeight: 1 }}>
                                            {cell.execCount != null ? `[${cell.execCount}]` : "[ ]"}
                                        </span>
                                    </div>
                                    {/* Editor */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <NbCellEditor value={cell.source} onChange={src => updateSource(idx, src)} onRun={() => runCell(idx)} />
                                    </div>
                                </div>
                                {/* Output */}
                                {cell.outputs.length > 0 && (
                                    <div style={{
                                        marginLeft: 48,
                                        borderTop: "1px solid #181825",
                                        background: "#13131f",
                                        maxHeight: 380,
                                        overflowY: "auto",
                                        padding: "8px 12px 10px 12px",
                                    }}>
                                        {cell.outputs.map((o, j) =>
                                            o.kind === "image" ? (
                                                <img key={j} src={`data:image/png;base64,${o.text}`}
                                                    style={{ maxWidth: "100%", borderRadius: 6, margin: "6px 0", display: "block", boxShadow: "0 2px 8px rgba(0,0,0,.4)" }} />
                                            ) : (
                                                <pre key={j} style={{
                                                    margin: "1px 0",
                                                    padding: "2px 0 2px 10px",
                                                    borderLeft: `2px solid ${o.kind === "stderr" ? "#f38ba8" : "#a6e3a1"}`,
                                                    fontFamily: "'JetBrains Mono',Consolas,monospace",
                                                    fontSize: 12, lineHeight: 1.65,
                                                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                                                    color: o.kind === "stderr" ? "#f38ba8" : "#a6e3a1",
                                                    background: o.kind === "stderr" ? "rgba(243,139,168,.05)" : "transparent",
                                                }}>{o.text}</pre>
                                            )
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            /* ── Markdown cell ── */
                            <div style={{ display: "flex", alignItems: "stretch" }}>
                                {/* Left gutter — narrow yellow accent */}
                                <div style={{
                                    width: 48, flexShrink: 0,
                                    background: "#11111b",
                                    display: "flex", alignItems: "flex-start", justifyContent: "center",
                                    paddingTop: 10,
                                }}>
                                    <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: .5, color: "#f9e2af", fontFamily: "monospace", opacity: .7 }}>MD</span>
                                </div>
                                <textarea
                                    value={cell.source}
                                    onChange={e => {
                                        updateSource(idx, e.target.value);
                                        const t = e.target;
                                        t.style.height = "auto";
                                        t.style.height = t.scrollHeight + "px";
                                    }}
                                    ref={el => {
                                        if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
                                    }}
                                    spellCheck={false}
                                    placeholder="Markdown…"
                                    style={{ flex: 1, minHeight: 52, background: "#1e1e2e", color: "#f9e2af", fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: 12.5, lineHeight: 1.65, padding: "10px 12px", border: "none", resize: "none", outline: "none", boxSizing: "border-box", overflow: "hidden" }}
                                />
                            </div>
                        )}

                        {/* Hover delete button */}
                        {hoveredCell === cell.id && cells.length > 1 && (
                            <div style={{ position: "absolute", top: 5, right: 6, zIndex: 2 }}>
                                <button
                                    onClick={() => deleteCell(idx)}
                                    title="Xóa cell"
                                    style={{ display: "flex", alignItems: "center", background: "rgba(17,17,27,.9)", border: "1px solid #45475a", cursor: "pointer", color: "#9399b2", padding: "3px 6px", borderRadius: 5, boxShadow: "0 1px 4px rgba(0,0,0,.3)" }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#f38ba8"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#f38ba8"; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#9399b2"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#45475a"; }}
                                >
                                    <Trash2 size={11} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {/* Bottom add-cell bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "6px 16px", borderTop: "1px solid #181825" }}>
                    <div style={{ flex: 1, height: 1, background: "#313244" }} />
                    <button
                        onClick={() => addCell("code")}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", fontSize: 11, fontWeight: 500, borderRadius: 12, border: "1px solid #313244", background: "transparent", color: "#89b4fa", cursor: "pointer", margin: "0 6px", whiteSpace: "nowrap" }}
                    >+ Code</button>
                    <button
                        onClick={() => addCell("markdown")}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", fontSize: 11, fontWeight: 500, borderRadius: 12, border: "1px solid #313244", background: "transparent", color: "#f9e2af", cursor: "pointer", margin: "0 6px", whiteSpace: "nowrap" }}
                    >+ MD</button>
                    <div style={{ flex: 1, height: 1, background: "#313244" }} />
                </div>
            </div>
        </div>
    );
};

/* ─── CodeMirror Python Editor ──────────────────────────────────────── */
const CodeEditor: React.FC<{
    value: string;
    onChange: (v: string) => void;
    onRun: () => void;
}> = ({ value, onChange, onRun }) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onRunRef = useRef(onRun);
    const onChgRef = useRef(onChange);
    useEffect(() => { onRunRef.current = onRun; }, [onRun]);
    useEffect(() => { onChgRef.current = onChange; }, [onChange]);

    /* Mount once */
    useEffect(() => {
        if (!hostRef.current) return;
        const runBinding = keymap.of([{
            key: "Ctrl-Enter", mac: "Cmd-Enter",
            run: () => { onRunRef.current(); return true; },
        }]);
        const view = new EditorView({
            state: EditorState.create({
                doc: value,
                extensions: [
                    basicSetup,
                    python(),
                    oneDark,
                    keymap.of([indentWithTab]),
                    runBinding,
                    EditorView.updateListener.of(u => {
                        if (u.docChanged) onChgRef.current(u.state.doc.toString());
                    }),
                    EditorView.theme({
                        "&": { height: "100%", background: "#1e1e2e" },
                        ".cm-scroller": {
                            fontFamily: "'JetBrains Mono','Fira Code',Consolas,monospace",
                            fontSize: "13.5px",
                            lineHeight: "1.65",
                        },
                        ".cm-content": { padding: "12px 0" },
                        ".cm-gutters": { background: "#181825", border: "none", color: "#45475a" },
                        ".cm-activeLineGutter": { background: "#2a2a3c" },
                        ".cm-activeLine": { background: "#2a2a3c" },
                        ".cm-tooltip-autocomplete": {
                            background: "#313244",
                            border: "1px solid #45475a",
                            color: "#cdd6f4",
                        },
                        ".cm-tooltip-autocomplete ul li[aria-selected]": {
                            background: "#45475a",
                        },
                        ".cm-cursor": { borderLeftColor: "#cba6f7" },
                    }),
                ],
            }),
            parent: hostRef.current,
        });
        viewRef.current = view;
        return () => { view.destroy(); viewRef.current = null; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* Sync value when active file switches */
    useEffect(() => {
        const v = viewRef.current;
        if (!v) return;
        const cur = v.state.doc.toString();
        if (cur === value) return;
        v.dispatch({ changes: { from: 0, to: cur.length, insert: value } });
    }, [value]);

    return <div ref={hostRef} style={{ flex: 1, overflow: "hidden", minHeight: 0 }} />;
};
/* ─── Header button ─────────────────────────────────────────────── */
const HBtn: React.FC<{
    onClick: () => void;
    title?: string;
    color?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
}> = ({ onClick, title, color = "#6c7086", style = {}, children }) => (
    <button
        onClick={onClick}
        title={title}
        style={{ display: "flex", alignItems: "center", gap: 3, padding: "4px 8px", fontSize: 11, fontWeight: 500, borderRadius: 5, border: "none", cursor: "pointer", background: "transparent", color, transition: "all .12s", ...style }}
    >
        {children}
    </button>
);
/* ─── Component ─────────────────────────────────────────────────────── */
export const PythonRunner = React.forwardRef<PythonRunnerHandle, PythonRunnerProps>(
    function PythonRunner({ initialCode = "", initialStdin = "", initialFiles, initialCells, fillHeight = false, onCodeChange }, ref) {
    /* file state */
    const [files, setFiles] = useState<PyFile[]>(() => {
        if (initialFiles && initialFiles.length > 0) {
            return initialFiles.map((f, i) => ({ id: i === 0 ? "main" : `f${i}`, name: f.name, code: f.code }));
        }
        if (initialCells && initialCells.length > 0) {
            return [{ id: "main", name: "notebook.ipynb", code: ipynbFromSources(initialCells) }];
        }
        return [{ id: "main", name: "main.py", code: initialCode }];
    });
    const [activeId, setActiveId] = useState("main");
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameVal, setRenameVal] = useState("");

    /* runtime state */
    const [output, setOutput] = useState<OutputLine[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [pyStatus, setPyStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
    const [pyVersion, setPyVersion] = useState("");
    const [loadPct, setLoadPct] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [stdinText, setStdinText] = useState(initialStdin);
    const [stdinOpen, setStdinOpen] = useState(true);
    const [stdinHeight, setStdinHeight] = useState(80);

    const pyRef = useRef<PyodideAPI | null>(null);
    const outputEndRef = useRef<HTMLDivElement>(null);
    const renameRef = useRef<HTMLInputElement>(null);
    const stdinRef = useRef<HTMLTextAreaElement>(null);
    const dragStdin = useRef<{ startY: number; startH: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerW, setContainerW] = useState(0);

    const activeFile = files.find(f => f.id === activeId) ?? files[0];
    const isNotebook = activeFile.name.endsWith(".ipynb");
    const hasInput = !isNotebook && files.some(f => !f.name.endsWith(".ipynb") && /\binput\s*\(/.test(f.code));
    const notebookRunAllRef = useRef<(() => Promise<void>) | null>(null);
    const isNarrow = containerW < 520;
    const isVeryNarrow = containerW < 380;

    /* ── Container resize observer ───────────────────────────────── */
    useEffect(() => {
        if (!containerRef.current) return;
        setContainerW(containerRef.current.getBoundingClientRect().width);
        const obs = new ResizeObserver(entries => {
            setContainerW(entries[0].contentRect.width);
        });
        obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    /* ── Load Pyodide (singleton, race-condition safe) ────────────── */
    useEffect(() => {
        if (window._pyodideInstance) {
            pyRef.current = window._pyodideInstance;
            setPyVersion(window._pyodideInstance.version);
            setLoadPct(100);
            setPyStatus("ready");
            return;
        }

        let cancelled = false;
        setPyStatus("loading");
        const ticker = setInterval(() => setLoadPct(p => Math.min(p + 7, 90)), 500);

        ensurePyodide()
            .then(py => {
                clearInterval(ticker);
                if (cancelled) return;
                pyRef.current = py;
                setPyVersion(py.version);
                setLoadPct(100);
                setPyStatus("ready");
            })
            .catch((e: Error) => {
                clearInterval(ticker);
                if (cancelled) return;
                setPyStatus("error");
                setOutput([{ type: "stderr", text: `❌ ${e.message}` }]);
            });

        return () => { cancelled = true; clearInterval(ticker); };
    }, []);

    /* ── Auto-scroll output ───────────────────────────────────────── */
    useEffect(() => { outputEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [output]);

    /* ── Stdin panel resize drag ──────────────────────────────────── */
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragStdin.current) return;
            const delta = dragStdin.current.startY - e.clientY; // drag up → bigger stdin
            setStdinHeight(Math.max(40, Math.min(300, dragStdin.current.startH + delta)));
        };
        const onUp = () => {
            if (!dragStdin.current) return;
            dragStdin.current = null;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, [])

    /* ── Focus rename input when editing ─────────────────────────── */
    useEffect(() => { if (renamingId) renameRef.current?.focus(); }, [renamingId]);

    /* ── File helpers ─────────────────────────────────────────────── */
    const updateCode = (code: string) => {
        setFiles(prev => prev.map(f => f.id === activeId ? { ...f, code } : f));
        onCodeChange?.(code);
    };

    useImperativeHandle(ref, () => ({
        applyCode: (code: string) => {
            setFiles(prev => prev.map(f => f.id === activeId ? { ...f, code } : f));
        },
        setProjectFiles: (incoming: { name: string; code: string }[]) => {
            if (incoming.length === 0) return;
            const newFiles: PyFile[] = incoming.map((f, i) => ({
                id: `agent_${Date.now()}_${i}`,
                name: f.name,
                code: f.code,
            }));
            setFiles(newFiles);
            setActiveId(newFiles[newFiles.length - 1].id);
        },
        getProjectFiles: () => files.map(f => ({ name: f.name, code: f.code })),
    }), [activeId, files]);

    const addFile = () => {
        const nf: PyFile = { id: `f${Date.now()}`, name: `file${files.length + 1}.py`, code: "" };
        setFiles(prev => [...prev, nf]);
        setActiveId(nf.id);
    };

    const deleteFile = (id: string) => {
        const rest = files.filter(f => f.id !== id);
        setFiles(rest);
        if (activeId === id) setActiveId(rest[0].id);
    };

    const startRename = (f: PyFile) => { setRenamingId(f.id); setRenameVal(f.name); };

    const commitRename = () => {
        if (!renamingId) return;
        let name = renameVal.trim() || "file.py";
        if (!name.endsWith(".py") && !name.endsWith(".ipynb")) name += ".py";
        setFiles(prev => prev.map(f => f.id === renamingId ? { ...f, name } : f));
        setRenamingId(null);
    };

    const addNotebook = () => {
        const nf: PyFile = {
            id: `f${Date.now()}`,
            name: `notebook${files.filter(f => f.name.endsWith(".ipynb")).length + 1}.ipynb`,
            code: ipynbFromSources([{ type: "code", source: "# Notebook mới\n" }]),
        };
        setFiles(prev => [...prev, nf]);
        setActiveId(nf.id);
    };

    /* ── Execute code ─────────────────────────────────────────────── */
    const runCode = useCallback(async () => {
        // Notebook mode: delegate to NotebookView’s runAll
        if (isNotebook) {
            if (notebookRunAllRef.current) await notebookRunAllRef.current();
            return;
        }

        const py = pyRef.current;
        if (!py || isRunning || !activeFile.code.trim()) return;

        // Detect scientific packages across all files (extract python from .ipynb)
        const allCode = files.map(f =>
            f.name.endsWith(".ipynb") ? extractNotebookPython(f.code) : f.code
        ).join("\n");
        const sciPkgs = detectSciPkgs(allCode);
        const usesMpl = /\bimport\s+matplotlib\b|\bfrom\s+matplotlib\b/.test(allCode);

        // If code uses input() and stdin is empty, open the STDIN panel as a hint but still run
        if (hasInput && !stdinText.trim()) {
            setStdinOpen(true);
        }

        setIsRunning(true);

        // Load scientific packages if needed (first time only — Pyodide caches)
        if (sciPkgs.length > 0) {
            setOutput([{ type: "info", text: `⏳ Đang tải thư viện: ${sciPkgs.join(", ")}…` }]);
            try {
                await (py as any).loadPackage?.(sciPkgs);
                if (usesMpl) {
                    await py.runPythonAsync(`import matplotlib; matplotlib.use('Agg')`);
                }
            } catch { /* user code will show ImportError on failure */ }
        }

        setOutput([{ type: "info", text: `▶ Đang chạy ${activeFile.name}…` }]);

        try {
            // Inject supporting files as sys.modules
            const otherFiles = files.filter(f => f.id !== activeId);
            const moduleInjects = otherFiles.map(f => {
                const mName = JSON.stringify(f.name.replace(/\.py$/, ""));
                const mCode = JSON.stringify(f.code);
                const mFile = JSON.stringify(f.name);
                return [
                    `_m = types.ModuleType(${mName})`,
                    `exec(compile(${mCode}, ${mFile}, 'exec'), _m.__dict__)`,
                    `sys.modules[${mName}] = _m`,
                    `del _m`,
                ].join("\n");
            }).join("\n");

            // Build stdin queue from the textarea (one value per line)
            const stdinLines = stdinText.split("\n");
            const stdinJson = JSON.stringify(stdinLines);

            const userCode = JSON.stringify(activeFile.code);
            const userName = JSON.stringify(activeFile.name);

            // All I/O is captured via Python-side io.StringIO.
            // input() is overridden to dequeue from stdinLines; echoes the value like a real terminal.
            const script = [
                "import sys, io, types, traceback, builtins as _bi",
                otherFiles.length > 0 ? moduleInjects : null,
                // stdin queue setup
                `_sq = ${stdinJson}`,
                "_si = [0]",
                "_orig_input = _bi.input",
                "def _input(prompt=''):",
                "    if prompt: print(prompt, end='', flush=True)",
                "    if _si[0] < len(_sq):",
                "        val = _sq[_si[0]]; _si[0] += 1",
                "        print(val)  # echo like terminal",
                "        return val",
                "    print('\\n⚠ Hết input — trả về chuỗi rỗng')",
                "    return ''",
                "_bi.input = _input",
                // stdout/stderr capture
                "__out = io.StringIO()",
                "__err = io.StringIO()",
                "__orig_streams = (sys.stdout, sys.stderr)",
                "sys.stdout, sys.stderr = __out, __err",
                "try:",
                `    exec(compile(${userCode}, ${userName}, 'exec'), {})`,
                "except SystemExit:",
                "    pass",
                "except BaseException:",
                "    traceback.print_exc()",
                "finally:",
                "    sys.stdout, sys.stderr = __orig_streams",
                "    _bi.input = _orig_input",
            ].filter(Boolean).join("\n");

            await py.runPythonAsync(script);

            // Capture matplotlib figures (if any)
            let figImages: string[] = [];
            if (usesMpl) {
                try {
                    const figJson = String(
                        (await py.runPythonAsync(
                            `import json as _jc, io as _ic, base64 as _bc
try:
    import matplotlib.pyplot as _pc
    _ns = _pc.get_fignums()
    _imgs = []
    for _fn in _ns:
        _f = _pc.figure(_fn)
        _b = _ic.BytesIO()
        _f.savefig(_b, format='png', bbox_inches='tight', dpi=100)
        _pc.close(_f)
        _b.seek(0)
        _imgs.append(_bc.b64encode(_b.read()).decode())
    _pc.close('all')
except Exception:
    _imgs = []
_jc.dumps(_imgs)`
                        )) ?? "[]"
                    );
                    figImages = JSON.parse(figJson);
                } catch { /* ignore */ }
            }

            const stdout = String((await py.runPythonAsync("__out.getvalue()")) ?? "");
            const stderr = String((await py.runPythonAsync("__err.getvalue()")) ?? "");
            await py.runPythonAsync("del __out, __err, __orig_streams");

            const lines: OutputLine[] = [];
            if (stdout.trim()) lines.push({ type: "stdout", text: stdout });
            if (stderr.trim()) lines.push({ type: "stderr", text: stderr });
            for (const src of figImages) lines.push({ type: "image", text: src });
            if (lines.length === 0) lines.push({ type: "info", text: "(Không có output)" });
            setOutput(lines);
        } catch (e: any) {
            setOutput([{ type: "stderr", text: e.message || String(e) }]);
        } finally {
            setIsRunning(false);
        }
    }, [files, activeFile, isRunning, stdinText]);

    /* ── Keyboard shortcuts ───────────────────────────────────────── */
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") runCode(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [runCode]);

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(activeFile.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* ignore */ }
    };

    /* ── Container style ──────────────────────────────────────────── */
    const wrapStyle: React.CSSProperties = {
        width: "100%",
        height: fillHeight ? "100%" : isFullscreen ? "calc(100vh - 28px)" : isNotebook ? "max(600px, 80vh)" : isNarrow ? "520px" : "540px",
        position: isFullscreen ? "fixed" : "relative",
        ...(isFullscreen && { top: 14, left: 14, right: 14, bottom: 14, zIndex: 50 }),
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: fillHeight ? 0 : 12,
        border: fillHeight ? "none" : "1px solid #313244",
        boxShadow: (fillHeight || isFullscreen) ? "none" : "0 4px 18px rgba(0,0,0,.18)",
        margin: fillHeight ? 0 : "16px 0",
        background: "#1e1e2e",
    };

    const runDisabled = isRunning || pyStatus !== "ready";

    /* ── Render ───────────────────────────────────────────────────── */
    return (
        <div ref={containerRef} style={wrapStyle}>

            {/* ══ HEADER ══════════════════════════════════════════════ */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px", background: "#181825", borderBottom: "1px solid #313244", flexShrink: 0, height: 44, gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 0", minWidth: 0, overflow: "hidden" }}>
                    {/* macOS traffic lights */}
                    <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                        {(["#f38ba8", "#f9e2af", "#a6e3a1"] as const).map((c, i) => (
                            <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: c, opacity: 0.85 }} />
                        ))}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#cba6f7", letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
                        <Terminal size={11} /> Python {pyStatus === "ready" ? pyVersion : "Runner"}
                    </span>
                    {!isNarrow && pyStatus === "loading" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                            <div style={{ width: 72, height: 3, background: "#313244", borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ width: `${loadPct}%`, height: "100%", background: "#cba6f7", transition: "width .5s ease" }} />
                            </div>
                            <span style={{ fontSize: 10, color: "#6c7086" }}>Đang tải…</span>
                        </div>
                    )}
                    {pyStatus === "error" && <AlertTriangle size={10} style={{ color: "#f38ba8", flexShrink: 0 }} />}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                    <HBtn onClick={copyCode} title="Sao chép code" color={copied ? "#a6e3a1" : "#6c7086"}>
                        {copied ? <CheckCircle2 size={12} /> : <ClipboardCopy size={12} />}
                        {!isNarrow && (copied ? "Copied!" : "Copy")}
                    </HBtn>
                    <HBtn onClick={() => setOutput([])} title="Xóa output">
                        <Trash2 size={12} />{!isNarrow && " Xóa"}
                    </HBtn>
                    <button
                        onClick={runCode}
                        disabled={runDisabled}
                        title="Chạy (Ctrl+Enter)"
                        style={{ display: "flex", alignItems: "center", gap: isVeryNarrow ? 0 : 5, padding: isVeryNarrow ? "6px" : "4px 11px", fontSize: 12, fontWeight: 700, borderRadius: 6, border: "none", cursor: runDisabled ? "not-allowed" : "pointer", background: runDisabled ? "#313244" : "#a6e3a1", color: runDisabled ? "#6c7086" : "#1e1e2e", transition: "all .15s" }}
                    >
                        {isRunning ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                        {!isVeryNarrow && (isRunning ? "Đang chạy…" : "Chạy ▶")}
                    </button>
                    <HBtn onClick={() => setIsFullscreen(f => !f)} title={isFullscreen ? "Thu nhỏ" : "Phóng to"} style={{ padding: 5 }}>
                        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </HBtn>
                </div>
            </div>

            {/* ══ BODY ════════════════════════════════════════════════ */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden", flexDirection: isNarrow ? "column" : "row" }}>

                {/* ── FILE EXPLORER ──────────────────────────────── */}
                {!isNarrow && <div style={{ width: 135, flexShrink: 0, background: "#11111b", borderRight: "1px solid #313244", display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "7px 10px 5px", fontSize: 9, fontWeight: 700, color: "#45475a", letterSpacing: ".1em", textTransform: "uppercase", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                        <span>Explorer</span>
                        <div style={{ display: "flex", gap: 3 }}>
                            <button
                                onClick={addFile}
                                title="Thêm file .py"
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#6c7086", padding: 2, borderRadius: 3, display: "flex" }}
                                onMouseEnter={e => (e.currentTarget.style.color = "#cba6f7")}
                                onMouseLeave={e => (e.currentTarget.style.color = "#6c7086")}
                            >
                                <FilePlus size={13} />
                            </button>
                            <button
                                onClick={addNotebook}
                                title="Thêm notebook .ipynb"
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#6c7086", padding: 2, borderRadius: 3, display: "flex" }}
                                onMouseEnter={e => (e.currentTarget.style.color = "#f9e2af")}
                                onMouseLeave={e => (e.currentTarget.style.color = "#6c7086")}
                            >
                                <BookOpen size={13} />
                            </button>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: "auto" }}>
                        {files.map(file => (
                            <div
                                key={file.id}
                                onClick={() => { setActiveId(file.id); setRenamingId(null); }}
                                onDoubleClick={() => startRename(file)}
                                title="Nhấp chọn · Nhấp đúp đổi tên"
                                style={{ display: "flex", alignItems: "center", padding: "5px 8px 5px 10px", cursor: "pointer", background: activeId === file.id ? "#1e1e2e" : "transparent", borderLeft: activeId === file.id ? "2px solid #cba6f7" : "2px solid transparent", transition: "all .1s" }}
                            >
                                {renamingId === file.id ? (
                                    <input
                                        ref={renameRef}
                                        value={renameVal}
                                        onChange={e => setRenameVal(e.target.value)}
                                        onBlur={commitRename}
                                        onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingId(null); }}
                                        onClick={e => e.stopPropagation()}
                                        style={{ width: "100%", background: "#313244", border: "1px solid #cba6f7", borderRadius: 3, color: "#cdd6f4", fontSize: 11, padding: "1px 4px", outline: "none" }}
                                    />
                                ) : (
                                    <>
                                        <span style={{ flex: 1, fontSize: 11, color: activeId === file.id ? "#cdd6f4" : "#6c7086", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
                                            {file.name.endsWith(".ipynb") ? <BookOpen size={12} style={{ color: "#f97316", flexShrink: 0 }} /> : <Terminal size={12} style={{ color: "#3b82f6", flexShrink: 0 }} />}{file.name}
                                        </span>
                                        {files.length > 1 && (
                                            <button
                                                onClick={e => { e.stopPropagation(); deleteFile(file.id); }}
                                                title="Xóa file"
                                                style={{ background: "none", border: "none", cursor: "pointer", color: "transparent", padding: "0 1px", borderRadius: 3, display: "flex", flexShrink: 0 }}
                                                onMouseEnter={e => (e.currentTarget.style.color = "#f38ba8")}
                                                onMouseLeave={e => (e.currentTarget.style.color = "transparent")}
                                            >
                                                <X size={10} />
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>}

                {isNotebook ? (
                    <NotebookView
                        key={activeFile.id}
                        value={activeFile.code}
                        onChange={updateCode}
                        pyRef={pyRef}
                        pyStatus={pyStatus}
                        isRunning={isRunning}
                        setIsRunning={setIsRunning}
                        onRunAllRef={notebookRunAllRef}
                    />
                ) : (<>

                    {/* ── CODE EDITOR ────────────────────────────────── */}
                    <div style={{ flex: isNarrow ? "1 1 55%" : "1.2 1 0", display: "flex", flexDirection: "column", borderRight: isNarrow ? "none" : "1px solid #313244", borderBottom: isNarrow ? "1px solid #313244" : "none", minWidth: 0, minHeight: 0 }}>
                        <div style={{ padding: "3px 12px", background: "#181825", borderBottom: "1px solid #313244", fontSize: 10, color: "#6c7086", fontFamily: "monospace", display: "flex", justifyContent: "space-between", flexShrink: 0, overflow: "hidden" }}>
                            <span style={{ color: "#89b4fa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeFile.name}</span>
                            {!isNarrow && <span style={{ flexShrink: 0, paddingLeft: 8 }}>Ctrl+Enter chạy · Tab = 4 spaces</span>}
                        </div>
                        <CodeEditor
                            value={activeFile.code}
                            onChange={updateCode}
                            onRun={runCode}
                        />
                    </div>

                    {/* ── OUTPUT PANEL ───────────────────────────────── */}
                    <div style={{ flex: isNarrow ? "1 1 45%" : "1 1 0", display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, background: "#181825" }}>
                        <div style={{ padding: "3px 12px", background: "#181825", borderBottom: "1px solid #313244", fontSize: 10, color: "#6c7086", fontFamily: "monospace", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                            <Terminal size={10} color="#89b4fa" />
                            <span style={{ color: "#89b4fa" }}>Output</span>
                        </div>
                        <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px", fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: 12.5, lineHeight: 1.75 }}>
                            {output.length === 0 && (
                                <span style={{ color: "#45475a", fontSize: 11 }}>
                                    Nhấn <b style={{ color: "#a6e3a1" }}>▶ Chạy</b> để thực thi code
                                </span>
                            )}
                            {output.map((line, i) =>
                                line.type === "image" ? (
                                    <img key={i} src={`data:image/png;base64,${line.text}`}
                                        style={{ maxWidth: "100%", margin: "8px 0", borderRadius: 6, display: "block" }} />
                                ) : (
                                    <pre key={i} style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 2, color: line.type === "stderr" ? "#f38ba8" : line.type === "result" ? "#fab387" : line.type === "info" ? "#6c7086" : "#a6e3a1" }}>
                                        {line.text}
                                    </pre>
                                )
                            )}
                            <div ref={outputEndRef} />
                        </div>

                        {/* ── STDIN RESIZE HANDLE ── */}
                        <div
                            onMouseDown={e => {
                                dragStdin.current = { startY: e.clientY, startH: stdinHeight };
                                document.body.style.cursor = "ns-resize";
                                document.body.style.userSelect = "none";
                            }}
                            title="Kéo để thay đổi kích thước STDIN"
                            style={{ height: 6, flexShrink: 0, cursor: "ns-resize", background: "#181825", display: "flex", alignItems: "center", justifyContent: "center", borderTop: `1px solid ${hasInput ? "#45475a" : "#313244"}` }}
                        >
                            <div style={{ width: 36, height: 3, borderRadius: 2, background: "#45475a" }} />
                        </div>

                        {/* ── STDIN PANEL ── always show when input() detected, collapsible otherwise ── */}
                        <div style={{ flexShrink: 0, background: "#11111b" }}>
                            {/* header row */}
                            <div
                                onClick={() => setStdinOpen(o => !o)}
                                style={{ padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, userSelect: "none" }}
                            >
                                <Download size={10} style={{ flexShrink: 0, color: hasInput ? "#f9e2af" : "#45475a" }} />
                                <span style={{ fontSize: 10, fontWeight: 600, color: hasInput ? "#f9e2af" : "#45475a", fontFamily: "monospace", letterSpacing: "0.04em" }}>
                                    STDIN {hasInput ? <span style={{ fontSize: 9, background: "#313244", padding: "1px 5px", borderRadius: 3, color: "#cba6f7" }}>input() được phát hiện</span> : ""}
                                </span>
                                <span style={{ marginLeft: "auto", color: "#45475a" }}>
                                    {stdinOpen ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
                                </span>
                            </div>
                            {stdinOpen && (
                                <>
                                    <div style={{ padding: "0 10px 4px", fontSize: 9, color: "#45475a", fontFamily: "monospace" }}>
                                        Mỗi dòng = 1 lần gọi input() · Để trống nếu không cần
                                    </div>
                                    <style>{`.py-stdin::placeholder{color:#313244}.py-stdin:focus{outline:none}.py-stdin::-webkit-scrollbar{width:4px}.py-stdin::-webkit-scrollbar-thumb{background:#313244;border-radius:2px}`}</style>
                                    <textarea
                                        ref={stdinRef}
                                        className="py-stdin"
                                        value={stdinText}
                                        onChange={e => setStdinText(e.target.value)}
                                        placeholder={"Alice\n25\nHà Nội"}
                                        spellCheck={false}
                                        style={{ width: "100%", height: stdinHeight, resize: "none", background: "#1e1e2e", color: "#cdd6f4", fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: 12, lineHeight: 1.6, padding: "6px 10px", border: "none", borderTop: "1px solid #313244", boxSizing: "border-box" }}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </>)}
            </div>

            {/* ══ LOADING OVERLAY ═════════════════════════════════════ */}
            {pyStatus === "loading" && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(17,17,27,.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, zIndex: 10 }}>
                    <Terminal size={42} style={{ color: "#cba6f7" }} />
                    <p style={{ color: "#cdd6f4", fontWeight: 600, fontSize: 14, margin: 0 }}>Đang tải Python runtime…</p>
                    <div style={{ width: 220, height: 5, background: "#313244", borderRadius: 5, overflow: "hidden" }}>
                        <div style={{ width: `${loadPct}%`, height: "100%", background: "linear-gradient(90deg,#cba6f7,#89b4fa)", borderRadius: 5, transition: "width .5s ease" }} />
                    </div>
                    <p style={{ color: "#6c7086", fontSize: 11, margin: 0 }}>Lần đầu ~5-10 giây · Sau được cache lại</p>
                </div>
            )}
        </div>
    );
    }
);
PythonRunner.displayName = "PythonRunner";
