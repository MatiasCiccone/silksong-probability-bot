import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { retry } from "@/lib/retry"

// This route will be called by Vercel Cron
export async function GET(request: Request) {
  const startTime = Date.now()
  const executionId = `cron_${startTime}`

  // Check if this is a manual test or the actual cron job
  const url = new URL(request.url)
  const isManualTest = url.searchParams.has("test")

  // Only generate a test ID if this is a manual test
  const testId = isManualTest ? Math.random().toString(36).substring(2, 8) : undefined

  logger.info(`Cron job started`, {
    executionId,
    isManualTest,
    testId: testId || "none",
  })

  try {
    // Get the base URL from the request
    const baseUrl = `${url.protocol}//${url.host}`
    logger.info(`Determined base URL for API calls`, { executionId, baseUrl })

    // Call our tweet endpoint with retry logic
    const response = await retry(
      async () => {
        logger.info(`Sending request to tweet endpoint`, {
          executionId,
          endpoint: `${baseUrl}/api/tweet`,
          isManualTest,
          testId: testId || "none",
        })

        // Only include testMode and testId if this is a manual test
        const body = isManualTest ? JSON.stringify({ testMode: true, testId }) : undefined

        // Include the API key in the request to the tweet endpoint
        const res = await fetch(`${baseUrl}/api/tweet`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.API_SECRET_KEY || ""}`,
            "X-Cron-Job": "true", // Add a special header to identify this as a cron job request
          },
          body: body,
        })

        // Get the response as text first to ensure we can log it even if JSON parsing fails
        const responseText = await res.text()
        let data

        try {
          data = JSON.parse(responseText)
        } catch (parseError) {
          logger.error(`Failed to parse tweet endpoint response`, {
            executionId,
            responseStatus: res.status,
            responseText,
            error: parseError instanceof Error ? parseError.message : String(parseError),
          })
          throw new Error(`Tweet endpoint returned invalid JSON: ${responseText}`)
        }

        if (!data.success) {
          logger.error(`Tweet endpoint returned error`, {
            executionId,
            responseStatus: res.status,
            error: data.error || data.message || "Unknown error",
            fullResponse: data,
          })
          throw new Error(data.message || "Unknown error in tweet endpoint")
        }

        return { res, data }
      },
      {
        retries: 1,
        initialDelay: 2000,
        maxDelay: 30000,
        onRetry: (error, attempt) => {
          logger.warn(`Cron retry attempt ${attempt} after error`, {
            executionId,
            error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
          })
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
      isManualTest,
      testId: testId || "none",
    })

    // Send a ping to a monitoring service (optional)
    try {
      // You can replace this with an actual monitoring service like UptimeRobot, Cronitor, etc.
      // await fetch('https://cronitor.link/p/your-monitor-id', { method: 'GET' });

      // For now, we'll just log it
      logger.info(`Monitoring ping would be sent here`, { executionId })
    } catch (monitorError) {
      logger.warn(`Failed to send monitoring ping`, {
        executionId,
        error: monitorError instanceof Error ? monitorError.message : String(monitorError),
      })
      // Don't throw this error as it's not critical
    }

    return NextResponse.json({
      success: true,
      message: isManualTest ? "Manual cron test executed successfully" : "Cron job executed successfully",
      executionTime,
      executionId,
      isManualTest,
      testId: testId || undefined,
      data,
    })
  } catch (error) {
    const executionTime = Date.now() - startTime

    // Enhanced error logging
    logger.error(`Cron job failed after ${executionTime}ms`, {
      executionId,
      executionTime,
      isManualTest,
      testId: testId || "none",
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
              // Include any additional properties on the error object
              ...Object.fromEntries(
                Object.entries(error).filter(([key]) => !["message", "stack", "name"].includes(key)),
              ),
            }
          : error,
    })

    // Send a failure alert (optional)
    try {
      // You can replace this with an actual alerting service
      // await fetch('https://your-alert-service.com/api/alert', {
      //   method: 'POST',
      //   body: JSON.stringify({ error: String(error), executionId })
      // });

      // For now, we'll just log it
      logger.info(`Alert would be sent here`, {
        executionId,
        error: error instanceof Error ? error.message : String(error),
      })
    } catch (alertError) {
      logger.error(`Failed to send alert`, {
        executionId,
        error: alertError instanceof Error ? alertError.message : String(alertError),
      })
    }

    return NextResponse.json(
      {
        success: false,
        message: "Cron job failed",
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        executionId,
        isManualTest,
        testId: testId || undefined,
      },
      { status: 500 },
    )
  }
}

// Explicitly set Node.js runtime
export const runtime = "nodejs"

