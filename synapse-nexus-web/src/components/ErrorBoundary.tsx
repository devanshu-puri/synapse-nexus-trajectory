'use client'

import { Component, ReactNode, ErrorInfo } from 'react'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 w-full bg-primary text-textprimary">
          <div className="bg-elevated p-6 rounded-lg border border-danger shadow-lg max-w-md w-full text-center">
            <h2 className="text-xl font-clash text-danger mb-4">Something went wrong</h2>
            <p className="text-textsecondary text-sm mb-6 font-mono-data">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              className="bg-danger text-white px-4 py-2 font-medium hover:bg-opacity-80 transition-all rounded-sm font-mono-data text-sm"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
