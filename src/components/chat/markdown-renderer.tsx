import { useChatStore } from "@/store/chat-store";
import { CheckCircle2, ClipboardCopy } from "lucide-react";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import remarkGfm from "remark-gfm";
import { PythonRunner } from "./python-runner";
import { SandboxViewer } from "./sandbox-viewer";

interface MarkdownRendererProps {
    content: string;
}

function isCSSubject(name: string): boolean {
    const lower = name.toLowerCase();
    return ["computer science", "khoa học máy tính"].some(kw => lower.includes(kw));
}

/* ─── Static multi-file code viewer (CS + editor mode) ──────────── */
const PyProjectViewer: React.FC<{ files: { name: string; code: string }[] }> = ({ files }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const [copied, setCopied] = useState(false);
    const active = files[activeIdx] ?? files[0];

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(active?.code ?? "");
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* ignore */ }
    };

    return (
        <div className="relative rounded-xl overflow-hidden my-4 border border-gray-200 shadow-sm">
            <div className="flex bg-gray-800 text-gray-200 text-xs font-mono overflow-x-auto">
                <div className="flex flex-1 overflow-x-auto">
                    {files.map((f, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveIdx(i)}
                            className={`px-3 py-2 border-r border-gray-700 flex-shrink-0 transition-colors ${
                                i === activeIdx ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"
                            }`}
                        >
                            {f.name}
                        </button>
                    ))}
                </div>
                <button onClick={copy} className="px-4 py-2 flex items-center gap-1 hover:text-white transition-colors flex-shrink-0">
                    {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <ClipboardCopy size={14} />}
                    <span className={copied ? "text-green-400" : ""}>{copied ? "Copied!" : "Copy"}</span>
                </button>
            </div>
            <SyntaxHighlighter
                language="python"
                style={vscDarkPlus}
                customStyle={{ margin: 0, padding: "1rem", fontSize: "0.875rem", borderRadius: 0 }}
                showLineNumbers={true}
            >
                {active?.code ?? ""}
            </SyntaxHighlighter>
        </div>
    );
};

type ContentPart =
    | { type: "markdown"; content: string }
    | { type: "sandbox"; files: Record<string, string> }
    | { type: "python"; code: string; stdin?: string }
    | { type: "pyproject"; files: { name: string; code: string }[]; stdin?: string }
    | { type: "notebook"; cells: { type: "markdown" | "code"; source: string }[] };

function parseNotebookCells(raw: string): { type: "markdown" | "code"; source: string }[] {
    const cells: { type: "markdown" | "code"; source: string }[] = [];
    const cellRegex = /<cell\s+type="(markdown|code)"[^>]*>([\s\S]*?)(?:<\/cell>|$)/g;
    let m;
    while ((m = cellRegex.exec(raw)) !== null) {
        cells.push({ type: m[1] as "markdown" | "code", source: m[2].trim() });
    }
    return cells;
}

const parseContent = (text: string): ContentPart[] => {
    const parts: ContentPart[] = [];
    // Match <project>, <python> (with optional <stdin>), <pyproject> (with optional <stdin>), <notebook> blocks
    const blockRegex = /(<project>[\s\S]*?(?:<\/project>|$))|(<python>([\s\S]*?)(?:<\/python>|$)\s*(?:<stdin>([\s\S]*?)(?:<\/stdin>|$))?)|(<pyproject>([\s\S]*?)(?:<\/pyproject>|$)\s*(?:<stdin>([\s\S]*?)(?:<\/stdin>|$))?)|(<notebook>([\s\S]*?)(?:<\/notebook>|$))/g;
    let lastIndex = 0;
    let match;

    while ((match = blockRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ type: "markdown", content: text.slice(lastIndex, match.index) });
        }

        if (match[1] !== undefined) {
            // <project> block
            const projectContent = match[1].replace(/^<project>/, "").replace(/<\/project>$/, "");
            const files: Record<string, string> = {};
            const fileRegex = /<file name="([^"]+)">([\s\S]*?)(?:<\/file>|$)/g;
            let fileMatch;
            while ((fileMatch = fileRegex.exec(projectContent)) !== null) {
                let rawName = fileMatch[1] || "index.html";
                const fileName = rawName.startsWith("/") ? rawName : `/${rawName}`;
                files[fileName] = fileMatch[2] ?? "";
            }
            parts.push({ type: "sandbox", files });
        } else if (match[2] !== undefined) {
            // <python> block (+ optional <stdin>)
            parts.push({ type: "python", code: (match[3] ?? "").trim(), stdin: match[4] ? match[4].trim() : undefined });
        } else if (match[5] !== undefined) {
            // <pyproject> multi-file block (+ optional <stdin>)
            const pyFiles: { name: string; code: string }[] = [];
            const fileRegex2 = /<file name="([^"]+)">([\s\S]*?)(?:<\/file>|$)/g;
            let fm;
            while ((fm = fileRegex2.exec(match[6] ?? "")) !== null) {
                pyFiles.push({ name: fm[1].replace(/^\//, ""), code: fm[2].trim() });
            }
            if (pyFiles.length > 0) parts.push({ type: "pyproject", files: pyFiles, stdin: match[7] ? match[7].trim() : undefined });
        } else if (match[8] !== undefined) {
            // <notebook> block
            const cells = parseNotebookCells(match[9] ?? "");
            if (cells.length > 0) parts.push({ type: "notebook", cells });
        }

        lastIndex = blockRegex.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push({ type: "markdown", content: text.slice(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: "markdown", content: text }];
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    const parts = parseContent(content);
    const { selectedSubjectId, subjects } = useChatStore();
    const subjectName = subjects.find(s => s.id === selectedSubjectId)?.name ?? "";

    return (
        <div className="w-full">
            {parts.map((part, index) => {
                if (part.type === "python") {
                    return <PythonRunner key={index} initialCode={part.code} initialStdin={part.stdin} />;
                }

                if (part.type === "pyproject") {
                    return <PythonRunner key={index} initialFiles={part.files} initialStdin={part.stdin} />;
                }

                if (part.type === "notebook") {
                    return <PythonRunner key={`nb-${index}-c${part.cells.length}`} initialCells={part.cells} />;
                }

                if (part.type === "sandbox") {
                    const sandboxFiles = part.files;
                    return Object.keys(sandboxFiles).length > 0 ? (
                        <SandboxViewer key={index} files={sandboxFiles} />
                    ) : (
                        <div key={index} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm animate-pulse flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
                            Khởi tạo môi trường lập trình...
                        </div>
                    );
                }

                // markdown part
                const mdContent = part.content;
                return (
                    <div key={index} className="prose prose-p:text-gray-700 prose-headings:font-display prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-img:rounded-xl max-w-none break-words text-[15px] leading-[1.75] w-full">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code({ node, inline, className, children, ...props }: any) {
                                    const match = /language-(\w+)/.exec(className || "");
                                    const language = match ? match[1] : "";

                                    return !inline && match ? (
                                        <CodeBlock language={language} value={String(children).replace(/\n$/, "")} />
                                    ) : (
                                        <code
                                            className="bg-gray-200 border border-gray-300/50 rounded-md px-[0.4rem] py-[0.15rem] font-mono text-[0.85em] text-orange-600 font-medium"
                                            {...props}
                                        >
                                            {children}
                                        </code>
                                    );
                                },
                                ul: ({ children }) => <ul className="list-none pl-2 my-4 space-y-2 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-blue-200 before:to-purple-200">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-5 my-4 space-y-2 text-gray-700 marker:text-blue-500 marker:font-semibold">{children}</ol>,
                                li: ({ children }) => (
                                    <li className="relative pl-6 leading-relaxed mb-2 before:content-[''] before:absolute before:left-[-2px] before:top-[0.6em] before:w-2 before:h-2 before:rounded-full before:bg-blue-400 before:-translate-x-1/2 before:shadow-[0_0_8px_rgba(96,165,250,0.6)]">
                                        <span className="text-gray-700">{children}</span>
                                    </li>
                                ),
                                h1: ({ children }) => <h1 className="text-2xl sm:text-3xl font-extrabold mt-8 mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-xl sm:text-2xl font-bold mt-6 mb-3 text-gray-800 border-b border-gray-100 pb-2">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-lg font-semibold mt-5 mb-2 text-gray-800 flex items-center gap-2 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-blue-500">{children}</h3>,
                                p: ({ children }) => <p className="my-3 text-gray-700 leading-[1.8]">{children}</p>,
                                blockquote: ({ children }) => (
                                    <blockquote className="relative overflow-hidden pl-5 pr-4 py-3 my-5 bg-gradient-to-r from-blue-50/80 to-indigo-50/30 border-l-4 border-blue-500 rounded-r-xl italic text-gray-700 shadow-sm">
                                        <div className="absolute top-0 left-0 w-8 h-8 opacity-10 text-blue-600">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
                                        </div>
                                        <span className="relative z-10">{children}</span>
                                    </blockquote>
                                ),
                                strong: ({ children }) => <strong className="font-semibold text-gray-900 bg-yellow-50/50 px-1 rounded">{children}</strong>,
                                table: ({ children }) => (
                                    <div className="overflow-x-auto my-6 rounded-xl border border-gray-200 shadow-sm ring-1 ring-black/5">
                                        <table className="min-w-full divide-y divide-gray-200">{children}</table>
                                    </div>
                                ),
                                thead: ({ children }) => <thead className="bg-gray-50/80">{children}</thead>,
                                th: ({ children }) => (
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        {children}
                                    </th>
                                ),
                                tbody: ({ children }) => <tbody className="bg-white divide-y divide-gray-100">{children}</tbody>,
                                tr: ({ children }) => <tr className="hover:bg-blue-50/30 transition-colors">{children}</tr>,
                                td: ({ children }) => <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-700">{children}</td>,
                            }}
                        >
                            {mdContent}
                        </ReactMarkdown>
                    </div>
                );
            })}
        </div>
    );
};

const CodeBlock = ({ language, value }: { language: string; value: string }) => {
    const [isCopied, setIsCopied] = useState(false);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy text: ", err);
        }
    };

    return (
        <div className="relative group rounded-xl overflow-hidden my-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-200 text-xs font-mono">
                <span>{language || "code"}</span>
                <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 hover:text-white transition-colors focus:outline-none"
                    title="Copy code"
                >
                    {isCopied ? (
                        <>
                            <CheckCircle2 size={14} className="text-green-400" />
                            <span className="text-green-400">Copied!</span>
                        </>
                    ) : (
                        <>
                            <ClipboardCopy size={14} />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>
            <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                customStyle={{
                    margin: 0,
                    padding: "1rem",
                    fontSize: "0.875rem",
                    borderRadius: "0 0 0.75rem 0.75rem",
                }}
                showLineNumbers={true}
            >
                {value}
            </SyntaxHighlighter>
        </div>
    );
};
