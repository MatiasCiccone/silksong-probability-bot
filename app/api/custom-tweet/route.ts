import { NextResponse } from "next/server"

// Post a custom tweet
export async function POST(request: Request) {
  try {
    // Get the tweet text from the request body
    const { text } = await request.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ success: false, message: "Tweet text is required" }, { status: 400 })
    }

    // Get the base URL from the request
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`

    // Call our Twitter API v2 route
    const response = await fetch(`${baseUrl}/api/twitter-v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || data.message)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error posting custom tweet:", error)

    return NextResponse.json(
      { success: false, message: "Failed to post custom tweet", error: String(error) },
      { status: 500 },
    )
  }
}

// Explicitly set Node.js runtime
export const runtime = "nodejs"

