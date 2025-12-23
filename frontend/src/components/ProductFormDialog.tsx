import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  MenuItem,
  Tabs,
  Tab,
  Box, // Usaremos Box com CSS Grid no lugar de Grid
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  Typography,
  Avatar,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import AddIcon from "@mui/icons-material/Add";
import DescriptionIcon from "@mui/icons-material/Description";
import ImageIcon from "@mui/icons-material/Image";
import { type Product, ProductService } from "../services/products";
import { api } from "../services/api";

interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productToEdit?: Product | null;
}

interface Spec {
  name: string;
  value: string;
}
interface Attachment {
  fileName: string;
  filePath: string;
  fileType: string;
}

const UNITS = ["UN", "CX", "KG", "M", "L"];

function TabPanel(props: {
  children?: React.ReactNode;
  index: number;
  value: number;
}) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

export function ProductFormDialog({
  open,
  onClose,
  onSuccess,
  productToEdit,
}: ProductFormDialogProps) {
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    internalCode: "",
    barcode: "",
    unit: "UN",
    costPrice: "",
    salePrice: "",
    currentStock: "",
    minStock: "",
    location: "",
  });

  const [specs, setSpecs] = useState<Spec[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (open) {
      setTabIndex(0);
      if (productToEdit) {
        setFormData({
          name: productToEdit.name,
          category: productToEdit.category,
          internalCode: productToEdit.internalCode,
          barcode: productToEdit.barcode,
          unit: productToEdit.unit,
          costPrice: String(productToEdit.costPrice),
          salePrice: productToEdit.salePrice
            ? String(productToEdit.salePrice)
            : "",
          currentStock: String(productToEdit.currentStock),
          minStock: String(productToEdit.minStock),
          location: productToEdit.location || "",
        });
        setSpecs(
          productToEdit.specifications?.map((s) => ({
            name: s.name,
            value: s.value,
          })) || []
        );
        setAttachments(productToEdit.attachments || []);
      } else {
        setFormData({
          name: "",
          category: "",
          internalCode: "",
          barcode: "",
          unit: "UN",
          costPrice: "",
          salePrice: "",
          currentStock: "",
          minStock: "",
          location: "",
        });
        setSpecs([]);
        setAttachments([]);
      }
      setError("");
    }
  }, [open, productToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addSpec = () => setSpecs([...specs, { name: "", value: "" }]);
  const removeSpec = (idx: number) =>
    setSpecs(specs.filter((_, i) => i !== idx));
  const updateSpec = (idx: number, field: "name" | "value", val: string) => {
    const newSpecs = [...specs];
    newSpecs[idx] = { ...newSpecs[idx], [field]: val };
    setSpecs(newSpecs);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const uploadData = new FormData();
    uploadData.append("file", file);

    try {
      setLoading(true);
      const res = await api.post("/files/upload", uploadData);

      setAttachments([
        ...attachments,
        {
          fileName: file.name,
          filePath: res.data.filePath,
          fileType: res.data.fileType,
        },
      ]);
    } catch (err) {
      console.error(err);
      setError("Erro ao fazer upload do arquivo.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const updateAttachmentName = (idx: number, newName: string) => {
    const newAttachments = [...attachments];
    newAttachments[idx] = { ...newAttachments[idx], fileName: newName };
    setAttachments(newAttachments);
  };

  // --- LÓGICA DE REMOÇÃO FÍSICA ---
  const removeAttachment = async (idx: number) => {
    const fileToDelete = attachments[idx];

    if (fileToDelete.filePath) {
      try {
        await api.delete("/files/delete", {
          data: { filePath: fileToDelete.filePath },
        });
      } catch (err) {
        console.error("Erro ao apagar arquivo físico:", err);
      }
    }

    setAttachments(attachments.filter((_, i) => i !== idx));
  };

  const renderFilePreview = (file: Attachment) => {
    if (file.fileType.startsWith("image/")) {
      return <ImageIcon />;
    }
    return <DescriptionIcon />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cleanSpecs = specs
        .filter((s) => s.name && s.value)
        .map((s) => ({ name: s.name, value: s.value }));

      const cleanAttachments = attachments.map((a) => ({
        fileName: a.fileName,
        filePath: a.filePath,
        fileType: a.fileType,
      }));

      const payload = {
        ...formData,
        costPrice: Number(formData.costPrice),
        salePrice: formData.salePrice ? Number(formData.salePrice) : undefined,
        currentStock: Number(formData.currentStock),
        minStock: Number(formData.minStock),
        specifications: cleanSpecs,
        attachments: cleanAttachments,
      };

      if (productToEdit) {
        await ProductService.update(productToEdit.id, payload);
      } else {
        await ProductService.create(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Erro ao salvar produto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: "600" }}>
          {productToEdit ? "Editar Produto" : "Novo Produto"}
        </DialogTitle>

        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}>
          <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)}>
            <Tab label="Dados Gerais" />
            <Tab label="Especificações" />
            <Tab label="Anexos" />
          </Tabs>
        </Box>

        <DialogContent sx={{ minHeight: 400, pt: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {Array.isArray(error) ? error.join(", ") : error}
            </Alert>
          )}

          {/* ABA 1: DADOS GERAIS */}
          <TabPanel value={tabIndex} index={0}>
            {/* CORREÇÃO: Substituição de Grid por Box com CSS Grid de 12 colunas */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(12, 1fr)",
                gap: 2,
              }}
            >
              {/* Nome: xs=12 sm=6 */}
              <Box sx={{ gridColumn: { xs: "span 12", sm: "span 6" } }}>
                <TextField
                  required
                  fullWidth
                  label="Nome"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </Box>

              {/* Categoria: xs=12 sm=6 */}
              <Box sx={{ gridColumn: { xs: "span 12", sm: "span 6" } }}>
                <TextField
                  required
                  fullWidth
                  label="Categoria"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                />
              </Box>

              {/* Cód Interno: xs=6 sm=4 */}
              <Box sx={{ gridColumn: { xs: "span 6", sm: "span 4" } }}>
                <TextField
                  required
                  fullWidth
                  label="Cód. Interno"
                  name="internalCode"
                  value={formData.internalCode}
                  onChange={handleChange}
                />
              </Box>

              {/* EAN: xs=6 sm=4 */}
              <Box sx={{ gridColumn: { xs: "span 6", sm: "span 4" } }}>
                <TextField
                  required
                  fullWidth
                  label="EAN/GTIN"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleChange}
                />
              </Box>

              {/* Unidade: xs=12 sm=4 */}
              <Box sx={{ gridColumn: { xs: "span 12", sm: "span 4" } }}>
                <TextField
                  select
                  required
                  fullWidth
                  label="Unidade"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                >
                  {UNITS.map((u) => (
                    <MenuItem key={u} value={u}>
                      {u}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              {/* Preço Custo: xs=6 (metade) */}
              <Box sx={{ gridColumn: "span 6" }}>
                <TextField
                  required
                  fullWidth
                  type="number"
                  label="Preço Custo"
                  name="costPrice"
                  value={formData.costPrice}
                  onChange={handleChange}
                />
              </Box>

              {/* Preço Venda: xs=6 (metade) */}
              <Box sx={{ gridColumn: "span 6" }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Preço Venda"
                  name="salePrice"
                  value={formData.salePrice}
                  onChange={handleChange}
                />
              </Box>

              {/* Estoque, Mínimo, Localização: xs=4 (terço) */}
              <Box sx={{ gridColumn: "span 4" }}>
                <TextField
                  required
                  fullWidth
                  type="number"
                  label="Estoque"
                  name="currentStock"
                  value={formData.currentStock}
                  onChange={handleChange}
                />
              </Box>

              <Box sx={{ gridColumn: "span 4" }}>
                <TextField
                  required
                  fullWidth
                  type="number"
                  label="Mínimo"
                  name="minStock"
                  value={formData.minStock}
                  onChange={handleChange}
                />
              </Box>

              <Box sx={{ gridColumn: "span 4" }}>
                <TextField
                  fullWidth
                  label="Localização"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                />
              </Box>
            </Box>
          </TabPanel>

          {/* ABA 2: ESPECIFICAÇÕES */}
          <TabPanel value={tabIndex} index={1}>
            <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
              Adicione detalhes técnicos (Ex: Voltagem: 220v, Peso: 5kg)
            </Typography>
            {specs.map((spec, idx) => (
              <Box
                key={idx}
                sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}
              >
                <TextField
                  label="Nome (Ex: Cor)"
                  size="small"
                  value={spec.name}
                  onChange={(e) => updateSpec(idx, "name", e.target.value)}
                />
                <TextField
                  label="Valor (Ex: Azul)"
                  size="small"
                  fullWidth
                  value={spec.value}
                  onChange={(e) => updateSpec(idx, "value", e.target.value)}
                />
                <IconButton onClick={() => removeSpec(idx)} color="error">
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addSpec}
            >
              Adicionar Especificação
            </Button>
          </TabPanel>

          {/* ABA 3: ANEXOS */}
          <TabPanel value={tabIndex} index={2}>
            <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
              Anexe fotos, manuais ou notas fiscais.
            </Typography>

            <Button
              variant="contained"
              component="label"
              startIcon={<AttachFileIcon />}
              disabled={loading}
            >
              Upload de Arquivo
              <input
                hidden
                accept="image/*,.pdf"
                type="file"
                onChange={handleFileUpload}
              />
            </Button>

            <List sx={{ mt: 2 }}>
              {attachments.map((file, idx) => (
                <ListItem
                  key={idx}
                  sx={{
                    bgcolor: "#f9fafb",
                    mb: 1,
                    borderRadius: 1,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <Box sx={{ mr: 2 }}>
                    <Avatar
                      variant="rounded"
                      sx={{ bgcolor: "#e0e0e0", color: "#666" }}
                    >
                      {renderFilePreview(file)}
                    </Avatar>
                  </Box>

                  <TextField
                    fullWidth
                    size="small"
                    label="Título do Arquivo"
                    value={file.fileName}
                    onChange={(e) => updateAttachmentName(idx, e.target.value)}
                    sx={{ mr: 2 }}
                    helperText={`Tipo: ${file.fileType}`}
                  />

                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => removeAttachment(idx)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {attachments.length === 0 && (
                <Box
                  sx={{
                    p: 4,
                    textAlign: "center",
                    border: "1px dashed #ccc",
                    borderRadius: 2,
                    mt: 2,
                  }}
                >
                  <Typography color="text.secondary">
                    Nenhum anexo adicionado.
                  </Typography>
                </Box>
              )}
            </List>
          </TabPanel>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid #f0f0f0" }}>
          <Button onClick={onClose} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? "Salvando..." : "Salvar Produto"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
