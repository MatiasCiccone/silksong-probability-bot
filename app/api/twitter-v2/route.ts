import { NextResponse } from "next/server"
import { createOAuthHeader } from "@/lib/twitter-oauth"
import { retry } from "@/lib/retry"
import { logger } from "@/lib/logger"

// Function to post a tweet using Twitter API v2 with OAuth 1.0a
async function postTweet(text: string, requestId: string) {
  // Twitter API v2 endpoint for creating tweets
  const url = "https://api.twitter.com/2/tweets"

  logger.info(`Creating OAuth header for Twitter API request`, { requestId, url })

  try {
    // Create the OAuth header
    const oauthHeader = createOAuthHeader(
      "POST",
      url,
      null, // No query parameters for this endpoint
      process.env.TWITTER_API_KEY!,
      process.env.TWITTER_API_SECRET!,
      process.env.TWITTER_ACCESS_TOKEN!,
      process.env.TWITTER_ACCESS_SECRET!,
    )

    logger.info(`Sending request to Twitter API`, {
      requestId,
      url,
      textLength: text.length,
    })

    // Make the request
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: oauthHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    })

    // Get the response as text first to ensure we can log it even if JSON parsing fails
    const responseText = await response.text()

    // Check if the request was successful
    if (!response.ok) {
      logger.error(`Twitter API returned error status`, {
        requestId,
        status: response.status,
        statusText: response.statusText,
        responseText,
      })

      // Try to parse the error response as JSON
      let errorData
      try {
        errorData = JSON.parse(responseText)
        return { success: false, error: JSON.stringify(errorData) }
      } catch (e) {
        // If parsing fails, use the raw text
        return { success: false, error: responseText }
      }
    }

    // Parse the successful response
    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      logger.error(`Failed to parse Twitter API success response`, {
        requestId,
        responseText,
        error: parseError instanceof Error ? parseError.message : String(parseError),
      })
      return { success: false, error: `Failed to parse Twitter API response: ${responseText}` }
    }

    logger.info(`Twitter API request successful`, {
      requestId,
      tweetId: data.data?.id,
    })

    return { success: true, data }
  } catch (error) {
    logger.error(`Error in postTweet function`, {
      requestId,
      error,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : JSON.stringify(error),
    }
  }
}

// Handler for the API route
export async function POST(request: Request) {
  const requestId = `twitter_v2_${Date.now()}`

  try {
    // Get the tweet text from the request body
    let requestBody
    try {
      requestBody = await request.json()
      logger.info(`Twitter API request received`, { requestId, textLength: requestBody?.text?.length || 0 })
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

    logger.info(`Attempting to post tweet`, { requestId, textLength: text.length })

    // Post the tweet with retry logic - now handling errors properly
    const result = await retry(() => postTweet(text, requestId), {
      retries: 1,
      initialDelay: 1000,
      maxDelay: 5000,
      onRetry: (error, attempt) => {
        logger.warn(`Retry attempt ${attempt} after error`, {
          requestId,
          error: error instanceof Error ? error.message : JSON.stringify(error),
        })
      },
    })

    // Check if the tweet was posted successfully
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to post tweet",
          error: result.error,
          requestId,
        },
        { status: 500 },
      )
    }

    logger.info(`Tweet posted successfully`, {
      requestId,
      tweetId: result.data.data?.id,
    })

    return NextResponse.json({
      success: true,
      message: "Tweet posted successfully",
      requestId,
      data: {
        tweetId: result.data.data.id,
        tweetText: text,
      },
    })
  } catch (error) {
    // Enhanced error logging with proper serialization
    logger.error(`Failed to post tweet`, {
      requestId,
      error,
    })

    return NextResponse.json(
      {
        success: false,
        message: "Failed to post tweet",
        error: error instanceof Error ? error.message : JSON.stringify(error),
        requestId,
      },
      { status: 500 },
    )
  }
}

// Explicitly set Node.js runtime
export const runtime = "nodejs"

