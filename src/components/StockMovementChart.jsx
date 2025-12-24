'use client';
import React, { useEffect, useState, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { BarChart2, PieChart as PieChartIcon, TrendingUp, RefreshCcw } from 'lucide-react';
import api from '@/lib/axios';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const InventoryDashboard = () => {
    const [movementData, setMovementData] = useState([]);
    const [pieData, setPieData] = useState([]);
    const [trendData, setTrendData] = useState([]);
    const [dateRange, setDateRange] = useState('7d');
    const [loading, setLoading] = useState(false);

    // ✅ ฟังก์ชันดึงข้อมูล (แก้ไข Bug `${dateRange}` และ URL แล้ว)
    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            // ใช้เครื่องหมาย ` (Backticks) แทน ' (Single Quote) เพื่อให้ตัวแปรทำงานได้
            const [movementRes, distributionRes, trendRes] = await Promise.all([
                api.get(`/api/stats/movement?range=${dateRange}`),
                api.get('/api/stats/distribution'),
                api.get(`/api/stats/trend?range=${dateRange}`)
            ]);

            setMovementData(movementRes.data);
            setPieData(distributionRes.data);
            setTrendData(trendRes.data);
        } catch (err) {
            console.error("❌ Error fetching dashboard data:", err);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    return (
        <div className="space-y-6 p-4 md:p-6 bg-gray-50 min-h-screen">

            {/* Header Section */}
            <div className="flex justify-between items-center">
                <h1 className="text-xl md:text-2xl font-black text-gray-800">แดชบอร์ดสถิติรายการสินค้า</h1>
                <button
                    onClick={fetchDashboardData}
                    className="p-2 hover:bg-white rounded-full transition-all text-gray-400 hover:text-blue-500 shadow-sm"
                >
                    <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* --- Section 1: Main Charts (Bar & Pie) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

                {/* Chart 1.1: Movement Bar Chart (จำนวนรายการ) */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                        <h2 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2">
                            <BarChart2 size={18} className="text-blue-500" />
                            รายการเคลื่อนไหว (รับเข้า - เบิกออก)
                        </h2>
                        <div className="flex bg-gray-100 p-1 rounded-xl self-end sm:self-auto">
                            <button
                                onClick={() => setDateRange('7d')}
                                className={`px-4 py-1 text-xs md:text-sm rounded-lg transition-all ${dateRange === '7d' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500'}`}
                            >
                                7 วัน
                            </button>
                            <button
                                onClick={() => setDateRange('30d')}
                                className={`px-4 py-1 text-xs md:text-sm rounded-lg transition-all ${dateRange === '30d' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500'}`}
                            >
                                30 วัน
                            </button>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={movementData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                    stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} dy={10}
                                />
                                <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#F9FAFB' }}
                                    formatter={(value) => [`${value} รายการ`]}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}
                                />
                                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
                                <Bar dataKey="stock_in" name="รายการรับเข้า" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="stock_out" name="รายการเบิกออก" fill="#F43F5E" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 1.2: Distribution Pie Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-8">
                    <div className="flex items-center gap-2 mb-6">
                        <PieChartIcon size={18} className="text-purple-500" />
                        <h2 className="text-base md:text-lg font-bold text-gray-800">สัดส่วนตามคลัง (รายการ)</h2>
                    </div>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        {pieData && pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%" cy="45%"
                                        innerRadius={60} outerRadius={85}
                                        paddingAngle={5}
                                        dataKey="value" nameKey="label"
                                    >
                                        {pieData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => [`${value} รายการ`]}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}
                                    />
                                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-gray-400 text-sm flex flex-col items-center opacity-40">
                                <PieChartIcon size={48} className="mb-2" />
                                <span>ไม่มีข้อมูลรายการ</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- Section 2: Trend Area Chart (แนวโน้มสะสม) --- */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
                <div className="flex items-center gap-2 mb-6">
                    <TrendingUp size={18} className="text-indigo-500" />
                    <h2 className="text-base md:text-lg font-bold text-gray-800">แนวโน้มจำนวนรายการสินค้าสะสม</h2>
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(val) => new Date(val).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                axisLine={false} tickLine={false}
                            />
                            <YAxis hide />
                            <Tooltip
                                formatter={(value) => [`${value} รายการ`, 'รวมรายการสะสม']}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="total"
                                stroke="#6366F1" strokeWidth={3}
                                fillOpacity={1} fill="url(#colorTotal)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default InventoryDashboard;