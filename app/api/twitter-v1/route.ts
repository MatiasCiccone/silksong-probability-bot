import { NextResponse } from "next/server"
import { createOAuthHeader } from "@/lib/twitter-oauth"

// Function to post a tweet using Twitter API v1.1 with OAuth 1.0a
async function postTweet(text: string) {
  try {
    // Twitter API v1.1 endpoint for creating tweets
    const baseUrl = "https://api.twitter.com/1.1/statuses/update.json"

    // Create URL with query parameters
    const url = new URL(baseUrl)
    url.searchParams.append("status", text)

    // Create the OAuth header
    const oauthHeader = createOAuthHeader(
      "POST",
      baseUrl,
      { status: text }, // Include the body in the signature
      process.env.TWITTER_API_KEY!,
      process.env.TWITTER_API_SECRET!,
      process.env.TWITTER_ACCESS_TOKEN!,
      process.env.TWITTER_ACCESS_SECRET!,
    )

    // Make the request
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: oauthHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
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
        tweetId: result.id_str,
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

