"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Tenta buscar o token no localStorage ou Cookies
    // (Ajuste a chave 'access_token' caso tenha usado outro nome no auth.ts)
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token") || getCookie("access_token")
        : null;

    // Simula um pequeno delay para você ver o loading na tela
    const timer = setTimeout(() => {
      if (token) {
        // Se tem token, vai direto pro Dashboard
        router.push("/dashboard");
      } else {
        // Se não tem, manda pro Login
        router.push("/login");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  // Função auxiliar simples para ler cookies (caso o localStorage falhe)
  function getCookie(name: string) {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
    return null;
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
        <div className="p-4 bg-white rounded-full shadow-lg shadow-blue-100">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
        <p className="text-sm font-medium text-slate-500 tracking-wide">
          Iniciando sistema...
        </p>
      </div>
    </div>
  );
}
