import { useEffect, useState } from "react";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  GridActionsCellItem,
  GridSearchIcon,
} from "@mui/x-data-grid";
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  Tooltip,
  TextField,
  InputAdornment,
} from "@mui/material";
import { type Supplier, SupplierService } from "../services/suppliers";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { SupplierFormDialog } from "../components/SupplierFormDialog";

export function Suppliers() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Controle do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Paginação e Busca
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20, // Padrão 20 para modo compacto
  });
  const [rowCount, setRowCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const data = await SupplierService.getAll(
        paginationModel.page + 1,
        paginationModel.pageSize,
        searchTerm
      );
      setRows(data.data);
      setRowCount(data.meta.itemCount);
    } catch (err) {
      setError("Erro ao carregar fornecedores.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Debounce da busca
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSuppliers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [paginationModel, searchTerm]);

  // Ações
  const handleAdd = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este fornecedor?")) {
      try {
        await SupplierService.delete(id);
        fetchSuppliers();
      } catch (error) {
        alert(
          "Erro ao excluir fornecedor (pode estar vinculado a movimentações)."
        );
      }
    }
  };

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Razão Social / Nome",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LocalShippingIcon
            fontSize="small"
            sx={{ color: "action.active", opacity: 0.7 }}
          />
          <Typography
            variant="body2"
            sx={{ fontWeight: "600", fontSize: "0.85rem" }}
          >
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: "cnpj",
      headerName: "CNPJ / CPF",
      width: 150,
      valueFormatter: (params) => params || "—",
    },
    {
      field: "email",
      headerName: "Email",
      width: 150,
      valueFormatter: (params) => params || "—",
    },
    {
      field: "phone",
      headerName: "Telefone",
      width: 150,
    },
    {
      field: "address",
      headerName: "Endereço",
      flex: 1,
      minWidth: 200,
      valueFormatter: (params) => params || "—",
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Ações",
      width: 100,
      getActions: ({ row }) => [
        <GridActionsCellItem
          key="edit"
          icon={
            <Tooltip title="Editar">
              <EditIcon fontSize="small" />
            </Tooltip>
          }
          label="Editar"
          onClick={() => handleEdit(row)}
        />,
        <GridActionsCellItem
          key="delete"
          icon={
            <Tooltip title="Excluir">
              <DeleteIcon fontSize="small" htmlColor="#d32f2f" />
            </Tooltip>
          }
          label="Excluir"
          onClick={() => handleDelete(row.id)}
        />,
      ],
    },
  ];

  return (
    <Box sx={{ pb: 4 }}>
      {/* Cabeçalho */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: "600", color: "#111827", fontSize: "1.5rem" }}
          >
            Fornecedores
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie seus parceiros e contatos de compra.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          size="small"
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          Novo Fornecedor
        </Button>
      </Box>

      {/* Barra de Pesquisa */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          bgcolor: "background.paper",
          border: "1px solid #e5e7eb",
          borderRadius: 2,
        }}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar por nome ou CNPJ..."
          size="small"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPaginationModel({ ...paginationModel, page: 0 });
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <GridSearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              bgcolor: "#f9fafb",
              "& fieldset": { borderColor: "#e5e7eb" },
              "&:hover fieldset": { borderColor: "#d1d5db" },
            },
          }}
        />
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabela */}
      <Paper
        elevation={1}
        sx={{
          width: "100%",
          overflow: "hidden",
          borderRadius: 2,
          border: "1px solid #e5e7eb",
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          rowCount={rowCount}
          loading={loading}
          pageSizeOptions={[20, 50, 100]}
          paginationModel={paginationModel}
          paginationMode="server"
          onPaginationModelChange={setPaginationModel}
          disableRowSelectionOnClick
          autoHeight
          density="compact"
          sx={{
            border: 0,
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#f9fafb",
              color: "#374151",
              fontWeight: "700",
              fontSize: "0.75rem",
              textTransform: "uppercase",
              minHeight: "40px !important",
              maxHeight: "40px !important",
            },
            "& .MuiDataGrid-cell": {
              fontSize: "0.80rem",
              color: "#1f2937",
              py: "4px",
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: "1px solid #e5e7eb",
            },
          }}
        />
      </Paper>

      <SupplierFormDialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        supplierToEdit={editingSupplier}
        onSuccess={() => {
          fetchSuppliers();
        }}
      />
    </Box>
  );
}
