// Simple Twitter API client using fetch
export async function postTweet(text: string) {
  const url = "https://api.twitter.com/2/tweets"

  // Create the OAuth 1.0a header
  const oauthHeader = await createOAuthHeader("POST", url)

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Twitter API error: ${JSON.stringify(errorData)}`)
  }

  return response.json()
}

// Create OAuth 1.0a header
async function createOAuthHeader(method: string, url: string) {
  // For simplicity, we'll use a pre-generated bearer token approach instead
  // This avoids the need for complex OAuth 1.0a signature generation

  // Get the bearer token using app credentials
  const bearerToken = await getBearerToken()

  return `Bearer ${bearerToken}`
}

// Get a bearer token
async function getBearerToken() {
  // In a real implementation, you would exchange your API key and secret for a bearer token
  // For now, we'll use a simpler approach with a pre-generated token

  // Check if we have a bearer token in environment variables
  if (process.env.TWITTER_BEARER_TOKEN) {
    return process.env.TWITTER_BEARER_TOKEN
  }

  // If not, we'll try to get one using the API key and secret
  const credentials = Buffer.from(`${process.env.TWITTER_API_KEY}:${process.env.TWITTER_API_SECRET}`).toString("base64")

  const response = await fetch("https://api.twitter.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })

  if (!response.ok) {
    throw new Error("Failed to get bearer token")
  }

  const data = await response.json()
  return data.access_token
}

