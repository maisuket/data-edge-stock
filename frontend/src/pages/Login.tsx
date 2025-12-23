import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  Avatar,
  CssBaseline,
  InputAdornment,
  IconButton,
  CircularProgress,
  Link,
  Fade,
} from "@mui/material";
// Ícones correspondentes ao layout de referência (Lucide -> MUI)
import EngineeringIcon from "@mui/icons-material/Engineering"; // Similar ao HardHat
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward"; // ArrowRight
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import axios from "axios";

// --- Configuração Local da API ---
const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
// ---------------------------------

interface LoginProps {
  onLoginSuccess: () => void;
}

// Tema adaptado para imitar o estilo Shadcn UI / Tailwind
const theme = createTheme({
  palette: {
    primary: {
      main: "#2563eb", // Blue-600
    },
    text: {
      primary: "#0f172a", // Slate-900
      secondary: "#64748b", // Slate-500
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: "none", // Remove caixa alta padrão do MUI
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8, // Bordas levemente arredondadas (estilo rounded-md/lg)
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#f1f5f9", // bg-muted/30 (Slate-100)
          "& fieldset": {
            border: "1px solid transparent", // Remove borda padrão
            transition: "all 0.2s",
          },
          "&:hover fieldset": {
            borderColor: "#cbd5e1", // Slate-300
          },
          "&.Mui-focused": {
            backgroundColor: "#ffffff",
            "& fieldset": {
              borderColor: "#2563eb", // Primary border on focus
              borderWidth: "1px",
            },
          },
          "& input": {
            paddingLeft: "8px", // Espaço extra após o ícone
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          padding: "10px 16px",
          fontSize: "0.95rem",
          boxShadow:
            "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", // shadow-lg
        },
      },
    },
  },
});

export function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/login", { username, password });
      localStorage.setItem("access_token", response.data.access_token);
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setError("Credenciais inválidas. Verifique seu usuário e senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc", // Fundo geral claro (slate-50)
          // Mantive a imagem de fundo com overlay suave para não perder a identidade do projeto atual
          backgroundImage: `linear-gradient(rgba(255,255,255,0.8), rgba(255,255,255,0.8)), url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2070&q=80')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          p: 2,
        }}
      >
        <Fade in={true} timeout={600}>
          <Paper
            elevation={4}
            sx={{
              width: "100%",
              maxWidth: 400,
              p: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              border: "1px solid #e2e8f0", // slate-200
              boxShadow:
                "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)", // shadow-xl
            }}
          >
            {/* Cabeçalho do Card */}
            <Box sx={{ mb: 4, textAlign: "center", width: "100%" }}>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: "primary.main",
                    boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.3)",
                  }}
                >
                  <EngineeringIcon fontSize="medium" />
                </Avatar>
              </Box>

              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "#0f172a", mb: 1 }}
              >
                Stock Control
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Entre com suas credenciais para acessar
              </Typography>
            </Box>

            {/* Mensagem de Erro */}
            {error && (
              <Fade in={!!error}>
                <Alert
                  severity="error"
                  sx={{
                    width: "100%",
                    mb: 3,
                    borderRadius: 2,
                    fontSize: "0.875rem",
                    border: "1px solid #fecaca",
                    bgcolor: "#fef2f2",
                    color: "#991b1b",
                    "& .MuiAlert-icon": { color: "#991b1b" },
                  }}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            {/* Formulário */}
            <Box
              component="form"
              onSubmit={handleSubmit}
              noValidate
              sx={{ width: "100%" }}
            >
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  sx={{
                    ml: 0.5,
                    mb: 0.5,
                    display: "block",
                    fontWeight: 500,
                    color: "#334155",
                  }}
                >
                  Usuário
                </Typography>
                <TextField
                  required
                  fullWidth
                  id="username"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  placeholder="Seu usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineIcon
                          sx={{ color: "#94a3b8" }}
                          fontSize="small"
                        />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="caption"
                  sx={{
                    ml: 0.5,
                    mb: 0.5,
                    display: "block",
                    fontWeight: 500,
                    color: "#334155",
                  }}
                >
                  Senha
                </Typography>
                <TextField
                  required
                  fullWidth
                  name="password"
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon
                          sx={{ color: "#94a3b8" }}
                          fontSize="small"
                        />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="alternar visibilidade da senha"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? (
                            <VisibilityOff fontSize="small" />
                          ) : (
                            <Visibility fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                endIcon={!loading && <ArrowForwardIcon />}
                sx={{ height: 48 }}
              >
                {loading ? (
                  <>
                    <CircularProgress
                      size={20}
                      color="inherit"
                      sx={{ mr: 1 }}
                    />
                    Entrando...
                  </>
                ) : (
                  "Entrar na Plataforma"
                )}
              </Button>
            </Box>

            {/* Rodapé similar à referência */}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 4, fontSize: "0.85rem", textAlign: "center" }}
            >
              Não tem acesso?{" "}
              <Link
                href="#"
                underline="hover"
                sx={{ color: "primary.main", fontWeight: 600 }}
              >
                Fale com seu gerente.
              </Link>
            </Typography>
          </Paper>
        </Fade>
      </Box>
    </ThemeProvider>
  );
}
