import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box, // Substituição de Grid por Box
  Alert,
} from "@mui/material";
import { type Supplier, SupplierService } from "../services/suppliers";
// Se criou o arquivo utils, importe assim:
import { maskCpfCnpj, maskPhone } from "../utils/mask";

interface SupplierFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplierToEdit?: Supplier | null;
}

const initialFormData = {
  name: "",
  cnpj: "",
  email: "",
  phone: "",
  address: "",
};

export function SupplierFormDialog({
  open,
  onClose,
  onSuccess,
  supplierToEdit,
}: SupplierFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    if (open) {
      if (supplierToEdit) {
        setFormData({
          name: supplierToEdit.name,
          cnpj: supplierToEdit.cnpj || "",
          email: supplierToEdit.email || "",
          phone: supplierToEdit.phone || "",
          address: supplierToEdit.address || "",
        });
      } else {
        setFormData(initialFormData);
      }
      setError("");
    }
  }, [open, supplierToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    // Aplica máscaras específicas
    if (name === "cnpj") {
      finalValue = maskCpfCnpj(value);
    } else if (name === "phone") {
      finalValue = maskPhone(value);
    }

    setFormData({
      ...formData,
      [name]: finalValue,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (supplierToEdit) {
        await SupplierService.update(supplierToEdit.id, formData);
      } else {
        await SupplierService.create(formData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Erro ao salvar fornecedor.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: "600" }}>
          {supplierToEdit ? "Editar Fornecedor" : "Novo Fornecedor"}
        </DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* CORREÇÃO: Substituição de Grid por Box com CSS Grid de 12 colunas para manter o layout original */}
          <Box
            sx={{
              display: "grid",
              // Mobile: 1 coluna | Desktop: 12 colunas
              gridTemplateColumns: { xs: "1fr", sm: "repeat(12, 1fr)" },
              gap: 2,
            }}
          >
            {/* Nome - Ocupa 8 colunas no desktop */}
            <Box sx={{ gridColumn: { xs: "1 / -1", sm: "span 8" } }}>
              <TextField
                required
                fullWidth
                label="Razão Social / Nome"
                name="name"
                value={formData.name}
                onChange={handleChange}
                autoFocus
                size="small"
              />
            </Box>

            {/* CNPJ - Ocupa 4 colunas no desktop */}
            <Box sx={{ gridColumn: { xs: "1 / -1", sm: "span 4" } }}>
              <TextField
                fullWidth
                label="CNPJ / CPF"
                name="cnpj"
                value={formData.cnpj}
                onChange={handleChange}
                placeholder="00.000.000/0000-00"
                size="small"
                inputProps={{ maxLength: 18 }}
              />
            </Box>

            {/* Email - Ocupa 6 colunas no desktop */}
            <Box sx={{ gridColumn: { xs: "1 / -1", sm: "span 6" } }}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                size="small"
              />
            </Box>

            {/* Telefone - Ocupa 6 colunas no desktop */}
            <Box sx={{ gridColumn: { xs: "1 / -1", sm: "span 6" } }}>
              <TextField
                fullWidth
                label="Telefone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                size="small"
                placeholder="(00) 00000-0000"
                inputProps={{ maxLength: 15 }}
              />
            </Box>

            {/* Endereço - Ocupa largura total (12 colunas) */}
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField
                fullWidth
                label="Endereço Completo"
                name="address"
                value={formData.address}
                onChange={handleChange}
                size="small"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
