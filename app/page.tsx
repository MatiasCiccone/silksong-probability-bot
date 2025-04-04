"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Footer } from "@/components/footer"
import { Copy, Check, AlertTriangle, ExternalLink, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

// Add this after the imports
const isDev = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview"

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
  let probability = 0

  // Only calculate probability if we're at or after the start date
  if (date >= START_DATE) {
    // Calculate days elapsed since start date
    // If it's the start date, days elapsed should be 1
    if (date.toISOString().split("T")[0] === START_DATE.toISOString().split("T")[0]) {
      daysElapsed = 1
    } else {
      daysElapsed = Math.floor((date.getTime() - START_DATE.getTime()) / msPerDay) + 1
    }

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

// Generate all dates and probabilities from April 2 to December 31, 2025
function generateAllDatesAndProbabilities() {
  const dates = []
  const msPerDay = 1000 * 60 * 60 * 24

  // Start from April 2, 2025 (one day before START_DATE)
  // Use explicit UTC time to avoid timezone issues
  const tableStartDate = new Date(Date.UTC(2025, 3, 2)) // Month is 0-indexed, so 3 = April

  // End at December 31, 2025
  const endDate = new Date(Date.UTC(2025, 11, 31)) // Month is 0-indexed, so 11 = December

  // Clone the start date
  let currentDate = new Date(tableStartDate.getTime())

  // Loop through all dates until we reach the end date (inclusive)
  while (currentDate <= endDate) {
    const data = calculateProbabilityForDate(currentDate)

    // Format probability to exactly 3 decimal places to match the tweet preview
    data.probability = Number.parseFloat(data.probability.toFixed(3))

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

// Format date for display in a compact way to prevent line breaks
// Ensure dates are displayed in UTC
function formatDate(dateString: string) {
  const date = new Date(dateString + "T00:00:00Z") // Force UTC

  // Use UTC methods to get date components
  const year = date.getUTCFullYear()
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" })
  const day = date.getUTCDate()

  return `${month} ${day} ${year}`
}

// Format raw probability value to prevent overflow
function formatRawValue(value: number) {
  // If the value is very small, show fewer decimal places
  if (value < 1) {
    return value.toFixed(8)
  }
  return value.toString()
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [customTweet, setCustomTweet] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [exampleTweet, setExampleTweet] = useState("")
  const [showProbabilityTable, setShowProbabilityTable] = useState(false)
  const [allDates, setAllDates] = useState<ReturnType<typeof calculateProbabilityForDate>[]>([])
  const [copied, setCopied] = useState(false)
  const [apiStatus, setApiStatus] = useState<"unknown" | "working" | "error">("unknown")
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
  const router = useRouter()

  // Initialize session token on page load
  useEffect(() => {
    async function initSession() {
      try {
        // Call the session endpoint to generate a session token
        await fetch("/api/auth/session")
      } catch (error) {
        console.error("Failed to initialize session:", error)
      }
    }

    initSession()
  }, [])

  const handleTriggerCron = async () => {
    try {
      setIsLoading(true)
      setResult(null)

      // Call the cron endpoint directly with test=true parameter
      const response = await fetch("/api/cron?test=true")

      const data = await response.json()
      setResult(data)

      if (data.success) {
        setApiStatus("working")
      } else {
        setApiStatus("error")
        console.error("Cron trigger error:", data.error || data.message)
      }
    } catch (error) {
      setApiStatus("error")
      console.error("Error triggering cron job:", error)
      setResult({
        success: false,
        message: "An error occurred while triggering the cron job",
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsLoading(false)
    }
  }

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

      if (data.success) {
        setApiStatus("working")
      } else {
        setApiStatus("error")
        console.error("Tweet error:", data.error || data.message)
      }
    } catch (error) {
      setApiStatus("error")
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
        setApiStatus("working")
        setCustomTweet("") // Clear the input on success
      } else {
        setApiStatus("error")
        console.error("Tweet error:", data.error || data.message)
      }
    } catch (error) {
      setApiStatus("error")
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

  // Copy tweet text to clipboard
  const copyTweetToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exampleTweet)
      setCopied(true)

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  // Open Twitter compose page with pre-filled tweet
  const openTwitterCompose = () => {
    const encodedTweet = encodeURIComponent(exampleTweet)
    window.open(`https://twitter.com/intent/tweet?text=${encodedTweet}`, "_blank")
  }

  // Add logout function
  const handleLogout = async () => {
    try {
      // Clear the auth cookie
      document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      document.cookie = "session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      // Redirect to login page
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <div className="max-w-2xl w-full space-y-8 bg-card text-card-foreground p-8 rounded-lg border-2 border-gray-700">
        {isDev && (
          <div className="w-full mb-4 p-2 bg-amber-900/30 text-amber-100 border border-amber-800 rounded-md text-center">
            <p className="text-sm font-medium">Development Mode - Authentication Bypassed</p>
          </div>
        )}
        <div className="relative mb-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Silksong Release Probability Bot</h1>
            <p className="text-lg mb-6">This bot tweets the probability of Silksong release every day at 00:00 UTC.</p>
            <p className="text-muted-foreground">Counting down to December 31, 2025</p>
          </div>
          {!isDev && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="absolute top-0 right-0 flex items-center gap-1"
              title="Logout"
            >
              <LogOut size={16} />
              <span className="sr-only">Logout</span>
            </Button>
          )}
        </div>

        {apiStatus === "error" && (
          <div className="bg-red-900/30 border border-red-800 rounded-md p-4 mb-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-100">Twitter API Error</h3>
                <p className="text-sm text-red-200 mt-1">
                  The Twitter API is currently returning errors. This could be due to rate limits, authentication
                  issues, or API changes.
                </p>
                <div className="mt-3">
                  <p className="text-sm font-medium text-red-100">Manual posting options:</p>
                  <ul className="list-disc list-inside text-sm text-red-200 mt-1 space-y-1">
                    <li>Use the "Copy" button in the Tweet Preview section to copy the tweet text</li>
                    <li>Click the "Post on Twitter" button to open Twitter with the tweet pre-filled</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <Button onClick={handleDailyTweet} disabled={isLoading} className="w-full mb-2">
            {isLoading ? "Posting Tweet..." : "Post Daily Probability Tweet"}
          </Button>
          <Button onClick={handleTriggerCron} disabled={isLoading} variant="secondary" className="w-full">
            Manually Test Cron Job
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

              <div className="mt-3 p-4 bg-gray-800 rounded-md border border-gray-700 relative">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-semibold">Tweet preview for {selectedDate}:</h3>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-gray-300 hover:text-white"
                      onClick={copyTweetToClipboard}
                      aria-label="Copy tweet text"
                      title="Copy tweet text"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      <span className="ml-1 text-xs">{copied ? "Copied!" : "Copy"}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-gray-300 hover:text-white"
                      onClick={openTwitterCompose}
                      aria-label="Post on Twitter"
                      title="Post on Twitter"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="ml-1 text-xs">Post on Twitter</span>
                    </Button>
                  </div>
                </div>
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
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      <col style={{ width: "25%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "25%" }} />
                      <col style={{ width: "35%" }} />
                    </colgroup>
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
                          <td className="px-4 py-2 whitespace-nowrap">{formatDate(date.date)}</td>
                          <td className="px-4 py-2 text-right">{date.daysRemaining}</td>
                          <td className="px-4 py-2 text-right font-mono">{date.probability.toFixed(3)}%</td>
                          <td className="px-4 py-2 text-right font-mono truncate" title={`${date.probability}%`}>
                            {formatRawValue(date.probability)}%
                          </td>
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
                      <p className="whitespace-pre-wrap text-sm">{result.data.tweetText}</p>
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

