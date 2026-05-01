"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Boxes,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

// Componentes Shadcn
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

// --- Itens do Menu ---
const menuItems = [
  { href: "/dashboard", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/products", label: "Produtos", icon: Package },
  { href: "/stock-history", label: "Movimentações", icon: ArrowLeftRight },
  { href: "/suppliers", label: "Fornecedores", icon: Truck },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Fecha a sidebar ao navegar no mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    // Remove cookies e localStorage
    document.cookie =
      "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    localStorage.removeItem("access_token");

    toast.info("Você saiu do sistema.");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* --- Overlay para Mobile --- */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- Sidebar --- */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border
          transform transition-transform duration-300 ease-in-out
          ${
            isSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
          flex flex-col
          shadow-xl lg:shadow-none
        `}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-sidebar-border">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground p-1.5 rounded-lg">
            <Boxes className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-wide">StockFlow</span>
          <button
            className="ml-auto lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">
            Menu Principal
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group text-sm font-medium
                  ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }
                `}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? "text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground"
                  }`}
                />
                <span>{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User / Footer */}
        <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/10">
          <div className="flex items-center gap-3 mb-4 px-1">
            <Avatar className="h-9 w-9 border border-sidebar-border">
              <AvatarFallback className="bg-sidebar-primary/10 text-sidebar-primary text-xs font-bold">
                AD
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">Administrador</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                admin@stock.com
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-sidebar-border bg-transparent"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Sistema</span>
          </Button>
        </div>
      </aside>

      {/* --- Main Content Wrapper --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 flex items-center px-4 justify-between border-b border-border bg-background">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="-ml-2"
          >
            <Menu className="w-6 h-6" />
          </Button>
          <span className="font-semibold">StockFlow</span>
          <div className="w-8" /> {/* Spacer */}
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto p-0">{children}</main>
      </div>
    </div>
  );
}
