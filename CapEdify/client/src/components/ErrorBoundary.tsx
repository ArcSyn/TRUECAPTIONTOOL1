import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`ErrorBoundary caught error in ${this.props.componentName || 'unknown component'}:`, error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="bg-red-50 border border-red-200 p-6 m-4">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-red-800">
              Component Error
            </h2>
            <p className="text-red-700">
              {this.props.componentName ? 
                `The ${this.props.componentName} component encountered an error and has been temporarily disabled.` :
                'A component encountered an error and has been temporarily disabled.'
              }
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="bg-red-100 p-3 rounded border">
                <summary className="cursor-pointer text-red-800 font-medium">
                  Error Details (Development Mode)
                </summary>
                <pre className="mt-2 text-sm text-red-700 overflow-auto">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <div className="flex space-x-2">
              <Button 
                onClick={this.handleReset}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Try Again
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Reload Page
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Wrapper component for easier usage
export const SafeComponent: React.FC<{
  children: ReactNode;
  componentName?: string;
  fallback?: ReactNode;
}> = ({ children, componentName, fallback }) => (
  <ErrorBoundary componentName={componentName} fallback={fallback}>
    {children}
  </ErrorBoundary>
);