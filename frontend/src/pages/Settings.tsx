import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  GridActionsCellItem,
} from "@mui/x-data-grid";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import StorageIcon from "@mui/icons-material/Storage";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { SystemService } from "../services/system";
import { UserService, type User } from "../services/users";
import { UserFormDialog } from "../components/UserFormDialog";

// --- SUB-COMPONENTE: Aba de Backup ---
function BackupTab() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleBackup = async () => {
    setLoading(true);
    setMsg(null);
    try {
      await SystemService.downloadBackup();
      setMsg({ type: "success", text: "Backup baixado com sucesso!" });
    } catch (error) {
      setMsg({ type: "error", text: "Erro ao gerar backup." });
    } finally {
      setLoading(false);
    }
  };

  return (
    // CORREÇÃO: Substituição de Grid por Box para evitar erros de tipagem (TS2769)
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
      <Box sx={{ width: { xs: "100%", md: "50%" } }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <StorageIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6">Banco de Dados</Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary" paragraph>
            Gere uma cópia completa de segurança (.zip) do banco de dados
            SQLite.
          </Typography>
          {msg && (
            <Alert severity={msg.type} sx={{ mb: 2 }}>
              {msg.text}
            </Alert>
          )}
          <Button
            variant="contained"
            fullWidth
            startIcon={
              loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <CloudDownloadIcon />
              )
            }
            onClick={handleBackup}
            disabled={loading}
          >
            {loading ? "Gerando..." : "Baixar Backup"}
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}

// --- SUB-COMPONENTE: Aba de Usuários ---
function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Controle do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await UserService.getAll(1, 50);
      setUsers(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handlers
  const handleAdd = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja remover este usuário?")) {
      try {
        await UserService.delete(id);
        fetchUsers();
      } catch (error) {
        alert("Erro ao excluir usuário.");
      }
    }
  };

  const columns: GridColDef[] = [
    { field: "name", headerName: "Nome", flex: 1 },
    { field: "username", headerName: "Usuário", width: 150 },
    { field: "email", headerName: "Email", width: 200 },
    {
      field: "role",
      headerName: "Permissão",
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === "ADMIN" ? "primary" : "default"}
          size="small"
        />
      ),
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Ações",
      width: 100,
      getActions: ({ row }) => [
        <GridActionsCellItem
          icon={
            <Tooltip title="Editar">
              <EditIcon />
            </Tooltip>
          }
          label="Editar"
          onClick={() => handleEdit(row)}
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="Excluir">
              <DeleteIcon htmlColor="#d32f2f" />
            </Tooltip>
          }
          label="Excluir"
          onClick={() => handleDelete(row.id)}
        />,
      ],
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h6">Gerenciar Acessos</Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleAdd}
        >
          Novo Usuário
        </Button>
      </Box>

      <Paper sx={{ height: 400, width: "100%" }}>
        <DataGrid
          rows={users}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          hideFooter
        />
      </Paper>

      {/* Modal de Usuário */}
      <UserFormDialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userToEdit={editingUser}
        onSuccess={fetchUsers}
      />
    </Box>
  );
}

// --- COMPONENTE PRINCIPAL ---
export function Settings() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Configurações
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Geral e Backup" />
          <Tab label="Usuários e Permissões" />
        </Tabs>
      </Box>

      {tab === 0 && <BackupTab />}
      {tab === 1 && <UsersTab />}
    </Box>
  );
}
