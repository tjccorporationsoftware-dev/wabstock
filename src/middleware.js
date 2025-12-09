import { NextResponse } from 'next/server'

export function middleware(request) {
    // 1. ดึง Path ปัจจุบันที่ผู้ใช้กำลังจะเข้า
    const path = request.nextUrl.pathname

    // 2. กำหนด Path ที่เป็น Public (ใครก็เข้าได้ไม่ต้อง Login)
    const isPublicPath = path === '/login'

    // 3. ดึง Token จาก Cookie (เปลี่ยน 'token' เป็นชื่อคุกกี้ที่คุณใช้เก็บ session)
    const token = request.cookies.get('token')?.value || ''

    // 4. เงื่อนไข: ถ้ามี Token (Login แล้ว) แต่พยายามเข้าหน้า Login -> ให้เด้งไป Dashboard
    if (isPublicPath && token) {
        return NextResponse.redirect(new URL('/dashboard', request.nextUrl))
    }

    // 5. เงื่อนไข: ถ้าไม่มี Token (ยังไม่ Login) และไม่ใช่หน้า Public -> ให้เด้งไปหน้า Login
    if (!isPublicPath && !token) {
        return NextResponse.redirect(new URL('/login', request.nextUrl))
    }

    // ถ้าผ่านเงื่อนไขทั้งหมด ให้ไปต่อได้
    return NextResponse.next()
}

// กำหนดว่า Middleware นี้จะทำงานกับ Route ไหนบ้าง
export const config = {
    matcher: [
        '/dashboard/:path*',  // ล็อคหน้า dashboard และลูกๆ ของมันทั้งหมด
        '/history/:path*',
        '/products/:path*',
        '/stock/:path*',
        '/warehouses/:path*',
        // ไม่ต้องใส่ /login เพราะเราอยากให้คนเข้าได้
    ],
}