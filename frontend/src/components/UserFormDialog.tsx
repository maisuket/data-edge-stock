import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box, // Substituímos Grid por Box
  Alert,
  MenuItem,
  InputAdornment,
  IconButton,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { type User, UserService } from "../services/users";

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userToEdit?: User | null;
}

const initialFormData = {
  name: "",
  email: "",
  username: "",
  password: "",
  role: "USER",
};

export function UserFormDialog({
  open,
  onClose,
  onSuccess,
  userToEdit,
}: UserFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [showPassword, setShowPassword] = useState(false);

  // Carrega dados se for edição
  useEffect(() => {
    if (open) {
      if (userToEdit) {
        setFormData({
          name: userToEdit.name,
          email: userToEdit.email,
          username: userToEdit.username,
          password: "", // Senha sempre vazia na edição
          role: userToEdit.role,
        });
      } else {
        setFormData(initialFormData);
      }
      setError("");
      setShowPassword(false);
    }
  }, [open, userToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validação básica
      if (!userToEdit && !formData.password) {
        throw new Error("Senha é obrigatória para novos usuários.");
      }

      // CORREÇÃO: Forçamos o tipo do role para satisfazer a interface User ("USER" | "ADMIN")
      const payload = {
        ...formData,
        role: formData.role as "USER" | "ADMIN",
      };

      // Se for edição e senha estiver vazia, não envia o campo para não sobrescrever
      if (userToEdit && !payload.password) {
        delete (payload as any).password;
      }

      if (userToEdit) {
        await UserService.update(userToEdit.id, payload);
      } else {
        await UserService.create(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Erro ao salvar usuário.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {userToEdit ? "Editar Usuário" : "Novo Usuário"}
        </DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* CORREÇÃO: Substituição de Grid por Box com CSS Grid.
              Layout: 2 colunas em telas maiores (sm), 1 coluna em mobile (xs).
              Gap: 2 (espaçamento).
          */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            {/* Nome - Ocupa todas as colunas (full width) */}
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField
                required
                fullWidth
                label="Nome Completo"
                name="name"
                value={formData.name}
                onChange={handleChange}
                autoFocus
              />
            </Box>

            {/* Email */}
            <TextField
              required
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />

            {/* Username */}
            <TextField
              required
              fullWidth
              label="Usuário (Login)"
              name="username"
              value={formData.username}
              onChange={handleChange}
              disabled={!!userToEdit} // Opcional: Bloquear mudança de username
            />

            {/* Senha */}
            <TextField
              fullWidth
              label={userToEdit ? "Nova Senha (Opcional)" : "Senha"}
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              required={!userToEdit}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Role */}
            <TextField
              select
              required
              fullWidth
              label="Permissão"
              name="role"
              value={formData.role}
              onChange={handleChange}
            >
              <MenuItem value="USER">Usuário Comum</MenuItem>
              <MenuItem value="ADMIN">Administrador</MenuItem>
            </TextField>
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
