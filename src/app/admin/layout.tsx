import { Activity, BarChart4, BookOpen, Key, Upload } from "lucide-react";
import Link from "next/link";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-gray-50 flex-col md:flex-row">
            <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0">
                <div className="p-4 border-b border-gray-100">
                    <h1 className="text-xl font-bold font-display text-gray-800 tracking-tight">AI4Student Admin</h1>
                </div>
                <nav className="p-4 space-y-1">
                    <Link href="/admin" className="flex items-center gap-3 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium">
                        <BarChart4 size={18} /> Giao diện chính
                    </Link>
                    <div className="pt-4 pb-2">
                        <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Quản lý</p>
                    </div>
                    <Link href="/admin?tab=knowledge" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg font-medium transition-colors">
                        <BookOpen size={18} /> Kiến thức môn học
                    </Link>
                    <Link href="/admin?tab=upload" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg font-medium transition-colors">
                        <Upload size={18} /> Tải lên tài liệu
                    </Link>
                    <div className="pt-4 pb-2">
                        <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Hệ thống</p>
                    </div>
                    <Link href="/admin?tab=apikeys" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg font-medium transition-colors">
                        <Key size={18} /> Quản lý API Keys
                    </Link>
                    <Link href="/admin?tab=monitor" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg font-medium transition-colors">
                        <Activity size={18} /> API Load Monitor
                    </Link>
                </nav>
            </aside>
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
