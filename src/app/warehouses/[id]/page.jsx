'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/axios';
import { ArrowLeft, MapPin, Box, Archive, Filter, Search, ZoomIn, X, Download } from 'lucide-react';
import Barcode from 'react-barcode';

// รายชื่อหมวดหมู่
const CATEGORIES = ["ทั้งหมด", "เครื่องมือแพทย์", "อุปกรณ์ไฟฟ้า", "อุปกรณ์คอมพิวเตอร์", "คอมชุด", "ครุภัณฑ์"];

// ✅ แก้ไข 1: ใช้ตัวแปร Environment เพื่อให้รองรับทั้ง Local และ Vercel
const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function WarehouseDetail() {
    const { id } = useParams();
    const router = useRouter();

    const [warehouse, setWarehouse] = useState(null);
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);

    const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const [selectedSku, setSelectedSku] = useState(null);
    const viewerRef = useRef(null);

    // ✅ แก้ไข 2: ฟังก์ชันช่วยแปลงลิงก์รูป (สำคัญมาก)
    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url; // ถ้าเป็นลิงก์ Supabase (http...) ให้ใช้ได้เลย
        return `${BASE_API_URL}${url}`; // ถ้าเป็น path เก่า ให้ต่อท้าย API
    };

    useEffect(() => {
        api.get(`/warehouses/${id}/inventory`)
            .then(res => {
                setWarehouse(res.data.warehouse);
                setProducts(res.data.products);
                setFilteredProducts(res.data.products);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        let result = products;
        if (selectedCategory !== 'ทั้งหมด') {
            result = result.filter(p => p.category === selectedCategory);
        }
        if (search) {
            const lowerSearch = search.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(lowerSearch) ||
                p.sku.toLowerCase().includes(lowerSearch)
            );
        }
        setFilteredProducts(result);
    }, [selectedCategory, search, products]);

    const downloadFromViewer = () => {
        const svg = viewerRef.current.querySelector("svg");
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const link = document.createElement("a");
            link.download = `${selectedSku}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        };
        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    };

    if (loading) return <div className="p-10 text-center">กำลังโหลดข้อมูล...</div>;
    if (!warehouse) return <div className="p-10 text-center text-red-500">ไม่พบข้อมูลคลังสินค้า</div>;

    return (
        <div className="flex bg-gray-50 min-h-screen">
            <Sidebar />
            <div className="flex-1 p-8">

                {/* Header ย้อนกลับ */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 transition-colors"
                >
                    <ArrowLeft size={20} /> ย้อนกลับ
                </button>

                {/* ข้อมูลคลังสินค้า */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                            <span className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                <Box size={28} />
                            </span>
                            {warehouse.name}
                        </h1>
                        <div className="flex items-center gap-2 text-gray-500 mt-2 ml-14">
                            <MapPin size={18} />
                            <span>{warehouse.location || 'ไม่ระบุสถานที่'}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">รายการทั้งหมด</p>
                        <p className="text-4xl font-bold text-blue-600">{products.length}</p>
                    </div>
                </div>

                {/* ส่วนตัวกรอง (Search + Filter) */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-xl font-bold text-gray-800 whitespace-nowrap">
                        รายการสินค้า ({filteredProducts.length})
                    </h2>

                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <Search size={18} />
                            </div>
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อ หรือ SKU..."
                                className="w-full p-2 pl-10 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="relative w-full md:w-auto">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                <Filter size={18} />
                            </div>
                            <select
                                className="w-full md:w-auto p-2 pl-10 border rounded-lg shadow-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-gray-700 min-w-[200px]"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                {CATEGORIES.map((cat, index) => (
                                    <option key={index} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* ตารางรายการสินค้า */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="p-4 text-sm font-semibold text-gray-600">รูปสินค้า</th>
                                <th className="p-4 text-sm font-semibold text-gray-600">บาร์โค้ด</th>
                                <th className="p-4 text-sm font-semibold text-gray-600">รหัสสินค้า (SKU)</th>
                                <th className="p-4 text-sm font-semibold text-gray-600">ชื่อสินค้า</th>
                                <th className="p-4 text-sm font-semibold text-gray-600">หมวดหมู่</th>
                                <th className="p-4 text-sm font-semibold text-gray-600 text-right">จำนวนคงเหลือ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            {/* ✅ แก้ไข 3: เรียกใช้ getImageUrl */}
                                            {p.image_url ? (
                                                <img src={getImageUrl(p.image_url)} className="w-12 h-12 object-cover rounded-md border border-gray-200" alt={p.name} />
                                            ) : (
                                                <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center text-xs text-gray-400">No Pic</div>
                                            )}
                                        </td>

                                        <td className="p-4 text-center cursor-pointer group relative w-32" onClick={() => setSelectedSku(p.sku)}>
                                            <div className="flex flex-col items-center justify-center">
                                                {/* ✅ แก้ไข 4: เรียกใช้ getImageUrl สำหรับบาร์โค้ดด้วย */}
                                                {p.barcode_url ? (
                                                    <img src={getImageUrl(p.barcode_url)} className="h-8 object-contain" alt="Barcode" />
                                                ) : (
                                                    <span className="text-gray-400 text-sm">-</span>
                                                )}
                                                <div className="text-[10px] text-blue-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                    <ZoomIn size={12} /> คลิกขยาย
                                                </div>
                                            </div>
                                        </td>

                                        <td className="p-4 font-mono text-sm text-gray-600">{p.sku}</td>
                                        <td className="p-4 font-medium text-gray-800">{p.name}</td>
                                        <td className="p-4 text-sm text-gray-500">
                                            <span className="px-2 py-1 bg-gray-100 rounded-md">{p.category || 'ทั่วไป'}</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`font-bold text-lg ${p.quantity <= 20 ? 'text-red-600' : 'text-green-600'}`}>
                                                {p.quantity}
                                            </span>
                                            <span className="text-sm text-gray-500 ml-1">{p.unit}</span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center justify-center">
                                            {search ? (
                                                <>
                                                    <Search size={48} className="text-gray-300 mb-3" />
                                                    <p>ไม่พบสินค้าที่ค้นหา "{search}"</p>
                                                </>
                                            ) : (
                                                <>
                                                    <Archive size={48} className="text-gray-300 mb-3" />
                                                    <p>ไม่พบสินค้าในหมวดหมู่นี้</p>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL แสดงบาร์โค้ด */}
            {selectedSku && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-60 backdrop-blur-sm"
                    onClick={() => setSelectedSku(null)}>
                    <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-200"
                        onClick={e => e.stopPropagation()}>

                        <div className="flex justify-between w-full items-center">
                            <h3 className="text-lg font-bold text-gray-700">Barcode Viewer</h3>
                            <button onClick={() => setSelectedSku(null)} className="p-1 hover:bg-gray-100 rounded-full"><X /></button>
                        </div>

                        <div ref={viewerRef} className="p-6 bg-white border-2 border-dashed border-gray-200 rounded-xl">
                            <Barcode
                                value={selectedSku}
                                format="CODE128"
                                width={2.5}
                                height={100}
                                fontSize={18}
                            />
                        </div>

                        <div className="flex gap-3 w-full">
                            <button onClick={() => setSelectedSku(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium">
                                ปิดหน้าต่าง
                            </button>
                            <button onClick={downloadFromViewer} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                                <Download size={20} /> ดาวน์โหลดรูป
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}