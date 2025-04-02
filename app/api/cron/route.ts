import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { retry } from "@/lib/retry"

// This route will be called by Vercel Cron
export async function GET(request: Request) {
  const startTime = Date.now()
  const executionId = `cron_${startTime}`

  logger.info(`Cron job started`, { executionId })

  try {
    // Get the base URL from the request
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`

    // Call our tweet endpoint with retry logic
    const response = await retry(
      async () => {
        const res = await fetch(`${baseUrl}/api/tweet`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        })

        const data = await res.json()

        if (!data.success) {
          throw new Error(data.message || "Unknown error in tweet endpoint")
        }

        return { res, data }
      },
      {
        retries: 5, // More retries for the cron job
        initialDelay: 2000,
        maxDelay: 30000, // Longer max delay
        onRetry: (error, attempt) => {
          logger.warn(`Cron retry attempt ${attempt} after error`, { error: error.message, executionId })
        },
      },
    )

    const { data } = response

    // Calculate execution time
    const executionTime = Date.now() - startTime

    logger.info(`Cron job completed successfully`, {
      executionId,
      executionTime,
      tweetId: data.data.tweetId,
      probability: data.data.probability,
    })

    // Send a ping to a monitoring service (optional)
    try {
      // You can replace this with an actual monitoring service like UptimeRobot, Cronitor, etc.
      // await fetch('https://cronitor.link/p/your-monitor-id', { method: 'GET' });

      // For now, we'll just log it
      logger.info("Monitoring ping would be sent here", { executionId })
    } catch (monitorError) {
      logger.warn("Failed to send monitoring ping", { error: String(monitorError) })
      // Don't throw this error as it's not critical
    }

    return NextResponse.json({
      success: true,
      message: "Cron job executed successfully",
      executionTime,
      executionId,
      data,
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    logger.error(`Cron job failed after ${executionTime}ms`, error)

    // Send a failure alert (optional)
    try {
      // You can replace this with an actual alerting service
      // await fetch('https://your-alert-service.com/api/alert', {
      //   method: 'POST',
      //   body: JSON.stringify({ error: String(error), executionId })
      // });

      // For now, we'll just log it
      logger.info("Alert would be sent here", { executionId, error: String(error) })
    } catch (alertError) {
      logger.error("Failed to send alert", alertError)
    }

    return NextResponse.json(
      {
        success: false,
        message: "Cron job failed",
        error: String(error),
        executionTime,
        executionId,
      },
      { status: 500 },
    )
  }
}

// Explicitly set Node.js runtime
export const runtime = "nodejs"

