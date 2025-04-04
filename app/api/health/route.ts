import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

// Health check endpoint
export async function GET(request: Request) {
  const requestId = `health_${Date.now()}`

  try {
    // Get the current time
    const now = new Date()

    // Check if we're close to the scheduled cron time (within 5 minutes)
    const minutes = now.getUTCMinutes()
    const hours = now.getUTCHours()
    const isNearCronTime = hours === 23 && minutes >= 55 // 5 minutes before midnight UTC

    // Log the health check
    logger.info("Health check executed", {
      requestId,
      timestamp: now.toISOString(),
      isNearCronTime,
    })

    // Get the base URL from the request
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`

    // Test the tweet endpoint with a minimal request to check if the API is working
    let apiStatus = "unknown"
    let apiError = null

    try {
      // Only do a lightweight check - don't actually post a tweet
      const testResponse = await fetch(`${baseUrl}/api/twitter-v2`, {
        method: "HEAD",
      })

      apiStatus = testResponse.ok ? "working" : "error"

      if (!testResponse.ok) {
        apiError = `API returned status ${testResponse.status}`
      }
    } catch (error) {
      apiStatus = "error"
      apiError = error instanceof Error ? error.message : String(error)
    }

    // Return health status
    return NextResponse.json({
      status: "healthy",
      timestamp: now.toISOString(),
      utcTime: `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`,
      isNearCronTime,
      apiStatus,
      apiError,
      message: isNearCronTime ? "Cron job will run soon" : "System operational",
      requestId,
    })
  } catch (error) {
    logger.error("Health check failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : String(error),
        requestId,
      },
      { status: 500 },
    )
  }
}

// Explicitly set Node.js runtime
export const runtime = "nodejs"

