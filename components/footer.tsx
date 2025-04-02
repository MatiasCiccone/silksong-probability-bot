import Link from "next/link"
import { Github } from "lucide-react"
import { XLogo } from "./x-logo"

export function Footer() {
  return (
    <footer className="mt-8 pb-4 flex justify-center space-x-4">
      <Link
        href="https://github.com/MatiasCiccone/silksong-probability-bot"
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full bg-white hover:bg-gray-100 transition-colors"
        aria-label="GitHub Repository"
      >
        <Github size={24} className="text-black" />
      </Link>
      <Link
        href="https://x.com/SilksongProbBot"
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full bg-white hover:bg-gray-100 transition-colors"
        aria-label="X Profile"
      >
        <XLogo size={24} className="text-black" />
      </Link>
    </footer>
  )
}

