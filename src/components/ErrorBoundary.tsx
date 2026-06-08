import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-8 my-4 rounded-xl border border-red-500/20 bg-red-500/5 flex flex-col items-center text-center space-y-4">
          <div className="size-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="size-6 text-red-500" />
          </div>
          <div className="space-y-2">
            <h3 className="font-display text-lg font-bold text-foreground">Ops! Algo deu errado</h3>
            <p className="text-sm text-foreground/60 max-w-md mx-auto">
              Houve um erro ao carregar este componente. Tentamos isolar o problema para que o resto do sistema continue funcionando.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="size-4" /> Recarregar página
          </Button>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-4 bg-black/40 rounded text-left overflow-auto max-w-full text-xs font-mono text-red-400">
              {this.state.error?.toString()}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
