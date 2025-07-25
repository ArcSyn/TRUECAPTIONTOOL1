
export function Footer() {
  return (
    <footer className={cn("fixed bottom-0 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t")}>
      <div className={cn("container flex h-14 items-center justify-between")}>
        <p className={cn("mx-6 text-sm text-muted-foreground")}>
          Built by <a href="https://pythagora.ai" target="_blank" rel="noopener noreferrer">Pythagora</a>
        </p>
      </div>
    </footer>
  )
}

import { cn } from "@/lib/utils";

