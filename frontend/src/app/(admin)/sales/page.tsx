"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ShoppingCart,
  Package,
  Info,
  Loader2,
  Printer,
  Plus,
  Trash2,
  Eye,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ProductService } from "@/lib/services/products";
import { SalesService } from "@/lib/services/sales";

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
  const [cart, setCart] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const cartTotal = cart.reduce(
    (acc, item) => acc + item.quantity * item.unitPrice,
    0,
  );

  // Busca produtos (limite alto para popular o Select facilmente)
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => ProductService.getAll(1, 100, ""),
  });

  const products = productsData?.data || [];
  const selectedProduct = products.find((p: any) => p.id === productId);

  // Quantidade desse produto específico que já está no carrinho
  const qtyInCartForSelected = selectedProduct
    ? cart
        .filter((item) => item.productId === selectedProduct.id)
        .reduce((sum, item) => sum + item.quantity, 0)
    : 0;

  // Auto-preenche o preço de venda quando seleciona o produto
  useEffect(() => {
    if (selectedProduct && selectedProduct.salePrice) {
      setUnitPrice(String(selectedProduct.salePrice));
    } else {
      setUnitPrice("");
    }
  }, [selectedProduct]);

  // Busca as vendas recentes em vez das movimentações brutas
  const { data: salesData, isLoading: isLoadingSales } = useQuery({
    queryKey: ["sales"],
    queryFn: () => SalesService.getAll(1, 100),
  });

  const allSales = salesData?.data || [];
  const recentSales = allSales.slice(0, 10);

  // Filtra apenas as vendas com a data de "hoje" e soma os totais
  const todaySalesTotal = allSales
    .filter((s: any) => {
      const date = new Date(s.createdAt);
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    })
    .reduce((acc: number, curr: any) => acc + Number(curr.totalAmount || 0), 0);

  const saleMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const payload = {
        notes: description || "Venda balcão (PDV)",
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };
      return SalesService.create(payload);
    },
    onSuccess: (_, variables) => {
      toast.success("Saída/Venda registrada com sucesso!");
      handlePrintCartReceipt(variables, description);
      setCart([]);
      setDescription("");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (error: any) => {
      let errMsg =
        error?.response?.data?.message || "Erro ao registrar a saída.";
      if (Array.isArray(errMsg)) {
        errMsg = errMsg[0]?.constraints
          ? Object.values(errMsg[0].constraints)[0]
          : errMsg.join(", ");
      } else if (typeof errMsg === "object") {
        errMsg = JSON.stringify(errMsg);
      }

      toast.error(String(errMsg));
    },
  });

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !quantity || Number(quantity) <= 0) {
      toast.error("Selecione um produto e informe uma quantidade válida.");
      return;
    }

    const prod = products.find((p: any) => p.id === productId);
    if (!prod) return;

    const requestedQty = Number(quantity);
    const qtyInCart = cart
      .filter((item) => item.productId === productId)
      .reduce((sum, item) => sum + item.quantity, 0);

    if (prod.currentStock < qtyInCart + requestedQty) {
      toast.error(
        `Estoque insuficiente! Você possui ${prod.currentStock} em estoque e já adicionou ${qtyInCart} ao carrinho.`,
      );
      return; // Bloqueia a adição ao carrinho
    }

    const price = unitPrice ? Number(unitPrice) : 0;
    const existingItemIndex = cart.findIndex(
      (item) => item.productId === productId && item.unitPrice === price,
    );

    if (existingItemIndex >= 0) {
      // Se já existe, soma as quantidades para não duplicar linhas
      const updatedCart = [...cart];
      updatedCart[existingItemIndex].quantity += requestedQty;
      setCart(updatedCart);
    } else {
      // Se não, adiciona como item novo
      const newItem = {
        id: Math.random().toString(36).substring(2, 9),
        productId,
        productName: prod.name,
        quantity: requestedQty,
        unitPrice: price,
      };
      setCart([...cart, newItem]);
    }

    setProductId("");
    setQuantity("");
    setUnitPrice("");
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Adicione ao menos um produto no carrinho.");
      return;
    }
    saleMutation.mutate(cart);
  };

  const handleViewSale = (sale: any) => {
    setSelectedSale(sale);
    setIsViewDialogOpen(true);
  };

  const handlePrintCartReceipt = (items: any[], obs: string) => {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      toast.error("O bloqueador de pop-ups impediu a impressão.");
      return;
    }

    const dateStr = new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const total = items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);

    const itemsHtml = items
      .map(
        (i) =>
          `<div class="row"><span>${i.productName} (x${i.quantity})</span> <span>${fmt.format(i.quantity * i.unitPrice)}</span></div>`,
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Comprovante de Venda</title>
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
            <p>COMPROVANTE DE VENDA</p>
            <p>${dateStr}</p>
          </div>
          <div style="margin-bottom: 10px;">
            ${itemsHtml}
          </div>
          <div class="total">TOTAL: ${fmt.format(total)}</div>
          <p style="margin-top: 10px; font-size: 12px;">Obs: ${obs || "-"}</p>
          <div class="footer">Obrigado!</div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 200); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
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

    const itemsHtml = (sale.items || [])
      .map(
        (i: any) =>
          `<div class="row"><span>${i.product?.name || "Item Excluído"} (x${Number(i.quantity)})</span> <span>${fmt.format(Number(i.unitPrice))}</span></div>`,
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Comprovante de Venda</title>
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
            <p>COMPROVANTE DE VENDA</p>
            <p>${dateStr}</p>
          </div>
          <div style="margin-bottom: 10px;">
            ${itemsHtml}
          </div>
          <div class="total">TOTAL: ${fmt.format(Number(sale.totalAmount))}</div>
          <p style="margin-top: 10px; font-size: 12px;">Obs: ${sale.notes || "-"}</p>
          <div class="footer">Obrigado!</div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 200); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-6 md:p-8 max-w-250 mx-auto space-y-6 animate-in fade-in duration-500">
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

        <div className="bg-primary/10 border border-primary/20 px-5 py-3 rounded-lg flex flex-col shrink-0 min-w-40 text-right">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">
            Vendas de Hoje
          </span>
          <span className="text-2xl font-black text-foreground tabular-nums tracking-tight">
            {fmt.format(todaySalesTotal)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Esquerda: Formulário e Carrinho */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Adicionar Item</CardTitle>
              <CardDescription>
                Selecione o produto e a quantidade para adicionar à venda.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddToCart} className="space-y-4">
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
                      {products.map((p: any) => {
                        const qtyInCart = cart
                          .filter((item) => item.productId === p.id)
                          .reduce((sum, item) => sum + item.quantity, 0);
                        const available = p.currentStock - qtyInCart;
                        return (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            disabled={available <= 0}
                          >
                            {p.name} ({available} disponíveis)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantidade *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.1"
                      min="0.1"
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
                      step="0.1"
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

                <Button
                  type="submit"
                  variant="secondary"
                  className="w-full bg-primary hover:bg-[#A65E2E] text-primary-foreground mt-4"
                  disabled={saleMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar ao Carrinho
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Carrinho de Vendas */}
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Carrinho de Venda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                      <TableHead className="text-right">Valor Un.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-12.5"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-24 text-center text-muted-foreground"
                        >
                          O carrinho está vazio.
                        </TableCell>
                      </TableRow>
                    ) : (
                      cart.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-sm">
                            {item.productName}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                            {fmt.format(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-semibold text-foreground">
                            {fmt.format(item.quantity * item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                              onClick={() => handleRemoveFromCart(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* Direita: Resumo e Finalização */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm bg-muted/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                <Info className="w-4 h-4" /> Resumo do Produto Selecionado
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
                        Estoque Disponível
                      </p>
                      <p
                        className={`font-semibold ${selectedProduct.currentStock - qtyInCartForSelected <= selectedProduct.minStock ? "text-red-500" : "text-green-600"}`}
                      >
                        {selectedProduct.currentStock - qtyInCartForSelected}{" "}
                        {selectedProduct.unit}
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
                    selectedProduct.currentStock <
                      Number(quantity) + qtyInCartForSelected && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-md mt-4">
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                          Atenção: A quantidade solicitada{" "}
                          {qtyInCartForSelected > 0
                            ? `(somada aos ${qtyInCartForSelected} no carrinho) `
                            : ""}
                          excede o estoque atual!
                        </p>
                      </div>
                    )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Package className="w-12 h-12 opacity-20 mx-auto mb-3" />
                  <p className="text-sm">
                    Selecione um produto ao lado para ver os detalhes de
                    estoque.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Finalizar Venda</CardTitle>
              <CardDescription>
                Confira os itens no carrinho e conclua.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Observações / Cliente</Label>
                <Textarea
                  id="description"
                  placeholder="Ex: Venda balcão, Cliente João..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  disabled={saleMutation.isPending}
                />
              </div>

              <div className="pt-4 border-t flex justify-between items-center mt-4">
                <span className="font-semibold text-muted-foreground">
                  Total da Venda:
                </span>
                <span className="text-2xl font-bold text-primary tabular-nums">
                  {fmt.format(cartTotal)}
                </span>
              </div>

              <Button
                onClick={handleCheckout}
                className="w-full bg-primary hover:bg-[#A65E2E] text-primary-foreground mt-4"
                disabled={saleMutation.isPending || cart.length === 0}
              >
                {saleMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ShoppingCart className="w-4 h-4 mr-2" />
                )}
                Confirmar Venda
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabela de Últimas Saídas */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              Últimas Vendas Registradas
            </CardTitle>
            <CardDescription>
              Lista das 10 vendas mais recentes realizadas no sistema.
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
                  <TableHead>Itens</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="text-right w-25">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingSales ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full rounded-md" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : recentSales.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhuma venda registrada recentemente.
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
                        {sale.items?.length === 1
                          ? sale.items[0].product?.name || "Produto excluído"
                          : `${sale.items?.length || 0} itens`}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-foreground">
                        {fmt.format(Number(sale.totalAmount))}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-50 truncate text-xs">
                        {sale.notes || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Ver detalhes"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleViewSale(sale)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Imprimir recibo"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handlePrintReceipt(sale)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Detalhes da Venda */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-125 w-[95vw] max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Venda</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground bg-muted/10 p-3 rounded-lg border border-border">
                <p>
                  <strong className="text-foreground">Data:</strong>{" "}
                  {new Date(selectedSale.createdAt).toLocaleString("pt-BR")}
                </p>
                <p className="mt-1">
                  <strong className="text-foreground">Observações:</strong>{" "}
                  {selectedSale.notes || "-"}
                </p>
              </div>
              <div className="max-h-[45vh] overflow-y-auto pr-2 space-y-2">
                {selectedSale.items?.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-border"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-sm text-foreground">
                        {item.product?.name || "Produto Excluído"}
                      </span>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {Number(item.quantity)}x de{" "}
                        {fmt.format(Number(item.unitPrice))}
                      </span>
                    </div>
                    <span className="font-semibold text-sm text-foreground tabular-nums">
                      {fmt.format(
                        Number(item.quantity) * Number(item.unitPrice),
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="font-semibold text-muted-foreground">
                  Total:
                </span>
                <span className="font-bold text-xl text-primary tabular-nums">
                  {fmt.format(Number(selectedSale.totalAmount))}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
