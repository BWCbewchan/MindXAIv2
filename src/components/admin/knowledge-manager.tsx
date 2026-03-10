"use client";

import { BookOpen, Edit2, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Knowledge {
    id: string;
    title: string;
    subject_name: string;
    content: string;
    source_type: string;
    created_at: string;
    subject_id: string;
    is_active: boolean;
}

interface Subject {
    id: string;
    name: string;
}

export const KnowledgeManager = () => {
    const [data, setData] = useState<Knowledge[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterSubject, setFilterSubject] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            const [knowRes, subRes] = await Promise.all([
                fetch("/api/knowledge" + (filterSubject !== "all" ? `?subject_id=${filterSubject}` : "")),
                fetch("/api/subjects")
            ]);
            const knowData = await knowRes.json();
            const subData = await subRes.json();
            if (!knowData.error) setData(knowData);
            if (!subData.error) setSubjects(subData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filterSubject]);

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa kiến thức này?")) return;
        try {
            await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" });
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const filteredData = data.filter(item =>
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content?.substring(0, 100).toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <BookOpen size={20} className="text-blue-500" /> Quản lý hệ thống kiến thức
                </h2>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <select
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 max-w-xs"
                    >
                        <option value="all">Tất cả môn học</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>

                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-500"><div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />Đang tải...</div>
            ) : filteredData.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl text-gray-500">Chưa có dữ liệu kiến thức nào.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 rounded-tl-lg">Tiêu đề / Trích đoạn</th>
                                <th className="px-4 py-3">Môn học</th>
                                <th className="px-4 py-3">Nguồn</th>
                                <th className="px-4 py-3">Ngày tạo</th>
                                <th className="px-4 py-3 text-right rounded-tr-lg">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((item) => (
                                <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="px-4 py-3 max-w-xs">
                                        <p className="font-semibold text-gray-800 truncate">{item.title || "Không có tiêu đề"}</p>
                                        <p className="text-xs text-gray-500 truncate">{item.content.substring(0, 80)}...</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {item.subject_name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 uppercase text-xs font-bold text-gray-400">{item.source_type}</td>
                                    <td className="px-4 py-3 text-xs">{new Date(item.created_at).toLocaleDateString("vi-VN")}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Chỉnh sửa">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa dữ liệu">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
