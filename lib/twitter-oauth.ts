import crypto from "crypto"

// OAuth 1.0a parameters
interface OAuthParams {
  oauth_consumer_key: string
  oauth_nonce: string
  oauth_signature_method: string
  oauth_timestamp: string
  oauth_token: string
  oauth_version: string
}

// Create OAuth 1.0a signature
export function createOAuthSignature(
  method: string,
  url: string,
  params: OAuthParams,
  body: Record<string, any> | null,
  consumerSecret: string,
  tokenSecret: string,
): string {
  // Create parameter string
  const allParams = { ...params }

  // Add body parameters if this is a POST request with form data
  if (method === "POST" && body) {
    Object.assign(allParams, body)
  }

  // Sort parameters alphabetically
  const paramString = Object.keys(allParams)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
    .join("&")

  // Create signature base string
  const signatureBaseString = [method.toUpperCase(), encodeURIComponent(url), encodeURIComponent(paramString)].join("&")

  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`

  // Create signature
  const signature = crypto.createHmac("sha1", signingKey).update(signatureBaseString).digest("base64")

  return signature
}

// Create OAuth 1.0a header
export function createOAuthHeader(
  method: string,
  url: string,
  body: Record<string, any> | null,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessSecret: string,
): string {
  // Create OAuth parameters
  const oauthParams: OAuthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  }

  // Create signature
  const signature = createOAuthSignature(method, url, oauthParams, body, consumerSecret, accessSecret)

  // Add signature to parameters
  const allParams = {
    ...oauthParams,
    oauth_signature: signature,
  }

  // Create header string
  const headerString =
    "OAuth " +
    Object.keys(allParams)
      .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(allParams[key])}"`)
      .join(", ")

  return headerString
}

