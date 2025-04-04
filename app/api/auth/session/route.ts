import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import crypto from "crypto"

// Generate a session token for authenticated users
export async function GET(request: Request) {
  try {
    // Check if the user is authenticated
    const authCookie = cookies().get("auth_token")

    if (authCookie?.value !== process.env.AUTH_PASSWORD) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    // Generate a session token
    const sessionToken = crypto.randomBytes(32).toString("hex")

    // Store the session token in a cookie
    cookies().set({
      name: "session_token",
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      // Short expiration - 1 hour
      maxAge: 60 * 60,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Session token generation error:", error)
    return NextResponse.json({ success: false, message: "Failed to generate session token" }, { status: 500 })
  }
}

