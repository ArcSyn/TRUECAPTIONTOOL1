import React from 'react';
import { Check, Upload, Mic, Edit, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  currentStep: 'upload' | 'transcribe' | 'edit' | 'export';
  completedSteps: string[];
}

const steps = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'transcribe', label: 'Transcribe', icon: Mic },
  { id: 'edit', label: 'Edit', icon: Edit },
  { id: 'export', label: 'Export', icon: Download },
];

export function StepIndicator({ currentStep, completedSteps }: StepIndicatorProps) {
  return (
    <div className={cn("flex justify-center items-center space-x-4 mb-8")}>
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = currentStep === step.id;
        const isUpcoming = !isCompleted && !isCurrent;

        return (
          <React.Fragment key={step.id}>
            <div className={cn("flex flex-col items-center space-y-2")}>
              <div
                className={cn(
                  "flex justify-center items-center rounded-full w-12 h-12 transition-all duration-300",
                  isCompleted && "bg-green-500 text-white shadow-lg scale-110",
                  isCurrent && "bg-blue-500 text-white shadow-lg scale-110 animate-pulse",
                  isUpcoming && "bg-gray-200 text-gray-400"
                )}
              >
                {isCompleted ? (
                  <Check className={cn("w-6 h-6")} />
                ) : (
                  <Icon className={cn("w-6 h-6")} />
                )}
              </div>
              <span
                className={cn(
                  "font-medium text-sm transition-colors duration-300",
                  isCompleted && "text-green-600",
                  isCurrent && "text-blue-600",
                  isUpcoming && "text-gray-400"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-16 h-0.5 transition-colors duration-300",
                  completedSteps.includes(steps[index + 1].id) ? "bg-green-500" : "bg-gray-200"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}



