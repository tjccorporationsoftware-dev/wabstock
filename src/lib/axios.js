const api = axios.create({
    // ลบ process.env... ทิ้งไปเลย ใส่ลิงก์ Coolify เพียวๆ
    // และอย่าลืมเปลี่ยนเป็น https (เติม s) ลองดูก่อนครับ
    baseURL: 'https://p00gko4gc80ko44c4kcc84ww.103.230.120.42.sslip.io/api',
});