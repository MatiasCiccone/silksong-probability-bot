import { NextResponse } from "next/server"

// Mock function to simulate posting a tweet
async function mockPostTweet(text: string) {
  // Log the tweet text
  console.log("Would tweet:", text)

  // Generate a fake tweet ID
  const tweetId = `mock_${Date.now()}`

  // Return a mock response
  return {
    data: {
      id: tweetId,
      text,
    },
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

    // Mock posting the tweet
    const result = await mockPostTweet(text)

    return NextResponse.json({
      success: true,
      message: "Tweet would be posted (mock mode)",
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

