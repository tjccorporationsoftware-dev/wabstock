'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/axios';
import { Package, AlertTriangle, Box, BarChart2, Warehouse, ArrowRight, Calendar, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
    const router = useRouter();

    const [stats, setStats] = useState(null);
    const [movementData, setMovementData] = useState([]);
    const [dateRange, setDateRange] = useState('7d');
    const [loading, setLoading] = useState(true);

    // --- โหลดข้อมูล ---
    useEffect(() => {
        api.get('/dashboard').then(res => {
            console.log("Dashboard Data:", res.data); // เช็คดู log ได้ว่า image_url มาไหม
            setStats(res.data);
            setLoading(false);
        }).catch(err => {
            console.error("API Error:", err);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        api.get(`/stats/movement?range=${dateRange}`)
            .then(res => setMovementData(res.data))
            .catch(err => console.error(err));
    }, [dateRange]);

    const currentDate = new Date().toLocaleDateString('th-TH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-400">
                <div className="animate-pulse flex flex-col items-center">
                    <Box size={40} className="mb-2" />
                    <span>กำลังโหลดข้อมูล...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex bg-gray-50/50 min-h-screen font-sans">
            <Sidebar />

            <div className="flex-1 p-8 space-y-8 overflow-y-auto">

                {/* --- Header --- */}
                <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Dashboard</h1>
                        <p className="text-gray-500 mt-1">ภาพรวมสินค้าคงคลังแยกตามจุดจัดเก็บ</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
                        <Calendar size={16} className="text-blue-500" />
                        {currentDate}
                    </div>
                </header>

                {/* --- 1. Top Stats Cards --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between transition-shadow">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">สินค้าทั้งหมด</p>
                            <h3 className="text-3xl font-bold text-gray-800">{stats?.totalProducts || 0}</h3>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Package size={28} /></div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between transition-shadow">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">สินค้าใกล้หมด</p>
                            <h3 className="text-3xl font-bold text-red-500">{stats?.lowStockItems?.length || 0}</h3>
                        </div>
                        <div className="p-3 bg-red-50 text-red-500 rounded-xl"><AlertTriangle size={28} /></div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between transition-shadow">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">จำนวนคลังสินค้า</p>
                            <h3 className="text-3xl font-bold text-purple-600">{stats?.warehouseStats?.length || 0}</h3>
                        </div>
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Warehouse size={28} /></div>
                    </div>
                </div>

                {/* --- 2. Warehouse Grid Section --- */}
                <div>
                    <div className="flex items-center gap-2 mb-6">
                        <Box size={20} className="text-blue-600" />
                        <h2 className="text-xl font-bold text-gray-800">ข้อมูลรายคลังสินค้า</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {stats?.warehouseStats?.map((wh) => (
                            <div
                                key={wh.id}
                                onClick={() => router.push(`/warehouses/${wh.id}`)}
                                className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm  transition-all duration-300 cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-purple-500 transform scale-x-0  transition-transform duration-300"></div>

                                {/* ✅ แก้ไขตรงนี้: ใช้ wh.image_url แทน wh.image */}
                                <div className="flex justify-center mb-4">
                                    {wh.image_url ? (
                                        <div className="w-20 h-20 rounded-full p-1 border border-gray-100 shadow-inner bg-white">
                                            <img
                                                src={wh.image_url}
                                                alt={wh.name}
                                                className="w-full h-full rounded-full object-cover"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-100">
                                            <Warehouse size={32} />
                                        </div>
                                    )}
                                </div>

                                <div className="text-center">
                                    <h3 className="text-lg font-bold text-gray-800 mb-1  transition-colors">
                                        {wh.name}
                                    </h3>
                                    <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-4">
                                        <MapPin size={12} />
                                        <span>Warehouse Location</span>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl py-3 px-4 flex justify-between items-center">
                                        <span className="text-xs font-medium text-gray-500">สินค้าคงเหลือ</span>
                                        <div className="text-right">
                                            <span className="text-lg font-bold text-gray-900 block leading-none">
                                                {parseInt(wh.product_count || 0).toLocaleString()}
                                            </span>
                                            <span className="text-[10px] text-gray-400"> รายการ </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex justify-center opacity-0  transition-opacity transform translate-y-2 ">
                                    <span className="text-sm font-medium text-blue-600 flex items-center gap-1">
                                        ดูรายละเอียด <ArrowRight size={16} />
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- 3. Chart Section --- */}
                {/* --- 3. Chart Section (แบบปกติ: สีทึบ + ขนาดพอดี) --- */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mt-8">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <BarChart2 size={20} className="text-blue-500" />
                            กราฟการเคลื่อนไหวสินค้า
                        </h2>
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => setDateRange('7d')}
                                className={`px-4 py-1 text-sm rounded-lg transition-all ${dateRange === '7d'
                                        ? 'bg-white shadow text-blue-600 font-bold'
                                        : 'text-gray-500'
                                    }`}
                            >
                                7 วัน
                            </button>
                            <button
                                onClick={() => setDateRange('30d')}
                                className={`px-4 py-1 text-sm rounded-lg transition-all ${dateRange === '30d'
                                        ? 'bg-white shadow text-blue-600 font-bold'
                                        : 'text-gray-500'
                                    }`}
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
                                    stroke="#9CA3AF"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#9CA3AF"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />

                                <Tooltip
                                    cursor={{ fill: '#F9FAFB' }}
                                    contentStyle={{
                                        borderRadius: '8px',
                                        border: 'none',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                />

                                {/* กำหนด barSize={30} เพื่อให้แท่งไม่ใหญ่เกินไป และใช้สีทึบปกติ */}
                                <Bar
                                    dataKey="stock_in"
                                    name="รับเข้า"
                                    fill="#3B82F6"
                                    radius={[4, 4, 0, 0]}
                                    barSize={30}
                                />
                                <Bar
                                    dataKey="stock_out"
                                    name="เบิกออก"
                                    fill="#F43F5E"
                                    radius={[4, 4, 0, 0]}
                                    barSize={30}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}