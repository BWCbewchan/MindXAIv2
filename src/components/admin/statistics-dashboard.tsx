"use client";

import { BookOpen, Clock, MessageSquare, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const StatisticsDashboard = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/stats")
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-10 flex justify-center"><div className="w-8 h-8 border-4 border border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
    if (!stats) return <div className="p-10 text-center text-red-500">Failed to load statistics</div>;

    const COLORS = ['#6C9BD2', '#9B72CF', '#4ECDC4', '#F4A261', '#FF6B6B'];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-800 mb-6">Thống kê chi tiết Hệ thống</h2>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="bg-blue-50 p-4 rounded-full text-blue-500"><MessageSquare size={28} /></div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase">Tổng Tin Nhắn</p>
                        <h3 className="text-3xl font-bold text-gray-800">{stats.overview.total_messages}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="bg-purple-50 p-4 rounded-full text-purple-500"><Users size={28} /></div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase">Tổng Phiên Chat</p>
                        <h3 className="text-3xl font-bold text-gray-800">{stats.overview.total_chats}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="bg-green-50 p-4 rounded-full text-green-500"><BookOpen size={28} /></div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase">Dữ liệu Kiến thức</p>
                        <h3 className="text-3xl font-bold text-gray-800">{stats.overview.total_knowledge_entries}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="bg-orange-50 p-4 rounded-full text-orange-500"><Clock size={28} /></div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase">Tin nhắn H.nay</p>
                        <h3 className="text-3xl font-bold text-gray-800">{stats.overview.messages_today}</h3>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Messages per subject */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Môn học được hỏi nhiều nhất</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.subject_popularity} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                                <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="message_count" name="Số tin nhắn" radius={[0, 4, 4, 0]}>
                                    {stats.subject_popularity.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tokens used per subject */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Lượng Token xử lý theo môn học</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.subject_popularity}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="avg_tokens"
                                    nameKey="name"
                                    label={({ name, percent }: { name?: string, percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                                >
                                    {stats.subject_popularity.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px' }} formatter={(value) => `${Math.round(Number(value))} tokens/tin`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Biểu đồ nhắn tin 7 ngày gần nhất</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.time_series} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} />
                            <YAxis />
                            <Tooltip
                                labelFormatter={(label) => new Date(label).toLocaleDateString('vi-VN')}
                                contentStyle={{ borderRadius: '8px' }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="messages" name="Tổng tin nhắn" stroke="#6C9BD2" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="new_chats" name="Phiên chat mới" stroke="#F4A261" strokeWidth={3} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
