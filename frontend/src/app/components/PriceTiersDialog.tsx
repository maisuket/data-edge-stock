"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Save, Tag } from "lucide-react";
import { toast } from "sonner";

import { PriceTierService } from "@/lib/services/price-tiers";
import type { Product } from "@/lib/services/products";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface PriceTiersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

interface TierRow {
  minQuantity: string;
  unitPrice: string;
}

const fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const emptyTier: TierRow = { minQuantity: "", unitPrice: "" };

export function PriceTiersDialog({
  open,
  onOpenChange,
  product,
}: PriceTiersDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [tiers, setTiers] = useState<TierRow[]>([emptyTier]);

  useEffect(() => {
    if (!open || !product) return;
    setLoading(true);
    PriceTierService.get(product.id)
      .then((config) => {
        setEnabled(config.enabled);
        setTiers(
          config.tiers.length > 0
            ? config.tiers.map((t) => ({
                minQuantity: String(t.minQuantity),
                unitPrice: String(t.unitPrice),
              }))
            : [emptyTier],
        );
      })
      .catch(() => {
        toast.error("Erro ao carregar a promoção do produto.");
        setEnabled(false);
        setTiers([emptyTier]);
      })
      .finally(() => setLoading(false));
  }, [open, product]);

  const addTier = () => setTiers((prev) => [...prev, { ...emptyTier }]);
  const removeTier = (i: number) =>
    setTiers((prev) => prev.filter((_, idx) => idx !== i));
  const updateTier = (i: number, field: keyof TierRow, value: string) =>
    setTiers((prev) =>
      prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)),
    );

  const handleSave = async () => {
    if (!product) return;

    const parsedTiers = tiers
      .filter((t) => t.minQuantity.trim() && t.unitPrice.trim())
      .map((t) => ({
        minQuantity: Number(t.minQuantity),
        unitPrice: Number(t.unitPrice),
      }));

    if (enabled && parsedTiers.length === 0) {
      toast.error(
        "Cadastre ao menos uma faixa de quantidade para ativar a promoção.",
      );
      return;
    }

    setSaving(true);
    try {
      await PriceTierService.set(product.id, {
        enabled,
        tiers: parsedTiers,
      });
      toast.success("Promoção salva!");
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(typeof msg === "string" ? msg : "Erro ao salvar a promoção.");
    } finally {
      setSaving(false);
    }
  };

  const sortedPreview = tiers
    .filter((t) => t.minQuantity.trim() && t.unitPrice.trim())
    .map((t) => ({
      minQuantity: Number(t.minQuantity),
      unitPrice: Number(t.unitPrice),
    }))
    .sort((a, b) => a.minQuantity - b.minQuantity);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Tag className="w-5 h-5 text-accent" />
            Promoção por quantidade
          </DialogTitle>
        </DialogHeader>

        {loading || !product ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {product.name} — preço normal:{" "}
              <span className="font-medium text-foreground">
                {product.salePrice
                  ? fmt.format(product.salePrice)
                  : "não definido"}
              </span>
            </p>

            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Promoção ativa
                </p>
                <p className="text-xs text-muted-foreground">
                  Liga ou desliga a qualquer momento sem apagar as faixas.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Faixas de quantidade</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTier}
                >
                  <Plus className="w-3 h-3 mr-1" /> Adicionar faixa
                </Button>
              </div>

              <div className="space-y-2">
                {tiers.map((tier, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min="0.001"
                      step="1"
                      placeholder="A partir de (un)"
                      value={tier.minQuantity}
                      onChange={(e) =>
                        updateTier(i, "minQuantity", e.target.value)
                      }
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Preço unitário (R$)"
                      value={tier.unitPrice}
                      onChange={(e) =>
                        updateTier(i, "unitPrice", e.target.value)
                      }
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTier(i)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {sortedPreview.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                  Prévia
                </p>
                {sortedPreview.map((t, i) => (
                  <p key={i} className="text-sm text-foreground">
                    A partir de <strong>{t.minQuantity}</strong> un: cada uma
                    sai por <strong>{fmt.format(t.unitPrice)}</strong>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
