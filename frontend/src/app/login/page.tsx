"use client"; // Necessário para usar hooks como useState e useRouter

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation"; // Importante: use navigation, não router
import { Loader2, Lock, Mail, Eye, EyeOff } from "lucide-react";
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
    "https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=1200&q=80",
  );

  // Carrega a imagem dinâmica salva nas configurações
  useEffect(() => {
    SettingsService.getByKey("LOGIN_IMAGE_URL")
      .then((res) => {
        if (res?.value) setBgImage(res.value);
      })
      .catch(console.error); // Ignora erro silenciosamente no login para não impedir o usuário de logar
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
      await authService.login(data);

      setSuccess(true);
      toast.success("Login realizado! Redirecionando...");

      // Aguarda um momento visual e redireciona
      setTimeout(() => {
        router.push("/dashboard"); // Redireciona para a home
        router.refresh(); // Força atualização para o middleware reconhecer o novo cookie
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || "Ocorreu um erro ao tentar entrar.");
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Lado Esquerdo - Imagem com Tema de Pudim */}
      <div className="hidden lg:flex w-1/2 relative bg-muted items-center justify-center overflow-hidden">
        {/* Overlay para dar um tom de caramelo mais aconchegante sobre a imagem */}
        <div className="absolute inset-0 bg-primary/20 z-10 mix-blend-multiply" />
        {/* Imagem do Unsplash (Sem Direitos Autorais) de um Pudim / Flan */}
        <img
          src={bgImage}
          alt="Fábrica de Pudins"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradiente e texto integrado à imagem */}
        <div className="relative z-20 flex flex-col justify-end w-full h-full p-12 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
          <div className="max-w-lg animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h2 className="text-5xl font-extrabold text-white mb-4 tracking-tight">
              StockFlow
            </h2>
            <p className="text-white/80 text-lg leading-relaxed">
              A doçura de uma gestão eficiente. O controle perfeito para a sua
              fábrica.
            </p>
          </div>
        </div>
      </div>

      {/* Lado Direito - Formulário de Login */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative bg-background">
        <div className="w-full max-w-[380px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Cabeçalho */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center mb-2">
              {/* Substitua o src pelo caminho real da sua logo na pasta 'public' (ex: '/minha-logo.svg') */}
              <img
                src="/logo.png"
                alt="Logo StockFlow"
                className="h-60 w-auto object-contain"
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
              disabled={isSubmitting || success}
              className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-xl hover:bg-[#A65E2E] hover:scale-[1.02] hover:shadow-lg active:scale-95 transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
