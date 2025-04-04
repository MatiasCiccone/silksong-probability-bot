"use client"

import { useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || "/"

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
        // Successful login, redirect
        router.push(redirect)
      } else {
        // Failed login
        setError("Invalid password")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error("Login error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-8 bg-card text-card-foreground p-8 rounded-lg border-2 border-gray-700">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Silksong Release Probability Bot</h1>
          <p className="text-lg mb-6">Login to access the dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full"
            />
          </div>

          {error && <div className="p-3 bg-red-900/30 text-red-100 rounded-md border border-red-800">{error}</div>}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </div>
    </div>
  )
}

