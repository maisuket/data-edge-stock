import { useState, useEffect } from "react";
import {
  HashRouter, // CORREÇÃO: Usamos HashRouter em vez de BrowserRouter para Electron
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
  useLocation,
} from "react-router-dom";
import { Login } from "./pages/Login";
import { Products } from "./pages/Products";
import { Dashboard } from "./pages/Dashboard";
import { StockHistory } from "./pages/StockHistory";
import { Suppliers } from "./pages/Suppliers";
import { Settings } from "./pages/Settings";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CssBaseline,
  IconButton,
  Container,
  Divider,
  Badge,
  Popover,
  ListSubheader,
  ListItemAvatar,
  Avatar as MuiAvatar,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import InventoryIcon from "@mui/icons-material/Inventory";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LogoutIcon from "@mui/icons-material/Logout";
import HistoryIcon from "@mui/icons-material/History";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import WarningIcon from "@mui/icons-material/Warning";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import SettingsIcon from "@mui/icons-material/Settings";
import { ProductService } from "./services/products";

// --- CONFIGURAÇÃO DO TEMA (Enterprise) ---
const theme = createTheme({
  palette: {
    primary: {
      main: "#2563eb", // Azul Royal moderno
    },
    secondary: {
      main: "#dc004e",
    },
    background: {
      default: "#f3f4f6", // Cinza bem suave para o fundo
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#111827", // Sidebar Escura (Dark Navy)
          color: "#e5e7eb", // Texto claro
          borderRight: "none",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#ffffff", // Topbar Branca
          color: "#1f2937", // Texto Escuro
          boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.1)", // Sombra sutil
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: "4px 8px", // Espaçamento entre itens
          "&.Mui-selected": {
            backgroundColor: "rgba(37, 99, 235, 0.15)", // Azul translúcido
            color: "#60a5fa", // Texto azul claro
            "&:hover": {
              backgroundColor: "rgba(37, 99, 235, 0.25)",
            },
            "& .MuiListItemIcon-root": {
              color: "#60a5fa", // Ícone azul
            },
          },
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.05)",
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: "#9ca3af", // Ícones cinza claro
          minWidth: 40,
        },
      },
    },
  },
});

const drawerWidth = 260;

// --- COMPONENTE DE LAYOUT ---
const Layout = ({ onLogout }: { onLogout: () => void }) => {
  const location = useLocation();

  // Estados de Notificação
  const [anchorElNotif, setAnchorElNotif] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Carrega notificações (produtos com estoque baixo)
  const fetchNotifications = async () => {
    try {
      const stats = await ProductService.getStats();
      if (stats && stats.criticalItems) {
        setNotifications(stats.criticalItems);
      }
    } catch (error) {
      console.error("Erro ao buscar notificações", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMenuNotif = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNotif(event.currentTarget);
  };

  const handleCloseNotif = () => {
    setAnchorElNotif(null);
  };

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {/* Top App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Gestão de Estoque
          </Typography>

          {/* --- ÍCONE DE NOTIFICAÇÕES --- */}
          <IconButton
            size="large"
            color="inherit"
            sx={{ mr: 0 }}
            onClick={handleMenuNotif}
          >
            <Badge badgeContent={notifications.length} color="error">
              <NotificationsIcon
                color={notifications.length > 0 ? "action" : "inherit"}
              />
            </Badge>
          </IconButton>

          {/* Menu de Notificações (Popover) */}
          <Popover
            open={Boolean(anchorElNotif)}
            anchorEl={anchorElNotif}
            onClose={handleCloseNotif}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            PaperProps={{
              sx: { width: 320, maxHeight: 400 },
            }}
          >
            <List
              subheader={
                <ListSubheader>Alertas de Estoque Baixo</ListSubheader>
              }
            >
              {notifications.length === 0 ? (
                <ListItem>
                  <ListItemText secondary="Nenhum alerta no momento." />
                </ListItem>
              ) : (
                notifications.map((item) => (
                  <ListItem key={item.id} divider>
                    <ListItemAvatar>
                      <MuiAvatar sx={{ bgcolor: "warning.light" }}>
                        <WarningIcon color="warning" />
                      </MuiAvatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={item.name}
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          Restam: <strong>{item.currentStock}</strong> (Mín:{" "}
                          {item.minStock})
                        </Typography>
                      }
                    />
                  </ListItem>
                ))
              )}
            </List>
          </Popover>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: [1],
            py: 1,
          }}
        >
          <InventoryIcon sx={{ mr: 1, color: "primary.main", fontSize: 28 }} />
          <Typography
            variant="h6"
            color="inherit"
            noWrap
            sx={{ fontWeight: "bold", letterSpacing: 1 }}
          >
            STOCK TCL
          </Typography>
        </Toolbar>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mb: 2 }} />

        <Box sx={{ overflow: "auto" }}>
          <List>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/dashboard"
                selected={location.pathname === "/dashboard"}
              >
                <ListItemIcon>
                  <DashboardIcon />
                </ListItemIcon>
                <ListItemText primary="Dashboard" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/produtos"
                selected={location.pathname === "/produtos"}
              >
                <ListItemIcon>
                  <InventoryIcon />
                </ListItemIcon>
                <ListItemText primary="Produtos" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/fornecedores"
                selected={location.pathname === "/fornecedores"}
              >
                <ListItemIcon>
                  <LocalShippingIcon />
                </ListItemIcon>
                <ListItemText primary="Fornecedores" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/historico"
                selected={location.pathname === "/historico"}
              >
                <ListItemIcon>
                  <HistoryIcon />
                </ListItemIcon>
                <ListItemText primary="Histórico" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/configuracoes"
                selected={location.pathname === "/configuracoes"}
              >
                <ListItemIcon>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary="Configurações" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>

        <Box sx={{ mt: "auto", p: 2 }}>
          <ListItemButton
            onClick={onLogout}
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.05)",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" },
            }}
          >
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Sair do Sistema" />
          </ListItemButton>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          mt: 8,
          minHeight: "100vh",
          backgroundColor: "background.default",
        }}
      >
        <Container maxWidth="xl" sx={{ mt: 2 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

// --- APP PRINCIPAL ---
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) setIsAuthenticated(true);
  }, []);

  const login = () => setIsAuthenticated(true);
  const logout = () => {
    localStorage.removeItem("access_token");
    setIsAuthenticated(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <HashRouter>
        {" "}
        {/* CORREÇÃO: HashRouter aqui também */}
        <Routes>
          {/* Rota Pública */}
          <Route
            path="/login"
            element={
              !isAuthenticated ? (
                <Login onLoginSuccess={login} />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />

          {/* Rotas Privadas (Com Layout) */}
          <Route
            element={
              isAuthenticated ? (
                <Layout onLogout={logout} />
              ) : (
                <Navigate to="/login" />
              )
            }
          >
            <Route path="/historico" element={<StockHistory />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/produtos" element={<Products />} />
            <Route path="/fornecedores" element={<Suppliers />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;
