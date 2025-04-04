import { type NextRequest, NextResponse } from "next/server"

// Define which paths should be public (no auth required)
const PUBLIC_PATHS = [
  "/api/cron", // Allow Vercel cron job to run without auth
  "/login", // Login page must be public
  "/favicon.ico",
  "/api/auth", // Auth API for login
]

// Check if a path should be public
const isPublicPath = (path: string) => {
  return PUBLIC_PATHS.some((publicPath) => path.startsWith(publicPath))
}

// Check if a path is an API route that needs API key auth
const isApiPath = (path: string) => {
  return path.startsWith("/api/") && !isPublicPath(path)
}

// Check if we're in development mode
const isDevelopmentMode = () => {
  return process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview"
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths without authentication
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Bypass authentication in development mode or v0 preview
  if (isDevelopmentMode()) {
    return NextResponse.next()
  }

  // For API routes, check for API key or session token
  if (isApiPath(pathname)) {
    const apiKey = process.env.API_SECRET_KEY
    const authHeader = request.headers.get("authorization")
    const isCronJob = request.headers.get("x-cron-job") === "true"

    // Check for session token in cookies for browser requests
    const sessionToken = request.cookies.get("session_token")
    const hasValidSession = sessionToken?.value ? true : false

    // If it's a cron job, has a valid API key, or has a valid session, allow it
    if (isCronJob || authHeader === `Bearer ${apiKey}` || hasValidSession) {
      return NextResponse.next()
    }

    // API key is invalid, return 401 Unauthorized
    return new NextResponse(JSON.stringify({ success: false, message: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    })
  }

  // For UI routes, check for auth cookie
  const authCookie = request.cookies.get("auth_token")

  if (authCookie?.value === process.env.AUTH_PASSWORD) {
    return NextResponse.next()
  }

  // No valid auth, redirect to login
  const url = request.nextUrl.clone()
  url.pathname = "/login"
  url.search = `?redirect=${encodeURIComponent(pathname)}`

  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next (Next.js internals)
     * 2. /_static (static files)
     * 3. /_vercel (Vercel internals)
     * 4. /public (public files)
     */
    "/((?!_next|_static|_vercel|public).*)",
  ],
}

