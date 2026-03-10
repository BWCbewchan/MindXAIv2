import {
    SandpackCodeEditor,
    SandpackFileExplorer,
    SandpackLayout,
    SandpackPreview,
    SandpackProvider,
} from "@codesandbox/sandpack-react";
import { Code, Columns, Maximize2, Minimize2, Play } from "lucide-react";
import React, { useMemo, useState } from "react";

interface SandboxViewerProps {
    files: Record<string, string>;
    template?: "static" | "react" | "vue" | "angular" | "svelte";
}

const HIDDEN_FILES = [
    "/package.json", "package.json",
    "/node_modules",
    "/App.js", "/App.jsx", "/App.tsx",
    "/index.js",
    "/src/index.js", "/src/App.js", "/src/App.jsx", "/src/App.tsx",
    "/public/index.html",
    "/.babelrc", "/babel.config.js",
];

function sortProjectFiles(files: string[]): string[] {
    const order = (f: string) => {
        if (f === "/index.html" || f === "index.html") return 0;
        if (f.endsWith(".html")) return 1;
        if (f.startsWith("/css/") || f.endsWith(".css")) return 2;
        if (f.startsWith("/js/") || f.endsWith(".js")) return 3;
        return 4;
    };
    return [...files].sort((a, b) => order(a) - order(b));
}

export const SandboxViewer: React.FC<SandboxViewerProps> = ({ files, template }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [viewMode, setViewMode] = useState<"code" | "preview" | "split">("split");

    const detectedTemplate = useMemo(() => {
        if (template) return template;
        const fileNames = Object.keys(files);
        if (fileNames.some(f => f.endsWith(".html"))) return "static";
        if (fileNames.some(f => f.endsWith(".tsx") || f.endsWith(".jsx"))) return "react";
        return "static";
    }, [files, template]);

    const visibleFileKeys = useMemo(() => {
        const allFiles = Object.keys(files);
        const filtered = allFiles.filter(f => !HIDDEN_FILES.includes(f));
        return sortProjectFiles(filtered.length > 0 ? filtered : allFiles);
    }, [files]);

    const defaultActiveFile = useMemo(() => {
        if (visibleFileKeys.includes("/index.html")) return "/index.html";
        if (visibleFileKeys.includes("index.html")) return "index.html";
        const firstHtml = visibleFileKeys.find(f => f.endsWith(".html"));
        return firstHtml || visibleFileKeys[0] || "/index.html";
    }, [visibleFileKeys]);

    return (
        /* 
         * QUAN TRỌNG: width: 100% + overflow: hidden trên container ngoài cùng
         * để ngăn Sandbox tự mở rộng theo chiều rộng code.
         * Khi fullscreen: fixed inset-4 để chiếm toàn màn hình.
         */
        <div
            style={{
                width: "100%",
                maxWidth: "100%",
                height: isFullscreen ? "calc(100vh - 32px)" : "700px",
                position: isFullscreen ? "fixed" : "relative",
                inset: isFullscreen ? "16px" : undefined,
                zIndex: isFullscreen ? 50 : undefined,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",   // ← chặn sandbox tự mở rộng ngang
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                boxShadow: isFullscreen ? "0 25px 50px rgba(0,0,0,0.25)" : "0 1px 3px rgba(0,0,0,0.06)",
                marginTop: "16px",
                marginBottom: "16px",
                background: "#fff",
            }}
        >
            {/* CSS nội bộ: chỉ target CodeMirror scroller, KHÔNG set min-width trên cm-content */}
            <style>{`
                .sbx .sp-wrapper,
                .sbx .sp-layout { height: 100% !important; border: none !important; border-radius: 0 !important; }
                .sbx .sp-layout { display: flex !important; overflow: hidden !important; }
                .sbx .sp-stack { overflow: hidden !important; height: 100% !important; }
                .sbx .sp-code-editor { overflow: hidden !important; height: 100% !important; }
                /* CodeMirror 6: scroll ngang nội bộ không mở rộng container */
                .sbx .cm-editor { height: 100% !important; overflow: hidden !important; font-size: 13.5px; }
                .sbx .cm-scroller { overflow: auto !important; height: 100% !important; }
                .sbx .cm-gutters { position: sticky !important; left: 0 !important; z-index: 3 !important; background: #f8f9fb !important; }
                /* Preview */
                .sbx .sp-preview,
                .sbx .sp-preview-container { height: 100% !important; flex: 1 !important; overflow: hidden !important; }
                .sbx .sp-preview-iframe { height: 100% !important; }
                /* File explorer */
                .sbx .sp-file-explorer { height: 100% !important; overflow-y: auto !important; }
            `}</style>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", flexShrink: 0, height: "48px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {/* ... (các nút màu và title giữ nguyên) ... */}
                    <div style={{ display: "flex", gap: "4px" }}>
                        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f87171" }} />
                        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#fbbf24" }} />
                        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#34d399" }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" }}>Live Sandbox</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ display: "flex", background: "rgba(203,213,225,0.4)", padding: "4px", borderRadius: "8px" }}>
                        {[
                            { key: "code" as const, icon: <Code size={13} />, label: "Code" },
                            { key: "split" as const, icon: <Columns size={13} />, label: "Split", fullscreenNeeded: true },
                            { key: "preview" as const, icon: <Play size={13} />, label: "Preview", fullscreenNeeded: true },
                        ].map(({ key, icon, label, fullscreenNeeded }) => (
                            <button
                                key={key}
                                onClick={() => { setViewMode(key); if (fullscreenNeeded) setIsFullscreen(true); }}
                                style={{
                                    display: "flex", alignItems: "center", gap: "4px",
                                    padding: "4px 10px", fontSize: 12, fontWeight: 500, borderRadius: "6px",
                                    border: "none", cursor: "pointer", transition: "all 0.15s",
                                    background: viewMode === key ? "#fff" : "transparent",
                                    color: viewMode === key ? "#334155" : "#94a3b8",
                                    boxShadow: viewMode === key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                }}
                            >
                                {icon} {label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => { if (isFullscreen) { setViewMode("code"); setIsFullscreen(false); } else { setIsFullscreen(true); } }}
                        title={isFullscreen ? "Thu nhỏ" : "Phóng to"}
                        style={{ padding: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", borderRadius: "6px" }}
                    >
                        {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                    </button>
                </div>
            </div>

            {/* VÙNG CHỨA SANDBOX — Định vị absolute 4 góc để tránh flex resize bug */}
            <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
                <div className="sbx" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
                    <SandpackProvider
                        template={detectedTemplate}
                        theme="light"
                        files={files}
                        options={{
                            externalResources: [
                                "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css",
                                "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js",
                                "https://fonts.googleapis.com/icon?family=Material+Icons",
                                "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
                                "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
                            ],
                            visibleFiles: visibleFileKeys,
                            activeFile: defaultActiveFile,
                        }}
                    >
                        <SandpackLayout style={{ height: "100%", maxWidth: "100%" }}>
                            {/* File Explorer */}
                            {(viewMode === "code" || viewMode === "split") && (
                                <div style={{ width: viewMode === "split" ? 160 : 210, flexShrink: 0, height: "100%", borderRight: "1px solid #e2e8f0", overflow: "hidden" }}>
                                    <SandpackFileExplorer style={{ height: "100%" }} />
                                </div>
                            )}

                            {/* Code Editor: min-width:0 để flex không mở rộng ngang */}
                            {(viewMode === "code" || viewMode === "split") && (
                                <div style={{ flex: 1, minWidth: 0, height: "100%", overflow: "hidden" }}>
                                    <SandpackCodeEditor
                                        showTabs
                                        showLineNumbers
                                        showInlineErrors
                                        style={{ height: "100%", minWidth: 0 }}
                                    />
                                </div>
                            )}

                            {/* Preview */}
                            {(viewMode === "preview" || viewMode === "split") && (
                                <div style={{ flex: viewMode === "split" ? 1.5 : 1, minWidth: 0, height: "100%", overflow: "hidden" }}>
                                    <SandpackPreview
                                        showNavigator
                                        showRefreshButton
                                        showOpenInCodeSandbox
                                        style={{ height: "100%" }}
                                    />
                                </div>
                            )}
                        </SandpackLayout>
                    </SandpackProvider>
                </div>
            </div>
        </div>
    );
};
