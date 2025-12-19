import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
    // ⚠️ ลบ process.env ทิ้งไปเลยครับ ใส่ลิงก์ Coolify เพียวๆ
    // หมายเหตุ: ผมลองเปลี่ยนเป็น https ให้ก่อน เผื่อ sslip.io รองรับ
    baseURL: 'https://p00gko4gc80ko44c4kcc84ww.103.230.120.42.sslip.io/api',
});

// ... (ส่วน interceptors เก็บไว้เหมือนเดิม) ...

export default api;