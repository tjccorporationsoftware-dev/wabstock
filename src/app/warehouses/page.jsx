'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/axios';
import { Warehouse, MapPin, ChevronRight, Plus } from 'lucide-react';
import Swal from 'sweetalert2';

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState([]);
    const router = useRouter();

    // ดึงข้อมูลคลังสินค้า
    const fetchWarehouses = () => {
        api.get('/warehouses')
            .then(res => setWarehouses(res.data))
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchWarehouses();
    }, []);

    // ฟังก์ชันเพิ่มคลังสินค้า (แถมให้)
    const handleAddWarehouse = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'เพิ่มคลังสินค้าใหม่',
            html:
                '<input id="swal-input1" class="swal2-input" placeholder="ชื่อคลังสินค้า">' +
                '<input id="swal-input2" class="swal2-input" placeholder="สถานที่ตั้ง">',
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                return [
                    document.getElementById('swal-input1').value,
                    document.getElementById('swal-input2').value
                ]
            }
        });

        if (formValues && formValues[0]) {
            try {
                await api.post('/warehouses', { name: formValues[0], location: formValues[1] });
                Swal.fire('สำเร็จ', 'เพิ่มคลังสินค้าเรียบร้อย', 'success');
                fetchWarehouses();
            } catch (err) {
                Swal.fire('ผิดพลาด', 'ไม่สามารถเพิ่มคลังสินค้าได้', 'error');
            }
        }
    };

    return (
        <div className="flex bg-gray-50 min-h-screen">
            <Sidebar />
            <div className="flex-1 p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">คลังสินค้า</h1>
                        <p className="text-gray-500 mt-1">จัดการและตรวจสอบสต็อกแยกตามคลัง</p>
                    </div>
                    <button
                        onClick={handleAddWarehouse}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={20} /> เพิ่มคลังสินค้า
                    </button>
                </div>

                {/* Grid แสดงคลังสินค้า */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {warehouses.map((wh) => (
                        <div
                            key={wh.id}
                            onClick={() => router.push(`/warehouses/${wh.id}`)} // 👉 กดแล้วไปหน้า Detail
                            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Warehouse size={32} />
                                </div>
                                <div className="bg-gray-100 p-2 rounded-full text-gray-400 group-hover:text-blue-600">
                                    <ChevronRight size={20} />
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-gray-800 mb-2">{wh.name}</h3>

                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                <MapPin size={16} />
                                <span>{wh.location || 'ไม่ระบุสถานที่'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}