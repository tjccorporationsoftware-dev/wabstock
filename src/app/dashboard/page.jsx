'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/axios';
import {
    Package, AlertTriangle, Box, BarChart2, Warehouse,
    ArrowRight, Calendar, MapPin, PieChart as PieChartIcon,
    CheckCircle // เพิ่มไอคอนนี้เข้ามา
} from 'lucide-react';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    AreaChart, Area
} from 'recharts';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

export default function Dashboard() {
    const router = useRouter();

    const [stats, setStats] = useState(null);
    const [movementData, setMovementData] = useState([]);
    const [dateRange, setDateRange] = useState('7d');
    const [loading, setLoading] = useState(true);

    // --- 1. โหลดข้อมูล ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                // ดึงข้อมูล Dashboard รวม
                const dashboardRes = await api.get('/dashboard');

                setStats(dashboardRes.data);

                // ตั้งค่าข้อมูลกราฟ Movement
                if (dashboardRes.data.graphData) {
                    const mappedData = dashboardRes.data.graphData.map(item => ({
                        date: item.date,
                        stock_in: Number(item.total_in),
                        stock_out: Number(item.total_out)
                    }));
                    setMovementData(mappedData);
                }

                setLoading(false);
            } catch (err) {
                console.error("API Error:", err);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // แยก useEffect สำหรับกราฟ movement เมื่อเปลี่ยน dateRange
    useEffect(() => {
        api.get(`/stats/movement?range=${dateRange}`)
            .then(res => {
                setMovementData(res.data);
            })
            .catch(err => console.error(err));
    }, [dateRange]);

    const currentDate = new Date().toLocaleDateString('th-TH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // --- 2. เตรียมข้อมูลสำหรับกราฟต่างๆ ---

    // A. ข้อมูล Pie Chart
    const pieData = stats?.warehouseStats?.map(wh => ({
        name: wh.name,
        value: parseInt(wh.product_count || 0)
    })).filter(item => item.value > 0) || [];

    // B. ข้อมูล Horizontal Bar Chart (สินค้าที่มีสต็อกมากที่สุด 5 อันดับ) - [แก้ไขใหม่]
    // หมายเหตุ: ต้องมั่นใจว่า Backend ส่ง topStockItems หรือ topProducts มาให้
    // ถ้า Backend ยังไม่ได้ทำ ให้ใช้ stats?.allProducts?.sort(...) แทนชั่วคราวได้
    const highStockChartData = (stats?.topStockItems || []).slice(0, 5).map(item => ({
        name: item.name,
        stock: parseInt(item.quantity || 0)
    }));

    // C. ข้อมูล Area Chart (แนวโน้มสต็อกรวม)
    const trendData = movementData.map(item => {
        const netMovement = (item.stock_in || 0) - (item.stock_out || 0);
        return {
            date: item.date,
            total: netMovement
        };
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

            <div className="flex-1 p-8 space-y-8 overflow-y-auto h-screen">

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

                {/* --- Section 1: Top Stats Cards --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between transition-shadow hover:shadow-md">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">สินค้าทั้งหมด</p>
                            <h3 className="text-3xl font-bold text-gray-800">{stats?.totalProducts?.toLocaleString() || 0}</h3>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Package size={28} /></div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between transition-shadow hover:shadow-md">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">สินค้าใกล้หมด</p>
                            <h3 className="text-3xl font-bold text-red-500">{stats?.lowStockItems?.length || 0}</h3>
                        </div>
                        <div className="p-3 bg-red-50 text-red-500 rounded-xl"><AlertTriangle size={28} /></div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between transition-shadow hover:shadow-md">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">จำนวนคลังสินค้า</p>
                            <h3 className="text-3xl font-bold text-purple-600">{stats?.warehouseStats?.length || 0}</h3>
                        </div>
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Warehouse size={28} /></div>
                    </div>
                </div>

                {/* --- Section 2: Warehouse Grid --- */}
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
                                className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>

                                <div className="flex justify-center mb-4">
                                    {wh.image_url ? (
                                        <div className="w-20 h-20 rounded-full p-1 border border-gray-100 shadow-inner bg-white">
                                            <img src={wh.image_url} alt={wh.name} className="w-full h-full rounded-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-100">
                                            <Warehouse size={32} />
                                        </div>
                                    )}
                                </div>

                                <div className="text-center">
                                    <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">{wh.name}</h3>
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
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- Section 3: Main Charts (Movement & Distribution) --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Chart 3.1: Movement Bar Chart */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <BarChart2 size={20} className="text-blue-500" />
                                กราฟการเคลื่อนไหวสินค้า
                            </h2>
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setDateRange('7d')}
                                    className={`px-4 py-1 text-sm rounded-lg transition-all ${dateRange === '7d' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500'}`}
                                >
                                    7 วัน
                                </button>
                                <button
                                    onClick={() => setDateRange('30d')}
                                    className={`px-4 py-1 text-sm rounded-lg transition-all ${dateRange === '30d' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500'}`}
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
                                        stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} dy={10}
                                    />
                                    <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: '#F9FAFB' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Bar dataKey="stock_in" name="รับเข้า" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={30} />
                                    <Bar dataKey="stock_out" name="เบิกออก" fill="#F43F5E" radius={[4, 4, 0, 0]} barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chart 3.2: Distribution Pie Chart */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <div className="flex items-center gap-2 mb-6">
                            <PieChartIcon size={20} className="text-purple-500" />
                            <h2 className="text-lg font-bold text-gray-800">สัดส่วนสินค้าตามคลัง</h2>
                        </div>

                        <div className="h-[300px] w-full flex items-center justify-center">
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData} cx="50%" cy="50%"
                                            innerRadius={60} outerRadius={90}
                                            paddingAngle={5} dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => parseInt(value).toLocaleString() + ' รายการ'}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-gray-400 text-sm flex flex-col items-center">
                                    <PieChartIcon size={40} className="mb-2 opacity-20" />
                                    ไม่มีข้อมูลสินค้า
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Section 4: Secondary Charts (Top Stock & Trends) --- */}
                <div className="">
                    {/* Chart 4.2: Total Stock Trend (Area Chart) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <BarChart2 size={20} className="text-indigo-500" />
                            <h2 className="text-lg font-bold text-gray-800">แนวโน้มสต็อกรวม</h2>
                        </div>

                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(val) => new Date(val).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                        tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="total"
                                        name="สต็อกรวม"
                                        stroke="#6366F1"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorTotal)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}