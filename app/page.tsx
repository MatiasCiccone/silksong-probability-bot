"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Footer } from "@/components/footer"

// The target date is December 31, 2025
const TARGET_DATE = new Date("2025-12-31T00:00:00Z")
// The start date is April 3, 2025
const START_DATE = new Date("2025-04-03T00:00:00Z")

// Calculate probability for a specific date
function calculateProbabilityForDate(date: Date) {
  // Calculate days remaining until target date
  const msPerDay = 1000 * 60 * 60 * 24
  const daysRemaining = Math.ceil((TARGET_DATE.getTime() - date.getTime()) / msPerDay)

  // Calculate total days in the period (including both start and end dates)
  const totalDays = Math.ceil((TARGET_DATE.getTime() - START_DATE.getTime()) / msPerDay) + 1

  // If we're before the start date, set days elapsed to 0
  let daysElapsed = 0

  if (date >= START_DATE) {
    // Calculate days elapsed since start date
    // If it's the start date, days elapsed should be 1
    if (date.toISOString().split("T")[0] === START_DATE.toISOString().split("T")[0]) {
      daysElapsed = 1
    } else {
      daysElapsed = Math.floor((date.getTime() - START_DATE.getTime()) / msPerDay) + 1
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
    date: date.toISOString().split("T")[0],
  }
}

// Generate all dates and probabilities from start to target
function generateAllDatesAndProbabilities() {
  const dates = []
  const msPerDay = 1000 * 60 * 60 * 24

  // Clone the start date
  let currentDate = new Date(START_DATE.getTime())

  // Loop through all dates until we reach the target date
  while (currentDate <= TARGET_DATE) {
    const data = calculateProbabilityForDate(currentDate)
    dates.push(data)

    // Move to the next day
    currentDate = new Date(currentDate.getTime() + msPerDay)
  }

  return dates
}

// Create tweet text for a specific date
function createTweetTextForDate(data: {
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

// Format date for display
function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [customTweet, setCustomTweet] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [exampleTweet, setExampleTweet] = useState("")
  const [showProbabilityTable, setShowProbabilityTable] = useState(false)
  const [allDates, setAllDates] = useState<ReturnType<typeof calculateProbabilityForDate>[]>([])
  const [result, setResult] = useState<{
    success: boolean
    message: string
    data?: {
      tweetId?: string
      probability?: number
      daysRemaining?: number
      daysElapsed?: number
      totalDays?: number
      tweetText?: string
    }
    error?: string
  } | null>(null)

  // Initialize the date selector with today's date and generate all dates
  useEffect(() => {
    const today = new Date()
    const formattedDate = today.toISOString().split("T")[0]
    setSelectedDate(formattedDate)

    // Generate example tweet for today
    const probData = calculateProbabilityForDate(today)
    const tweetText = createTweetTextForDate(probData)
    setExampleTweet(tweetText)

    // Generate all dates and probabilities
    setAllDates(generateAllDatesAndProbabilities())
  }, [])

  // Update example tweet when date changes
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    setSelectedDate(newDate)

    // Generate example tweet for selected date
    // Use UTC time to ensure consistent date handling
    const date = new Date(`${newDate}T12:00:00Z`)

    const probData = calculateProbabilityForDate(date)
    const tweetText = createTweetTextForDate(probData)
    setExampleTweet(tweetText)
  }

  const handleDailyTweet = async () => {
    try {
      setIsLoading(true)
      setResult(null)

      const response = await fetch("/api/tweet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      setResult(data)

      if (!data.success) {
        console.error("Tweet error:", data.error || data.message)
      }
    } catch (error) {
      console.error("Error posting tweet:", error)
      setResult({
        success: false,
        message: "An error occurred while posting the tweet",
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomTweet = async () => {
    if (!customTweet.trim()) {
      setResult({
        success: false,
        message: "Please enter a tweet message",
      })
      return
    }

    try {
      setIsLoading(true)
      setResult(null)

      const response = await fetch("/api/custom-tweet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: customTweet }),
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        setCustomTweet("") // Clear the input on success
      }

      if (!data.success) {
        console.error("Tweet error:", data.error || data.message)
      }
    } catch (error) {
      console.error("Error posting tweet:", error)
      setResult({
        success: false,
        message: "An error occurred while posting the tweet",
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Check if selected date is before the start date
  const isBeforeStartDate = selectedDate ? new Date(selectedDate + "T00:00:00Z") < START_DATE : false

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full space-y-8 bg-card text-card-foreground p-8 rounded-lg border-2 border-gray-700">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Silksong Release Probability Bot</h1>
          <p className="text-lg mb-6">This bot tweets the probability of Silksong release every day at 00:00 UTC.</p>
          <p className="text-muted-foreground mb-8">Counting down to December 31, 2025</p>
        </div>

        <div className="space-y-6">
          <Button onClick={handleDailyTweet} disabled={isLoading} className="w-full">
            {isLoading ? "Posting Tweet..." : "Post Daily Probability Tweet"}
          </Button>

          <div className="pt-4 border-t border-border">
            <h2 className="text-xl font-semibold mb-3">Custom Tweet</h2>
            <div className="space-y-3">
              <Input
                value={customTweet}
                onChange={(e) => setCustomTweet(e.target.value)}
                placeholder="Enter your custom tweet"
                disabled={isLoading}
                className="w-full"
              />
              <Button
                onClick={handleCustomTweet}
                disabled={isLoading || !customTweet.trim()}
                variant="outline"
                className="w-full"
              >
                {isLoading ? "Posting Tweet..." : "Post Custom Tweet"}
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h2 className="text-xl font-semibold mb-3">Tweet Preview</h2>
            <div className="space-y-3">
              <div className="flex flex-col space-y-2">
                <label htmlFor="date-selector" className="text-sm font-medium">
                  Select a date to preview the tweet:
                </label>
                <Input
                  id="date-selector"
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  min="2025-01-01"
                  max="2025-12-31"
                  className="w-full bg-gray-800 border-gray-600"
                />
              </div>

              {isBeforeStartDate && (
                <div className="p-3 bg-blue-900/20 text-blue-100 rounded-md border border-blue-800">
                  <p>Selected date is before April 3, 2025</p>
                  <p className="text-sm mt-1">Probability will be 0.000%</p>
                </div>
              )}

              <div className="mt-3 p-4 bg-gray-800 rounded-md border border-gray-700">
                <h3 className="text-sm font-semibold mb-2">Tweet preview for {selectedDate}:</h3>
                <p className="whitespace-pre-wrap text-sm">{exampleTweet}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-semibold">Probability Table</h2>
              <Button variant="outline" size="sm" onClick={() => setShowProbabilityTable(!showProbabilityTable)}>
                {showProbabilityTable ? "Hide Table" : "Show Table"}
              </Button>
            </div>

            {showProbabilityTable && (
              <div className="mt-3 border border-gray-700 rounded-md overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-right">Days Left</th>
                        <th className="px-4 py-2 text-right">Probability</th>
                        <th className="px-4 py-2 text-right">Raw Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {allDates.map((date, index) => (
                        <tr
                          key={index}
                          className={
                            date.date === selectedDate
                              ? "bg-blue-900/20"
                              : index % 2 === 0
                                ? "bg-gray-900"
                                : "bg-gray-800"
                          }
                        >
                          <td className="px-4 py-2">{formatDate(date.date)}</td>
                          <td className="px-4 py-2 text-right">{date.daysRemaining}</td>
                          <td className="px-4 py-2 text-right font-mono">{date.probability.toFixed(3)}%</td>
                          <td className="px-4 py-2 text-right font-mono">{date.probability}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {result && (
            <div
              className={`p-4 rounded-md border ${
                result.success
                  ? "bg-green-900/30 text-green-100 border-green-800"
                  : "bg-red-900/30 text-red-100 border-red-800"
              }`}
            >
              <p className="font-medium">{result.message}</p>
              {result.success && result.data && (
                <div className="mt-2 text-sm">
                  <p>Tweet ID: {result.data.tweetId}</p>
                  {result.data.probability !== undefined && <p>Probability: {result.data.probability.toFixed(3)}%</p>}
                  {result.data.daysRemaining !== undefined && <p>Days Remaining: {result.data.daysRemaining}</p>}
                  {result.data.daysElapsed !== undefined && result.data.totalDays !== undefined && (
                    <p>
                      Progress: {result.data.daysElapsed} of {result.data.totalDays} days (
                      {((result.data.daysElapsed / result.data.totalDays) * 100).toFixed(2)}%)
                    </p>
                  )}
                  {result.data.tweetText && (
                    <div className="mt-2 p-3 bg-gray-800 rounded border border-gray-700">
                      <p className="whitespace-pre-wrap">{result.data.tweetText}</p>
                    </div>
                  )}
                </div>
              )}
              {!result.success && result.error && (
                <div className="mt-2 text-sm overflow-auto max-h-40">
                  <p className="font-bold">Error details:</p>
                  <pre className="whitespace-pre-wrap">{result.error}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  )
}

