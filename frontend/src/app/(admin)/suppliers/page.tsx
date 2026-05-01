"use client";

import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Truck,
  MapPin,
  Phone,
  Mail,
  FileText,
  AlertTriangle,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";

// Imports com caminhos relativos
import {
  SupplierService,
  type Supplier,
} from "../../../lib/services/suppliers";

// Componentes Shadcn
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SupplierFormDialog } from "@/app/components/SupllierFormDialog";

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Controle do Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const queryClient = useQueryClient();

  // Query: Listar Fornecedores
  const { data, isLoading, isError, isPlaceholderData } = useQuery({
    queryKey: ["suppliers", page, search],
    queryFn: () => SupplierService.getAll(page, pageSize, search),
    placeholderData: keepPreviousData,
  });

  // Mutation: Excluir
  const deleteMutation = useMutation({
    mutationFn: SupplierService.delete,
    onSuccess: () => {
      toast.success("Fornecedor excluído!");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: () =>
      toast.error(
        "Erro ao excluir. O fornecedor pode ter produtos vinculados."
      ),
  });

  // Handlers
  const handleAdd = () => {
    setEditingSupplier(null);
    setIsFormOpen(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este fornecedor?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Fornecedores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie seus parceiros e contatos de compra.
          </p>
        </div>
        <Button
          onClick={handleAdd}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Novo Fornecedor
        </Button>
      </div>

      <Card className="border-border shadow-sm bg-card">
        <CardHeader className="pb-4 border-b border-border">
          <CardTitle>Listagem de Parceiros</CardTitle>
          <CardDescription>
            Visualize todos os fornecedores cadastrados.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Busca */}
          <div className="flex items-center space-x-2 mb-4 bg-background p-1 rounded-md border border-border w-fit">
            <div className="relative w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CNPJ..."
                className="pl-9 border-0 shadow-none focus-visible:ring-0 h-9 bg-transparent"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold text-foreground">
                    Fornecedor
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Contatos
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Endereço
                  </TableHead>
                  <TableHead className="text-right font-semibold text-foreground w-[80px]">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-32 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col justify-center items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-sm">Carregando parceiros...</span>
                      </div>
                    </TableCell>
                  </TableRow>
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
                ) : data?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-32 text-center text-muted-foreground"
                    >
                      Nenhum fornecedor encontrado para "{search}".
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data?.map((row) => (
                    <TableRow
                      key={row.id}
                      className="group hover:bg-muted/30 transition-colors"
                    >
                      {/* Coluna Nome/CNPJ */}
                      <TableCell className="align-top py-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-muted rounded-lg text-muted-foreground border border-border mt-1">
                            <Truck className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-base">
                              {row.name}
                            </div>
                            {row.cnpj && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <Badge
                                  variant="outline"
                                  className="text-xs font-mono font-normal text-muted-foreground bg-background"
                                >
                                  <FileText className="w-3 h-3 mr-1" />
                                  {row.cnpj}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Coluna Contatos */}
                      <TableCell className="align-top py-4">
                        <div className="space-y-1.5">
                          {row.email ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-4 h-4 text-muted-foreground/70" />
                              <span>{row.email}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground/50 italic">
                              Sem e-mail
                            </span>
                          )}

                          {row.phone ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="w-4 h-4 text-muted-foreground/70" />
                              <span>{row.phone}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground/50 italic block">
                              Sem telefone
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Coluna Endereço */}
                      <TableCell className="align-top py-4">
                        {row.address ? (
                          <div className="flex items-start gap-2 text-sm text-muted-foreground max-w-[250px]">
                            <MapPin className="w-4 h-4 text-muted-foreground/70 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{row.address}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground/50 italic">
                            Não informado
                          </span>
                        )}
                      </TableCell>

                      {/* Coluna Ações (Dropdown) */}
                      <TableCell className="text-right align-top py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-muted"
                            >
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(row)}>
                              <Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(row.id)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                ? `Total de ${data.meta.itemCount} registro(s)`
                : ""}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="h-8 text-xs bg-background hover:bg-muted"
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
                className="h-8 text-xs bg-background hover:bg-muted"
              >
                Próximo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <SupplierFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        supplierToEdit={editingSupplier}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        }}
      />
    </div>
  );
}
