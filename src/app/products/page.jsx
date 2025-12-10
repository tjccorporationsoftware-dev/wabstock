'use client';
import { useEffect, useState, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/axios';
import Swal from 'sweetalert2';
import Cookies from 'js-cookie';
// เพิ่ม Edit ไอคอน
import { Filter, Search, Trash2, Plus, X, Upload, Wand2, Save, Download, ZoomIn, FileSpreadsheet, Edit } from 'lucide-react';
import Barcode from 'react-barcode';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const CATEGORIES = ["ทั้งหมด", "เครื่องมือแพทย์", "อุปกรณ์ไฟฟ้า", "อุปกรณ์คอมพิวเตอร์", "ครุภัณฑ์"];
const UNITS = ["ชิ้น", "กล่อง", "แพ็ค", "โหล", "เครื่อง", "ชุด", "อัน", "ตัว"];

const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
    const [role, setRole] = useState('');
    const [warehouses, setWarehouses] = useState([]);

    // State สำหรับ Modal และการแก้ไข
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null); // เก็บ ID สินค้าที่กำลังแก้ไข (null = เพิ่มใหม่)
    const [selectedSku, setSelectedSku] = useState(null);
    const viewerRef = useRef(null);

    const [formData, setFormData] = useState({
        sku: '', name: '', category: CATEGORIES[1], unit: UNITS[0],
        cost_price: '', sale_price: '', reorder_point: 10,
        initial_stock: '', warehouse_id: '' // ใช้เฉพาะตอนเพิ่มใหม่
    });

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);
    const barcodeRef = useRef(null);

    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `${BASE_API_URL}${url}`;
    };

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

    const handleExportExcel = async () => {
        Swal.fire({ title: 'กำลังสร้างไฟล์ Excel...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Products');

            worksheet.columns = [
                { header: 'วันที่ข้อมูล', key: 'date', width: 20 },
                { header: 'รูปบาร์โค้ด', key: 'barcode_img', width: 25 },
                { header: 'รหัสสินค้า (SKU)', key: 'sku', width: 20 },
                { header: 'ชื่อสินค้า', key: 'name', width: 30 },
                { header: 'หมวดหมู่', key: 'category', width: 15 },
                { header: 'หน่วยนับ', key: 'unit', width: 10 },
                { header: 'คงเหลือรวม', key: 'total_stock', width: 15 },
            ];

            const now = new Date();
            const dateStr = `${now.toLocaleDateString('th-TH')} ${now.toLocaleTimeString('th-TH')}`;

            for (let i = 0; i < filteredProducts.length; i++) {
                const p = filteredProducts[i];
                const row = worksheet.addRow({
                    date: dateStr,
                    sku: p.sku,
                    name: p.name,
                    category: p.category,
                    unit: p.unit,
                    total_stock: p.total_stock,
                    barcode_img: ''
                });

                row.height = 60;

                if (p.barcode_url) {
                    try {
                        const imgUrl = getImageUrl(p.barcode_url);
                        const response = await fetch(imgUrl);
                        const buffer = await response.arrayBuffer();
                        const imageId = workbook.addImage({ buffer: buffer, extension: 'png' });
                        worksheet.addImage(imageId, {
                            tl: { col: 1, row: row.number - 1 },
                            ext: { width: 150, height: 75 }
                        });
                    } catch (err) {
                        row.getCell('barcode_img').value = 'No Image';
                    }
                } else {
                    row.getCell('barcode_img').value = '-';
                }
            }

            worksheet.eachRow((row) => {
                row.eachCell((cell) => {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Stock_Products_${now.toISOString().split('T')[0]}.xlsx`);
            Swal.close();
        } catch (error) {
            console.error(error);
            Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถสร้างไฟล์ Excel ได้", "error");
        }
    };

    // ✅ ปรับปรุง handleOpenModal: รองรับทั้งเพิ่มและแก้ไข
    const handleOpenModal = (product = null) => {
        if (product) {
            // โหมดแก้ไข
            setEditingId(product.id);
            setFormData({
                sku: product.sku,
                name: product.name,
                category: product.category,
                unit: product.unit,
                cost_price: product.cost_price || 0,
                sale_price: product.sale_price || 0,
                reorder_point: product.reorder_point || 0,
                initial_stock: '', // ไม่ให้แก้สต็อกที่นี่
                warehouse_id: ''
            });
            setImagePreview(getImageUrl(product.image_url));
        } else {
            // โหมดเพิ่มใหม่
            setEditingId(null);
            setFormData({
                sku: '', name: '', category: CATEGORIES[1], unit: UNITS[0],
                cost_price: '', sale_price: '', reorder_point: 10,
                initial_stock: '',
                warehouse_id: warehouses[0]?.id || ''
            });
            setImagePreview(null);
        }
        setImageFile(null);
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
        saveSvgAsPng(svg, formData.sku);
    };

    const downloadFromViewer = () => {
        const svg = viewerRef.current.querySelector("svg");
        if (!svg) return;
        saveSvgAsPng(svg, selectedSku);
    };

    const saveSvgAsPng = (svg, filename) => {
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
            link.download = `${filename}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        };
        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    }

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

    // ✅ ปรับปรุง handleSubmit: รองรับทั้ง POST (เพิ่ม) และ PUT (แก้ไข)
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

        // ส่งข้อมูลสต็อกเฉพาะตอนเพิ่มใหม่เท่านั้น (แก้ไขไม่ส่ง)
        if (!editingId && formData.initial_stock && formData.warehouse_id) {
            data.append("initial_stock", formData.initial_stock);
            data.append("warehouse_id", formData.warehouse_id);
        }

        if (imageFile) data.append("image", imageFile);

        // สร้างบาร์โค้ดใหม่เฉพาะถ้าไม่มีรูปบาร์โค้ดเดิม หรือมีการเปลี่ยน SKU
        if (formData.sku) {
            try {
                const barcodeFile = await getBarcodeFile();
                if (barcodeFile) data.append("barcode_image", barcodeFile);
            } catch (err) { console.error("Barcode Error", err); }
        }

        try {
            if (editingId) {
                // กรณีแก้ไข (PUT)
                await api.put(`/products/${editingId}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                // กรณีเพิ่มใหม่ (POST)
                await api.post('/products', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            Swal.fire({ icon: "success", title: "สำเร็จ", text: "บันทึกเรียบร้อย", timer: 1500, showConfirmButton: false });
            setIsModalOpen(false);
            fetchProducts();
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.error || "บันทึกไม่สำเร็จ";
            Swal.fire("ผิดพลาด", errorMsg, "error");
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

                    <div className="flex gap-3">
                        <button
                            onClick={handleExportExcel}
                            className="bg-green-600 text-white px-5 py-2 rounded-xl flex gap-2 items-center hover:bg-green-700 transition shadow-sm"
                        >
                            <FileSpreadsheet size={20} /> Export Excel
                        </button>

                        {role === "ADMIN" && (
                            // กดปุ่มเพิ่ม -> ส่ง null ไป handleOpenModal
                            <button className="bg-blue-600 text-white px-5 py-2 rounded-xl flex gap-2 items-center hover:bg-blue-700 transition shadow-sm" onClick={() => handleOpenModal(null)}>
                                <Plus /> เพิ่มสินค้า
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-3.5 text-gray-600" size={20} />
                        <input type="text" placeholder="ค้นหา..." className="w-full p-3 pl-10 border rounded-xl"
                            value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-3.5 text-gray-600" size={20} />
                        <select className="p-3 pl-10 border rounded-xl" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <table className="w-full table-auto">
                        <thead className="bg-gray-100">
                            <tr>
                                {/* ✅ หัวข้อคอลัมน์ห้ามตัด (whitespace-nowrap) */}
                                <th className="p-4 text-left text-gray-800 whitespace-nowrap">รูปสินค้า</th>
                                <th className="p-4 text-left text-gray-800 whitespace-nowrap">รูปบาร์โค้ด</th>
                                <th className="p-4 text-left text-gray-800 whitespace-nowrap">รหัสสินค้า</th>
                                <th className="p-4 text-left text-gray-800 whitespace-nowrap">ชื่อสินค้า</th>
                                <th className="p-4 text-left text-gray-800 whitespace-nowrap">หมวดหมู่</th>
                                <th className="p-4 text-center text-gray-800 whitespace-nowrap">คงเหลือ</th>
                                <th className="p-4 text-center text-gray-800 whitespace-nowrap">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((p) => (
                                <tr key={p.id} className="border-t hover:bg-gray-50 align-top">
                                    <td className="p-3 text-center">
                                        {p.image_url ?
                                            <img src={getImageUrl(p.image_url)} className="w-12 h-12 rounded object-cover mx-auto" alt={p.name} />
                                            : <div className="w-12 h-12 bg-gray-100 rounded mx-auto flex items-center justify-center text-xs text-gray-400">No Img</div>
                                        }
                                    </td>

                                    <td className="p-3 text-center cursor-pointer group relative" onClick={() => setSelectedSku(p.sku)}>
                                        <div className="flex flex-col items-center justify-center">
                                            {p.barcode_url ?
                                                <img src={getImageUrl(p.barcode_url)} className="h-full w-40 mx-auto" alt="barcode" />
                                                : "-"
                                            }
                                            <div className="text-[10px] text-blue-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                <ZoomIn size={12} className="text-blue-600" /> ขยาย
                                            </div>
                                        </div>
                                    </td>

                                    <td className="p-3 font-mono text-sm pt-4 text-gray-800 whitespace-nowrap">{p.sku}</td>

                                    {/* ✅ ชื่อสินค้าตัดลงบรรทัดใหม่ได้ (break-words) และจำกัดความกว้าง */}
                                    <td className="p-3 pt-4 text-gray-800 wrap-break-word whitespace-normal max-w-[250px]">
                                        {p.name}
                                    </td>

                                    <td className="p-3 pt-4 text-gray-800 whitespace-nowrap">{p.category}</td>

                                    {/* ✅ แสดงแค่ยอดรวม ไม่แยกคลัง */}
                                    <td className="p-3 text-center pt-4">
                                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${p.total_stock <= p.reorder_point ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {p.total_stock} {p.unit}
                                        </span>
                                    </td>

                                    <td className="p-3 text-center pt-4 whitespace-nowrap">
                                        {role === "ADMIN" && (
                                            <div className="flex items-center justify-center gap-2">
                                                {/* ปุ่มแก้ไข */}
                                                <button onClick={() => handleOpenModal(p)} className="text-blue-500 hover:bg-blue-50 p-2 rounded transition">
                                                    <Edit size={18} />
                                                </button>
                                                {/* ปุ่มลบ */}
                                                <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded transition">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL เพิ่ม/แก้ไข สินค้า */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b">
                            {/* เปลี่ยนหัวข้อตามโหมด */}
                            <h2 className="text-xl font-bold">{editingId ? "แก้ไขข้อมูลสินค้า" : "เพิ่มสินค้าใหม่"}</h2>
                            <button onClick={() => setIsModalOpen(false)}><X /></button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form className="space-y-6">
                                <div className="flex justify-center">
                                    <div className="w-32 h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50"
                                        onClick={() => fileInputRef.current.click()}>
                                        {imagePreview ? (
                                            <img src={imagePreview} className="w-full h-full rounded-xl object-cover" />
                                        ) : (
                                            <><Upload size={20} className="text-gray-500" /><span className="text-xs text-gray-600 mt-1">รูปสินค้า</span></>
                                        )}
                                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageChange} />
                                    </div>
                                </div>
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
                                <div><label className="font-bold text-sm">ชื่อสินค้า</label><input className="w-full p-2 mt-1 border rounded-lg" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="font-bold text-sm">หมวดหมู่</label><select className="w-full p-2 mt-1 border rounded-lg" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>{CATEGORIES.filter(c => c !== "ทั้งหมด").map(c => <option key={c}>{c}</option>)}</select></div>
                                    <div><label className="font-bold text-sm">หน่วยนับ</label><select className="w-full p-2 mt-1 border rounded-lg" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>{UNITS.map(u => <option key={u}>{u}</option>)}</select></div>
                                </div>

                                {/* ✅ แสดงส่วนนี้เฉพาะตอนเพิ่มใหม่เท่านั้น (แก้ไขไม่ให้แก้สต็อกที่นี่) */}
                                {!editingId && (
                                    <div className="p-4 bg-gray-50 rounded-xl border">
                                        <label className="font-bold text-sm">ตั้งค่าสต็อกเริ่มต้น</label>
                                        <div className="grid grid-cols-2 gap-4 mt-2">
                                            <div className="text-gray-700"><label className="text-xs">คลังสินค้า</label><select className="w-full p-2 mt-1 border rounded-lg" value={formData.warehouse_id} onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
                                            <div className="text-gray-700"><label className="text-xs">จำนวนเริ่มต้น</label><input type="number" className="w-full p-2 mt-1 border rounded-lg" value={formData.initial_stock} onChange={(e) => setFormData({ ...formData, initial_stock: e.target.value })} /></div>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-lg bg-gray-100">ยกเลิก</button>
                            <button className="px-5 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2" onClick={handleSubmit}>
                                <Save size={18} /> {editingId ? "อัปเดตข้อมูล" : "บันทึกสินค้า"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL แสดงบาร์โค้ดขนาดใหญ่ */}
            {selectedSku && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-60 backdrop-blur-sm"
                    onClick={() => setSelectedSku(null)}>
                    <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-200"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between w-full items-center">
                            <h3 className="text-lg font-bold text-gray-800">Barcode Viewer</h3>
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
                            <button onClick={() => setSelectedSku(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 font-medium">
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