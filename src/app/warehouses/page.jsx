'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/axios';
import { Warehouse, MapPin, ChevronRight, Plus, Edit, Trash2 } from 'lucide-react'; // ✅ เพิ่ม Icon Edit, Trash2
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

    // ฟังก์ชันเพิ่มคลังสินค้า
    const handleAddWarehouse = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'เพิ่มคลังสินค้าใหม่',
            html:
                '<input id="swal-input1" class="swal2-input" placeholder="ชื่อคลังสินค้า">' +
                '<input id="swal-input2" class="swal2-input" placeholder="สถานที่ตั้ง">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ยกเลิก',
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

    // ✅ ฟังก์ชันแก้ไขคลังสินค้า
    const handleEditWarehouse = async (e, warehouse) => {
        e.stopPropagation(); // ⛔ หยุดไม่ให้ Event ทะลุไปกดคลิก Card (ไม่ให้เปลี่ยนหน้า)

        const { value: formValues } = await Swal.fire({
            title: 'แก้ไขข้อมูลคลังสินค้า',
            html:
                `<input id="swal-input-name" class="swal2-input" placeholder="ชื่อคลังสินค้า" value="${warehouse.name}">` +
                `<input id="swal-input-loc" class="swal2-input" placeholder="สถานที่ตั้ง" value="${warehouse.location || ''}">`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'อัปเดต',
            cancelButtonText: 'ยกเลิก',
            preConfirm: () => {
                return [
                    document.getElementById('swal-input-name').value,
                    document.getElementById('swal-input-loc').value
                ]
            }
        });

        if (formValues && formValues[0]) {
            try {
                await api.put(`/warehouses/${warehouse.id}`, {
                    name: formValues[0],
                    location: formValues[1]
                });
                Swal.fire('สำเร็จ', 'แก้ไขข้อมูลเรียบร้อย', 'success');
                fetchWarehouses();
            } catch (err) {
                console.error(err);
                Swal.fire('ผิดพลาด', 'ไม่สามารถแก้ไขข้อมูลได้', 'error');
            }
        }
    };

    // ✅ ฟังก์ชันลบคลังสินค้า
    const handleDeleteWarehouse = async (e, id) => {
        e.stopPropagation(); // ⛔ หยุดการเปลี่ยนหน้า

        Swal.fire({
            title: 'ยืนยันการลบ?',
            text: "หากลบแล้ว ข้อมูลสินค้าในคลังนี้อาจได้รับผลกระทบ!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ลบเลย',
            cancelButtonText: 'ยกเลิก'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.delete(`/warehouses/${id}`);
                    Swal.fire('ลบสำเร็จ!', 'คลังสินค้าถูกลบแล้ว', 'success');
                    fetchWarehouses();
                } catch (err) {
                    console.error(err);
                    // เช็ค Error จาก Backend (เช่น ลบไม่ได้เพราะมีของอยู่)
                    const errorMsg = err.response?.data?.error || 'ไม่สามารถลบคลังสินค้าได้';
                    Swal.fire('ผิดพลาด', errorMsg, 'error');
                }
            }
        })
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
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus size={20} /> เพิ่มคลังสินค้า
                    </button>
                </div>

                {/* Grid แสดงคลังสินค้า */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {warehouses.map((wh) => (
                        <div
                            key={wh.id}
                            onClick={() => router.push(`/warehouses/${wh.id}`)} // 👉 กดที่การ์ดเพื่อไปหน้า Detail
                            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group relative"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Warehouse size={32} />
                                </div>

                                {/* ✅ ปุ่มจัดการ (Edit / Delete) */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => handleEditWarehouse(e, wh)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                        title="แก้ไข"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteWarehouse(e, wh.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                        title="ลบ"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-gray-800 mb-2 pr-8">{wh.name}</h3>

                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                                <MapPin size={16} />
                                <span>{wh.location || 'ไม่ระบุสถานที่'}</span>
                            </div>

                            <div className="flex items-center text-blue-600 text-sm font-medium mt-auto">
                                ดูรายการสินค้า <ChevronRight size={16} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}