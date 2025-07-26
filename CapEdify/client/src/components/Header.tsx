import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ThemeSelector } from "@/components/ThemeSelector";

export function Header() {
  const navigate = useNavigate();

  return (
    <header className={cn("top-0 z-50 fixed bg-background/80 backdrop-blur-sm border-b w-full")}>
      <div className={cn("flex justify-between items-center h-16 container")}>
        <div
          className={cn("font-bold hover:text-primary text-xl transition-colors cursor-pointer")}
          onClick={() => navigate("/")}
        >
          CapEdify
        </div>
        <div className={cn("flex items-center space-x-4")}>
          <ThemeToggle />
          <div className="bg-border/50 w-px h-6" /> {/* Subtle divider */}
          <ThemeSelector />
        </div>
      </div>
    </header>
  )
}

