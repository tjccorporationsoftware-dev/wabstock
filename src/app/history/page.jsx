'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/axios';
import {
    History,
    ArrowDownCircle,
    ArrowUpCircle,
    Trash2,
    Calendar,
    User,
    XCircle,
} from 'lucide-react';

const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function HistoryPage() {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState('');

    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `${BASE_API_URL}${url}`;
    };

    const fetchHistory = async () => {
        try {
            const res = await api.get('/history');
            setLogs(res.data);
            setFilteredLogs(res.data);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    useEffect(() => {
        if (selectedDate) {
            const filtered = logs.filter((item) => {
                const itemDate = new Date(item.created_at).toISOString().split('T')[0];
                return itemDate === selectedDate;
            });
            setFilteredLogs(filtered);
        } else {
            setFilteredLogs(logs);
        }
    }, [selectedDate, logs]);

    const clearFilter = () => setSelectedDate('');

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const renderTypeBadge = (type) => {
        const styles = {
            IN: 'text-green-600 bg-green-100',
            OUT: 'text-red-600 bg-red-100',
            DELETE: 'text-gray-600 bg-gray-200',
        };

        const icons = {
            IN: <ArrowDownCircle size={16} />,
            OUT: <ArrowUpCircle size={16} />,
            DELETE: <Trash2 size={16} />,
        };

        return (
            <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold ${styles[type]}`}>
                {icons[type]} {type === 'IN' ? 'รับเข้า' : type === 'OUT' ? 'เบิกออก' : 'ลบสินค้า'}
            </span>
        );
    };

    return (
        <div className="flex bg-gray-100 min-h-screen">
            <Sidebar />

            <div className="flex-1 p-6 md:p-10">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-linear-to-br from-blue-600 to-blue-500 p-3 rounded-xl text-white shadow-md">
                            <History size={26} />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800">ประวัติการทำรายการ</h1>
                    </div>

                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow border border-gray-200">
                        <Calendar size={20} className="text-gray-500" />
                        <span className="text-gray-600 text-sm font-medium">เลือกวันที่:</span>
                        <input
                            type="date"
                            className="border border-gray-300 rounded px-2 py-1 text-gray-700 focus:outline-none focus:border-blue-500"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                        {selectedDate && (
                            <button onClick={clearFilter} className="text-red-500 hover:text-red-700" title="ล้างตัวกรอง">
                                <XCircle size={20} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
                    {loading ? (
                        <div className="p-10 text-center text-gray-500 animate-pulse">กำลังโหลดข้อมูล...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="p-4 text-sm font-semibold text-gray-600">วันที่ / เวลา</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">ประเภท</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">สินค้า</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">คลังสินค้า</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600 text-right">จำนวน</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">ผู้ทำรายการ</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">หมายเหตุ</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100">
                                    {filteredLogs.length > 0 ? (
                                        filteredLogs.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50 transition-all">
                                                <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-gray-400" />
                                                        {formatDate(item.created_at)}
                                                    </div>
                                                </td>

                                                <td className="p-4">{renderTypeBadge(item.type)}</td>

                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        {item.image_url ? (
                                                            <img
                                                                src={getImageUrl(item.image_url)}
                                                                alt={item.product_name}
                                                                className="w-11 h-11 rounded-lg object-cover border border-gray-200 shadow-sm"
                                                            />
                                                        ) : (
                                                            <div className="w-11 h-11 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400 border">
                                                                No Pic
                                                            </div>
                                                        )}
                                                        <span className={`font-medium ${item.type === 'DELETE' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                                            {item.product_name || 'สินค้าถูกลบ'}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="p-4 text-sm text-gray-600">{item.warehouse_name || '-'}</td>

                                                <td className={`p-4 text-right font-bold ${item.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {item.type === 'IN' ? '+' : ''}{item.quantity}
                                                </td>

                                                <td className="p-4">
                                                    <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded-full w-fit shadow-sm">
                                                        <User size={14} /> {item.user_name}
                                                    </div>
                                                </td>

                                                <td className="p-4 text-sm text-gray-500 italic">{item.reason || '-'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="p-12 text-center text-gray-400 bg-gray-50">
                                                <div className="flex flex-col items-center justify-center">
                                                    <Calendar size={48} className="text-gray-300 mb-3" />
                                                    <p>ไม่พบรายการในช่วงวันที่เลือก</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}