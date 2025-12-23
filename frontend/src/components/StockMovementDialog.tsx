import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Alert,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Divider,
} from "@mui/material";
import {
  StockMovementService,
  MovementType,
} from "../services/stock-movements";
import type { Product } from "../services/products";
import { type Supplier, SupplierService } from "../services/suppliers"; // Importando serviço de fornecedores

interface StockMovementDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product | null;
}

export function StockMovementDialog({
  open,
  onClose,
  onSuccess,
  product,
}: StockMovementDialogProps) {
  // Estados Básicos
  const [type, setType] = useState<MovementType>(MovementType.ENTRY);
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");

  // Estados Avançados (Entrada)
  const [batch, setBatch] = useState("");
  const [supplierId, setSupplierId] = useState(""); // Estado para o Fornecedor
  const [suppliers, setSuppliers] = useState<Supplier[]>([]); // Lista de fornecedores

  // Estados de Controle
  const [isInventoryMode, setIsInventoryMode] = useState(false);
  const [finalStockCount, setFinalStockCount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Resetar campos ao abrir o modal
  useEffect(() => {
    if (open) {
      setType(MovementType.ENTRY);
      setQuantity("");
      setDescription("");
      setBatch("");
      setSupplierId(""); // Resetar fornecedor
      setIsInventoryMode(false);
      setFinalStockCount("");
      setError("");
    }
  }, [open]);

  // Carregar fornecedores quando abrir e for do tipo ENTRADA
  useEffect(() => {
    if (open && type === MovementType.ENTRY) {
      SupplierService.getAll(1, 50)
        .then((response) => {
          setSuppliers(response.data);
        })
        .catch((err) => console.error("Erro ao carregar fornecedores", err));
    }
  }, [open, type]);

  // Lógica da Calculadora de Inventário (Balanço)
  const handleInventoryChange = (value: string) => {
    setFinalStockCount(value);
    if (!product) return;

    const realCount = Number(value);
    const systemCount = product.currentStock;
    const diff = realCount - systemCount;

    // Se o valor real é maior que o sistema, sobraram itens (Entrada/Ajuste)
    // Se o valor real é menor, faltaram itens (Saída/Perda)
    if (diff > 0) {
      setType(MovementType.ADJUSTMENT);
      setQuantity(String(diff));
      setDescription("Correção de Inventário (Sobra)");
    } else if (diff < 0) {
      setType(MovementType.EXIT);
      setQuantity(String(Math.abs(diff))); // Quantidade sempre positiva
      setDescription("Correção de Inventário (Perda/Falta)");
    } else {
      setQuantity("0");
      setDescription("Estoque correto.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    // Validação básica
    if (Number(quantity) <= 0) {
      setError("A quantidade deve ser maior que zero.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Prepara o objeto de dados
      const payload: any = {
        productId: product.id,
        type,
        quantity: Number(quantity),
        description,
        batch: batch || undefined,
      };

      // Adiciona o fornecedor apenas se for ENTRADA e tiver um selecionado
      if (type === MovementType.ENTRY && supplierId) {
        payload.supplierId = supplierId;
      }

      await StockMovementService.create(payload);

      onSuccess(); // Recarrega a tabela pai
      onClose(); // Fecha o modal
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Erro ao registrar movimentação."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1 }}>Movimentar Estoque</DialogTitle>

        <DialogContent dividers>
          {/* Cabeçalho do Produto */}
          <Box sx={{ mb: 3, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
            <Typography variant="subtitle1" component="div">
              <strong>{product.name}</strong>
            </Typography>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Cód: {product.internalCode}
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                Saldo Atual: {product.currentStock} {product.unit}
              </Typography>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Toggle Modo Inventário */}
          <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isInventoryMode}
                  onChange={(e) => {
                    setIsInventoryMode(e.target.checked);
                    setQuantity("");
                    setFinalStockCount("");
                  }}
                />
              }
              label="Modo Inventário (Balanço)"
            />
          </Box>

          {isInventoryMode ? (
            // === MODO INVENTÁRIO ===
            <TextField
              label="Contagem Física (Quanto tem na prateleira?)"
              type="number"
              fullWidth
              autoFocus
              value={finalStockCount}
              onChange={(e) => handleInventoryChange(e.target.value)}
              helperText={
                finalStockCount && product
                  ? `Diferença calculada: ${
                      Number(finalStockCount) - product.currentStock
                    } itens`
                  : "Digite o valor contado para calcular a diferença automaticamente."
              }
              sx={{ mb: 2 }}
            />
          ) : (
            // === MODO MANUAL ===
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                select
                label="Tipo"
                value={type}
                onChange={(e) => setType(e.target.value as MovementType)}
                sx={{ width: "150px" }}
              >
                <MenuItem value={MovementType.ENTRY}>Entrada</MenuItem>
                <MenuItem value={MovementType.EXIT}>Saída</MenuItem>
                <MenuItem value={MovementType.ADJUSTMENT}>Ajuste (+)</MenuItem>
              </TextField>

              <TextField
                label="Quantidade"
                type="number"
                fullWidth
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                slotProps={{
                  input: {
                    inputProps: {
                      min: 0.1,
                      step: 0.1, // 👈 ESSENCIAL
                    },
                  },
                }}
              />
            </Box>
          )}

          {/* Campos Extras (Apenas para ENTRADA) */}
          {type === MovementType.ENTRY && (
            <>
              <Divider sx={{ my: 2 }}>Dados de Entrada</Divider>

              {/* Seleção de Fornecedor */}
              <TextField
                select
                label="Fornecedor"
                fullWidth
                margin="dense"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                helperText="Opcional: Vincule esta entrada a um fornecedor cadastrado."
              >
                <MenuItem value="">
                  <em>Nenhum</em>
                </MenuItem>
                {suppliers.map((supplier) => (
                  <MenuItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Lote"
                fullWidth
                margin="dense"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
              />
            </>
          )}

          <TextField
            label="Observação / Motivo"
            fullWidth
            margin="normal"
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              isInventoryMode
                ? "Correção automática de inventário"
                : "Ex: Venda balcão, Nota Fiscal 123..."
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !quantity || Number(quantity) === 0}
            color={type === MovementType.EXIT ? "error" : "primary"}
          >
            {loading ? "Processando..." : "Confirmar"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
