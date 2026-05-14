"use client"; // Error boundaries devem ser sempre Client Components

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Aqui você pode enviar o erro para um serviço de monitoramento (ex: Sentry)
    console.error("Erro capturado pelo Error Boundary:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center space-y-4 animate-in fade-in duration-500">
      <div className="p-4 bg-red-100 text-red-600 rounded-full dark:bg-red-900/20 dark:text-red-400">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        Ocorreu um erro inesperado!
      </h2>
      <p className="text-muted-foreground max-w-md">
        Não foi possível carregar esta parte da aplicação devido a um problema
        interno.
      </p>
      <Button onClick={() => reset()} variant="outline" className="mt-4">
        Tentar carregar novamente
      </Button>
    </div>
  );
}
