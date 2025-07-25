import { cn } from "@/lib/utils";
import { Outlet } from "react-router-dom"
import { Header } from "./Header"
import { Footer } from "./Footer"

export function Layout() {
  return (
    <div className={cn("bg-gradient-to-br from-background to-secondary min-h-screen")}>
      <Header />
      <div className={cn("flex pt-16 h-[calc(100vh-4rem)]")}>
        <main className={cn("flex-1 p-6 overflow-y-auto")}>
          <div className={cn("mx-auto max-w-7xl")}>
            <Outlet />
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}

