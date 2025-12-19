'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/axios';
import {
    Package, AlertTriangle, Box, BarChart2, Warehouse,
    ArrowRight, Calendar, MapPin, PieChart as PieChartIcon,
    CheckCircle, TrendingUp // เพิ่มไอคอนนี้เข้ามา
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
        <div className="flex bg-gray-50/50 min-h-screen font-sans overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto h-screen mt-16 md:mt-6  lg:mt-1">

                {/* --- Header --- */}
                <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                    <div className="min-w-0"> {/* min-w-0 ช่วยกัน textล้น */}
                        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 tracking-tight whitespace-nowrap">
                            Dashboard
                        </h1>
                        <p className="text-sm md:text-base text-gray-500 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                            ภาพรวมสินค้าคงคลังแยกตามจุดจัดเก็บ
                        </p>
                    </div>
                    <div className="self-start md:self-auto flex items-center gap-2 text-xs md:text-sm text-gray-500 bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-sm border border-gray-100 whitespace-nowrap">
                        <Calendar size={14} className="text-blue-500 md:w-4 md:h-4" />
                        {currentDate}
                    </div>
                </header>

                {/* --- Section 1: Top Stats Cards --- */}
                <div className="grid grid-cols-3 gap-2 md:gap-6">
                    {/* Card 1 */}
                    <div className="bg-white p-2 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center md:flex-row md:justify-between transition-shadow hover:shadow-md cursor-pointer">
                        <div className="text-center md:text-left order-2 md:order-1 w-full overflow-hidden">
                            <p className="text-[10px] md:text-sm font-medium text-gray-500 mb-0.5 md:mb-1 whitespace-nowrap">ทั้งหมด</p>
                            <h3 className="text-lg md:text-3xl font-bold text-gray-800 truncate">
                                {stats?.totalProducts?.toLocaleString() || 0}
                            </h3>
                        </div>
                        <div className="p-1.5 md:p-3 bg-blue-50 text-blue-600 rounded-xl mb-1 md:mb-0 order-1 md:order-2 shrink-0">
                            <Package size={18} className="md:w-7 md:h-7" />
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-white p-2 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center md:flex-row md:justify-between transition-shadow hover:shadow-md cursor-pointer">
                        <div className="text-center md:text-left order-2 md:order-1 w-full overflow-hidden">
                            <p className="text-[10px] md:text-sm font-medium text-gray-500 mb-0.5 md:mb-1 whitespace-nowrap">ใกล้หมด</p>
                            <h3 className="text-lg md:text-3xl font-bold text-red-500 truncate">
                                {stats?.lowStockItems?.length || 0}
                            </h3>
                        </div>
                        <div className="p-1.5 md:p-3 bg-red-50 text-red-500 rounded-xl mb-1 md:mb-0 order-1 md:order-2 shrink-0">
                            <AlertTriangle size={18} className="md:w-7 md:h-7" />
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-white p-2 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center md:flex-row md:justify-between transition-shadow hover:shadow-md cursor-pointer">
                        <div className="text-center md:text-left order-2 md:order-1 w-full overflow-hidden">
                            <p className="text-[10px] md:text-sm font-medium text-gray-500 mb-0.5 md:mb-1 whitespace-nowrap">คลังสินค้า</p>
                            <h3 className="text-lg md:text-3xl font-bold text-purple-600 truncate">
                                {stats?.warehouseStats?.length || 0}
                            </h3>
                        </div>
                        <div className="p-1.5 md:p-3 bg-purple-50 text-purple-600 rounded-xl mb-1 md:mb-0 order-1 md:order-2 shrink-0">
                            <Warehouse size={18} className="md:w-7 md:h-7" />
                        </div>
                    </div>
                </div>

                {/* --- Section 2: Warehouse Grid --- */}
                <div>
                    <div className="flex items-center gap-2 mb-3 md:mb-4">
                        <Box size={18} className="text-blue-600 md:w-5 md:h-5" />
                        <h2 className="text-base md:text-lg font-bold text-gray-800 whitespace-nowrap">ข้อมูลรายคลังสินค้า</h2>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2 md:gap-6">
                        {stats?.warehouseStats?.map((wh) => (
                            <div
                                key={wh.id}
                                onClick={() => router.push(`/warehouses/${wh.id}`)}
                                className="group bg-white rounded-xl p-2 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>

                                <div className="flex justify-center mb-1.5">
                                    {wh.image_url ? (
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full p-0.5 border border-gray-100 shadow-inner bg-white shrink-0">
                                            <img src={wh.image_url} alt={wh.name} className="w-full h-full rounded-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-100 shrink-0">
                                            <Warehouse size={18} className="md:w-5 md:h-5" />
                                        </div>
                                    )}
                                </div>

                                <div className="text-center w-full overflow-hidden">
                                    <h3 className="text-[10px] md:text-sm font-bold text-gray-800 mb-0.5 group-hover:text-blue-600 transition-colors truncate px-1 block w-full">
                                        {wh.name}
                                    </h3>

                                    <div className="flex items-center justify-center gap-0.5 text-gray-400 text-[9px] md:text-xs mb-1.5 w-full">
                                        <MapPin size={8} className="md:w-3 md:h-3 shrink-0" />
                                        <span className="truncate max-w-[60px] md:max-w-[100px] block">{wh.location || 'Location'}</span>
                                    </div>

                                    <div className="bg-gray-50 rounded-md py-1 px-1 flex flex-col items-center justify-center w-full">
                                        <span className="text-[8px] md:text-[10px] font-medium text-gray-500 mb-0 whitespace-nowrap">คงเหลือ</span>
                                        <span className="text-xs md:text-sm font-bold text-gray-900 leading-none truncate w-full">
                                            {parseInt(wh.product_count || 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- Section 3: Main Charts --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

                    {/* Chart 3.1: Movement Bar Chart */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-8 overflow-hidden">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-3">
                            <h2 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2 whitespace-nowrap">
                                <BarChart2 size={18} className="text-blue-500 md:w-5 md:h-5" />
                                กราฟการเคลื่อนไหว
                            </h2>
                            <div className="flex bg-gray-100 p-1 rounded-xl self-end sm:self-auto shrink-0">
                                <button onClick={() => setDateRange('7d')} className={`px-3 py-1 text-xs md:text-sm rounded-lg transition-all whitespace-nowrap ${dateRange === '7d' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500'}`}>7 วัน</button>
                                <button onClick={() => setDateRange('30d')} className={`px-3 py-1 text-xs md:text-sm rounded-lg transition-all whitespace-nowrap ${dateRange === '30d' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500'}`}>30 วัน</button>
                            </div>
                        </div>
                        <div className="h-[250px] md:h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={movementData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                    <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                    <Bar dataKey="stock_in" name="รับเข้า" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar dataKey="stock_out" name="เบิกออก" fill="#F43F5E" radius={[4, 4, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chart 3.2: Distribution Pie Chart */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-8 overflow-hidden">
                        <div className="flex items-center gap-2 mb-4 md:mb-6">
                            <PieChartIcon size={18} className="text-purple-500 md:w-5 md:h-5" />
                            <h2 className="text-base md:text-lg font-bold text-gray-800 whitespace-nowrap">สัดส่วนตามคลัง</h2>
                        </div>
                        <div className="h-[250px] md:h-[300px] w-full flex items-center justify-center">
                            {pieData && pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(value) => parseInt(value).toLocaleString() + ' รายการ'} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-gray-400 text-sm flex flex-col items-center">
                                    <PieChartIcon size={40} className="mb-2 opacity-20" />
                                    <span className="whitespace-nowrap">ไม่มีข้อมูลสินค้า</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Section 4: Secondary Charts (Trend) --- */}
                <div className="pb-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 overflow-hidden">
                        <div className="flex items-center gap-2 mb-4 md:mb-6">
                            <TrendingUp size={18} className="text-indigo-500 md:w-5 md:h-5" />
                            <h2 className="text-base md:text-lg font-bold text-gray-800 whitespace-nowrap">แนวโน้มสต็อกรวม</h2>
                        </div>
                        <div className="h-[200px] md:h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                    <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                    <Area type="monotone" dataKey="total" name="สต็อกรวม" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}