import { useEffect, useState } from "react";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
} from "@mui/x-data-grid";
import { Box, Typography, Paper, Chip } from "@mui/material";
import {
  MovementType,
  type StockMovement,
  StockMovementService,
} from "../services/stock-movements";
import { ptBR } from "date-fns/locale/pt-BR";
import { format } from "date-fns";

interface StockMovementRow
  extends Omit<StockMovement, "product" | "supplier" | "user"> {
  product?: { name: string };
  supplier?: { name: string } | null;
  user?: { name: string };
}

export function StockHistory() {
  const [rows, setRows] = useState<StockMovementRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  });
  const [rowCount, setRowCount] = useState(0);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await StockMovementService.getAll(
        paginationModel.page + 1,
        paginationModel.pageSize
      );
      // O cast 'as unknown as StockMovementRow[]' garante que o TypeScript aceite
      // a conversão dos dados vindos da API para nossa interface local ajustada.
      setRows(data.data as unknown as StockMovementRow[]);
      setRowCount(data.meta.itemCount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [paginationModel]);

  const columns: GridColDef<StockMovementRow>[] = [
    {
      field: "createdAt",
      headerName: "Data/Hora",
      width: 130,
      valueFormatter: (value) => {
        if (!value) return "-";
        const date = new Date(value);
        if (isNaN(date.getTime())) return "-";
        return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
      },
    },
    {
      field: "type",
      headerName: "Tipo",
      align: "center",
      headerAlign: "center",
      width: 100,
      renderCell: (params) => {
        let color: "success" | "error" | "warning" | "default" = "default";
        if (params.value === MovementType.ENTRY) color = "success";
        if (params.value === MovementType.EXIT) color = "error";
        if (params.value === MovementType.ADJUSTMENT) color = "warning";
        return (
          <Chip
            label={params.value}
            color={color}
            size="small"
            variant="outlined"
            sx={{
              fontWeight: "bold",
              minWidth: "70px",
              height: "20px",
              fontSize: "0.7rem",
            }}
          />
        );
      },
    },
    {
      field: "product",
      headerName: "Produto",
      width: 120,
      valueGetter: (_, row) => row.product?.name ?? "—",
    },
    {
      field: "unitValue",
      headerName: "Vlr. Unit.",
      width: 90,
      type: "number",
      valueFormatter: (value) =>
        value
          ? Number(value).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })
          : "—",
    },
    {
      field: "batch",
      headerName: "Lote",
      width: 90,
      valueGetter: (value) => value || "—",
    },
    {
      field: "supplier",
      headerName: "Fornecedor",
      width: 120,
      valueGetter: (_, row) => row.supplier?.name ?? "—",
    },
    { field: "quantity", headerName: "Qtd.", width: 50, type: "number" },
    { field: "stockBefore", headerName: "Antes", width: 50, type: "number" },
    {
      field: "stockAfter",
      headerName: "Depois",
      width: 50,
      type: "number",
      cellClassName: "fw-bold",
    },
    {
      field: "user",
      headerName: "Usuário",
      width: 130,
      valueGetter: (_, row) => row.user?.name ?? "—",
    },
    { field: "description", headerName: "Obs.", flex: 1, minWidth: 130 },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        mb: 4,
      }}
    >
      <Typography
        variant="h5"
        sx={{ mb: 2, fontWeight: "600", fontSize: "1.25rem" }}
      >
        Histórico de Movimentações
      </Typography>

      <Paper
        elevation={1}
        sx={{
          width: "100%",
          bgcolor: "background.paper",
          overflow: "hidden",
          borderRadius: 1,
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
          getRowId={(row) => row.id}
          autoHeight
          density="compact"
          sx={{
            border: 0,
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#f3f4f6",
              fontWeight: "600",
              fontSize: "0.75rem",
              textTransform: "uppercase",
              color: "#4b5563",
              minHeight: "40px !important",
              maxHeight: "40px !important",
            },
            "& .MuiDataGrid-cell": {
              fontSize: "0.80rem",
              py: "4px",
            },
            "& .fw-bold": {
              fontWeight: "600",
              color: "#111827",
            },
            backgroundColor: "background.paper",
          }}
        />
      </Paper>
    </Box>
  );
}
