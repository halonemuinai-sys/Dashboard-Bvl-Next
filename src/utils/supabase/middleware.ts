import { NextResponse, type NextRequest } from 'next/server'
import { verifySessionToken } from '@/utils/auth'

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  // Ambil token session dari cookie
  const sessionCookie = request.cookies.get('session_token')
  const token = sessionCookie ? sessionCookie.value : ''

  // Verifikasi token session secara lokal
  let user = null
  if (token) {
    user = await verifySessionToken(token)
  }

  // Protect routes
  const isLoginPage = request.nextUrl.pathname.startsWith('/login')
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isPublicRoute = request.nextUrl.pathname.startsWith('/public')
  const isPublicFile = request.nextUrl.pathname.match(/\.(.*)$/)
  const isApi = request.nextUrl.pathname.startsWith('/api')
  const isMobileRoute = request.nextUrl.pathname.startsWith('/m')

  // Jika tidak login, redirect ke halaman login
  if (!user && !isLoginPage && !isAuthPage && !isPublicRoute && !isPublicFile && !isApi && !isMobileRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Jika sudah login dan mencoba masuk ke halaman login, redirect ke home
  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
