import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  Chip,
  InputAdornment,
  Stack,
  IconButton,
  Fade,
  Container,
  alpha,
  useTheme,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FileDownload as ExportIcon,
  CompareArrows as MoveIcon,
  Inventory2Outlined as ProductIcon,
  WarningAmberRounded as WarningIcon,
  CheckCircleOutlineRounded as CheckIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import axios from "axios";

// --- Tipos ---
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  minStock: number;
  unit: string;
  supplierId?: string;
}

// 1. Modal de Formulário de Produto
const ProductFormDialog = ({
  open,
  onClose,
  onSuccess,
  productToEdit,
}: any) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {productToEdit ? "Editar Produto" : "Novo Produto"}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Nome do Produto"
            fullWidth
            defaultValue={productToEdit?.name || ""}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Preço (R$)"
              fullWidth
              type="number"
              defaultValue={productToEdit?.price || ""}
            />
            <TextField
              label="Qtd Inicial"
              fullWidth
              type="number"
              defaultValue={productToEdit?.quantity || ""}
              disabled={!!productToEdit}
            />
          </Stack>
          <FormControl fullWidth>
            <InputLabel>Unidade</InputLabel>
            <Select label="Unidade" defaultValue={productToEdit?.unit || "UN"}>
              <MenuItem value="UN">Unidade (UN)</MenuItem>
              <MenuItem value="KG">Quilograma (KG)</MenuItem>
              <MenuItem value="L">Litro (L)</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={onSuccess}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// 2. Modal de Movimentação de Estoque
const StockMovementDialog = ({ open, onClose, onSuccess, product }: any) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Movimentar Estoque</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Produto: <strong>{product?.name}</strong>
        </Typography>
        <Stack spacing={2}>
          <FormControl fullWidth>
            <InputLabel>Tipo</InputLabel>
            <Select label="Tipo" defaultValue="IN">
              <MenuItem value="IN">Entrada (+)</MenuItem>
              <MenuItem value="OUT">Saída (-)</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Quantidade" type="number" fullWidth />
          <TextField label="Observação" multiline rows={2} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color="info" onClick={onSuccess}>
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// --- Componente Principal ---
export function Products() {
  const theme = useTheme();

  // Estados
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [rowCount, setRowCount] = useState(0);

  // Modais
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(
    undefined
  );
  const [movingProduct, setMovingProduct] = useState<Product | undefined>(
    undefined
  );

  // Carregar Produtos
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/products", {
        params: {
          page: page + 1,
          take: rowsPerPage,
          search: searchTerm,
        },
      });

      const data = response.data.data || response.data;
      const total = response.data.meta?.itemCount || data.length;

      setRows(data);
      setRowCount(total);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar a lista de produtos.");
      // Dados de fallback para visualização se a API falhar
      setRows([
        {
          id: "1",
          name: "Cimento CP II",
          price: 35.9,
          quantity: 150,
          minStock: 50,
          unit: "SC",
        },
        {
          id: "2",
          name: "Tijolo 8 Furos",
          price: 1.2,
          quantity: 400,
          minStock: 1000,
          unit: "UN",
        },
        {
          id: "3",
          name: "Areia Média",
          price: 120.0,
          quantity: 5,
          minStock: 10,
          unit: "m³",
        },
      ]);
      setRowCount(3);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchTerm]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) {
      alert("Erro ao excluir produto.");
    }
  };

  const handleExport = () => {
    alert("Funcionalidade de exportação iniciada.");
  };

  return (
    <Fade in={true} timeout={600}>
      <Container maxWidth="xl" sx={{ py: 4, height: "100%" }}>
        {/* Cabeçalho */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
          sx={{ mb: 4 }}
        >
          <Box>
            <Typography
              variant="h4"
              fontWeight={800}
              color="text.primary"
              letterSpacing="-0.5px"
            >
              Produtos
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Gerencie seu catálogo e níveis de estoque.
            </Typography>
          </Box>

          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={handleExport}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                borderColor: theme.palette.divider,
                color: theme.palette.text.secondary,
              }}
            >
              Exportar
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingProduct(undefined);
                setIsFormOpen(true);
              }}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
              }}
            >
              Novo Produto
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            {error} (Exibindo dados de exemplo)
          </Alert>
        )}

        <Paper
          elevation={0}
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 3,
            overflow: "hidden",
            bgcolor: "background.paper",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          {/* Barra de Busca */}
          <Box
            sx={{
              p: 2,
              borderBottom: `1px solid ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.background.default, 0.5),
            }}
          >
            <TextField
              placeholder="Buscar por nome, código ou categoria..."
              size="small"
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                maxWidth: 400,
                "& .MuiOutlinedInput-root": {
                  bgcolor: "background.paper",
                  borderRadius: 2,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Tabela Customizada (Substituindo DataGrid) */}
          <TableContainer>
            <Table sx={{ minWidth: 650 }} aria-label="tabela de produtos">
              <TableHead
                sx={{ bgcolor: alpha(theme.palette.background.default, 0.5) }}
              >
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      color: "text.secondary",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                    }}
                  >
                    Produto
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      color: "text.secondary",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                    }}
                  >
                    Estoque
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      color: "text.secondary",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                    }}
                  >
                    Preço Unit.
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 700,
                      color: "text.secondary",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                    }}
                  >
                    Ações
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const isLow = row.quantity <= row.minStock;
                  return (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                    >
                      <TableCell component="th" scope="row">
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              p: 0.5,
                              borderRadius: 1,
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              color: theme.palette.primary.main,
                              display: "flex",
                            }}
                          >
                            <ProductIcon fontSize="small" />
                          </Box>
                          <Box>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              color="text.primary"
                            >
                              {row.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {row.unit}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={isLow ? <WarningIcon /> : <CheckIcon />}
                          label={`${row.quantity} un`}
                          size="small"
                          color={isLow ? "error" : "success"}
                          variant={isLow ? "filled" : "outlined"}
                          sx={{ fontWeight: 600, minWidth: 80 }}
                        />
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(row.price)}
                      </TableCell>
                      <TableCell align="right">
                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="flex-end"
                        >
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => {
                              setMovingProduct(row);
                              setIsMoveOpen(true);
                            }}
                            title="Movimentar"
                          >
                            <MoveIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => {
                              setEditingProduct(row);
                              setIsFormOpen(true);
                            }}
                            title="Editar"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(row.id)}
                            title="Excluir"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Nenhum produto encontrado.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={rowCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage="Linhas por página:"
          />
        </Paper>

        {/* Modais Internos */}
        <ProductFormDialog
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          productToEdit={editingProduct}
          onSuccess={() => {
            setIsFormOpen(false);
            fetchProducts();
          }}
        />

        <StockMovementDialog
          open={isMoveOpen}
          onClose={() => setIsMoveOpen(false)}
          product={movingProduct}
          onSuccess={() => {
            setIsMoveOpen(false);
            fetchProducts();
          }}
        />
      </Container>
    </Fade>
  );
}
