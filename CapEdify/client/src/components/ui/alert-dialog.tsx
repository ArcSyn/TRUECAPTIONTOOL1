"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Simplified alert dialog stubs - install @radix-ui/react-alert-dialog for full functionality
const AlertDialog = ({ children }: { children: React.ReactNode }) => <>{children}</>

const AlertDialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn("inline-flex justify-center items-center", className)}
    {...props}
  />
))
AlertDialogTrigger.displayName = "AlertDialogTrigger"

const AlertDialogPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>

const AlertDialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "z-50 fixed inset-0 bg-black/80",
      className
    )}
    {...props}
  />
))
AlertDialogOverlay.displayName = "AlertDialogOverlay"

const AlertDialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <div
      ref={ref}
      className={cn(
        "top-[50%] left-[50%] z-50 fixed gap-4 grid bg-white shadow-lg p-6 border rounded-lg w-full max-w-lg translate-x-[-50%] translate-y-[-50%] duration-200",
        className
      )}
      {...props}
    />
  </AlertDialogPortal>
))
AlertDialogContent.displayName = "AlertDialogContent"

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-2 sm:text-left text-center", className)}
    {...props}
  />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex sm:flex-row flex-col-reverse sm:justify-end sm:space-x-2", className)}
    {...props}
  />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("font-semibold text-lg", className)}
    {...props}
  />
))
AlertDialogTitle.displayName = "AlertDialogTitle"

const AlertDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-gray-500 text-sm", className)}
    {...props}
  />
))
AlertDialogDescription.displayName = "AlertDialogDescription"

const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex justify-center items-center bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 h-10 font-semibold text-white text-sm transition-colors disabled:cursor-not-allowed",
      className
    )}
    {...props}
  />
))
AlertDialogAction.displayName = "AlertDialogAction"

const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex justify-center items-center bg-white hover:bg-gray-50 disabled:opacity-50 mt-2 sm:mt-0 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 h-10 font-semibold text-gray-900 text-sm transition-colors disabled:cursor-not-allowed",
      className
    )}
    {...props}
  />
))
AlertDialogCancel.displayName = "AlertDialogCancel"

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
