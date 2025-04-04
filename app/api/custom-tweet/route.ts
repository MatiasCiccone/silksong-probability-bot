import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

// Post a custom tweet
export async function POST(request: Request) {
  const requestId = `custom_tweet_${Date.now()}`

  try {
    // Get the tweet text from the request body
    let requestBody
    try {
      requestBody = await request.json()
      logger.info(`Custom tweet request received`, { requestId, textLength: requestBody?.text?.length || 0 })
    } catch (parseError) {
      logger.error(`Failed to parse request body`, {
        requestId,
        error: parseError instanceof Error ? parseError.message : String(parseError),
        headers: Object.fromEntries([...request.headers.entries()]),
      })
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body - could not parse JSON",
          requestId,
        },
        { status: 400 },
      )
    }

    const { text } = requestBody

    if (!text || typeof text !== "string") {
      logger.warn(`Invalid tweet text provided`, { requestId, text })
      return NextResponse.json(
        {
          success: false,
          message: "Tweet text is required and must be a string",
          requestId,
        },
        { status: 400 },
      )
    }

    // Get the base URL from the request
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`

    logger.info(`Forwarding custom tweet to Twitter API`, {
      requestId,
      textLength: text.length,
      endpoint: `${baseUrl}/api/twitter-v2`,
    })

    // Call our Twitter API v2 route
    const response = await fetch(`${baseUrl}/api/twitter-v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    })

    // Get the response as text first to ensure we can log it even if JSON parsing fails
    const responseText = await response.text()
    let data

    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      logger.error(`Failed to parse Twitter API response`, {
        requestId,
        responseStatus: response.status,
        responseText,
        error: parseError instanceof Error ? parseError.message : String(parseError),
      })
      throw new Error(`Twitter API returned invalid JSON: ${responseText}`)
    }

    if (!data.success) {
      // Log the full error response
      logger.error(`Twitter API returned error`, {
        requestId,
        responseStatus: response.status,
        errorDetails: data.error || data.message || "Unknown error",
        fullResponse: JSON.stringify(data),
      })

      // Create a properly formatted error message
      const errorMessage =
        typeof data.error === "object"
          ? JSON.stringify(data.error)
          : data.error || data.message || "Unknown error from Twitter API"

      throw new Error(errorMessage)
    }

    logger.info(`Custom tweet posted successfully`, {
      requestId,
      tweetId: data.data?.tweetId,
      responseStatus: response.status,
    })

    return NextResponse.json({
      success: true,
      message: "Custom tweet posted successfully",
      requestId,
      data: data.data,
    })
  } catch (error) {
    // Enhanced error logging with proper serialization
    const errorDetails =
      error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
            // Include any additional properties on the error object
            ...(typeof error === "object"
              ? Object.fromEntries(
                  Object.entries(error as any).filter(([key]) => !["message", "stack", "name"].includes(key)),
                )
              : {}),
          }
        : { rawError: typeof error === "object" ? JSON.stringify(error) : String(error) }

    logger.error(`Failed to post custom tweet`, {
      requestId,
      errorDetails,
    })

    return NextResponse.json(
      {
        success: false,
        message: "Failed to post custom tweet",
        error: error instanceof Error ? error.message : JSON.stringify(error),
        requestId,
      },
      { status: 500 },
    )
  }
}

// Explicitly set Node.js runtime
export const runtime = "nodejs"

