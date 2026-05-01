"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  Loader2,
  Calendar,
  Filter,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

// Imports
import {
  StockMovementService,
  MovementType,
} from "../../../lib/services/stock-movements";

// Componentes UI
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MovementsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filterType, setFilterType] = useState<string>("ALL");

  // Query de Movimentações
  const { data, isLoading, isError } = useQuery({
    queryKey: ["movements", page, pageSize],
    queryFn: () => StockMovementService.getAll(page, pageSize),
    placeholderData: keepPreviousData,
  });

  // Função auxiliar para renderizar o tipo de movimento
  const renderTypeBadge = (type: MovementType) => {
    switch (type) {
      case MovementType.ENTRY:
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/50 gap-1 pr-2"
          >
            <ArrowDownToLine className="w-3 h-3" /> Entrada
          </Badge>
        );
      case MovementType.EXIT:
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50 gap-1 pr-2"
          >
            <ArrowUpFromLine className="w-3 h-3" /> Saída
          </Badge>
        );
      case MovementType.ADJUSTMENT:
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50 gap-1 pr-2"
          >
            <ArrowRightLeft className="w-3 h-3" /> Ajuste
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Movimentações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Histórico completo de entradas e saídas de estoque.
          </p>
        </div>
      </div>

      <Card className="border-border shadow-sm bg-card">
        <CardHeader className="pb-4 border-b border-border">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle>Histórico</CardTitle>
              <CardDescription>
                Registro auditável de operações.
              </CardDescription>
            </div>

            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Tipos</SelectItem>
                  <SelectItem value="ENTRY">Entradas</SelectItem>
                  <SelectItem value="EXIT">Saídas</SelectItem>
                  <SelectItem value="ADJUSTMENT">Ajustes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border">
                  <TableHead className="pl-6 w-[180px]">Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="w-[300px]">Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col justify-center items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-sm">Carregando histórico...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-destructive"
                    >
                      Erro ao carregar dados.
                    </TableCell>
                  </TableRow>
                ) : data?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-muted-foreground"
                    >
                      Nenhuma movimentação registrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data?.map((row) => (
                    <TableRow
                      key={row.id}
                      className="group hover:bg-muted/30 transition-colors border-b border-border"
                    >
                      <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {row.createdAt
                            ? format(
                                new Date(row.createdAt),
                                "dd/MM/yyyy HH:mm",
                                { locale: ptBR }
                              )
                            : "-"}
                        </div>
                      </TableCell>

                      <TableCell>{renderTypeBadge(row.type)}</TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground text-sm">
                            {row.product?.name || "Produto excluído"}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {row.product?.internalCode}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold text-sm">
                          {row.quantity}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex gap-1 items-center mt-0.5">
                          {row.stockBefore}{" "}
                          <span className="text-muted-foreground/50">→</span>{" "}
                          {row.stockAfter}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <User className="w-3 h-3" />
                          {row.user?.name || "Sistema"}
                        </div>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                        {row.description || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              {data?.meta?.itemCount
                ? `Total de ${data.meta.itemCount} registros`
                : ""}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="h-8 text-xs"
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
                disabled={!data?.meta?.hasNextPage || isLoading}
                className="h-8 text-xs"
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
