"use client";

import { indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { keymap } from "@codemirror/view";
import { EditorView, basicSetup } from "codemirror";
import {
    CheckCircle2,
    ChevronDown, ChevronUp,
    ClipboardCopy, FilePlus,
    Maximize2, Minimize2, Play, RefreshCw, Terminal, Trash2, X,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

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
interface OutputLine { type: "stdout" | "stderr" | "result" | "info"; text: string; }
interface PyFile     { id: string; name: string; code: string; }
interface PythonRunnerProps { initialCode?: string; initialStdin?: string; }

/* ─── Singleton Pyodide loader ──────────────────────────────────────── */
const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/";
let _loadingPromise: Promise<PyodideAPI> | null = null;

function ensurePyodide(): Promise<PyodideAPI> {
    if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
    if (window._pyodideInstance)       return Promise.resolve(window._pyodideInstance);
    if (_loadingPromise)               return _loadingPromise;

    _loadingPromise = (async () => {
        if (!window.loadPyodide) {
            await new Promise<void>((resolve, reject) => {
                const s = document.createElement("script");
                s.src     = `${PYODIDE_CDN}pyodide.js`;
                s.onload  = () => resolve();
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
/* ─── CodeMirror Python Editor ──────────────────────────────────────── */
const CodeEditor: React.FC<{
    value: string;
    onChange: (v: string) => void;
    onRun: () => void;
}> = ({ value, onChange, onRun }) => {
    const hostRef  = useRef<HTMLDivElement>(null);
    const viewRef  = useRef<EditorView | null>(null);
    const onRunRef = useRef(onRun);
    const onChgRef = useRef(onChange);
    useEffect(() => { onRunRef.current = onRun;    }, [onRun]);
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
export const PythonRunner: React.FC<PythonRunnerProps> = ({ initialCode = "", initialStdin = "" }) => {
    /* file state */
    const [files,     setFiles]     = useState<PyFile[]>([{ id: "main", name: "main.py", code: initialCode }]);
    const [activeId,  setActiveId]  = useState("main");
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameVal,  setRenameVal]  = useState("");

    /* runtime state */
    const [output,       setOutput]       = useState<OutputLine[]>([]);
    const [isRunning,    setIsRunning]    = useState(false);
    const [pyStatus,     setPyStatus]     = useState<"idle" | "loading" | "ready" | "error">("idle");
    const [pyVersion,    setPyVersion]    = useState("");
    const [loadPct,      setLoadPct]      = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [copied,       setCopied]       = useState(false);
    const [stdinText,    setStdinText]    = useState(initialStdin);
    const [stdinOpen,    setStdinOpen]    = useState(true);
    const [stdinHeight,  setStdinHeight]  = useState(80);

    const pyRef        = useRef<PyodideAPI | null>(null);
    const outputEndRef = useRef<HTMLDivElement>(null);
    const renameRef    = useRef<HTMLInputElement>(null);
    const stdinRef     = useRef<HTMLTextAreaElement>(null);
    const dragStdin    = useRef<{ startY: number; startH: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerW, setContainerW] = useState(1000);

    const activeFile   = files.find(f => f.id === activeId) ?? files[0];
    const hasInput      = /\binput\s*\(/.test(activeFile.code);
    const isNarrow      = containerW < 520;
    const isVeryNarrow  = containerW < 380;

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
    const updateCode = (code: string) =>
        setFiles(prev => prev.map(f => f.id === activeId ? { ...f, code } : f));

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
        if (!name.endsWith(".py")) name += ".py";
        setFiles(prev => prev.map(f => f.id === renamingId ? { ...f, name } : f));
        setRenamingId(null);
    };

    /* ── Execute code ─────────────────────────────────────────────── */
    const runCode = useCallback(async () => {
        const py = pyRef.current;
        if (!py || isRunning || !activeFile.code.trim()) return;

        // Validate: code uses input() but stdin is empty — require user to fill it
        if (hasInput && !stdinText.trim()) {
            setStdinOpen(true);
            setOutput([{ type: "stderr", text: "⚠ Code dùng input() nhưng STDIN chưa có giá trị!\nHãy nhập các giá trị vào ô STDIN bên dưới (mỗi dòng = 1 lần input()) rồi nhấn Chạy lại." }]);
            setTimeout(() => stdinRef.current?.focus(), 80);
            return;
        }

        setIsRunning(true);
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
            const stdinJson  = JSON.stringify(stdinLines);

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

            const stdout = String((await py.runPythonAsync("__out.getvalue()")) ?? "");
            const stderr = String((await py.runPythonAsync("__err.getvalue()")) ?? "");
            await py.runPythonAsync("del __out, __err, __orig_streams");

            const lines: OutputLine[] = [];
            if (stdout.trim()) lines.push({ type: "stdout", text: stdout });
            if (stderr.trim()) lines.push({ type: "stderr", text: stderr });
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
        height: isFullscreen ? "calc(100vh - 28px)" : isNarrow ? "520px" : "540px",
        position: isFullscreen ? "fixed" : "relative",
        ...(isFullscreen && { top: 14, left: 14, right: 14, bottom: 14, zIndex: 50 }),
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: 12,
        border: "1px solid #313244",
        boxShadow: isFullscreen ? "0 28px 60px rgba(0,0,0,.45)" : "0 4px 18px rgba(0,0,0,.18)",
        margin: "16px 0",
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
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#cba6f7", letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        🐍 Python {pyStatus === "ready" ? pyVersion : "Runner"}
                    </span>
                    {!isNarrow && pyStatus === "loading" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                            <div style={{ width: 72, height: 3, background: "#313244", borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ width: `${loadPct}%`, height: "100%", background: "#cba6f7", transition: "width .5s ease" }} />
                            </div>
                            <span style={{ fontSize: 10, color: "#6c7086" }}>Đang tải…</span>
                        </div>
                    )}
                    {pyStatus === "error" && <span style={{ fontSize: 10, color: "#f38ba8", flexShrink: 0 }}>⚠</span>}
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
                        <button
                            onClick={addFile}
                            title="Thêm file .py"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#6c7086", padding: 2, borderRadius: 3, display: "flex" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#cba6f7")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#6c7086")}
                        >
                            <FilePlus size={13} />
                        </button>
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
                                            <span style={{ fontSize: 12 }}>🐍</span>{file.name}
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
                        {output.map((line, i) => (
                            <pre key={i} style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 2, color: line.type === "stderr" ? "#f38ba8" : line.type === "result" ? "#fab387" : line.type === "info" ? "#6c7086" : "#a6e3a1" }}>
                                {line.text}
                            </pre>
                        ))}
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
                            <span style={{ fontSize: 10 }}>📥</span>
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
            </div>

            {/* ══ LOADING OVERLAY ═════════════════════════════════════ */}
            {pyStatus === "loading" && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(17,17,27,.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, zIndex: 10 }}>
                    <div style={{ fontSize: 42 }}>🐍</div>
                    <p style={{ color: "#cdd6f4", fontWeight: 600, fontSize: 14, margin: 0 }}>Đang tải Python runtime…</p>
                    <div style={{ width: 220, height: 5, background: "#313244", borderRadius: 5, overflow: "hidden" }}>
                        <div style={{ width: `${loadPct}%`, height: "100%", background: "linear-gradient(90deg,#cba6f7,#89b4fa)", borderRadius: 5, transition: "width .5s ease" }} />
                    </div>
                    <p style={{ color: "#6c7086", fontSize: 11, margin: 0 }}>Lần đầu ~5-10 giây · Sau được cache lại ⚡</p>
                </div>
            )}
        </div>
    );
};
