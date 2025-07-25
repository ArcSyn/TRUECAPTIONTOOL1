"use client"

import { useNavigate } from "react-router-dom"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import ThemeSelector from "@/components/ThemeSelector" // ✅ Correct import

export function Header() {
  const navigate = useNavigate()

  return (
    <header className={cn("top-0 z-50 fixed bg-background/80 backdrop-blur-sm border-b w-full")}>
      <div className={cn("flex justify-between items-center px-6 h-16")}>
        <div
          className={cn("font-bold text-xl cursor-pointer")}
          onClick={() => navigate("/")}
        >
          Home
        </div>
        <div className={cn("flex items-center gap-4")}>
          <ThemeToggle />
          <ThemeSelector />
        </div>
      </div>
    </header>
  )
}

import { cn } from "@/lib/utils";

