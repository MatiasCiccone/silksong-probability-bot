// Retry function with exponential backoff
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number
    initialDelay?: number
    maxDelay?: number
    factor?: number
    onRetry?: (error: Error, attempt: number) => void
  } = {},
): Promise<T> {
  const { retries = 3, initialDelay = 1000, maxDelay = 10000, factor = 2, onRetry = () => {} } = options

  let lastError: Error

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Call the onRetry callback
      onRetry(lastError, attempt + 1)

      if (attempt < retries - 1) {
        // Calculate delay with exponential backoff
        const delay = Math.min(initialDelay * Math.pow(factor, attempt), maxDelay)

        // Add some jitter to prevent all retries happening at exactly the same time
        const jitter = Math.random() * 200

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay + jitter))
      }
    }
  }

  throw lastError!
}

