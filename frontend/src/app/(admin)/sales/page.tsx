"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ShoppingCart, Package, Info, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StockMovementService } from "@/lib/services/stock-movements";
import { ProductService } from "@/lib/services/products";

const fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function SalesPage() {
  const qc = useQueryClient();

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [description, setDescription] = useState("");

  // Busca produtos (limite alto para popular o Select facilmente)
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => ProductService.getAll(1, 100, ""),
  });

  const products = productsData?.data || [];
  const selectedProduct = products.find((p: any) => p.id === productId);

  // Auto-preenche o preço de venda quando seleciona o produto
  useEffect(() => {
    if (selectedProduct && selectedProduct.salePrice) {
      setUnitPrice(String(selectedProduct.salePrice));
    } else {
      setUnitPrice("");
    }
  }, [selectedProduct]);

  // Busca as movimentações recentes
  const { data: movementsData, isLoading: isLoadingMovements } = useQuery({
    queryKey: ["stock-movements"],
    // Aumentamos o limite para 100 para garantir que pegaremos todas as vendas do dia no cálculo
    queryFn: () => StockMovementService.getAll(1, 100),
  });

  const allSales = (movementsData?.data || []).filter(
    (m: any) => m.type === "SAIDA" || m.type === "EXIT",
  );

  const recentSales = allSales.slice(0, 10);

  // Filtra apenas as vendas com a data de "hoje" e soma os totais
  const todaySalesTotal = allSales
    .filter((m: any) => {
      const date = new Date(m.createdAt);
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    })
    .reduce((acc: number, curr: any) => {
      return acc + curr.quantity * (curr.unitValue || 0);
    }, 0);

  const saleMutation = useMutation({
    mutationFn: (payload: any) => StockMovementService.create(payload),
    onSuccess: () => {
      toast.success("Saída/Venda registrada com sucesso!");
      setProductId("");
      setQuantity("");
      setUnitPrice("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
    },
    onError: (error: any) => {
      let errMsg =
        error?.response?.data?.message || "Erro ao registrar a saída.";
      if (Array.isArray(errMsg)) {
        // Se for array de objetos do class-validator, pega a primeira constraint
        errMsg = errMsg[0]?.constraints
          ? Object.values(errMsg[0].constraints)[0]
          : errMsg.join(", ");
      } else if (typeof errMsg === "object") {
        errMsg = JSON.stringify(errMsg);
      }

      toast.error(String(errMsg));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !quantity) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    saleMutation.mutate({
      productId,
      type: "SAIDA",
      quantity: Number(quantity),
      // Usamos entryPrice no payload para setar o valor unitário da movimentação no backend
      entryPrice: unitPrice ? Number(unitPrice) : undefined,
      description: description || "Saída de produto / Venda",
    });
  };

  const handlePrintReceipt = (sale: any) => {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      toast.error("O bloqueador de pop-ups impediu a impressão.");
      return;
    }

    const dateStr = new Date(sale.createdAt).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const totalStr = sale.unitValue
      ? fmt.format(sale.quantity * sale.unitValue)
      : "-";
    const unitStr = sale.unitValue ? fmt.format(sale.unitValue) : "-";

    printWindow.document.write(`
      <html>
        <head>
          <title>Comprovante de Saída</title>
          <style>
            body { font-family: monospace; width: 300px; margin: 0 auto; padding: 20px; color: #000; font-size: 14px; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .header h2 { margin: 0 0 5px 0; font-size: 18px; }
            .header p { margin: 2px 0; font-size: 12px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .total { font-weight: bold; font-size: 16px; border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; text-align: right; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; border-top: 1px dashed #000; padding-top: 10px; }
            @media print { body { width: 100%; margin: 0; padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>STOCKFLOW</h2>
            <p>COMPROVANTE DE SAÍDA</p>
            <p>${dateStr}</p>
          </div>
          <div class="row"><span>Produto:</span> <span style="text-align:right">${sale.product?.name || "Excluído"}</span></div>
          <div class="row"><span>Qtd:</span> <span>${sale.quantity}</span></div>
          <div class="row"><span>Valor Un:</span> <span>${unitStr}</span></div>
          <div class="total">TOTAL: ${totalStr}</div>
          <p style="margin-top: 10px; font-size: 12px;">Obs: ${sale.description || "-"}</p>
          <div class="footer">Obrigado!</div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 200); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-6 md:p-8 max-w-[1000px] mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingCart className="w-8 h-8 text-accent" />
            Registrar Saída
          </h1>
          <p className="text-muted-foreground mt-1">
            Dê baixa no estoque de produtos finalizados ou registre vendas.
          </p>
        </div>

        <div className="bg-primary/10 border border-primary/20 px-5 py-3 rounded-lg flex flex-col shrink-0 min-w-[160px] text-right">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">
            Vendas de Hoje
          </span>
          <span className="text-2xl font-black text-foreground tabular-nums tracking-tight">
            {fmt.format(todaySalesTotal)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário Principal */}
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader>
            <CardTitle>Detalhes da Saída</CardTitle>
            <CardDescription>
              Preencha os dados para deduzir o estoque.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product">Produto *</Label>
                <Select
                  value={productId}
                  onValueChange={setProductId}
                  disabled={isLoadingProducts || saleMutation.isPending}
                >
                  <SelectTrigger id="product">
                    <SelectValue
                      placeholder={
                        isLoadingProducts
                          ? "Carregando..."
                          : "Selecione um produto..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.currentStock} disponíveis)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Ex: 1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    disabled={saleMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">
                    Valor Unitário de Saída (R$)
                  </Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 15.50"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    readOnly={!!selectedProduct?.salePrice}
                    disabled={saleMutation.isPending}
                    className={
                      selectedProduct?.salePrice
                        ? "bg-muted cursor-not-allowed text-muted-foreground font-medium"
                        : ""
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Observações / Cliente</Label>
                <Textarea
                  id="description"
                  placeholder="Ex: Venda balcão, Cliente João..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  disabled={saleMutation.isPending}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-[#A65E2E] text-primary-foreground"
                disabled={saleMutation.isPending}
              >
                {saleMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ShoppingCart className="w-4 h-4 mr-2" />
                )}
                Confirmar Saída
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Painel Lateral de Informações */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm bg-muted/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                <Info className="w-4 h-4" /> Resumo do Produto
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedProduct ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Produto Selecionado
                    </p>
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      <Package className="w-4 h-4" /> {selectedProduct.name}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Estoque Atual
                      </p>
                      <p
                        className={`font-semibold ${selectedProduct.currentStock <= selectedProduct.minStock ? "text-red-500" : "text-green-600"}`}
                      >
                        {selectedProduct.currentStock} {selectedProduct.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Preço Sugerido
                      </p>
                      <p className="font-semibold text-foreground">
                        {selectedProduct.salePrice
                          ? fmt.format(selectedProduct.salePrice)
                          : "Não definido"}
                      </p>
                    </div>
                  </div>
                  {Number(quantity) > 0 &&
                    selectedProduct.currentStock < Number(quantity) && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-md mt-4">
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                          Atenção: Quantidade solicitada é maior que o estoque
                          atual.
                        </p>
                      </div>
                    )}
                  {Number(quantity) > 0 && Number(unitPrice) > 0 && (
                    <div className="pt-4 border-t mt-4">
                      <p className="text-xs text-muted-foreground mb-1">
                        Valor Total da Saída
                      </p>
                      <p className="text-xl font-bold text-foreground">
                        {fmt.format(Number(quantity) * Number(unitPrice))}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Package className="w-12 h-12 opacity-20 mx-auto mb-3" />
                  <p className="text-sm">
                    Selecione um produto para ver os detalhes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabela de Últimas Saídas */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              Últimas Saídas Registradas
            </CardTitle>
            <CardDescription>
              Lista das 10 vendas/saídas mais recentes realizadas no sistema.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="w-full sm:w-auto shrink-0"
          >
            <Link href="/stock-history">Ver Histórico Completo</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Data / Hora</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Valor Un.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="text-right w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingMovements ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full rounded-md" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : recentSales.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhuma saída registrada recentemente.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentSales.map((sale: any) => (
                    <TableRow key={sale.id}>
                      <TableCell className="text-muted-foreground tabular-nums text-xs">
                        {new Date(sale.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {sale.product?.name || "Produto excluído"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {sale.quantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                        {sale.unitValue ? fmt.format(sale.unitValue) : "-"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-foreground">
                        {sale.unitValue
                          ? fmt.format(sale.quantity * sale.unitValue)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate text-xs">
                        {sale.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handlePrintReceipt(sale)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
