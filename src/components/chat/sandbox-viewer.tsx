import {
    SandpackCodeEditor,
    SandpackFileExplorer,
    SandpackLayout,
    SandpackPreview,
    SandpackProvider,
} from "@codesandbox/sandpack-react";
import { Code, Columns, Maximize2, Minimize2, Play } from "lucide-react";
import React, { useState } from "react";

interface SandboxViewerProps {
    files: Record<string, string>;
    template?: "react" | "vanilla" | "vue" | "angular" | "svelte";
}

export const SandboxViewer: React.FC<SandboxViewerProps> = ({ files, template = "react" }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [viewMode, setViewMode] = useState<"code" | "preview" | "split">("split");

    return (
        <div className={`mt-4 mb-4 rounded-xl overflow-hidden border border-gray-200 shadow-sm transition-all duration-300 flex flex-col ${!isFullscreen && "shrink-0"} ${isFullscreen ? "fixed inset-4 z-50 bg-white shadow-2xl" : "relative w-full"}`} style={{ height: isFullscreen ? "calc(100vh - 80px)" : "700px" }}>

            <style>{`
                .custom-sandpack .sp-wrapper { height: 100% !important; min-height: 100% !important; }
                .custom-sandpack .sp-layout { height: 100% !important; min-height: 100% !important; border: none !important; border-radius: 0 !important; background: transparent; display: flex !important; }
                .custom-sandpack .sp-stack { height: 100% !important; min-height: 100% !important; display: flex; flex-direction: column; }
                .custom-sandpack .sp-code-editor { height: 100% !important; flex: 1; }
                .custom-sandpack .sp-preview { height: 100% !important; flex: 1; display: flex; flex-direction: column; }
                .custom-sandpack .sp-preview-container { height: 100% !important; flex: 1; background: #fff; }
                .custom-sandpack .sp-preview-iframe { height: 100% !important; min-height: 100% !important; }
                .custom-sandpack .cm-editor { font-size: 14px; }
            `}</style>

            {/* Header / Controls */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-gray-200 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                    </div>
                    <span className="ml-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Sandbox</span>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-200/50 p-1 rounded-lg">
                        <button
                            onClick={() => {
                                setViewMode("code");
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === "code" ? "bg-white text-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            <Code size={14} /> Code
                        </button>
                        <button
                            onClick={() => {
                                setViewMode("split");
                                setIsFullscreen(true);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all hidden sm:flex ${viewMode === "split" ? "bg-white text-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            <Columns size={14} /> Split
                        </button>
                        <button
                            onClick={() => {
                                setViewMode("preview");
                                setIsFullscreen(true);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === "preview" ? "bg-white text-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            <Play size={14} /> Preview
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            if (isFullscreen) {
                                // Exiting fullscreen -> force raw code view
                                setViewMode("code");
                                setIsFullscreen(false);
                            } else {
                                setIsFullscreen(true);
                            }
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors ml-2"
                        title={isFullscreen ? "Thu nhỏ" : "Phóng to"}
                    >
                        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                </div>
            </div>

            {/* Sandpack Area */}
            <div className={`bg-white custom-sandpack relative ${!isFullscreen && "shrink-0"}`} style={{ height: isFullscreen ? "calc(100vh - 80px)" : "700px" }}>
                <SandpackProvider
                    template={template}
                    theme="light"
                    files={files}
                    customSetup={{
                        dependencies: {
                            "lucide-react": "latest",
                            "recharts": "latest",
                            "framer-motion": "latest",
                            "clsx": "latest",
                            "tailwind-merge": "latest",
                        }
                    }}
                    options={{
                        externalResources: ["https://cdn.tailwindcss.com"],
                    }}
                >
                    <SandpackLayout className="flex w-full h-full min-h-full">
                        <div style={{ display: (viewMode === "code" || viewMode === "split") ? "flex" : "none", width: viewMode === "split" ? "180px" : "250px", flexDirection: "column", height: "100%" }} className="shrink-0 border-r border-gray-200">
                            <SandpackFileExplorer className="!h-full w-full" />
                        </div>

                        <div style={{ display: (viewMode === "code" || viewMode === "split") ? "flex" : "none", flex: viewMode === "split" ? 1 : 1, height: "100%", flexDirection: "column" }}>
                            <SandpackCodeEditor
                                showTabs
                                showLineNumbers
                                showInlineErrors
                                wrapContent
                                style={{ flex: 1, height: "100%" }}
                            />
                        </div>

                        <div style={{ display: (viewMode === "preview" || viewMode === "split") ? "flex" : "none", flex: viewMode === "split" ? 1.5 : 1, height: "100%", flexDirection: "column" }} className={viewMode === "split" ? "border-l border-gray-200" : ""}>
                            <SandpackPreview
                                showNavigator={true}
                                showRefreshButton={true}
                                showOpenInCodeSandbox={true}
                                style={{ flex: 1, height: "100%" }}
                            />
                        </div>
                    </SandpackLayout>
                </SandpackProvider>
            </div>
        </div>
    );
};
