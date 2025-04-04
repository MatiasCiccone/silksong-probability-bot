import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    // Check if password matches
    if (password === process.env.AUTH_PASSWORD) {
      // Set auth cookie
      cookies().set({
        name: "auth_token",
        value: password,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        // 7 days expiration
        maxAge: 60 * 60 * 24 * 7,
      })

      return NextResponse.json({ success: true })
    }

    // Invalid password
    return NextResponse.json({ success: false, message: "Invalid password" }, { status: 401 })
  } catch (error) {
    console.error("Auth error:", error)
    return NextResponse.json({ success: false, message: "Authentication failed" }, { status: 500 })
  }
}

