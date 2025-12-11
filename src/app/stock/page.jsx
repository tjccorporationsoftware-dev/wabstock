'use client';
import { useEffect, useState, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/axios';
import Swal from 'sweetalert2';
// ✅ เพิ่ม Plus เข้าไปใน import แล้วครับ
import { Truck, Search, Plus, ShoppingCart, X, MapPin, Package, AlertTriangle, ScanBarcode, Warehouse, Check, Box } from 'lucide-react';

const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function StockOutModernPage() {
    // --- Data State ---
    const [allProducts, setAllProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [cart, setCart] = useState([]);
    const [reason, setReason] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // --- Filter State ---
    const [selectedFilterWarehouse, setSelectedFilterWarehouse] = useState('ALL');

    // --- Modal State ---
    const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
    const [selectedProductForAdd, setSelectedProductForAdd] = useState(null);

    const [isLoading, setIsLoading] = useState(true);
    const searchInputRef = useRef(null);

    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `${BASE_API_URL}${url}`;
    };

    // 1. โหลดข้อมูล (สินค้า + คลังสินค้า)
    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [productsRes, warehousesRes] = await Promise.all([
                api.get('/products'),
                api.get('/warehouses')
            ]);
            setAllProducts(productsRes.data);
            setWarehouses(warehousesRes.data);
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // 2. ฟังก์ชันเมื่อกดที่สินค้า
    const handleProductClick = (product) => {
        if (!product.stocks || product.stocks.every(s => s.quantity <= 0)) {
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'warning', title: 'สินค้าหมดสต็อก' });
            return;
        }

        if (selectedFilterWarehouse !== 'ALL') {
            const targetStock = product.stocks.find(s => s.warehouse_id === selectedFilterWarehouse);
            if (targetStock && targetStock.quantity > 0) {
                addToCart(product, targetStock);
            } else {
                Swal.fire('สินค้าหมด', 'สินค้านี้ไม่มีในคลังที่คุณเลือก', 'warning');
            }
            return;
        }

        const availableWarehouses = product.stocks.filter(s => s.quantity > 0);
        if (availableWarehouses.length === 1) {
            addToCart(product, availableWarehouses[0]);
        } else {
            setSelectedProductForAdd(product);
            setIsWarehouseModalOpen(true);
        }
    };

    // 3. เพิ่มลงตะกร้า
    const addToCart = (product, stockInfo) => {
        const warehouseId = stockInfo.warehouse_id || stockInfo.warehouse?.id;
        const warehouseName = stockInfo.warehouse_name || stockInfo.warehouse?.name;
        const uniqueKey = `${product.id}-${warehouseId}`;
        const exists = cart.find(item => item.uniqueKey === uniqueKey);

        if (exists) {
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
            Toast.fire({ icon: 'info', title: 'รายการนี้อยู่ในตะกร้าแล้ว' });
        } else {
            const newItem = {
                uniqueKey: uniqueKey,
                productId: product.id,
                name: product.name,
                sku: product.sku,
                unit: product.unit,
                image_url: product.image_url,
                warehouseId: warehouseId,
                warehouseName: warehouseName,
                maxQty: stockInfo.quantity,
                inputQty: ''
            };
            setCart([...cart, newItem]);
        }

        setIsWarehouseModalOpen(false);
        setSelectedProductForAdd(null);
    };

    const removeFromCart = (uniqueKey) => {
        setCart(cart.filter(item => item.uniqueKey !== uniqueKey));
    };

    const updateCartQty = (uniqueKey, value) => {
        setCart(cart.map(item => {
            if (item.uniqueKey === uniqueKey) {
                const val = parseInt(value);
                if (val > item.maxQty) return { ...item, inputQty: item.maxQty };
                return { ...item, inputQty: value };
            }
            return item;
        }));
    };

    const handleSubmit = async () => {
        if (cart.length === 0) return Swal.fire('ตะกร้าว่าง', 'กรุณาเลือกสินค้าก่อน', 'warning');
        if (!reason.trim()) return Swal.fire('ขาดเหตุผล', 'กรุณาระบุเหตุผลด้านล่างขวา', 'warning');

        const invalidItems = cart.filter(item => !item.inputQty || parseInt(item.inputQty) <= 0);
        if (invalidItems.length > 0) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุจำนวนสินค้าให้ถูกต้อง', 'warning');

        Swal.fire({
            title: 'ยืนยันการเบิก?',
            text: `ต้องการเบิกสินค้า ${cart.length} รายการ`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยันการเบิก',
            confirmButtonColor: '#d33'
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'กำลังบันทึก...', didOpen: () => Swal.showLoading() });
                try {
                    await Promise.all(cart.map(item =>
                        api.post('/stock-out', {
                            productId: item.productId,
                            warehouseId: item.warehouseId,
                            quantity: parseInt(item.inputQty),
                            reason: reason
                        })
                    ));
                    Swal.fire('สำเร็จ', 'ตัดสต๊อกเรียบร้อย', 'success');
                    setCart([]);
                    setReason('');
                    const res = await api.get('/products');
                    setAllProducts(res.data);
                } catch (err) {
                    Swal.fire('Error', 'เกิดข้อผิดพลาด', 'error');
                }
            }
        });
    };

    const filteredProducts = allProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchQuery.toLowerCase());

        if (selectedFilterWarehouse === 'ALL') return matchesSearch;

        const hasStockInWarehouse = p.stocks?.some(s => s.warehouse_id === selectedFilterWarehouse && s.quantity > 0);
        return matchesSearch && hasStockInWarehouse;
    });

    return (
        <div className="flex bg-[#F3F4F6] min-h-screen font-sans">
            <Sidebar />

            <div className="flex-1 flex flex-col md:flex-row h-screen overflow-hidden">

                {/* ================= LEFT: Catalog & Search ================= */}
                <div className="flex-1 flex flex-col relative">

                    {/* Header */}
                    <div className="p-6 bg-white shadow-sm z-10 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <Truck className="text-blue-600" /> เบิกสินค้า (Stock Out)
                            </h1>
                        </div>

                        {/* Search Bar */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-6 w-6 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="block w-full pl-12 pr-12 py-3 bg-gray-50 border-0 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-lg shadow-inner"
                                placeholder="พิมพ์ชื่อหรือรหัสสินค้า..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <ScanBarcode className="h-6 w-6 text-gray-400" />
                            </div>
                        </div>

                        {/* Filter Bar */}
                        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                            <button
                                onClick={() => setSelectedFilterWarehouse('ALL')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${selectedFilterWarehouse === 'ALL'
                                    ? 'bg-gray-800 text-white border-gray-800 shadow-md'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                                    }`}
                            >
                                <Warehouse size={16} /> ทั้งหมด
                                {selectedFilterWarehouse === 'ALL' && <Check size={14} />}
                            </button>

                            {warehouses.map(wh => (
                                <button
                                    key={wh.id}
                                    onClick={() => setSelectedFilterWarehouse(wh.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${selectedFilterWarehouse === wh.id
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                                        }`}
                                >
                                    {wh.name}
                                    {selectedFilterWarehouse === wh.id && <Check size={14} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ✅ List View */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/50">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-64 text-gray-400">กำลังโหลดข้อมูล...</div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400 opacity-60">
                                <Package size={64} className="mb-4" />
                                <p className="text-lg">ไม่พบสินค้า {selectedFilterWarehouse !== 'ALL' && 'ในคลังนี้'}</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase border-b">
                                        <tr>
                                            <th className="p-4 w-16 text-center">รูป</th>
                                            <th className="p-4">ชื่อสินค้า / รหัส</th>
                                            <th className="p-4 text-center">สถานะ</th>
                                            <th className="p-4 text-right whitespace-nowrap">คงเหลือ</th>
                                            <th className="p-4 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredProducts.map(product => {
                                            const isOutOfStock = !product.stocks || product.stocks.every(s => s.quantity <= 0);
                                            let displayStock = product.total_stock;
                                            let stockLabel = "รวมทุกคลัง";

                                            if (selectedFilterWarehouse !== 'ALL') {
                                                const stock = product.stocks?.find(s => s.warehouse_id === selectedFilterWarehouse);
                                                displayStock = stock ? stock.quantity : 0;
                                                stockLabel = "ในคลังนี้";
                                            }

                                            return (
                                                <tr
                                                    key={product.id}
                                                    onClick={() => handleProductClick(product)}
                                                    className={`group transition-colors cursor-pointer ${isOutOfStock || displayStock <= 0
                                                            ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                                                            : 'hover:bg-blue-50/50'
                                                        }`}
                                                >
                                                    {/* รูปสินค้า */}
                                                    <td className="p-3 text-center">
                                                        <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 overflow-hidden mx-auto flex items-center justify-center">
                                                            {product.image_url ? (
                                                                <img src={getImageUrl(product.image_url)} className="w-full h-full object-cover" />
                                                            ) : <Box size={20} className="text-gray-300" />}
                                                        </div>
                                                    </td>

                                                    {/* ชื่อและรหัส */}
                                                    <td className="p-3">
                                                        <div className="font-bold text-gray-800 text-sm mb-1">{product.name}</div>
                                                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-gray-100 text-gray-500">
                                                            {product.sku}
                                                        </div>
                                                    </td>

                                                    {/* สถานะ */}
                                                    <td className="p-3 text-center">
                                                        {isOutOfStock ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold border border-red-100">
                                                                <AlertTriangle size={10} /> หมด
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-gray-500">{stockLabel}</span>
                                                        )}
                                                    </td>

                                                    {/* คงเหลือ */}
                                                    <td className="p-3 text-right">
                                                        <div className={`text-lg font-bold ${displayStock <= 0 ? 'text-gray-400' : 'text-blue-600'}`}>
                                                            {displayStock}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400">{product.unit}</div>
                                                    </td>

                                                    {/* ปุ่ม + */}
                                                    <td className="p-3 text-center">
                                                        {!isOutOfStock && displayStock > 0 && (
                                                            <button className="p-2 rounded-full bg-blue-100 text-blue-600 opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-600 hover:text-white">
                                                                <Plus size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* ================= RIGHT: Cart ================= */}
                <div className="w-full md:w-[400px] lg:w-[450px] bg-white border-l shadow-2xl z-20 flex flex-col h-full">
                    <div className="p-5 border-b bg-gray-50/50 backdrop-blur-sm sticky top-0">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                            <ShoppingCart className="text-blue-600 fill-blue-100" /> รายการที่เลือก ({cart.length})
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAFAFA]">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-3">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                                    <ShoppingCart size={40} className="opacity-30" />
                                </div>
                                <p className="text-sm">ยังไม่มีรายการ</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.uniqueKey} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative group animate-in slide-in-from-right-4 duration-300">
                                    <button onClick={() => removeFromCart(item.uniqueKey)} className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                                        <X size={16} />
                                    </button>

                                    <div className="flex gap-3 mb-3 pr-6">
                                        <div className="w-12 h-12 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                                            {item.image_url ? <img src={getImageUrl(item.image_url)} className="w-full h-full object-cover" /> : null}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-gray-800 line-clamp-1">{item.name}</div>
                                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                                <MapPin size={10} /> {item.warehouseName}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded-xl">
                                        <span className="text-xs text-gray-500 ml-2">คงเหลือ: {item.maxQty}</span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                placeholder="0"
                                                className="w-20 p-1.5 bg-white border border-gray-200 rounded-lg text-center font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={item.inputQty}
                                                onChange={(e) => updateCartQty(item.uniqueKey, e.target.value)}
                                                autoFocus
                                            />
                                            <span className="text-xs font-bold text-gray-600 w-8">{item.unit}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-5 border-t bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                        <div className="mb-4">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">เหตุผลในการเบิก</label>
                            <input
                                type="text"
                                placeholder="เช่น นำไปใช้หน้างาน A..."
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={cart.length === 0}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg shadow-red-200 flex justify-center items-center gap-2 transition-all active:scale-[0.98] ${cart.length === 0
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                : 'bg-linear-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'}`}
                        >
                            <Truck size={20} /> ยืนยันการเบิก
                        </button>
                    </div>
                </div>
            </div>

            {/* ================= MODAL: เลือกคลังสินค้า (แสดงเฉพาะตอนเลือก Filter = All) ================= */}
            {isWarehouseModalOpen && selectedProductForAdd && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">เลือกคลังสินค้าต้นทาง</h3>
                                <p className="text-sm text-gray-500">สินค้านี้มีอยู่ในหลายคลัง</p>
                            </div>
                            <button onClick={() => setIsWarehouseModalOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {selectedProductForAdd.stocks.map((stock, idx) => (
                                <button
                                    key={idx}
                                    disabled={stock.quantity <= 0}
                                    onClick={() => addToCart(selectedProductForAdd, stock)}
                                    className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all group ${stock.quantity <= 0
                                        ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                                        : 'border-gray-100 bg-white hover:border-blue-500 hover:bg-blue-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${stock.quantity > 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'}`}>
                                            <MapPin size={20} />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-gray-800 group-hover:text-blue-700">{stock.warehouse_name || stock.warehouse?.name}</div>
                                            <div className="text-xs text-gray-500">คลังเก็บสินค้า</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-xl font-bold ${stock.quantity > 0 ? 'text-gray-800' : 'text-red-400'}`}>
                                            {stock.quantity}
                                        </div>
                                        <div className="text-xs text-gray-400">{selectedProductForAdd.unit}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}