"use client";

import { ArrowLeft, ArrowRight, BookOpen, Globe, Terminal } from "lucide-react";
import Link from "next/link";

const TOOLS = [
    {
        slug: "python",
        label: "Python Script",
        Icon: Terminal,
        desc: "Viết và chạy Python với Pyodide — hỗ trợ numpy, matplotlib, pandas, scipy, sympy.",
        color: "#3b82f6",
        border: "rgba(59,130,246,.35)",
    },
    {
        slug: "notebook",
        label: "Jupyter Notebook",
        Icon: BookOpen,
        desc: "Notebook kiểu Jupyter — chia cell code / markdown, chạy từng cell, xem biểu đồ inline.",
        color: "#f97316",
        border: "rgba(249,115,22,.35)",
    },
    {
        slug: "sandbox",
        label: "Web Sandbox",
        Icon: Globe,
        desc: "Editor HTML + CSS + JS với live preview — dựa trên CodeSandbox Sandpack.",
        color: "#22c55e",
        border: "rgba(34,197,94,.35)",
    },
];

export default function IdePage() {
    return (
        <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
            padding: "40px 24px",
            fontFamily: "var(--font-display, Nunito, sans-serif)",
        }}>
            <div style={{ textAlign: "center" }}>
                <h1 style={{ fontSize: 32, fontWeight: 800, color: "#cdd6f4", margin: 0, letterSpacing: "-0.03em" }}>
                    IDE Trực Tuyến
                </h1>
                <p style={{ marginTop: 10, fontSize: 15, color: "#6c7086" }}>
                    Chọn công cụ để bắt đầu code
                </p>
            </div>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 20,
                width: "100%",
                maxWidth: 800,
            }}>
                {TOOLS.map(tool => (
                    <Link key={tool.slug} href={`/ide/${tool.slug}`} style={{ textDecoration: "none" }}>
                        <div style={{
                            background: "#1e1e2e",
                            border: `1px solid ${tool.border}`,
                            borderRadius: 14,
                            padding: "24px 22px",
                            cursor: "pointer",
                            transition: "transform .15s, box-shadow .15s",
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                        }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
                                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${tool.border}`;
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                            }}
                        >
                            <tool.Icon size={36} color={tool.color} />
                            <div>
                                <div style={{ fontSize: 17, fontWeight: 700, color: tool.color, marginBottom: 6 }}>
                                    {tool.label}
                                </div>
                                <div style={{ fontSize: 13, color: "#9399b2", lineHeight: 1.55 }}>
                                    {tool.desc}
                                </div>
                            </div>
                            <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: tool.color, fontWeight: 600 }}>
                                Mở IDE <ArrowRight size={12} />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <Link href="/" style={{ fontSize: 13, color: "#45475a", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <ArrowLeft size={13} /> Quay lại trang chính
            </Link>
        </div>
    );
}
