"use client";

import { Bot, Check, ChevronRight, Paperclip, RefreshCw, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

/* ─── Types ─────────────────────────────────────────────────────────── */
interface AiFile { name: string; code: string; }

interface AgentMsg {
    id: string;
    role: "user" | "assistant";
    content: string;           // full AI text
    pendingFiles?: AiFile[];   // waiting for user review
    appliedFiles?: string[];   // file names confirmed & written
    reviewState?: "pending" | "accepted" | "rejected";
    streaming?: boolean;
}

export interface IdeAgentProps {
    tool: string;
    /** Returns the current code when called — avoids re-render on every keystroke */
    getCurrentCode?: () => string;
    /**
     * Called when AI produces files.
     * Page should: snapshot → apply to editor → show Accept/Discard overlay.
     * When user decides, page calls onResult("accepted" | "rejected").
     */
    onApplyFiles?: (files: AiFile[], onResult: (r: "accepted" | "rejected") => void) => void;
    open: boolean;
}

const CODE_LANG: Record<string, string> = {
    python: "python",
    notebook: "python",
    sandbox: "html",
};

const SUGGESTIONS: Record<string, string[]> = {
    python:   ["Viết chương trình Fibonacci", "Debug lỗi cho tôi", "Tối ưu thuật toán", "Viết thêm unit test"],
    notebook: ["Phân tích dữ liệu mẫu", "Vẽ biểu đồ từ dữ liệu", "Giải thích kết quả", "Thêm ô markdown"],
    sandbox:  ["Tạo landing page đẹp", "Thêm responsive design", "Tạo animation đẹp", "Debug JS cho tôi"],
};

/* ─── Parse AI response → project files ─────────────────────────────── */
function parseAiFiles(text: string, tool: string): AiFile[] | null {
    const defaultName = tool === "sandbox" ? "index.html" : "main.py";

    // 1. <pyproject><file name="x.py">...</file></pyproject>  (Python multi-file)
    const pyprojectMatch = /<pyproject>([\s\S]*?)<\/pyproject>/i.exec(text);
    if (pyprojectMatch) {
        const files: AiFile[] = [];
        const fileRe = /<file\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/file>/g;
        let m;
        while ((m = fileRe.exec(pyprojectMatch[1])) !== null) {
            files.push({ name: m[1].trim(), code: m[2].trim() });
        }
        if (files.length > 0) return files;
    }

    // 2. <python>...</python>  (single Python file)
    const pythonMatch = /<python>([\s\S]*?)<\/python>/i.exec(text);
    if (pythonMatch) {
        return [{ name: defaultName, code: pythonMatch[1].trim() }];
    }

    // 3. Multiple fenced blocks with file-name hints (e.g. ```html /index.html ... ```)
    const namedRe = /```(\w+)\s+([^\n]+)\n([\s\S]*?)```/g;
    const namedFiles: AiFile[] = [];
    let mn;
    while ((mn = namedRe.exec(text)) !== null) {
        const hint = mn[2].trim();
        const code = mn[3].trimEnd();
        if (code.length > 10 && (hint.includes(".") || hint.startsWith("/"))) {
            namedFiles.push({ name: hint.startsWith("/") ? hint : `/${hint}`, code });
        }
    }
    if (namedFiles.length > 0) return namedFiles;

    // 4. Fallback: largest fenced code block → default file name
    const RE = /```(?:\w*)\n?([\s\S]*?)```/g;
    let best: { code: string; len: number } | null = null;
    let m2;
    while ((m2 = RE.exec(text)) !== null) {
        const code = m2[1].trimEnd();
        if (!best || code.length > best.len) best = { code, len: code.length };
    }
    if (best && best.len > 20) return [{ name: defaultName, code: best.code }];

    return null;
}

/* ─── AI result card (shown after stream ends) ───────────────────────── */
function ResultCard({
    msg, onViewDetail,
}: {
    msg: AgentMsg;
    onViewDetail: () => void;
}) {
    if (msg.streaming) {
        return (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 11px", borderRadius: "4px 12px 12px 12px", background: "#1e1e2e", border: "1px solid #313244", fontSize: 12, color: "#6c7086" }}>
                <span style={{ color: "#a6e3a1" }}>●</span>
                <span>Đang xử lý…</span>
            </div>
        );
    }

    /* ── PENDING REVIEW (Accept/Discard is on the editor overlay) ── */
    if (msg.reviewState === "pending" && msg.pendingFiles) {
        return (
            <div style={{ borderRadius: "4px 12px 12px 12px", background: "#1c1c2e", border: "1px solid #cba6f7", padding: "9px 12px", maxWidth: "96%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                    <RefreshCw size={13} style={{ color: "#cba6f7" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#cba6f7" }}>
                        Đã áp vào editor — đang chờ xác nhận
                    </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 7 }}>
                    {msg.pendingFiles.map(f => (
                        <span key={f.name} style={{ fontSize: 10.5, background: "rgba(203,166,247,.1)", border: "1px solid rgba(203,166,247,.35)", borderRadius: 4, padding: "2px 8px", color: "#cba6f7", fontFamily: "monospace" }}>
                            {f.name}
                        </span>
                    ))}
                </div>
                <button
                    onClick={onViewDetail}
                    style={{ fontSize: 10, color: "#6c7086", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 2 }}
                >
                    xem giải thích <ChevronRight size={10} />
                </button>
            </div>
        );
    }

    /* ── ACCEPTED ── */
    if (msg.reviewState === "accepted" && msg.appliedFiles) {
        return (
            <div style={{ borderRadius: "4px 12px 12px 12px", background: "#1a2a1a", border: "1px solid #2a4a2a", padding: "8px 11px", maxWidth: "96%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <Check size={14} style={{ color: "#a6e3a1" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#a6e3a1" }}>
                        Đã áp dụng {msg.appliedFiles.length} file
                    </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                    {msg.appliedFiles.map(f => (
                        <span key={f} style={{ fontSize: 10.5, background: "rgba(166,227,161,.12)", border: "1px solid rgba(166,227,161,.3)", borderRadius: 4, padding: "1px 7px", color: "#a6e3a1", fontFamily: "monospace" }}>
                            {f}
                        </span>
                    ))}
                </div>
                <button onClick={onViewDetail} style={{ fontSize: 10, color: "#6c7086", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 2 }}>
                    xem giải thích <ChevronRight size={10} />
                </button>
            </div>
        );
    }

    /* ── REJECTED ── */
    if (msg.reviewState === "rejected") {
        return (
            <div style={{ borderRadius: "4px 12px 12px 12px", background: "#1e1e2e", border: "1px solid #45475a", padding: "8px 11px", maxWidth: "96%", display: "flex", alignItems: "center", gap: 7 }}>
                <X size={13} style={{ color: "#f38ba8" }} />
                <span style={{ fontSize: 12, color: "#6c7086" }}>Đã bỏ qua thay đổi</span>
                <button onClick={onViewDetail} style={{ marginLeft: "auto", fontSize: 10, color: "#45475a", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 2 }}>
                    xem <ChevronRight size={10} />
                </button>
            </div>
        );
    }

    // No files — plain explanation text
    return (
        <div style={{ maxWidth: "96%", borderRadius: "4px 12px 12px 12px", background: "#1e1e2e", border: "1px solid #313244", padding: "8px 11px", fontSize: 12, color: "#cdd6f4", lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {msg.content || "▌"}
        </div>
    );
}

/* ─── Detail modal (full AI explanation) ────────────────────────────── */
function DetailModal({ content, onClose }: { content: string; onClose: () => void }) {
    return (
        <div
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{ background: "#1e1e2e", border: "1px solid #313244", borderRadius: 12, padding: "16px", maxWidth: 560, width: "100%", maxHeight: "70vh", display: "flex", flexDirection: "column", gap: 10 }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#cba6f7" }}>Giải thích của AI</span>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6c7086", display: "flex", alignItems: "center" }}>
                        <X size={16} />
                    </button>
                </div>
                <div style={{ overflowY: "auto", fontSize: 12.5, lineHeight: 1.7, color: "#cdd6f4", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {content}
                </div>
            </div>
        </div>
    );
}

/* ─── Main panel ─────────────────────────────────────────────────────── */
export const IdeAgent: React.FC<IdeAgentProps> = ({ tool, getCurrentCode, onApplyFiles, open }) => {
    const [messages, setMessages] = useState<AgentMsg[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [detailContent, setDetailContent] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const codeIncludedRef = useRef(false);
    const msgsRef = useRef(messages);
    useEffect(() => { msgsRef.current = messages; }, [messages]);

    /* Auto-scroll */
    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages]);

    /* Reset context when panel re-opens or tool changes */
    useEffect(() => {
        if (open) codeIncludedRef.current = false;
    }, [open, tool]);

    const sendMessage = useCallback(async (rawText: string, forceCode = false) => {
        const text = rawText.trim();
        if (!text || loading) return;

        /* Inject code context on first send or when explicitly requested */
        let apiText = text;
        const currentCode = getCurrentCode?.() ?? "";
        if ((forceCode || !codeIncludedRef.current) && currentCode.trim()) {
            if (tool === "sandbox") {
                apiText = `[IDE - Web Sandbox]\nFiles hiện tại:\n${currentCode}\n\nYêu cầu: ${text}`;
            } else {
                const lang = CODE_LANG[tool] || "";
                apiText = `[IDE - Công cụ: ${tool}]\nCode hiện tại:\n\`\`\`${lang}\n${currentCode}\n\`\`\`\n\nYêu cầu: ${text}`;
            }
            codeIncludedRef.current = true;
        } else {
            codeIncludedRef.current = true;
        }

        const userMsgId = `u${Date.now()}`;
        const aiMsgId   = `a${Date.now() + 1}`;
        setMessages(prev => [
            ...prev,
            { id: userMsgId, role: "user",     content: text },
            { id: aiMsgId,   role: "assistant", content: "", streaming: true },
        ]);
        setInput("");
        setLoading(true);

        try {
            const history = msgsRef.current
                .filter(m => !m.streaming)
                .slice(-10)
                .map(m => ({
                    role: m.role === "user" ? ("user" as const) : ("model" as const),
                    parts: [{ text: m.content }],
                }));

            const ctrl = new AbortController();
            abortRef.current = ctrl;

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: ctrl.signal,
                body: JSON.stringify({ message: apiText, ideMode: tool, history }),
            });

            if (!res.ok || !res.body) throw new Error("Không kết nối được AI");

            const reader = res.body.getReader();
            const dec    = new TextDecoder();
            let acc = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                acc += dec.decode(value, { stream: true });
                const snap = acc;
                setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: snap } : m));
            }

            // Parse files → apply to editor immediately, wait for user Accept/Discard on editor
            const files = parseAiFiles(acc, tool);

            setMessages(prev => prev.map(m =>
                m.id === aiMsgId
                    ? { ...m, streaming: false, pendingFiles: files ?? undefined, reviewState: files ? "pending" : undefined }
                    : m
            ));

            if (files && onApplyFiles) {
                onApplyFiles(files, (result) => {
                    setMessages(prev => prev.map(m =>
                        m.id === aiMsgId
                            ? { ...m, reviewState: result, appliedFiles: result === "accepted" ? files.map(f => f.name) : undefined }
                            : m
                    ));
                });
            }
        } catch (e: unknown) {
            if ((e as { name?: string })?.name === "AbortError") return;
            const errMsg = (e instanceof Error) ? e.message : "Lỗi kết nối AI";
            setMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, content: `⚠️ ${errMsg}`, streaming: false } : m
            ));
        } finally {
            setLoading(false);
            abortRef.current = null;
        }
    }, [loading, getCurrentCode, tool, onApplyFiles]);

    const stopGeneration = () => {
        abortRef.current?.abort();
        setLoading(false);
    };

    const clearChat = () => {
        stopGeneration();
        setMessages([]);
        codeIncludedRef.current = false;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const adjustHeight = (el: HTMLTextAreaElement) => {
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 100) + "px";
    };

    const suggestions = SUGGESTIONS[tool] ?? SUGGESTIONS.python;
    const hasCode = !!getCurrentCode;

    return (
        <>
            {detailContent && (
                <DetailModal content={detailContent} onClose={() => setDetailContent(null)} />
            )}
            <div style={{
                width: open ? 320 : 0,
                flexShrink: 0,
                overflow: "hidden",
                transition: "width .2s ease",
                display: "flex",
                flexDirection: "column",
                borderLeft: open ? "1px solid #313244" : "none",
                background: "#13131f",
            }}>
                {open && (
                    <div style={{ width: 320, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

                        {/* ── Header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 40, borderBottom: "1px solid #313244", flexShrink: 0, background: "#0d0d17" }}>
                            <Bot size={15} style={{ color: "#cba6f7" }} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#cba6f7", flex: 1, letterSpacing: "-.01em" }}>AI Agent</span>
                            {loading && (
                                <span style={{ fontSize: 10, color: "#a6e3a1" }}>● đang xử lý</span>
                            )}
                            <button
                                onClick={clearChat}
                                title="Xóa hội thoại"
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#45475a", padding: "2px 7px", borderRadius: 4, fontSize: 10 }}
                            >
                                Xóa
                            </button>
                        </div>

                        {/* ── Messages */}
                        <div
                            ref={scrollRef}
                            style={{ flex: 1, overflowY: "auto", padding: "10px 10px 4px", display: "flex", flexDirection: "column", gap: 8, overscrollBehavior: "contain" }}
                        >
                            {messages.length === 0 ? (
                                <div style={{ color: "#6c7086", fontSize: 12, textAlign: "center", marginTop: 20, lineHeight: 1.7 }}>
                                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}><Bot size={30} style={{ color: "#9399b2" }} /></div>
                                    <div style={{ fontWeight: 700, color: "#9399b2", marginBottom: 4 }}>AI Agent sẵn sàng!</div>
                                    <div style={{ fontSize: 11, marginBottom: 14 }}>Giao lệnh để AI viết code thẳng vào Explorer</div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 5, textAlign: "left" }}>
                                        {suggestions.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => sendMessage(s)}
                                                style={{ background: "#1e1e2e", border: "1px solid #313244", borderRadius: 7, padding: "6px 10px", color: "#89b4fa", fontSize: 11, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 5 }}
                                            >
                                                <ChevronRight size={11} /> {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                messages.map(msg => (
                                    <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                                        {msg.role === "user" ? (
                                            <div style={{
                                                maxWidth: "85%",
                                                background: "#2d2d50",
                                                border: "1px solid #45475a",
                                                borderRadius: "12px 12px 4px 12px",
                                                padding: "6px 11px",
                                                fontSize: 12,
                                                color: "#cdd6f4",
                                                whiteSpace: "pre-wrap",
                                                wordBreak: "break-word",
                                            }}>
                                                {msg.content}
                                            </div>
                                        ) : (
                                            <ResultCard
                                                msg={msg}
                                                onViewDetail={() => setDetailContent(msg.content)}
                                            />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* ── Re-send code button */}
                        {hasCode && messages.length > 0 && (
                            <div style={{ padding: "4px 10px", flexShrink: 0 }}>
                                <button
                                    onClick={() => sendMessage(input || "Hãy xem lại code hiện tại của tôi", true)}
                                    style={{ fontSize: 10, color: "#6c7086", background: "#0d0d17", border: "1px solid #313244", borderRadius: 5, padding: "3px 8px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                                >
                                    <Paperclip size={10} /> Gửi kèm code hiện tại
                                </button>
                            </div>
                        )}

                        {/* ── Input */}
                        <div style={{ padding: "8px 10px 10px", borderTop: "1px solid #313244", flexShrink: 0 }}>
                            <div style={{ display: "flex", gap: 6, alignItems: "flex-end", background: "#0d0d17", border: "1px solid #313244", borderRadius: 10, padding: "7px 8px 7px 10px" }}>
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => { setInput(e.target.value); adjustHeight(e.target); }}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Giao lệnh cho AI… (Enter gửi)"
                                    disabled={loading}
                                    rows={1}
                                    style={{
                                        flex: 1, background: "none", border: "none", outline: "none",
                                        resize: "none", overflow: "hidden", color: "#cdd6f4",
                                        fontSize: 12.5, lineHeight: 1.55, fontFamily: "inherit",
                                        minHeight: 20, maxHeight: 100,
                                    }}
                                />
                                <button
                                    onClick={() => loading ? stopGeneration() : sendMessage(input)}
                                    title={loading ? "Dừng" : "Gửi (Enter)"}
                                    style={{
                                        width: 28, height: 28, borderRadius: 7, border: "none", flexShrink: 0,
                                        background: loading ? "#f38ba8" : input.trim() ? "#cba6f7" : "#313244",
                                        color: (loading || input.trim()) ? "#11111b" : "#45475a",
                                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                        transition: "background .12s",
                                    }}
                                >
                                    {loading
                                        ? <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                                        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                                    }
                                </button>
                            </div>
                            <div style={{ fontSize: 9.5, color: "#313244", marginTop: 4, textAlign: "right" }}>
                                Enter gửi · Shift+Enter xuống dòng
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
