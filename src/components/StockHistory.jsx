import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Search, Calendar, FileText } from 'lucide-react';

const StockHistory = () => {
    const [movements, setMovements] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchMovements();
    }, []);

    const fetchMovements = async () => {
        try {
            const res = await fetch('/stock-movements2', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            setMovements(data);
        } catch (err) {
            console.error('Error fetching history:', err);
        }
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="text-blue-600" />
                        ประวัติการเข้า-ออกสินค้า
                    </h1>

                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="ค้นหา SKU หรือชื่อสินค้า..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-bottom border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">วัน-เวลา</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ประเภท</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">สินค้า</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">จำนวน (ชิ้น)</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">คลัง</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">หมายเหตุ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {movements.filter(m =>
                                    m.sku.includes(searchTerm) || m.product_name.includes(searchTerm)
                                ).map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {new Date(item.date).toLocaleString('th-TH')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {item.type === 'IN' ? (
                                                <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-xs font-bold">
                                                    <ArrowDownLeft size={14} /> รับเข้า
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-1 rounded-lg text-xs font-bold">
                                                    <ArrowUpRight size={14} /> เบิกออก
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-gray-800">{item.sku}</div>
                                            <div className="text-xs text-gray-500">{item.product_name}</div>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold ${item.type === 'IN' ? 'text-blue-600' : 'text-rose-600'}`}>
                                            {item.type === 'IN' ? '+' : '-'}{Math.abs(item.quantity).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{item.warehouse_name}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-gray-500 truncate max-w-[200px]">{item.reason}</div>
                                            <div className="text-[10px] text-gray-400">โดย: {item.operator}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockHistory;