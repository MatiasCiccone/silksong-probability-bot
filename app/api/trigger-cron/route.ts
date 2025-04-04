import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { retry } from "@/lib/retry"

// This endpoint allows manually triggering the cron job
export async function GET(request: Request) {
  const requestId = `trigger_cron_${Date.now()}`

  try {
    logger.info(`Manually triggering cron job`, { requestId })

    // Get the base URL from the request
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`

    // Generate a random test identifier to prevent duplicate tweets
    const testId = Math.random().toString(36).substring(2, 8)
    logger.info(`Generated test ID for manual cron trigger`, { requestId, testId })

    // Call our tweet endpoint with retry logic and the test identifier
    const response = await retry(
      async () => {
        logger.info(`Sending request to tweet endpoint`, {
          requestId,
          testId,
          endpoint: `${baseUrl}/api/tweet`,
        })

        const res = await fetch(`${baseUrl}/api/tweet`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            testMode: true,
            testId: testId,
          }),
        })

        // Get the response as text first to ensure we can log it even if JSON parsing fails
        const responseText = await res.text()
        let data

        try {
          data = JSON.parse(responseText)
        } catch (parseError) {
          logger.error(`Failed to parse tweet endpoint response`, {
            requestId,
            responseStatus: res.status,
            responseText,
            error: parseError instanceof Error ? parseError.message : String(parseError),
          })
          throw new Error(`Tweet endpoint returned invalid JSON: ${responseText}`)
        }

        if (!data.success) {
          logger.error(`Tweet endpoint returned error`, {
            requestId,
            responseStatus: res.status,
            error: data.error || data.message || "Unknown error",
            fullResponse: data,
          })
          throw new Error(data.error || data.message || "Unknown error in tweet endpoint")
        }

        return { res, data }
      },
      {
        retries: 1,
        initialDelay: 1000,
        maxDelay: 5000,
        onRetry: (error, attempt) => {
          logger.warn(`Trigger retry attempt ${attempt} after error`, {
            requestId,
            error: error instanceof Error ? error.message : String(error),
          })
        },
      },
    )

    const { data } = response

    logger.info(`Cron job manually triggered successfully`, {
      requestId,
      testId,
      tweetId: data.data.tweetId,
    })

    return NextResponse.json({
      success: true,
      message: "Cron job manually triggered",
      requestId,
      testId,
      data: data.data,
    })
  } catch (error) {
    // Enhanced error logging
    logger.error(`Failed to trigger cron job`, {
      requestId,
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

    return NextResponse.json(
      {
        success: false,
        message: "Failed to trigger cron job",
        error: error instanceof Error ? error.message : String(error),
        requestId,
      },
      { status: 500 },
    )
  }
}

// Explicitly set Node.js runtime
export const runtime = "nodejs"

