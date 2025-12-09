'use client';
import { useEffect, useState, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/axios';
import Swal from 'sweetalert2';
import Cookies from 'js-cookie';
import { Filter, Search, Trash2, Plus, X, Upload, Wand2, Save, Download } from 'lucide-react';
import Barcode from 'react-barcode';

const CATEGORIES = ["ทั้งหมด", "เครื่องมือแพทย์", "อุปกรณ์ไฟฟ้า", "อุปกรณ์คอมพิวเตอร์", "ครุภัณฑ์"];
const UNITS = ["ชิ้น", "กล่อง", "แพ็ค", "โหล", "เครื่อง", "ชุด", "อัน", "ตัว"];

// ✅ กำหนด API URL ที่นี่ (ต้องตรงกับ Backend)
const API_URL = "http://localhost:3000";

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
    const [role, setRole] = useState('');
    const [warehouses, setWarehouses] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        sku: '', name: '', category: CATEGORIES[1], unit: UNITS[0],
        cost_price: '', sale_price: '', reorder_point: 10, initial_stock: '', warehouse_id: ''
    });

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);
    const barcodeRef = useRef(null);

    const fetchProducts = () => {
        api.get(`/products`).then(res => {
            setProducts(res.data);
            setFilteredProducts(res.data);
        });
    };

    const fetchWarehouses = () => {
        api.get('/warehouses').then(res => setWarehouses(res.data));
    };

    useEffect(() => {
        const role = Cookies.get("user_role");
        setRole(role);
        fetchProducts();
        fetchWarehouses();
    }, []);

    useEffect(() => {
        let result = products;
        if (search) {
            const lower = search.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(lower) ||
                p.sku.toLowerCase().includes(lower)
            );
        }
        if (selectedCategory !== 'ทั้งหมด') {
            result = result.filter(p => p.category === selectedCategory);
        }
        setFilteredProducts(result);
    }, [search, selectedCategory, products]);

    const handleOpenModal = () => {
        setFormData({
            sku: '', name: '', category: CATEGORIES[1], unit: UNITS[0],
            cost_price: '', sale_price: '', reorder_point: 10, initial_stock: '',
            warehouse_id: warehouses[0]?.id || ''
        });
        setImageFile(null);
        setImagePreview(null);
        setIsModalOpen(true);
    };

    const handleGenerateSKU = () => {
        const randomSku = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
        setFormData(prev => ({ ...prev, sku: randomSku }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const downloadBarcode = () => {
        const svg = barcodeRef.current.querySelector("svg");
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
            link.download = `${formData.sku}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        };
        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    };

    // ฟังก์ชันแปลง Barcode -> File
    const getBarcodeFile = () => {
        return new Promise((resolve) => {
            if (!barcodeRef.current) { resolve(null); return; }
            const svg = barcodeRef.current.querySelector("svg");
            if (!svg) { resolve(null); return; }

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
                canvas.toBlob((blob) => {
                    const file = new File([blob], `barcode_${formData.sku}.png`, { type: "image/png" });
                    resolve(file);
                }, "image/png");
            };
            img.src = "data:image/svg+xml;base64," + btoa(svgData);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const data = new FormData();
        data.append("sku", formData.sku);
        data.append("name", formData.name);
        data.append("category", formData.category);
        data.append("unit", formData.unit);
        data.append("cost_price", formData.cost_price || 0);
        data.append("sale_price", formData.sale_price || 0);
        data.append("reorder_point", formData.reorder_point || 0);

        if (formData.initial_stock && formData.warehouse_id) {
            data.append("initial_stock", formData.initial_stock);
            data.append("warehouse_id", formData.warehouse_id);
        }

        if (imageFile) data.append("image", imageFile);

        if (formData.sku) {
            try {
                const barcodeFile = await getBarcodeFile();
                if (barcodeFile) data.append("barcode_image", barcodeFile);
            } catch (err) { console.error("Barcode Error", err); }
        }

        try {
            await api.post("/products", data);
            Swal.fire({ icon: "success", title: "สำเร็จ", text: "บันทึกเรียบร้อย", timer: 1500, showConfirmButton: false });
            setIsModalOpen(false);
            fetchProducts();
        } catch (err) {
            Swal.fire("ผิดพลาด", "บันทึกไม่สำเร็จ", "error");
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: "ลบสินค้า?", icon: "warning", showCancelButton: true, confirmButtonColor: "#d33", confirmButtonText: "ลบเลย"
        }).then((result) => {
            if (result.isConfirmed) {
                api.delete(`/products/${id}`).then(() => {
                    Swal.fire("ลบสำเร็จ", "", "success");
                    fetchProducts();
                });
            }
        });
    };

    return (
        <div className="flex bg-gray-50 min-h-screen">
            <Sidebar />
            <div className="flex-1 p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">จัดการสินค้า</h1>
                    {role === "ADMIN" && (
                        <button className="bg-blue-600 text-white px-5 py-2 rounded-xl flex gap-2 items-center" onClick={handleOpenModal}>
                            <Plus /> เพิ่มสินค้า
                        </button>
                    )}
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
                        <input type="text" placeholder="ค้นหา..." className="w-full p-3 pl-10 border rounded-xl"
                            value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-3.5 text-gray-500" size={20} />
                        <select className="p-3 pl-10 border rounded-xl" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-100">
                            {/* ✅ แก้ไข Hydration Error: ไม่ใส่คอมเมนต์แทรกใน tr */}
                            <tr>
                                <th className="p-4">รูปสินค้า</th>
                                <th className="p-4">รูปบาร์โค้ด</th>
                                <th className="p-4">รหัสสินค้า</th>
                                <th className="p-4">ชื่อสินค้า</th>
                                <th className="p-4">หมวดหมู่</th>
                                <th className="p-4 text-right">คงเหลือ</th>
                                <th className="p-4 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((p) => (
                                <tr key={p.id} className="border-t hover:bg-gray-50">
                                    <td className="p-3 text-center">
                                        {/* ✅ ใช้ API_URL ที่ประกาศไว้ */}
                                        {p.image_url ?
                                            <img src={`${API_URL}${p.image_url}`} className="w-12 h-12 rounded object-cover mx-auto" alt={p.name} />
                                            : <div className="w-12 h-12 bg-gray-100 rounded mx-auto flex items-center justify-center text-xs text-gray-400">No Img</div>
                                        }
                                    </td>
                                    <td className="p-3 text-center">
                                        {/* ✅ ใช้ API_URL ที่ประกาศไว้ */}
                                        {p.barcode_url ?
                                            <img src={`${API_URL}${p.barcode_url}`} className="h-8 mx-auto" alt="barcode" />
                                            : "-"
                                        }
                                    </td>
                                    <td className="p-3 font-mono text-sm">{p.sku}</td>
                                    <td className="p-3">{p.name}</td>
                                    <td className="p-3">{p.category}</td>
                                    <td className="p-3 text-right">{p.total_stock}</td>
                                    <td className="p-3 text-center">
                                        {role === "ADMIN" && (
                                            <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL (โค้ด Modal ส่วนนี้เหมือนเดิม แค่ตัดมาเพื่อให้สั้นลงครับ ใส่ต่อได้เลย) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h2 className="text-xl font-bold">เพิ่มสินค้าใหม่</h2>
                            <button onClick={() => setIsModalOpen(false)}><X /></button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form className="space-y-6">
                                {/* ส่วนอัปโหลดรูป */}
                                <div className="flex justify-center">
                                    <div className="w-32 h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50"
                                        onClick={() => fileInputRef.current.click()}>
                                        {imagePreview ? (
                                            <img src={imagePreview} className="w-full h-full rounded-xl object-cover" />
                                        ) : (
                                            <><Upload size={20} className="text-gray-400" /><span className="text-xs text-gray-500 mt-1">รูปสินค้า</span></>
                                        )}
                                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageChange} />
                                    </div>
                                </div>

                                {/* ส่วน SKU และ Barcode Generator (ที่ถูกซ่อนไว้สำหรับ user แต่ใช้ code ดึง) */}
                                <div>
                                    <label className="font-bold text-sm">รหัสสินค้า (SKU)</label>
                                    <div className="flex gap-2 mt-1">
                                        <input type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                            className="p-2 border rounded-lg flex-1" placeholder="ระบุ หรือกดสุ่ม" />
                                        <button type="button" onClick={handleGenerateSKU} className="p-2 bg-purple-100 text-purple-700 rounded-lg"><Wand2 /></button>
                                    </div>
                                    {formData.sku && (
                                        <div className="mt-4 p-3 border rounded-xl bg-white shadow-sm">
                                            <div ref={barcodeRef} className="flex justify-center">
                                                <Barcode value={formData.sku} format="CODE128" width={1.6} height={50} fontSize={12} />
                                            </div>
                                            <button type="button" onClick={downloadBarcode} className="mt-3 flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg w-full justify-center">
                                                <Download size={18} /> ดาวน์โหลดบาร์โค้ด
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Input อื่นๆ */}
                                <div><label className="font-bold text-sm">ชื่อสินค้า</label><input className="w-full p-2 mt-1 border rounded-lg" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="font-bold text-sm">หมวดหมู่</label><select className="w-full p-2 mt-1 border rounded-lg" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>{CATEGORIES.filter(c => c !== "ทั้งหมด").map(c => <option key={c}>{c}</option>)}</select></div>
                                    <div><label className="font-bold text-sm">หน่วยนับ</label><select className="w-full p-2 mt-1 border rounded-lg" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>{UNITS.map(u => <option key={u}>{u}</option>)}</select></div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-xl border">
                                    <label className="font-bold text-sm">ตั้งค่าสต็อกเริ่มต้น</label>
                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div><label className="text-xs">คลังสินค้า</label><select className="w-full p-2 mt-1 border rounded-lg" value={formData.warehouse_id} onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
                                        <div><label className="text-xs">จำนวนเริ่มต้น</label><input type="number" className="w-full p-2 mt-1 border rounded-lg" value={formData.initial_stock} onChange={(e) => setFormData({ ...formData, initial_stock: e.target.value })} /></div>
                                        {/* <div className="col-span-2"><label className="text-xs">จุดสั่งซื้อ (Reorder Point)</label><input type="number" className="w-full p-2 mt-1 border rounded-lg" value={formData.reorder_point} onChange={(e) => setFormData({ ...formData, reorder_point: e.target.value })} /></div> */}
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-lg bg-gray-100">ยกเลิก</button>
                            <button className="px-5 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2" onClick={handleSubmit}><Save size={18} /> บันทึกสินค้า</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}