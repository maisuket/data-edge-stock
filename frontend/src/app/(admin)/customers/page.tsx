"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

import { CustomerService } from "../../../lib/services/customers";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ── Page ───────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["customers", page],
    queryFn: () => CustomerService.getAll(page, 15),
    placeholderData: keepPreviousData,
  });

  const customers = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="p-6 md:p-8 max-w-350 mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Users className="w-8 h-8 text-accent" />
          Clientes
        </h1>
        <p className="text-muted-foreground mt-1">
          Cadastro de clientes do cardápio, atualizado automaticamente a cada
          pedido — base para futuras promoções.
        </p>
      </div>

      {/* Table */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold">
            Clientes mais frequentes
          </CardTitle>
          <CardDescription>
            {meta
              ? `${meta.itemCount} cliente${meta.itemCount !== 1 ? "s" : ""} cadastrado${meta.itemCount !== 1 ? "s" : ""}`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="pl-6">Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="pr-6">Cliente desde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full rounded-md" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-40 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-8 h-8 opacity-30" />
                      <p>Nenhum cliente registrado ainda.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="border-border hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="pl-6 font-medium text-foreground">
                      {customer.name || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {customer.phone}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="tabular-nums bg-primary/10 text-primary border border-primary/30">
                        {customer.orderCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-sm text-muted-foreground">
                      {format(new Date(customer.createdAt), "dd/MM/yy", {
                        locale: ptBR,
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        {meta && meta.pageCount > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Página {meta.page} de {meta.pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!meta.hasPreviousPage}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!meta.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
