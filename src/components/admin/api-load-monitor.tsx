"use client";

import { Activity, AlertTriangle, CheckCircle, Clock, Zap } from "lucide-react";
import { useEffect, useState } from "react";

export const ApiLoadMonitor = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/api-usage");
                const json = await res.json();
                setData(json);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 30000); // refresh every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading && !data) {
        return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu server...</div>;
    }

    if (!data || !data.totals) {
        return <div className="p-8 text-center text-red-500">Lấy dữ liệu thất bại.</div>;
    }

    const { totals, keyStats, recentErrors } = data;

    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 border-l-4 border-l-blue-500">
                    <div className="bg-blue-50 p-3 rounded-lg text-blue-500"><Zap size={24} /></div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Requests Hôm nay</p>
                        <h3 className="text-2xl font-bold font-display text-gray-800">{totals.total_requests_today}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 border-l-4 border-l-green-500">
                    <div className="bg-green-50 p-3 rounded-lg text-green-500"><CheckCircle size={24} /></div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Tỷ lệ thành công</p>
                        <h3 className="text-2xl font-bold font-display text-gray-800">{totals.overall_success_rate}%</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 border-l-4 border-l-purple-500">
                    <div className="bg-purple-50 p-3 rounded-lg text-purple-500"><Clock size={24} /></div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Tg phản hồi TB</p>
                        <h3 className="text-2xl font-bold font-display text-gray-800">{totals.avg_response_time} <span className="text-sm font-medium text-gray-500">ms</span></h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 border-l-4 border-l-orange-500">
                    <div className="bg-orange-50 p-3 rounded-lg text-orange-500"><Activity size={24} /></div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">API Keys Active</p>
                        <h3 className="text-2xl font-bold font-display text-gray-800">{totals.active_keys} <span className="text-sm font-medium text-gray-500">/ {totals.total_keys}</span></h3>
                    </div>
                </div>
            </div>

            {/* Key breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    Chi tiết từng API Key (Hôm nay)
                </h2>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 rounded-tl-lg">API Key</th>
                                <th className="px-4 py-3">Reqs / Giới hạn</th>
                                <th className="px-4 py-3">Health Score</th>
                                <th className="px-4 py-3">Error Rate</th>
                                <th className="px-4 py-3 text-right rounded-tr-lg">Avg Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {keyStats.map((key: any) => {
                                const isNearingQuota = key.remaining_quota < key.daily_limit * 0.1;
                                const isSick = key.health_score < 70;

                                return (
                                    <tr key={key.id} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-800">
                                            {key.key_name}
                                            {!key.is_active && <span className="ml-2 text-xs text-red-500 font-normal border border-red-200 px-1 rounded bg-red-50">Inactive</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span>{key.today_requests} / {key.daily_limit}</span>
                                                {isNearingQuota && key.is_active && (
                                                    <span title="Sắp hết Quota">
                                                        <AlertTriangle size={14} className="text-orange-500" />
                                                    </span>
                                                )}
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                                <div
                                                    className={`h-1.5 rounded-full ${isNearingQuota ? 'bg-orange-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${Math.min((key.today_requests / key.daily_limit) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded font-bold text-xs ${key.health_score > 90 ? 'text-green-700 bg-green-100' :
                                                key.health_score > 70 ? 'text-yellow-700 bg-yellow-100' : 'text-red-700 bg-red-100'
                                                }`}>
                                                {key.health_score}/100
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={key.today_errors > 0 ? "text-red-500 font-medium" : "text-gray-400"}>
                                                {key.today_errors} lỗi ({100 - key.success_rate}%)
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono">
                                            {key.avg_response_time > 0 ? `${key.avg_response_time}ms` : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                            {keyStats.length === 0 && (
                                <tr><td colSpan={5} className="py-8 text-center text-gray-500">Không có dữ liệu</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Error Logs */}
            {recentErrors && recentErrors.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <AlertTriangle size={20} className="text-red-500" /> Chi tiết Lỗi Hệ thống (Recent Errors)
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg whitespace-nowrap">Thời gian</th>
                                    <th className="px-4 py-3 whitespace-nowrap">API Key</th>
                                    <th className="px-4 py-3 w-full rounded-tr-lg">Thông báo lỗi (Error Message)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentErrors.map((err: any) => (
                                    <tr key={err.id} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                                            {new Date(err.timestamp).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-700">
                                            {err.key_name}
                                        </td>
                                        <td className="px-4 py-3 text-red-600 font-mono text-xs break-words break-all max-w-2xl">
                                            {err.error_message}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
