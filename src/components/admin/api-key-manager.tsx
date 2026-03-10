"use client";

import { AlertTriangle, Info, Key, Plus, Power, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";

interface ApiKey {
    id: string;
    key_name: string;
    api_key_display: string;
    is_active: boolean;
    total_requests: number;
    failed_requests: number;
    daily_limit: number;
    created_at: string;
}

export const ApiKeyManager = () => {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [newKey, setNewKey] = useState("");
    const [newLimit, setNewLimit] = useState(1000);

    const fetchKeys = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/api-keys");
            const data = await res.json();
            if (!data.error) setKeys(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKey) return;

        try {
            const res = await fetch("/api/api-keys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key_name: newName,
                    api_key: newKey,
                    daily_limit: newLimit,
                }),
            });

            if (res.ok) {
                setIsAdding(false);
                setNewName("");
                setNewKey("");
                fetchKeys();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleToggle = async (id: string, currentStatus: boolean) => {
        try {
            await fetch("/api/api-keys", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, is_active: !currentStatus }),
            });
            fetchKeys();
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa API Key này?")) return;
        try {
            await fetch(`/api/api-keys?id=${id}`, { method: "DELETE" });
            fetchKeys();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Key size={20} className="text-orange-500" /> Quản lý Gemini API Keys
                </h2>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-100 transition-colors"
                >
                    <Plus size={18} /> Thêm Key mới
                </button>
            </div>

            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg mb-6 flex items-start gap-3 text-sm">
                <Info size={20} className="flex-shrink-0 mt-0.5 text-blue-500" />
                <p>Hệ thống hỗ trợ <strong>Multiple API Keys</strong>. Khi một key hết quota, hệ thống sẽ tự động chuyển sang key khác. Các key lỗi quá nhiều sẽ tự động bị tắt (Deactivated).</p>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 space-y-4">
                    <h3 className="font-semibold text-gray-700">Thêm API Key mới</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Tên gợi nhớ (Tùy chọn)</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Ví dụ: Dev Key 1"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Giới hạn request / ngày</label>
                            <input
                                type="number"
                                value={newLimit}
                                onChange={(e) => setNewLimit(Number(e.target.value))}
                                min={10}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Google Gemini API Key *</label>
                        <input
                            type="password"
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                            placeholder="AIzaSy..."
                            required
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md">Hủy</button>
                        <button type="submit" className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm">Lưu Key</button>
                    </div>
                </form>
            )}

            {isLoading ? (
                <div className="text-center py-10 text-gray-500 flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4" />
                    Đang tải...
                </div>
            ) : keys.length === 0 ? (
                <div className="text-center py-10 bg-orange-50 rounded-xl border border-orange-100 text-orange-800 flex items-center justify-center flex-col gap-2">
                    <AlertTriangle size={32} className="text-orange-400" />
                    <p className="font-semibold">Chưa có API Key nào!</p>
                    <p className="text-sm">Hệ thống cần ít nhất 1 khóa API Gemini để hoạt động.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 rounded-tl-lg">Tên / API Key</th>
                                <th className="px-4 py-3">Trạng thái</th>
                                <th className="px-4 py-3">Sử dụng (Thành công / Lỗi)</th>
                                <th className="px-4 py-3">Giới hạn/Ngày</th>
                                <th className="px-4 py-3 text-right rounded-tr-lg">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {keys.map((key) => {
                                const isWarningError = key.failed_requests > key.total_requests * 0.1 && key.total_requests > 10;

                                return (
                                    <tr key={key.id} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-gray-800">{key.key_name}</p>
                                            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded text-gray-500 font-mono">
                                                {key.api_key_display}
                                            </code>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${key.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${key.is_active ? "bg-green-500" : "bg-red-500"}`}></span>
                                                {key.is_active ? "Active" : "Deactivated"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-medium text-gray-800">{key.total_requests} rqs</span>
                                                {key.failed_requests > 0 && (
                                                    <span className={`text-xs ${isWarningError ? 'text-red-500 font-bold' : 'text-orange-500'}`}>
                                                        {key.failed_requests} lỗi ( {Math.round((key.failed_requests / key.total_requests) * 100)}% )
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{key.daily_limit}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleToggle(key.id, key.is_active)}
                                                    className={`p-1.5 rounded-lg transition-colors ${key.is_active ? "text-orange-500 hover:bg-orange-50" : "text-green-500 hover:bg-green-50"
                                                        }`}
                                                    title={key.is_active ? "Tạm dừng" : "Kích hoạt"}
                                                >
                                                    <Power size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(key.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Xóa Key"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
