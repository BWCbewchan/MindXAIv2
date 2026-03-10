"use client";

import { ApiKeyManager } from "@/components/admin/api-key-manager";
import { ApiLoadMonitor } from "@/components/admin/api-load-monitor";
import { DocumentUploader } from "@/components/admin/document-uploader";
import { KnowledgeManager } from "@/components/admin/knowledge-manager";
import { StatisticsDashboard } from "@/components/admin/statistics-dashboard";
import { useSearchParams } from "next/navigation";

export const SearchParamsContext = () => {
    const searchParams = useSearchParams();
    const tab = searchParams.get("tab") || "stats";

    return (
        <div className="animate-fade-in">
            {tab === "stats" && <StatisticsDashboard />}
            {tab === "knowledge" && <KnowledgeManager />}
            {tab === "upload" && <DocumentUploader />}
            {tab === "apikeys" && <ApiKeyManager />}
            {tab === "monitor" && <ApiLoadMonitor />}
        </div>
    );
};
