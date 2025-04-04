// Enhanced logging utility with better object handling
export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data ? safeStringify(data) : "")
  },

  error: (message: string, error: any) => {
    // Create a more detailed error object
    const errorDetails = prepareErrorForLogging(error)
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, safeStringify(errorDetails))
  },

  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data ? safeStringify(data) : "")
  },
}

// Set to track objects during stringification to avoid circular references
const seen = new Set()

// Helper to safely stringify any value
function safeStringify(value: any): string {
  try {
    seen.clear() // Clear the set before each stringification
    return JSON.stringify(value, replacer, 2)
  } catch (err) {
    return `[Unstringifiable Object: ${String(err)}]`
  }
}

// Custom replacer function for JSON.stringify
function replacer(key: string, value: any): any {
  if (typeof value === "object" && value !== null) {
    // Handle circular references
    if (seen.has(value)) {
      return "[Circular Reference]"
    }
    seen.add(value)

    // Handle Error objects specially
    if (value instanceof Error) {
      return {
        message: value.message,
        stack: value.stack,
        name: value.name,
        ...Object.fromEntries(Object.entries(value).filter(([k]) => !["message", "stack", "name"].includes(k))),
      }
    }
  }
  return value
}

// Prepare error objects for logging
function prepareErrorForLogging(error: any): any {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...Object.fromEntries(Object.entries(error).filter(([key]) => !["message", "stack", "name"].includes(key))),
    }
  } else if (typeof error === "object" && error !== null) {
    // For non-Error objects, try to extract useful information
    return {
      type: "object",
      value: safeStringify(error),
      keys: Object.keys(error),
      ...error, // Include all properties
    }
  } else {
    // For primitives
    return {
      type: typeof error,
      value: String(error),
    }
  }
}

