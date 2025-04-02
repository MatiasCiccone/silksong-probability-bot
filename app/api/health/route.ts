import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

// Health check endpoint
export async function GET(request: Request) {
  try {
    // Get the current time
    const now = new Date()

    // Check if we're close to the scheduled cron time (within 5 minutes)
    const minutes = now.getUTCMinutes()
    const hours = now.getUTCHours()
    const isNearCronTime = hours === 23 && minutes >= 55 // 5 minutes before midnight UTC

    // Log the health check
    logger.info("Health check executed", {
      timestamp: now.toISOString(),
      isNearCronTime,
    })

    // Return health status
    return NextResponse.json({
      status: "healthy",
      timestamp: now.toISOString(),
      utcTime: `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`,
      isNearCronTime,
      message: isNearCronTime ? "Cron job will run soon" : "System operational",
    })
  } catch (error) {
    logger.error("Health check failed", error)

    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// Explicitly set Node.js runtime
export const runtime = "nodejs"

