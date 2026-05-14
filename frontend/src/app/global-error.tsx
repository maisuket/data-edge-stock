"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-4 bg-background">
          <div className="p-4 bg-red-100 text-red-600 rounded-full dark:bg-red-900/20 dark:text-red-400">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Erro Fatal na Aplicação
          </h2>
          <p className="text-muted-foreground max-w-md">
            Ocorreu um erro crítico no layout principal. Nossa equipe já foi
            notificada.
          </p>
          <button
            onClick={() => reset()}
            className="px-6 py-2 mt-4 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity font-medium"
          >
            Recarregar aplicação
          </button>
        </div>
      </body>
    </html>
  );
}
