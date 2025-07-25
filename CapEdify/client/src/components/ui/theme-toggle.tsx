"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    setIsDark(root.classList.contains("dark"))
  }, [])

  const toggleTheme = () => {
    const root = document.documentElement
    const newTheme = !isDark
    root.classList.toggle("dark", newTheme)
    setIsDark(newTheme)
  }

  const Icon = isDark ? Sun : Moon

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn("hover:bg-accent rounded-full w-9 h-9 transition-colors")}
      aria-label="Toggle theme"
    >
      <Icon className={cn("w-5 h-5 transition-all")} />
    </Button>
  )
}

import { cn } from "@/lib/utils";

