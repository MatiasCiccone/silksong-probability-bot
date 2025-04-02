import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { retry } from "@/lib/retry"

// The target date is December 31, 2025
const TARGET_DATE = new Date("2025-12-31T00:00:00Z")
// The start date is now April 3, 2025
const START_DATE = new Date("2025-04-03T00:00:00Z")

// Calculate days remaining and probability
function calculateProbability() {
  const today = new Date()

  // Calculate days remaining until target date
  const msPerDay = 1000 * 60 * 60 * 24
  const daysRemaining = Math.ceil((TARGET_DATE.getTime() - today.getTime()) / msPerDay)

  // Calculate total days in the period (including both start and end dates)
  const totalDays = Math.ceil((TARGET_DATE.getTime() - START_DATE.getTime()) / msPerDay) + 1

  // If we're before the start date, set days elapsed to 0
  let daysElapsed = 0

  if (today >= START_DATE) {
    // Calculate days elapsed since start date
    // If it's the start date, days elapsed should be 1
    if (today.toISOString().split("T")[0] === START_DATE.toISOString().split("T")[0]) {
      daysElapsed = 1
    } else {
      daysElapsed = Math.floor((today.getTime() - START_DATE.getTime()) / msPerDay) + 1
    }
  }

  // Calculate probability using the formula 1/daysRemaining * 100
  // This will give us the expected values:
  // - December 29, 2025: 1/3 * 100 = 33.33%
  // - December 30, 2025: 1/2 * 100 = 50.00%
  // - December 31, 2025: 1/1 * 100 = 100.00%
  let probability = 0

  if (daysElapsed > 0) {
    // Calculate days remaining until target date (including the target date)
    const daysToTarget = daysRemaining + 1

    // Calculate probability as 1/daysToTarget * 100
    probability = (1 / daysToTarget) * 100
  }

  return {
    daysRemaining,
    totalDays,
    daysElapsed,
    probability,
    date: today.toISOString().split("T")[0],
  }
}

// Create tweet text
function createTweetText(data: {
  daysRemaining: number
  totalDays: number
  daysElapsed: number
  probability: number
  date: string
}) {
  // Format probability to show 3 decimal places
  const formattedProbability = data.probability.toFixed(3)

  return `🎮 Silksong Release Probability Update (${data.date})

Probability: ${formattedProbability}%
Days remaining until Dec 31, 2025: ${data.daysRemaining}
Days elapsed: ${data.daysElapsed} of ${data.totalDays} total days

#Silksong #HollowKnight #TeamCherry`
}

// Post the daily tweet
export async function POST(request: Request) {
  const requestId = `tweet_${Date.now()}`

  try {
    logger.info("Calculating probability for daily tweet", { requestId })

    // Calculate probability
    const data = calculateProbability()

    logger.info("Probability calculated", {
      requestId,
      probability: data.probability,
      daysRemaining: data.daysRemaining,
      daysElapsed: data.daysElapsed,
      totalDays: data.totalDays,
    })

    // Create tweet text
    const tweetText = createTweetText(data)

    // Get the base URL from the request
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`

    logger.info("Posting daily tweet", { requestId, textLength: tweetText.length })

    // Call our Twitter API v2 route to post the tweet with retry logic
    const response = await retry(
      async () => {
        const res = await fetch(`${baseUrl}/api/twitter-v2`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: tweetText }),
        })

        const result = await res.json()

        if (!result.success) {
          throw new Error(result.error || result.message || "Unknown error in Twitter API")
        }

        return result
      },
      {
        retries: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        onRetry: (error, attempt) => {
          logger.warn(`Tweet retry attempt ${attempt} after error`, { error: error.message, requestId })
        },
      },
    )

    logger.info("Daily tweet posted successfully", {
      requestId,
      tweetId: response.data.tweetId,
    })

    return NextResponse.json({
      success: true,
      message: "Tweet posted successfully",
      data: {
        tweetId: response.data.tweetId,
        probability: data.probability,
        daysRemaining: data.daysRemaining,
        daysElapsed: data.daysElapsed,
        totalDays: data.totalDays,
        tweetText,
      },
    })
  } catch (error) {
    logger.error("Failed to post daily tweet", { error, requestId })

    return NextResponse.json(
      {
        success: false,
        message: "Failed to post tweet",
        error: error instanceof Error ? error.message : String(error),
        requestId,
      },
      { status: 500 },
    )
  }
}

// Explicitly set Node.js runtime
export const runtime = "nodejs"

