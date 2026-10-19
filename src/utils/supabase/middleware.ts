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

  // Protect routes. Match whole path segments: a bare startsWith('/m') also matched
  // /monthly-transactions and /monthly-dps-svc and let them skip the login redirect.
  const path = request.nextUrl.pathname
  const isUnder = (prefix: string) => path === prefix || path.startsWith(prefix + '/')
  const isLoginPage = isUnder('/login')
  // Password recovery is for users who cannot log in (the emailed reset link has no session).
  const isAuthPage = isUnder('/auth') || isUnder('/forgot-password') || isUnder('/reset-password')
  const isPublicRoute = isUnder('/public')
  const isPublicFile = path.match(/\.(.*)$/)
  const isApi = isUnder('/api')
  const isMobileRoute = isUnder('/m')

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
