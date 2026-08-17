import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error('Error caught by AppErrorBoundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReturnToOrders = () => {
    window.location.href = '/orders';
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = import.meta.env.DEV;

      return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-l-4 border-l-red-600">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-red-900">
                Operational display error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-zinc-700">
                The interface could not render this operational record.
              </p>

              {isDevelopment && this.state.error && (
                <details className="bg-zinc-100 border border-zinc-300 rounded p-3">
                  <summary className="text-xs font-mono font-semibold text-zinc-600 cursor-pointer mb-2">
                    Error Details (Development)
                  </summary>
                  <div className="font-mono text-xs text-red-800 space-y-1">
                    <div className="font-bold">{this.state.error.toString()}</div>
                    {this.state.errorInfo && (
                      <div className="text-zinc-600 whitespace-pre-wrap mt-2">
                        {this.state.errorInfo.componentStack}
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={this.handleRetry}
                  className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors font-medium"
                >
                  Retry
                </button>
                <button
                  onClick={this.handleReturnToOrders}
                  className="flex-1 px-4 py-2 bg-zinc-200 text-zinc-900 rounded-md hover:bg-zinc-300 transition-colors font-medium"
                >
                  Return to Orders
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
