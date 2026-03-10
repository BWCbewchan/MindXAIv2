"use client";

import { PythonRunner, PythonRunnerHandle } from "@/components/chat/python-runner";
import { SandboxViewer } from "@/components/chat/sandbox-viewer";
import { IdeAgent } from "@/components/ide/ide-agent";
import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_PYTHON = `# Chào mừng đến với Python IDE!
# Nhấn Ctrl+Enter để chạy code

import math

def fibonacci(n: int) -> list[int]:
    seq = [0, 1]
    for _ in range(n - 2):
        seq.append(seq[-1] + seq[-2])
    return seq[:n]

print("Fibonacci(10):", fibonacci(10))
print("Pi ≈", round(math.pi, 6))
`;

const DEFAULT_NOTEBOOK_CELLS: { type: "code" | "markdown"; source: string }[] = [
    {
        type: "markdown",
        source: "# Jupyter Notebook\n> Nhấn **Shift+Enter** để chạy cell, hoặc dùng nút ▶ bên trái.",
    },
    {
        type: "code",
        source: "# Ví dụ cơ bản\nprint('Hello from Notebook!')\n\nfor i in range(1, 6):\n    print(f'  {i} × {i} = {i*i}')",
    },
    {
        type: "code",
        source: "# Vẽ biểu đồ với matplotlib\nimport matplotlib.pyplot as plt\nimport numpy as np\n\nx = np.linspace(0, 2 * np.pi, 200)\nplt.figure(figsize=(7, 3))\nplt.plot(x, np.sin(x), label='sin(x)', color='#89b4fa')\nplt.plot(x, np.cos(x), label='cos(x)', color='#a6e3a1')\nplt.legend()\nplt.title('Sin & Cos')\nplt.tight_layout()\nplt.show()",
    },
];

const DEFAULT_WEB_FILES: Record<string, string> = {
    "/index.html": `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Web Sandbox</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <h1>🌐 Web Sandbox</h1>
  <p>Chỉnh sửa HTML, CSS, JS và xem kết quả trực tiếp!</p>
  <button id="btn">Click me</button>
  <p id="msg"></p>
  <script src="/js/main.js"></script>
</body>
</html>`,
    "/css/style.css": `body {
  font-family: sans-serif;
  background: #0f172a;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  margin: 0;
  gap: 12px;
}

h1 { font-size: 2rem; margin: 0; }

button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background .2s;
}
button:hover { background: #2563eb; }

#msg { color: #86efac; font-weight: 600; }`,
    "/js/main.js": `const btn = document.getElementById('btn');
const msg = document.getElementById('msg');
let count = 0;

btn.addEventListener('click', () => {
  count++;
  msg.textContent = \`Đã click \${count} lần!\`;
});`,
};

const TOOL_META: Record<string, { label: string; icon: string; color: string }> = {
    python:   { label: "Python Script",     icon: "🐍", color: "#3b82f6" },
    notebook: { label: "Jupyter Notebook",  icon: "📓", color: "#f97316" },
    sandbox:  { label: "Web Sandbox",       icon: "🌐", color: "#22c55e" },
};

export default function IdeToolPage({ params }: { params: Promise<{ tool: string }> }) {
    const { tool } = use(params);
    const meta = TOOL_META[tool];

    /* ── Agent state (all hooks before any early return) */
    const [agentOpen, setAgentOpen] = useState(false);
    const [reviewPending, setReviewPending] = useState(false);

    // Python / Notebook
    const pythonRef       = useRef<PythonRunnerHandle | null>(null);
    const codeRef         = useRef("");
    const onCodeChange    = useCallback((code: string) => { codeRef.current = code; }, []);

    // Sandbox: controlled files state + key to force Sandpack remount
    const [sandboxFiles, setSandboxFiles] = useState<Record<string, string>>(DEFAULT_WEB_FILES);
    const [sandboxKey, setSandboxKey] = useState(0);
    const sandboxFilesRef = useRef(sandboxFiles);
    useEffect(() => { sandboxFilesRef.current = sandboxFiles; }, [sandboxFiles]);

    const snapshotRef     = useRef<{ name: string; code: string }[]>([]);
    const reviewResultRef = useRef<((r: "accepted" | "rejected") => void) | null>(null);

    const getCode = useCallback(() => {
        if (tool === "sandbox") {
            // Format all sandbox files for the AI context
            return Object.entries(sandboxFilesRef.current)
                .map(([name, code]) => `=== ${name} ===\n${code}`)
                .join("\n\n");
        }
        return codeRef.current;
    }, [tool]);

    const onApplyFiles = useCallback((
        files: { name: string; code: string }[],
        onResult: (r: "accepted" | "rejected") => void,
    ) => {
        if (tool === "sandbox") {
            // snapshot current sandbox files
            snapshotRef.current = Object.entries(sandboxFilesRef.current)
                .map(([name, code]) => ({ name, code }));
            // Convert AI files to Sandpack Record (ensure leading /)
            const newFiles: Record<string, string> = {};
            for (const f of files) {
                const key = f.name.startsWith("/") ? f.name : `/${f.name}`;
                newFiles[key] = f.code;
            }
            setSandboxFiles(newFiles);
            setSandboxKey(k => k + 1);
        } else {
            // snapshot Python/Notebook files
            snapshotRef.current = pythonRef.current?.getProjectFiles() ?? [];
            pythonRef.current?.setProjectFiles(files);
        }
        reviewResultRef.current = onResult;
        setReviewPending(true);
    }, [tool]);

    const handleAccept = useCallback(() => {
        reviewResultRef.current?.("accepted");
        reviewResultRef.current = null;
        setReviewPending(false);
    }, []);

    const handleDiscard = useCallback(() => {
        if (tool === "sandbox") {
            // Restore sandbox snapshot
            const restored: Record<string, string> = {};
            for (const f of snapshotRef.current) restored[f.name] = f.code;
            setSandboxFiles(restored);
            setSandboxKey(k => k + 1);
        } else if (snapshotRef.current.length > 0) {
            pythonRef.current?.setProjectFiles(snapshotRef.current);
        }
        reviewResultRef.current?.("rejected");
        reviewResultRef.current = null;
        setReviewPending(false);
    }, [tool]);

    if (!meta) {
        return (
            <div style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 16, color: "#9399b2",
                fontFamily: "var(--font-display, Nunito, sans-serif)",
            }}>
                <span style={{ fontSize: 48 }}>🔍</span>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#f38ba8" }}>
                    Công cụ &quot;{tool}&quot; không tồn tại
                </p>
                <Link href="/ide" style={{ color: "#89b4fa", fontSize: 14, textDecoration: "none" }}>
                    ← Quay lại danh sách công cụ
                </Link>
            </div>
        );
    }

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
            {/* ── Top bar */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0 14px",
                height: 42,
                borderBottom: "1px solid #313244",
                background: "#181825",
                flexShrink: 0,
            }}>
                <Link href="/ide" title="Danh sách công cụ" style={{
                    display: "flex", alignItems: "center", gap: 5,
                    color: "#6c7086", textDecoration: "none", fontSize: 13,
                    padding: "4px 8px", borderRadius: 6, transition: "color .12s",
                }}
                    onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "#cdd6f4"}
                    onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "#6c7086"}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    IDE
                </Link>

                <span style={{ color: "#313244", fontSize: 16 }}>/</span>

                <span style={{ fontSize: 14, color: meta.color }}>{meta.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#cdd6f4", letterSpacing: "-0.01em" }}>
                    {meta.label}
                </span>

                <div style={{ flex: 1 }} />

                {/* AI Agent toggle */}
                <button
                    onClick={() => setAgentOpen(v => !v)}
                    title={agentOpen ? "Đóng AI Agent" : "Mở AI Agent"}
                    style={{
                        display: "flex", alignItems: "center", gap: 5,
                        fontSize: 12, fontWeight: 600,
                        padding: "4px 10px", borderRadius: 6,
                        border: `1px solid ${agentOpen ? "#cba6f7" : "#313244"}`,
                        background: agentOpen ? "rgba(203,166,247,.12)" : "transparent",
                        color: agentOpen ? "#cba6f7" : "#6c7086",
                        cursor: "pointer", transition: "all .12s",
                    }}
                >
                    🤖 Agent
                </button>

                <Link href="/" style={{
                    fontSize: 12, color: "#45475a", textDecoration: "none",
                    padding: "4px 10px", borderRadius: 6, border: "1px solid #313244",
                    transition: "color .12s, border-color .12s",
                }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.color = "#cdd6f4"; el.style.borderColor = "#45475a"; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.color = "#45475a"; el.style.borderColor = "#313244"; }}
                >
                    Trang chủ
                </Link>
            </div>

            {/* ── Tool content + Agent panel */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
                {/* Tool — wrapped in position:relative so overlay can sit on top */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, position: "relative" }}>

                    {/* ── Accept / Discard overlay bar (appears when AI proposes changes) */}
                    {reviewPending && (
                        <div style={{
                            position: "absolute", top: 0, left: 0, right: 0, zIndex: 50,
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "0 14px", height: 40,
                            background: "rgba(28,28,46,.96)",
                            borderBottom: "1px solid #cba6f7",
                            backdropFilter: "blur(6px)",
                        }}>
                            <span style={{ fontSize: 13 }}>📝</span>
                            <span style={{ fontSize: 12, color: "#cba6f7", fontWeight: 600, flex: 1 }}>
                                AI đề xuất thay đổi — hãy xem xét
                            </span>
                            <button
                                onClick={handleAccept}
                                style={{
                                    display: "flex", alignItems: "center", gap: 5,
                                    background: "rgba(166,227,161,.18)", border: "1px solid #a6e3a1",
                                    borderRadius: 7, padding: "4px 14px", cursor: "pointer",
                                    color: "#a6e3a1", fontSize: 12, fontWeight: 700,
                                }}
                            >
                                ✓ Accept
                            </button>
                            <button
                                onClick={handleDiscard}
                                style={{
                                    display: "flex", alignItems: "center", gap: 5,
                                    background: "rgba(243,139,168,.12)", border: "1px solid rgba(243,139,168,.5)",
                                    borderRadius: 7, padding: "4px 14px", cursor: "pointer",
                                    color: "#f38ba8", fontSize: 12, fontWeight: 700,
                                }}
                            >
                                ✕ Discard
                            </button>
                        </div>
                    )}

                    {tool === "python" && (
                        <PythonRunner ref={pythonRef} initialCode={DEFAULT_PYTHON} fillHeight onCodeChange={onCodeChange} />
                    )}
                    {tool === "notebook" && (
                        <PythonRunner ref={pythonRef} initialCells={DEFAULT_NOTEBOOK_CELLS} fillHeight onCodeChange={onCodeChange} />
                    )}
                    {tool === "sandbox" && (
                        <SandboxViewer key={sandboxKey} files={sandboxFiles} template="static" />
                    )}
                </div>

                {/* AI Agent sidebar */}
                <IdeAgent
                    tool={tool}
                    getCurrentCode={getCode}
                    onApplyFiles={onApplyFiles}
                    open={agentOpen}
                />
            </div>
        </div>
    );
}
