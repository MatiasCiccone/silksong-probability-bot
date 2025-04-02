// Simple health check script that can be run manually or as a GitHub Action
// Usage: node scripts/health-check.js https://your-app-url.vercel.app

async function runHealthCheck() {
  try {
    // Get the URL from command line arguments or use a default
    const url = process.argv[2] || "http://localhost:3000"

    console.log(`Running health check for ${url}...`)

    // Call the health endpoint
    const healthResponse = await fetch(`${url}/api/health`)
    const healthData = await healthResponse.json()

    console.log("Health check result:", healthData)

    if (healthData.status !== "healthy") {
      console.error("Health check failed!")
      process.exit(1)
    }

    // If we're within 5 minutes of the cron job time, check if the cron endpoint is accessible
    if (healthData.isNearCronTime) {
      console.log("Cron job will run soon. Testing cron endpoint...")

      try {
        // Just check if the endpoint is accessible, don't actually run it
        const cronResponse = await fetch(`${url}/api/cron`, { method: "HEAD" })

        if (cronResponse.ok) {
          console.log("Cron endpoint is accessible.")
        } else {
          console.warn(`Cron endpoint returned status ${cronResponse.status}`)
        }
      } catch (cronError) {
        console.warn("Could not access cron endpoint:", cronError.message)
      }
    }

    console.log("Health check passed!")
  } catch (error) {
    console.error("Health check script failed:", error)
    process.exit(1)
  }
}

runHealthCheck()

