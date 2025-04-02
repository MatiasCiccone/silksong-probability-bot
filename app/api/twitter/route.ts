import { NextResponse } from "next/server"
import { createOAuthHeader } from "@/lib/twitter-oauth"

// Function to post a tweet using Twitter API v2 with OAuth 1.0a
async function postTweet(text: string) {
  try {
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
  } catch (error) {
    console.error("Error posting tweet:", error)
    throw error
  }
}

// Handler for the API route
export async function POST(request: Request) {
  try {
    // Get the tweet text from the request body
    const { text } = await request.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ success: false, message: "Tweet text is required" }, { status: 400 })
    }

    // Post the tweet
    const result = await postTweet(text)

    return NextResponse.json({
      success: true,
      message: "Tweet posted successfully",
      data: {
        tweetId: result.data.id,
        tweetText: text,
      },
    })
  } catch (error) {
    console.error("Error in Twitter API route:", error)

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

