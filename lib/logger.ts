// Simple logging utility
export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data) : "")
  },

  error: (message: string, error: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error)

    // In a production environment, you might want to send this to a logging service
    // Example: await fetch('https://your-logging-service.com/api/log', {...})
  },

  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data) : "")
  },
}

