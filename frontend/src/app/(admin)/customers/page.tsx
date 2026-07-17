"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Users, AlertTriangle } from "lucide-react";
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

// ── Table skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="h-5 w-10 rounded-full ml-auto" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, isPlaceholderData } = useQuery({
    queryKey: ["customers", page],
    queryFn: () => CustomerService.getAll(page, 15),
    placeholderData: keepPreviousData,
  });

  const customers = data?.data ?? [];

  return (
    <div className="p-8 max-w-400 mx-auto pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Users className="w-7 h-7 text-accent" />
          Clientes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastro de clientes do cardápio, atualizado automaticamente a cada
          pedido — base para futuras promoções.
        </p>
      </div>

      {/* Table */}
      <Card className="border-border shadow-md bg-card rounded-2xl overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle>Clientes mais frequentes</CardTitle>
          <CardDescription>
            Cadastro agregado por telefone, atualizado a cada pedido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold text-foreground">
                    Nome
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Telefone
                  </TableHead>
                  <TableHead className="text-right font-semibold text-foreground">
                    Pedidos
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Cliente desde
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton />
                ) : isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-32 text-center text-destructive"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <AlertTriangle className="h-6 w-6" />
                        <span>
                          Erro ao carregar dados. Verifique a conexão.
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-32 text-center text-muted-foreground"
                    >
                      Nenhum cliente registrado ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="hover:bg-muted/40 transition-colors duration-300"
                    >
                      <TableCell className="font-medium text-foreground">
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
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(customer.createdAt), "dd/MM/yy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-xs text-muted-foreground">
              {data?.meta?.itemCount
                ? `Total de ${data.meta.itemCount} cliente(s)`
                : ""}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="h-8 text-xs rounded-xl transition-all duration-300 hover:scale-[1.05]"
              >
                Anterior
              </Button>
              <div className="text-xs font-medium px-2 text-muted-foreground">
                Página {page}{" "}
                {data?.meta?.pageCount ? `de ${data.meta.pageCount}` : ""}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={
                  !data?.meta?.hasNextPage || isLoading || isPlaceholderData
                }
                className="h-8 text-xs rounded-xl transition-all duration-300 hover:scale-[1.05]"
              >
                Próximo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
