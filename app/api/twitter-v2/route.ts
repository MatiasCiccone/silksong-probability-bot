import { NextResponse } from "next/server"
import { createOAuthHeader } from "@/lib/twitter-oauth"
import { retry } from "@/lib/retry"
import { logger } from "@/lib/logger"

// Function to post a tweet using Twitter API v2 with OAuth 1.0a
async function postTweet(text: string) {
  // Twitter API v2 endpoint for creating tweets
  const url = "https://api.twitter.com/2/tweets"

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

  // Make the request
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  })

  // Check if the request was successful
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Twitter API error: ${response.status} ${errorText}`)
  }

  return await response.json()
}

// Handler for the API route
export async function POST(request: Request) {
  try {
    // Get the tweet text from the request body
    const { text } = await request.json()

    if (!text || typeof text !== "string") {
      logger.warn("Invalid tweet text provided")
      return NextResponse.json({ success: false, message: "Tweet text is required" }, { status: 400 })
    }

    logger.info("Attempting to post tweet", { textLength: text.length })

    // Post the tweet with retry logic
    const result = await retry(() => postTweet(text), {
      retries: 3,
      initialDelay: 1000,
      maxDelay: 5000,
      onRetry: (error, attempt) => {
        logger.warn(`Retry attempt ${attempt} after error`, { error: error.message })
      },
    })

    logger.info("Tweet posted successfully", { tweetId: result.data.id })

    return NextResponse.json({
      success: true,
      message: "Tweet posted successfully",
      data: {
        tweetId: result.data.id,
        tweetText: text,
      },
    })
  } catch (error) {
    logger.error("Failed to post tweet", error)

    return NextResponse.json(
      {
        success: false,
        message: "Failed to post tweet",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// Explicitly set Node.js runtime
export const runtime = "nodejs"

