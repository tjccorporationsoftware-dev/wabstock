'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/axios';
import { Package, AlertTriangle, Layers, Box, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ✅ ใช้ตัวแปรนี้เป็น Master List ของหมวดหมู่ทั้งหมด
const CATEGORY_COLORS = {
    'เครื่องมือแพทย์': 'bg-blue-100 text-blue-600',
    'อุปกรณ์ไฟฟ้า': 'bg-yellow-100 text-yellow-600',
    'อุปกรณ์คอมพิวเตอร์': 'bg-purple-100 text-purple-600',
    'ครุภัณฑ์': 'bg-teal-100 text-teal-600',
};

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [movementData, setMovementData] = useState([]);
    const [dateRange, setDateRange] = useState('7d');

    useEffect(() => {
        api.get('/dashboard').then(res => setStats(res.data)).catch(err => console.error(err));
    }, []);

    useEffect(() => {
        api.get(`/stats/movement?range=${dateRange}`)
            .then(res => setMovementData(res.data))
            .catch(err => console.error(err));
    }, [dateRange]);

    return (
        <div className="flex bg-gray-50 min-h-screen">
            <Sidebar />
            <div className="flex-1 p-8 space-y-8">

                {/* Header Section */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">ภาพรวมระบบ (Dashboard)</h1>
                        <p className="text-gray-500 mt-1">ข้อมูลสถานะสินค้าและการเคลื่อนไหวล่าสุด</p>
                    </div>
                    <div className="text-right text-sm text-gray-400">
                        ข้อมูล ณ วันที่ {new Date().toLocaleDateString('th-TH')}
                    </div>
                </div>

                {/* 1. Main Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">รายการสินค้าทั้งหมด</p>
                            <h3 className="text-4xl font-bold text-gray-800">{stats?.totalProducts || 0}</h3>
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full mt-2 inline-block">Active Items</span>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-xl text-blue-600"><Package size={32} /></div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">สินค้าต้องเติมสต็อก</p>
                            <h3 className="text-4xl font-bold text-red-600">{stats?.lowStockItems?.length || 0}</h3>
                            <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full mt-2 inline-block">Low Stock Alert</span>
                        </div>
                        <div className="p-4 bg-red-50 rounded-xl text-red-600"><AlertTriangle size={32} /></div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">หมวดหมู่สินค้า</p>
                            {/* นับจำนวน Key ของ CATEGORY_COLORS เพื่อแสดงจำนวนหมวดหมู่ทั้งหมดที่มี */}
                            <h3 className="text-4xl font-bold text-gray-800">{Object.keys(CATEGORY_COLORS).length}</h3>
                            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full mt-2 inline-block">Categories</span>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-xl text-purple-600"><Layers size={32} /></div>
                    </div>
                </div>

                {/* 3. Category Breakdown */}
                <div>
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Box size={20} className="text-gray-500" /> แยกตามหมวดหมู่
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {/* ⭐ แก้ไขตรงนี้: วนลูปจาก Key ของ CATEGORY_COLORS แทน stats.categoryStats */}
                        {Object.keys(CATEGORY_COLORS).map((catName, idx) => {
                            // 1. ดึงสี
                            const colorClass = CATEGORY_COLORS[catName];

                            // 2. ค้นหาจำนวนสินค้าจาก API (ถ้าไม่เจอให้เป็น 0)
                            const foundStat = stats?.categoryStats?.find(c => c.category === catName);
                            const count = foundStat ? foundStat.count : 0;

                            return (
                                <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center hover:border-blue-200 transition-colors">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${colorClass}`}>
                                        <Package size={20} />
                                    </div>
                                    <h4 className="text-gray-800 font-semibold text-sm truncate w-full">{catName}</h4>

                                    {/* แสดงจำนวน (ถ้าเป็น 0 จะแสดงเลข 0 ปกติ) */}
                                    <p className={`text-2xl font-bold mt-1 ${count === 0 ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {count}
                                    </p>
                                    <p className="text-xs text-gray-400">รายการ</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. Stock Movement Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <BarChart2 size={20} className="text-blue-500" />
                            สถิติการรับเข้า-เบิกออก
                        </h2>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setDateRange('7d')}
                                className={`px-4 py-1 text-sm rounded-md transition-all ${dateRange === '7d' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                7 วันล่าสุด
                            </button>
                            <button
                                onClick={() => setDateRange('30d')}
                                className={`px-4 py-1 text-sm rounded-md transition-all ${dateRange === '30d' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                30 วันล่าสุด
                            </button>
                        </div>
                    </div>

                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={movementData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                    stroke="#9CA3AF"
                                    fontSize={12}
                                />
                                <YAxis stroke="#9CA3AF" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    cursor={{ fill: '#F3F4F6' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="stock_in" name="รับเข้า (In)" fill="#10B981" radius={[4, 4, 0, 0]} barSize={30} />
                                <Bar dataKey="stock_out" name="เบิกออก (Out)" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}