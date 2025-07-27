// TEMPORARY: Minimal UI components to avoid dependency issues
import React from 'react';

// Simple replacements for missing UI components
export const Accordion = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const AccordionItem = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const AccordionTrigger = ({ children, ...props }: any) => <button {...props}>{children}</button>;
export const AccordionContent = ({ children, ...props }: any) => <div {...props}>{children}</div>;

export const AlertDialog = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const AlertDialogTrigger = ({ children, ...props }: any) => <button {...props}>{children}</button>;
export const AlertDialogContent = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const AlertDialogHeader = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const AlertDialogTitle = ({ children, ...props }: any) => <h2 {...props}>{children}</h2>;

export const Avatar = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const AvatarImage = ({ children, ...props }: any) => <img {...props} />;
export const AvatarFallback = ({ children, ...props }: any) => <div {...props}>{children}</div>;

export const Calendar = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const Carousel = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const CarouselContent = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const CarouselItem = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const CarouselPrevious = ({ children, ...props }: any) => <button {...props}>{children}</button>;
export const CarouselNext = ({ children, ...props }: any) => <button {...props}>{children}</button>;

export const Chart = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const ChartContainer = ({ children, ...props }: any) => <div {...props}>{children}</div>;

export const Checkbox = ({ children, ...props }: any) => <input type="checkbox" {...props} />;

export const Collapsible = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const CollapsibleTrigger = ({ children, ...props }: any) => <button {...props}>{children}</button>;
export const CollapsibleContent = ({ children, ...props }: any) => <div {...props}>{children}</div>;

export const Command = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const CommandInput = ({ children, ...props }: any) => <input {...props} />;
export const CommandList = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const CommandItem = ({ children, ...props }: any) => <div {...props}>{children}</div>;

export const ContextMenu = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const ContextMenuTrigger = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const ContextMenuContent = ({ children, ...props }: any) => <div {...props}>{children}</div>;

export const Drawer = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const DrawerTrigger = ({ children, ...props }: any) => <button {...props}>{children}</button>;
export const DrawerContent = ({ children, ...props }: any) => <div {...props}>{children}</div>;

export const Form = ({ children, ...props }: any) => <form {...props}>{children}</form>;
export const FormField = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const FormItem = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const FormLabel = ({ children, ...props }: any) => <label {...props}>{children}</label>;
export const FormControl = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const FormMessage = ({ children, ...props }: any) => <div {...props}>{children}</div>;

export const HoverCard = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const HoverCardTrigger = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const HoverCardContent = ({ children, ...props }: any) => <div {...props}>{children}</div>;

export const InputOTP = ({ children, ...props }: any) => <input {...props} />;
export const InputOTPGroup = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const InputOTPSlot = ({ children, ...props }: any) => <div {...props}>{children}</div>;

export const Menubar = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const MenubarMenu = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const MenubarTrigger = ({ children, ...props }: any) => <button {...props}>{children}</button>;
export const MenubarContent = ({ children, ...props }: any) => <div {...props}>{children}</div>;

export const NavigationMenu = ({ children, ...props }: any) => <nav {...props}>{children}</nav>;
export const NavigationMenuList = ({ children, ...props }: any) => <ul {...props}>{children}</ul>;
export const NavigationMenuItem = ({ children, ...props }: any) => <li {...props}>{children}</li>;

export const RadioGroup = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const RadioGroupItem = ({ children, ...props }: any) => <input type="radio" {...props} />;

export const ResizablePanelGroup = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const ResizablePanel = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const ResizableHandle = ({ children, ...props }: any) => <div {...props}>{children}</div>;

export const Slider = ({ children, ...props }: any) => <input type="range" {...props} />;

export const Toaster = ({ children, ...props }: any) => <div {...props}>{children}</div>;

export const ToggleGroup = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const ToggleGroupItem = ({ children, ...props }: any) => <button {...props}>{children}</button>;

export const Tooltip = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const TooltipTrigger = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const TooltipContent = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const TooltipProvider = ({ children, ...props }: any) => <div {...props}>{children}</div>;
