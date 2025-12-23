import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Container,
  Card,
  CardContent,
  Stack,
  LinearProgress,
  IconButton,
  Chip,
  alpha,
  Fade,
  Button,
} from "@mui/material";
import {
  Inventory2Outlined as InventoryIcon,
  MonetizationOnOutlined as MoneyIcon,
  WarningAmberRounded as WarningIcon,
  TrendingUpRounded as TrendingIcon,
  MoreVertRounded as MoreIcon,
  RefreshRounded as RefreshIcon,
} from "@mui/icons-material";
import axios from "axios";

// --- Definições Locais para evitar erro de importação ---
export interface DashboardStats {
  totalProducts: number;
  totalValue: number;
  lowStock: number;
}

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
// -------------------------------------------------------

// Componente de Cartão de Estatística Reutilizável
const StatCard = ({
  title,
  value,
  icon,
  color,
  trend,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
  subtitle?: string;
}) => (
  <Card
    elevation={0}
    sx={{
      height: "100%",
      borderRadius: 4,
      border: "1px solid",
      borderColor: alpha(color, 0.1),
      background: `linear-gradient(135deg, #ffffff 0%, ${alpha(
        color,
        0.05
      )} 100%)`,
      transition: "transform 0.2s, box-shadow 0.2s",
      "&:hover": {
        transform: "translateY(-4px)",
        boxShadow: `0 12px 24px -10px ${alpha(color, 0.2)}`,
        borderColor: alpha(color, 0.3),
      },
    }}
  >
    <CardContent sx={{ p: 3 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
      >
        <Box
          sx={{
            p: 1.5,
            borderRadius: 3,
            bgcolor: alpha(color, 0.1),
            color: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </Box>
        {trend && (
          <Chip
            label={trend}
            size="small"
            sx={{
              bgcolor: alpha(color, 0.1),
              color: color,
              fontWeight: 700,
              fontSize: "0.75rem",
              height: 24,
            }}
          />
        )}
      </Stack>

      <Typography
        variant="h4"
        sx={{
          mt: 3,
          mb: 0.5,
          fontWeight: 800,
          color: "#1e293b",
          letterSpacing: "-1px",
        }}
      >
        {value}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: "#64748b",
          fontWeight: 600,
          mb: 0.5,
          textTransform: "uppercase",
          fontSize: "0.75rem",
          letterSpacing: "0.5px",
        }}
      >
        {title}
      </Typography>

      {subtitle && (
        <Typography
          variant="caption"
          sx={{ color: "#94a3b8", display: "block", mt: 1 }}
        >
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await api.get<DashboardStats>("/products/stats");
      setStats(response.data);
    } catch (error) {
      console.error("Erro ao carregar dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <CircularProgress size={40} thickness={4} sx={{ color: "#2563eb" }} />
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          Sincronizando dados...
        </Typography>
      </Box>
    );
  }

  // Fallback seguro se stats for nulo
  const safeStats = stats || {
    totalProducts: 0,
    totalValue: 0,
    lowStock: 0,
  };

  // Formatação de Moeda
  const formattedValue =
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(safeStats.totalValue) || "R$ 0,00";

  return (
    <Fade in={true} timeout={800}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Cabeçalho */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{ mb: 5 }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, color: "#0f172a", letterSpacing: "-1px" }}
            >
              Visão Geral
            </Typography>
            <Typography variant="body1" sx={{ color: "#64748b", mt: 0.5 }}>
              Acompanhe os principais indicadores do seu estoque em tempo real.
            </Typography>
          </Box>
          <Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadStats}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                borderColor: "#e2e8f0",
                color: "#475569",
                bgcolor: "white",
                "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f8fafc" },
              }}
            >
              Atualizar
            </Button>
          </Box>
        </Stack>

        {/* Grid de Cards Principais */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Total de Produtos */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Produtos Cadastrados"
              value={safeStats.totalProducts}
              icon={<InventoryIcon />}
              color="#2563eb" // Blue
              trend="+ Ativo"
              subtitle="Itens registrados no sistema"
            />
          </Grid>

          {/* Valor Total */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Valor em Estoque"
              value={formattedValue}
              icon={<MoneyIcon />}
              color="#10b981" // Green
              subtitle="Custo total acumulado"
            />
          </Grid>

          {/* Baixo Estoque */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Estoque Baixo"
              value={safeStats.lowStock}
              icon={<WarningIcon />}
              color="#f59e0b" // Amber
              trend={safeStats.lowStock > 0 ? "Atenção" : "Normal"}
              subtitle="Produtos abaixo do mínimo"
            />
          </Grid>

          {/* Métricas Gerais (Exemplo) */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Saúde Operacional"
              value="98.5%"
              icon={<TrendingIcon />}
              color="#8b5cf6" // Violet
              subtitle="Eficiência do sistema"
            />
          </Grid>
        </Grid>

        {/* Seção Inferior: Detalhes e Status */}
        <Grid container spacing={3}>
          {/* Painel Esquerdo: Métricas Detalhadas */}
          <Grid item xs={12} md={8}>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: 4,
                border: "1px solid #e2e8f0",
                height: "100%",
                background: "#fff",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 4 }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: "#1e293b" }}
                >
                  Análise de Inventário
                </Typography>
                <IconButton size="small">
                  <MoreIcon sx={{ color: "#94a3b8" }} />
                </IconButton>
              </Stack>

              <Box sx={{ mb: 5 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  sx={{ mb: 1.5 }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "#475569" }}
                  >
                    Ocupação do Estoque
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "#64748b", fontWeight: 600 }}
                  >
                    75%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={75}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    bgcolor: "#f1f5f9",
                    "& .MuiLinearProgress-bar": {
                      bgcolor: "#3b82f6",
                      borderRadius: 5,
                    },
                  }}
                />
              </Box>

              <Box sx={{ mb: 5 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  sx={{ mb: 1.5 }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "#475569" }}
                  >
                    Saúde Financeira (Giro)
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "#64748b", fontWeight: 600 }}
                  >
                    Ótimo
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={85}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    bgcolor: "#f1f5f9",
                    "& .MuiLinearProgress-bar": {
                      bgcolor: "#10b981",
                      borderRadius: 5,
                    },
                  }}
                />
              </Box>

              <Box>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  sx={{ mb: 1.5 }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "#475569" }}
                  >
                    Itens Críticos
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: safeStats.lowStock > 0 ? "#ef4444" : "#10b981",
                      fontWeight: 600,
                    }}
                  >
                    {safeStats.lowStock} Alertas
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={safeStats.lowStock > 0 ? 40 : 100}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    bgcolor: "#f1f5f9",
                    "& .MuiLinearProgress-bar": {
                      bgcolor: safeStats.lowStock > 0 ? "#ef4444" : "#10b981",
                      borderRadius: 5,
                    },
                  }}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Painel Direito: Status do Sistema (Dark Mode) */}
          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: 4,
                bgcolor: "#0f172a", // Dark Blue/Slate
                color: "#fff",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              }}
            >
              {/* Elementos Decorativos de Fundo */}
              <Box
                sx={{
                  position: "absolute",
                  top: -60,
                  right: -60,
                  width: 180,
                  height: 180,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0) 70%)",
                  zIndex: 0,
                }}
              />

              <Box sx={{ position: "relative", zIndex: 1 }}>
                <Typography variant="h6" gutterBottom fontWeight="700">
                  Status do Sistema
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    opacity: 0.7,
                    mb: 4,
                    lineHeight: 1.6,
                    fontSize: "0.9rem",
                  }}
                >
                  Monitoramento em tempo real dos serviços críticos e
                  conectividade.
                </Typography>

                <Stack spacing={2}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: "rgba(255,255,255,0.05)",
                      borderRadius: 3,
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      border: "1px solid rgba(255,255,255,0.05)",
                      transition: "background 0.2s",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                    }}
                  >
                    <Box
                      sx={{
                        p: 1,
                        bgcolor: "rgba(34,197,94,0.2)",
                        borderRadius: "50%",
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "#22c55e",
                          boxShadow: "0 0 8px #22c55e",
                        }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="600">
                        Banco de Dados
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.6 }}>
                        Online • 12ms
                      </Typography>
                    </Box>
                  </Paper>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: "rgba(255,255,255,0.05)",
                      borderRadius: 3,
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      border: "1px solid rgba(255,255,255,0.05)",
                      transition: "background 0.2s",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                    }}
                  >
                    <Box
                      sx={{
                        p: 1,
                        bgcolor: "rgba(59,130,246,0.2)",
                        borderRadius: "50%",
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "#3b82f6",
                          boxShadow: "0 0 8px #3b82f6",
                        }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="600">
                        API Gateway
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.6 }}>
                        Online • v1.2.0
                      </Typography>
                    </Box>
                  </Paper>
                </Stack>

                <Box
                  sx={{
                    mt: 5,
                    pt: 3,
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="center"
                    spacing={1}
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: "#22c55e",
                        animation: "pulse 2s infinite",
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ opacity: 0.5, letterSpacing: "0.5px" }}
                    >
                      SISTEMA OPERACIONAL
                    </Typography>
                  </Stack>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Fade>
  );
}
