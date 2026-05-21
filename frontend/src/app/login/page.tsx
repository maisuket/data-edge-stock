"use client"; // Necessário para usar hooks como useState e useRouter

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation"; // Importante: use navigation, não router
import {
  Loader2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Info,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/lib/services/auth";
import { SettingsService } from "@/lib/services/settings";

// Schema de validação
const loginSchema = z.object({
  username: z.string().min(5, "O usuário deve ter no mínimo 5 caracteres"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter(); // Hook de navegação
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [bgImage, setBgImage] = useState(
    "https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNmEwODY0OTBjZjQ0ODE5MWE0MTMxNWMxZmVkMTVkNmI6ZmlsZV8wMDAwMDAwMDk4ZGM3MWZiYmJkYjFmZmNhZDE5MzFkNSIsInRzIjoiMjA1ODkiLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6IjdjMjU3MmYyNWM0YTcxNjM4Y2FiNzkwZGZmMzk4YTlmY2Q0N2IxMGQ2OWRmYjEzZTZlYzA5ZDAxMWE0MTA2OWUiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJmbiI6bnVsbCwiY2QiOm51bGwsImNwIjpudWxsLCJtYSI6bnVsbH0=",
  );
  const [cookiesBlocked, setCookiesBlocked] = useState(false);

  // Carrega a imagem dinâmica salva nas configurações
  useEffect(() => {
    // Verifica proativamente se os cookies estão bloqueados no navegador
    // setTimeout evita a chamada síncrona do setState dentro do efeito (resolve o aviso do linter)
    const cookieCheckTimer = setTimeout(() => {
      if (typeof window !== "undefined") {
        let isCookieWorking = navigator.cookieEnabled;

        // Faz o teste real de gravação/leitura para pegar bloqueios de extensões
        if (isCookieWorking) {
          document.cookie = "testcookie=1; max-age=10";
          isCookieWorking = document.cookie.indexOf("testcookie=1") !== -1;
          document.cookie = "testcookie=1; max-age=0"; // Limpa o cookie de teste
        }

        if (!isCookieWorking) setCookiesBlocked(true);
      }
    }, 0);

    SettingsService.getByKey("LOGIN_IMAGE_URL")
      .then((res) => {
        if (res?.value) setBgImage(res.value);
      })
      .catch(console.error); // Ignora erro silenciosamente no login para não impedir o usuário de logar

    return () => clearTimeout(cookieCheckTimer);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const handleLogin = async (data: LoginFormData) => {
    setSuccess(false);

    try {
      // Chama o serviço real que salva o Cookie
      const response = await authService.login(data);

      // --- VERIFICAÇÃO DE BLOQUEIO DE TERCEIROS ---
      // Como o cookie é HttpOnly, fazemos um ping na rota de profile.
      // Se retornar 401, sabemos que o browser descartou o cookie.
      try {
        await authService.getProfile();
      } catch (verifyErr) {
        throw new Error("ThirdPartyCookieBlocked");
      }

      // Salva os dados do usuário no sessionStorage para uso no layout
      if (response.user) {
        sessionStorage.setItem("user", JSON.stringify(response.user));
      }

      setSuccess(true);
      toast.success("Login realizado! Redirecionando...");

      // Aguarda um momento visual e redireciona
      setTimeout(() => {
        // Força um full-reload para garantir que o servidor e o browser
        // estejam sincronizados com o novo estado de autenticação (cookie).
        window.location.href = "/dashboard";
      }, 1000);
    } catch (err: any) {
      if (err.message === "ThirdPartyCookieBlocked") {
        toast.error(
          "O login foi concluído, mas o navegador bloqueou o salvamento do cookie (bloqueio de terceiros). Por favor, adicione este site às exceções ou desative a prevenção de rastreamento cruzado.",
        );
      }
      // Identifica bloqueios de requisição causados por extensões (AdBlock, Privacy Badger, etc)
      else if (
        err.message === "Failed to fetch" ||
        err.message === "Network Error"
      ) {
        toast.error(
          "Erro de conexão. Verifique se alguma extensão de privacidade ou AdBlocker está bloqueando a requisição.",
        );
      } else {
        toast.error(err.message || "Ocorreu um erro ao tentar entrar.");
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Lado Esquerdo - Imagem com Tema de Pudim */}
      <div className="hidden lg:flex w-1/2 relative bg-muted items-center justify-center overflow-hidden">
        {/* Overlay para dar um tom de caramelo mais aconchegante sobre a imagem */}
        <div className="absolute inset-0 bg-primary/20 z-10 mix-blend-multiply" />
        {/* Imagem do Unsplash (Sem Direitos Autorais) de um Pudim / Flan */}
        <Image
          src={bgImage}
          alt="Fábrica de Pudins"
          fill
          className="object-cover"
          priority
          unoptimized
        />
        {/* Gradiente e texto integrado à imagem */}
        <div className="relative z-20 flex flex-col justify-end w-full h-full p-12 bg-linear-to-t from-black/90 via-black/40 to-transparent">
          <div className="max-w-lg animate-in fade-in slide-in-from-bottom-8 duration-700">
            <p className="text-white/80 text-lg leading-relaxed">
              A doçura de uma gestão eficiente. O controle perfeito para a sua
              fábrica.
            </p>
          </div>
        </div>
      </div>

      {/* Lado Direito - Formulário de Login */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative bg-background">
        <div className="w-full max-w-95 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Cabeçalho */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center mb-2">
              {/* Substitua o src pelo caminho real da sua logo na pasta 'public' (ex: '/minha-logo.svg') */}
              <Image
                src="/logo.png"
                alt="Logo Dr.Pudim"
                width={400}
                height={240}
                className="h-60 w-auto object-contain"
                priority
              />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Bem-vindo de volta
            </h1>
            <p className="text-muted-foreground">Gerenciamento de Estoque</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit(handleLogin)} className="space-y-6">
            {/* Campos (username/Senha) */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="username"
              >
                E-mail / Usuário
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors duration-300 group-focus-within:text-primary">
                  <Mail className="h-5 w-5 text-muted-foreground group-focus-within:text-primary" />
                </div>
                <input
                  {...register("username")}
                  id="username"
                  type="username"
                  placeholder="Digite seu usuário..."
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/20 focus:outline-none transition-all duration-300
                      ${
                        errors.username
                          ? "border-destructive focus-visible:border-destructive"
                          : "border-border focus-visible:border-primary/50"
                      }`}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-destructive mt-1 pl-1">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="password"
              >
                Senha
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors duration-300 group-focus-within:text-primary">
                  <Lock className="h-5 w-5 text-muted-foreground group-focus-within:text-primary" />
                </div>
                <input
                  {...register("password")}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-12 py-3 rounded-xl border bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/20 focus:outline-none transition-all duration-300
                      ${
                        errors.password
                          ? "border-destructive focus-visible:border-destructive"
                          : "border-border focus-visible:border-primary/50"
                      }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive mt-1 pl-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || success || cookiesBlocked}
              className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-xl hover:bg-[#A65E2E] hover:scale-[1.02] hover:shadow-lg active:scale-95 transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Entrar"
              )}
            </button>

            {cookiesBlocked ? (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-xs text-destructive mt-4">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  <strong>Erro Crítico:</strong> Os cookies estão bloqueados no
                  seu navegador. O login foi desativado, pois o sistema não
                  funcionará sem eles. Por favor, habilite-os nas configurações
                  ou saia do modo anônimo estrito.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 bg-muted/50 border border-border/50 rounded-lg text-xs text-muted-foreground mt-4">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  <strong>Aviso sobre Cookies:</strong> Este sistema necessita
                  de cookies para autenticação. Caso seu navegador os bloqueie
                  (ex: modo anônimo restrito), o login poderá falhar.
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
