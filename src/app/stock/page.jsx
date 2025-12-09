'use client';
import { useEffect, useState, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/axios';
import Swal from 'sweetalert2';
import { Package, CheckCircle, MapPin, ChevronDown, Search, Truck } from 'lucide-react'; // เพิ่มไอคอน Truck

export default function StockOutPage() {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const [form, setForm] = useState({
        productId: '',
        warehouseId: '',
        quantity: '',
        reason: ''
    });

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products');
            setProducts(res.data);
        } catch (error) {
            console.error("Error fetching products:", error);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // ปิด Dropdown เมื่อคลิกที่อื่น
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectProduct = (product) => {
        setSelectedProduct(product);
        setForm({
            productId: product.id,
            warehouseId: '',
            quantity: '',
            reason: ''
        });
        setIsDropdownOpen(false);
        setSearchQuery('');
    };

    const handleSelectWarehouse = (whId) => {
        setForm(prev => ({ ...prev, warehouseId: whId }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.productId) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาเลือกสินค้า', 'warning');
        if (!form.warehouseId) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาเลือกคลังสินค้า', 'warning');

        const qty = parseInt(form.quantity);
        if (isNaN(qty) || qty <= 0) {
            return Swal.fire('ข้อมูลไม่ถูกต้อง', 'กรุณาระบุจำนวนที่มากกว่า 0', 'warning');
        }

        // Helper ดึงรายการสต๊อก
        const stockList = selectedProduct.stocks || selectedProduct.stock_details || [];

        // Logic เบิกออก: เช็คของพอไหม
        const selectedWhStock = stockList.find(s => s.warehouse_id === parseInt(form.warehouseId))?.quantity || 0;

        if (qty > selectedWhStock) {
            return Swal.fire({
                icon: 'error',
                title: 'สินค้าไม่พอ',
                text: `คลังนี้มีสินค้าเหลือแค่ ${selectedWhStock} ชิ้น (คุณขอเบิก ${qty})`
            });
        }

        try {
            await api.post('/stock-out', {
                ...form,
                quantity: qty
            });

            Swal.fire({
                icon: 'success',
                title: 'บันทึกการเบิกสำเร็จ',
                text: `${selectedProduct.name} จำนวน ${qty} ${selectedProduct.unit}`,
                timer: 2000,
                showConfirmButton: false
            });

            setForm(prev => ({ ...prev, quantity: '', reason: '' }));

            const res = await api.get('/products');
            setProducts(res.data);
            const updatedProduct = res.data.find(p => p.id === selectedProduct.id);
            if (updatedProduct) setSelectedProduct(updatedProduct);

        } catch (err) {
            console.error(err);
            Swal.fire('ผิดพลาด', err.response?.data?.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getProductStockList = (product) => {
        if (!product) return [];
        return product.stocks || product.stock_details || [];
    };

    return (
        <div className="flex bg-gray-50 min-h-screen">
            <Sidebar />
            <div className="flex-1 p-8 flex flex-col items-center">

                <h1 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
                    {/* 🔵 เปลี่ยนเป็นสีน้ำเงิน Blue */}
                    <span className="p-2 bg-blue-100 text-blue-600 rounded-lg shadow-sm">
                        <Truck size={32} /> {/* เปลี่ยนไอคอนเป็นรถบรรทุกเพื่อให้เข้ากับ Stock Out */}
                    </span>
                    เบิกสินค้าออก (Stock Out)
                </h1>

                <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-4xl border border-gray-100">

                    {/* ---------------- 1. เลือกสินค้า ---------------- */}
                    <div className="mb-8 relative" ref={dropdownRef}>
                        <label className="block text-sm font-bold text-gray-700 mb-2">1. เลือกสินค้าที่จะเบิก</label>

                        <div
                            className={`w-full p-4 border rounded-xl bg-gray-50 flex items-center justify-between cursor-pointer transition-colors ${
                                // 🔵 Blue Border & Ring
                                isDropdownOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-300 hover:border-blue-400'
                                }`}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            {selectedProduct ? (
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 overflow-hidden shrink-0">
                                        {selectedProduct.image_url ? (
                                            <img src={`http://localhost:3000${selectedProduct.image_url}`} className="w-full h-full object-cover" alt={selectedProduct.name} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Pic</div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-800">{selectedProduct.name}</div>
                                        <div className="text-sm text-gray-500">SKU: {selectedProduct.sku} | คงเหลือรวม: {selectedProduct.total_stock} {selectedProduct.unit}</div>
                                    </div>
                                </div>
                            ) : (
                                <span className="text-gray-400">-- ค้นหาและเลือกสินค้า --</span>
                            )}
                            <ChevronDown size={20} className="text-gray-400" />
                        </div>

                        {/* Dropdown Content */}
                        {isDropdownOpen && (
                            <div className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-100 max-h-80 overflow-hidden flex flex-col">
                                <div className="p-3 border-b border-gray-100 bg-gray-50 sticky top-0">
                                    <div className="relative">
                                        <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
                                        <input
                                            type="text" autoFocus placeholder="พิมพ์ชื่อ หรือ รหัสสินค้า..."
                                            // 🔵 Blue Focus
                                            className="w-full pl-10 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="overflow-y-auto flex-1">
                                    {filteredProducts.length > 0 ? (
                                        filteredProducts.map(product => (
                                            <div key={product.id} onClick={() => handleSelectProduct(product)}
                                                // 🔵 Blue Hover
                                                className="flex items-center gap-3 p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors">
                                                <div className="w-10 h-10 bg-gray-100 rounded-md overflow-hidden shrink-0">
                                                    {product.image_url ? (
                                                        <img src={`http://localhost:3000${product.image_url}`} className="w-full h-full object-cover" alt={product.name} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">No Pic</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-800">{product.name}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {product.sku} • คงเหลือ <span className="text-blue-600 font-bold">{product.total_stock}</span> {product.unit}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-gray-400 text-sm">ไม่พบสินค้า</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ---------------- 2. เลือกคลังสินค้า ---------------- */}
                    <div className="mb-8">
                        <label className="block text-sm font-bold text-gray-700 mb-2">2. เลือกคลังสินค้าที่จะเบิก</label>

                        {!selectedProduct ? (
                            <div className="p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center text-gray-400">
                                กรุณาเลือกสินค้าก่อน
                            </div>
                        ) : getProductStockList(selectedProduct).length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {getProductStockList(selectedProduct).map((stock, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleSelectWarehouse(stock.warehouse_id)}
                                        // 🔵 Blue Active Card
                                        className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${parseInt(form.warehouseId) === stock.warehouse_id
                                                ? 'border-blue-500 bg-blue-50 shadow-md transform scale-[1.02]'
                                                : 'border-gray-200 hover:border-blue-200 hover:shadow-sm bg-white'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2 text-gray-700 font-bold">
                                                {/* 🔵 Blue Icon */}
                                                <MapPin size={18} className={parseInt(form.warehouseId) === stock.warehouse_id ? 'text-blue-500' : 'text-gray-400'} />
                                                {stock.warehouse_name}
                                            </div>
                                            {parseInt(form.warehouseId) === stock.warehouse_id && (
                                                <CheckCircle size={20} className="text-blue-500" />
                                            )}
                                        </div>
                                        <div className="mt-3">
                                            <span className="text-xs text-gray-500">คงเหลือในคลังนี้</span>
                                            <div className={`text-2xl font-bold ${parseInt(form.warehouseId) === stock.warehouse_id ? 'text-blue-600' : 'text-gray-800'}`}>
                                                {stock.quantity} <span className="text-sm font-normal text-gray-500">{selectedProduct.unit}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 bg-red-50 rounded-xl border border-red-200 text-center text-red-500 font-medium">
                                🚫 สินค้านี้หมดสต็อกในทุกคลัง (ไม่สามารถเบิกได้)
                            </div>
                        )}
                    </div>

                    {/* ---------------- 3. ระบุจำนวนและเหตุผล ---------------- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">3. จำนวนที่จะเบิก</label>
                            <input
                                type="number" min="1" placeholder="0"
                                // 🔵 Blue Focus
                                className={`w-full p-4 border rounded-xl outline-none transition-all text-xl font-bold ${!form.warehouseId
                                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800'
                                    }`}
                                value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
                                disabled={!form.warehouseId}
                            />
                            {!form.warehouseId && selectedProduct && (
                                <p className="text-xs text-red-400 mt-1">* กรุณาเลือกคลังสินค้าก่อน</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">4. หมายเหตุ / นำไปใช้ที่ไหน</label>
                            <input
                                type="text" placeholder="เช่น ใช้ในโครงการ A, เบิกเปลี่ยนของเสีย"
                                // 🔵 Blue Focus
                                className={`w-full p-4 border rounded-xl outline-none transition-all text-gray-800 ${!form.warehouseId
                                    ? 'bg-gray-100 border-gray-200 cursor-not-allowed'
                                    : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                    }`}
                                value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                                disabled={!form.warehouseId}
                            />
                        </div>
                    </div>

                    {/* ปุ่มยืนยัน (Gradient สีน้ำเงิน) */}
                    <button
                        onClick={handleSubmit}
                        disabled={!form.warehouseId || !form.quantity || parseInt(form.quantity) <= 0}
                        className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg flex justify-center items-center gap-2 transition-all active:scale-[0.98] ${!form.warehouseId || !form.quantity || parseInt(form.quantity) <= 0
                            ? 'bg-gray-300 cursor-not-allowed shadow-none'
                            : 'bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-xl'
                            }`}
                    >
                        ยืนยันการเบิกออก
                    </button>

                </div>
            </div>
        </div>
    );
}