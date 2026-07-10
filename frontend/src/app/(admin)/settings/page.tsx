"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTheme } from "next-themes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Moon,
  Sun,
  UserCircle,
  Shield,
  Lock,
  Check,
  Users,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  AlertTriangle,
  Link2,
  MapPin,
  Power,
} from "lucide-react";
import { toast } from "sonner";

// Importações relativas para garantir que o build funcione
import {
  profileService,
  type ProfileData,
} from "../../../lib/services/profile";
import { UserService, type User } from "../../../lib/services/users";
import { SettingsService } from "../../../lib/services/settings";
import {
  DeliveryZoneService,
  type DeliveryZone,
} from "../../../lib/services/delivery-zones";

// Componentes Shadcn
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserFormDialog } from "@/app/components/UserFormDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// --- SCHEMA ---
const profileSchema = z
  .object({
    name: z.string().min(3, "Nome muito curto"),
    email: z.string().email("E-mail inválido"),
    password: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type ProfileForm = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { setTheme, theme } = useTheme();
  const queryClient = useQueryClient();

  // -- ESTADOS --
  const [activeTab, setActiveTab] = useState("profile");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [userData, setUserData] = useState<ProfileData | null>(null);
  const [loginImageUrl, setLoginImageUrl] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [sidebarLogoUrl, setSidebarLogoUrl] = useState("");

  // Usuários
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);

  // Bairros de entrega
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneFee, setNewZoneFee] = useState("");
  const [zoneFeeEdits, setZoneFeeEdits] = useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  // Load Profile
  useEffect(() => {
    profileService
      .getMe()
      .then((data) => {
        setUserData(data);
        setValue("name", data.name);
        setValue("email", data.email);
      })
      .catch(() => toast.error("Erro ao carregar perfil."));
  }, [setValue]);

  // Load Settings (Imagem de Login e WhatsApp)
  useEffect(() => {
    SettingsService.getByKey("LOGIN_IMAGE_URL")
      .then((res) => {
        if (res?.value) setLoginImageUrl(res.value);
      })
      .catch(console.error);

    SettingsService.getByKey("WHATSAPP_NUMBER")
      .then((res) => {
        if (res?.value) setWhatsappNumber(res.value);
      })
      .catch(console.error);

    SettingsService.getByKey("SIDEBAR_LOGO_URL")
      .then((res) => {
        if (res?.value) setSidebarLogoUrl(res.value);
      })
      .catch(console.error);
  }, []);

  // Load Users
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users", userPage, userSearch],
    queryFn: () => UserService.getAll(userPage, 10, userSearch),
    enabled: activeTab === "users",
  });

  // Load Bairros de Entrega
  const { data: deliveryZones, isLoading: isLoadingZones } = useQuery({
    queryKey: ["delivery-zones-admin"],
    queryFn: () => DeliveryZoneService.getAll(),
    enabled: activeTab === "appearance",
  });

  const invalidateZones = () => {
    queryClient.invalidateQueries({ queryKey: ["delivery-zones-admin"] });
    queryClient.invalidateQueries({ queryKey: ["delivery-zones"] });
  };

  const createZoneMutation = useMutation({
    mutationFn: () =>
      DeliveryZoneService.create({
        neighborhood: newZoneName.trim(),
        fee: parseFloat(newZoneFee) || 0,
      }),
    onSuccess: () => {
      toast.success("Bairro cadastrado!");
      setNewZoneName("");
      setNewZoneFee("");
      invalidateZones();
    },
    onError: () => toast.error("Erro ao cadastrar bairro."),
  });

  const updateZoneMutation = useMutation({
    mutationFn: ({
      id,
      ...dto
    }: {
      id: string;
      fee?: number;
      active?: boolean;
    }) => DeliveryZoneService.update(id, dto),
    onSuccess: () => invalidateZones(),
    onError: () => toast.error("Erro ao atualizar bairro."),
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (id: string) => DeliveryZoneService.delete(id),
    onSuccess: () => {
      toast.success("Bairro removido.");
      invalidateZones();
    },
    onError: () => toast.error("Erro ao remover bairro."),
  });

  // Delete User
  const deleteUserMutation = useMutation({
    mutationFn: UserService.delete,
    onSuccess: () => {
      toast.success("Usuário excluído!");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => toast.error("Erro ao excluir usuário."),
  });

  const onSaveProfile = async (data: ProfileForm) => {
    setIsSavingProfile(true);
    try {
      const payload: any = { name: data.name, email: data.email };
      if (data.password) payload.password = data.password;

      const updated = await profileService.updateMe(payload);
      setUserData(updated);
      toast.success("Perfil atualizado!");
      setValue("password", "");
      setValue("confirmPassword", "");
    } catch {
      toast.error("Erro ao atualizar perfil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setDeleteUserTarget(user);
  };

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  return (
    <div className="p-8 max-w-7xl mx-auto pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b border-border pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Configurações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie seu perfil, usuários e aparência.
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col md:flex-row gap-8 w-full"
      >
        <aside className="w-full md:w-64 shrink-0">
          <TabsList className="flex flex-col h-auto bg-transparent p-0 space-y-2 w-full justify-start">
            <TabsTrigger
              value="profile"
              className="w-full justify-start px-4 py-2.5 h-10 text-sm font-medium hover:bg-muted/50 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-xl transition-all duration-300 shadow-none data-[state=active]:shadow-sm"
            >
              <UserCircle className="mr-2 h-4 w-4" />
              Meu Perfil
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="w-full justify-start px-4 py-2.5 h-10 text-sm font-medium hover:bg-muted/50 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-xl transition-all duration-300 shadow-none data-[state=active]:shadow-sm"
            >
              <Users className="mr-2 h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger
              value="appearance"
              className="w-full justify-start px-4 py-2.5 h-10 text-sm font-medium hover:bg-muted/50 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-xl transition-all duration-300 shadow-none data-[state=active]:shadow-sm"
            >
              <Sun className="mr-2 h-4 w-4" />
              Aparência
            </TabsTrigger>
          </TabsList>
        </aside>

        <div className="flex-1">
          <TabsContent value="profile" className="mt-0 space-y-6">
            <Card className="bg-card border-border shadow-md sm:rounded-2xl overflow-hidden">
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>Atualize seus dados.</CardDescription>
              </CardHeader>
              <CardContent>
                {!userData ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 p-4 bg-muted/30 rounded-2xl border border-dashed border-border shadow-sm">
                      <Avatar className="h-20 w-20 border-4 border-background shadow-sm transition-transform duration-300 hover:scale-105">
                        <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold shadow-inner">
                          {getInitials(userData.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1 text-center sm:text-left">
                        <h3 className="font-semibold text-lg">
                          {userData.name}
                        </h3>
                        <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground">
                          <Shield className="h-3.5 w-3.5" />
                          <Badge variant="secondary">{userData.role}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground pt-1 font-mono">
                          @{userData.username}
                        </p>
                      </div>
                    </div>

                    <form
                      id="profile-form"
                      onSubmit={handleSubmit(onSaveProfile)}
                      className="space-y-6"
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Nome Completo</Label>
                          <Input
                            {...register("name")}
                            className="bg-background rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
                          />
                          {errors.name && (
                            <span className="text-red-500 text-xs">
                              {errors.name.message}
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>E-mail</Label>
                          <Input
                            {...register("email")}
                            className="bg-background rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
                          />
                          {errors.email && (
                            <span className="text-red-500 text-xs">
                              {errors.email.message}
                            </span>
                          )}
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Lock className="h-4 w-4 text-muted-foreground" />{" "}
                          Segurança
                        </h4>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Nova Senha</Label>
                            <Input
                              type="password"
                              {...register("password")}
                              placeholder="Deixe em branco para manter"
                              className="bg-background rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
                            />
                            {errors.password && (
                              <span className="text-red-500 text-xs">
                                {errors.password.message}
                              </span>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Confirmar Senha</Label>
                            <Input
                              type="password"
                              {...register("confirmPassword")}
                              placeholder="Repita a nova senha"
                              className="bg-background rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
                            />
                            {errors.confirmPassword && (
                              <span className="text-red-500 text-xs">
                                {errors.confirmPassword.message}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </form>
                  </>
                )}
              </CardContent>
              <CardFooter className="border-t px-6 py-4 bg-muted/20 flex justify-end">
                <Button
                  type="submit"
                  form="profile-form"
                  disabled={isSavingProfile}
                  className="bg-primary text-primary-foreground rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-sm"
                >
                  {isSavingProfile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Salvar Alterações
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-0 space-y-6">
            <Card className="bg-card border-border shadow-md sm:rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle>Gestão de Usuários</CardTitle>
                  <CardDescription>
                    Gerencie quem acessa o sistema.
                  </CardDescription>
                </div>
                <Button
                  onClick={handleAddUser}
                  className="bg-primary text-primary-foreground rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-2" /> Novo Usuário
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4 bg-background p-1 rounded-xl border w-fit shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/20">
                  <div className="relative w-75">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar usuários..."
                      className="pl-9 border-0 shadow-none focus-visible:ring-0 h-9 bg-transparent rounded-xl"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="font-semibold">Usuário</TableHead>
                        <TableHead className="font-semibold">E-mail</TableHead>
                        <TableHead className="font-semibold">
                          Permissão
                        </TableHead>
                        <TableHead className="text-right font-semibold">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingUsers ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-32 text-center text-muted-foreground"
                          >
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : usersData?.data.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-32 text-center text-muted-foreground"
                          >
                            Nenhum usuário encontrado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        usersData?.data.map((user) => (
                          <TableRow
                            key={user.id}
                            className="group hover:bg-muted/40 transition-colors duration-300"
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border border-border shadow-sm transition-transform duration-300 group-hover:scale-110">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold shadow-inner">
                                    {getInitials(user.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="text-foreground font-medium">
                                    {user.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    @{user.username}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {user.email}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{user.role}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditUser(user)}
                                  className="rounded-xl transition-all duration-300 hover:scale-110 hover:bg-amber-500/10"
                                >
                                  <Pencil className="h-4 w-4 text-amber-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(user)}
                                  className="rounded-xl transition-all duration-300 hover:scale-110 hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="mt-0">
            <Card className="bg-card border-border shadow-md sm:rounded-2xl overflow-hidden">
              <CardHeader>
                <CardTitle>Aparência</CardTitle>
                <CardDescription>
                  Personalize a experiência visual.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl">
                  {/* Tema Claro */}
                  <div
                    className={`cursor-pointer border-2 rounded-2xl p-1 transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${
                      theme === "light"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-transparent bg-muted/30 hover:bg-muted/50"
                    }`}
                    onClick={() => setTheme("light")}
                  >
                    <div className="space-y-2 rounded-lg bg-[#ecedef] p-2">
                      <div className="space-y-2 rounded-xl bg-white p-2 shadow-sm border border-black/5">
                        <div className="h-2 w-20 rounded-full bg-[#ecedef]" />
                        <div className="h-2 w-20 rounded-full bg-[#ecedef]" />
                      </div>
                    </div>
                    <div className="mt-2 text-center text-sm font-medium flex items-center justify-center gap-2 p-2">
                      <Sun className="h-4 w-4" /> Claro
                    </div>
                  </div>

                  {/* Tema Escuro */}
                  <div
                    className={`cursor-pointer border-2 rounded-2xl p-1 transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${
                      theme === "dark"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-transparent bg-muted/30 hover:bg-muted/50"
                    }`}
                    onClick={() => setTheme("dark")}
                  >
                    <div className="space-y-2 rounded-lg bg-[#09090b] p-2 border border-white/10">
                      <div className="space-y-2 rounded-xl bg-[#18181b] p-2 shadow-sm border border-white/5">
                        <div className="h-2 w-20 rounded-full bg-[#27272a]" />
                        <div className="h-2 w-20 rounded-full bg-[#27272a]" />
                      </div>
                    </div>
                    <div className="mt-2 text-center text-sm font-medium flex items-center justify-center gap-2 p-2">
                      <Moon className="h-4 w-4" /> Escuro
                    </div>
                  </div>
                </div>

                <Separator className="my-8" />

                <div className="space-y-6 max-w-2xl">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                      Cardápio Público — WhatsApp
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="whatsappNumber">Número do WhatsApp</Label>
                      <div className="flex gap-2">
                        <Input
                          id="whatsappNumber"
                          placeholder="5511999999999 (DDI + DDD + número)"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          className="rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
                        />
                        <Button
                          onClick={async () => {
                            try {
                              await SettingsService.update(
                                "WHATSAPP_NUMBER",
                                whatsappNumber,
                              );
                              toast.success("Número do WhatsApp salvo!");
                            } catch {
                              toast.error("Erro ao salvar número.");
                            }
                          }}
                          className="rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-sm shrink-0"
                        >
                          Salvar
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Número que receberá os pedidos do cardápio público.
                        Formato: DDI + DDD + número (ex: 5511999999999).
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Link do Cardápio</Label>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={
                            typeof window !== "undefined"
                              ? `${window.location.origin}/cardapio`
                              : "/cardapio"
                          }
                          className="rounded-xl bg-muted text-muted-foreground text-sm"
                        />
                        <Button
                          variant="outline"
                          onClick={() => {
                            const url = `${window.location.origin}/cardapio`;
                            navigator.clipboard.writeText(url);
                            toast.success("Link copiado!");
                          }}
                          className="rounded-xl shrink-0 gap-2"
                        >
                          <Link2 className="w-4 h-4" />
                          Copiar
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Compartilhe este link com seus clientes para que eles
                        vejam o cardápio e façam pedidos via WhatsApp.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                      Tela de Login
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="loginImage">URL da Imagem de Fundo</Label>
                      <div className="flex gap-2">
                        <Input
                          id="loginImage"
                          placeholder="https://images.unsplash.com/photo-..."
                          value={loginImageUrl}
                          onChange={(e) => setLoginImageUrl(e.target.value)}
                          className="rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
                        />
                        <Button
                          onClick={async () => {
                            try {
                              await SettingsService.update(
                                "LOGIN_IMAGE_URL",
                                loginImageUrl,
                              );
                              toast.success(
                                "Imagem do login atualizada com sucesso!",
                              );
                            } catch {
                              toast.error("Erro ao salvar imagem do login.");
                            }
                          }}
                          className="rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-sm shrink-0"
                        >
                          Salvar Imagem
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Insira o link direto para a imagem que aparecerá na tela
                        de login. Recomendamos imagens em alta resolução.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                      <MapPin className="h-4 w-4" />
                      Bairros de Entrega
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Cadastre os bairros que a loja entrega e a taxa de cada
                      um. No cardápio, o cliente escolhe entre retirar na loja
                      (grátis) ou entrega por bairro.
                    </p>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Nome do bairro"
                        value={newZoneName}
                        onChange={(e) => setNewZoneName(e.target.value)}
                        className="rounded-xl"
                      />
                      <Input
                        type="number"
                        step="0.5"
                        min={0}
                        placeholder="Taxa (R$)"
                        value={newZoneFee}
                        onChange={(e) => setNewZoneFee(e.target.value)}
                        className="rounded-xl w-32"
                      />
                      <Button
                        onClick={() => createZoneMutation.mutate()}
                        disabled={
                          !newZoneName.trim() ||
                          !newZoneFee ||
                          createZoneMutation.isPending
                        }
                        className="rounded-xl shrink-0 gap-2"
                      >
                        {createZoneMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        Adicionar
                      </Button>
                    </div>

                    {isLoadingZones ? (
                      <Skeleton className="h-24 w-full rounded-xl" />
                    ) : !deliveryZones || deliveryZones.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-xl">
                        Nenhum bairro cadastrado ainda.
                      </p>
                    ) : (
                      <div className="rounded-md border border-border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                              <TableHead className="font-semibold">
                                Bairro
                              </TableHead>
                              <TableHead className="font-semibold w-32">
                                Taxa (R$)
                              </TableHead>
                              <TableHead className="font-semibold w-24">
                                Ativo
                              </TableHead>
                              <TableHead className="text-right font-semibold w-16">
                                Ações
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {deliveryZones.map((zone: DeliveryZone) => (
                              <TableRow key={zone.id}>
                                <TableCell
                                  className={
                                    zone.active
                                      ? "text-foreground"
                                      : "text-muted-foreground line-through"
                                  }
                                >
                                  {zone.neighborhood}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.5"
                                    min={0}
                                    value={
                                      zoneFeeEdits[zone.id] ??
                                      String(zone.fee)
                                    }
                                    onChange={(e) =>
                                      setZoneFeeEdits((prev) => ({
                                        ...prev,
                                        [zone.id]: e.target.value,
                                      }))
                                    }
                                    onBlur={(e) => {
                                      const newFee = parseFloat(
                                        e.target.value,
                                      );
                                      if (
                                        !isNaN(newFee) &&
                                        newFee !== zone.fee
                                      ) {
                                        updateZoneMutation.mutate({
                                          id: zone.id,
                                          fee: newFee,
                                        });
                                      }
                                    }}
                                    className="h-8 w-24 rounded-lg"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      updateZoneMutation.mutate({
                                        id: zone.id,
                                        active: !zone.active,
                                      })
                                    }
                                    className={`h-8 gap-1.5 rounded-lg ${
                                      zone.active
                                        ? "text-[#4CAF50] hover:text-[#4CAF50]"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    <Power className="h-3.5 w-3.5" />
                                    {zone.active ? "Ativo" : "Inativo"}
                                  </Button>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      deleteZoneMutation.mutate(zone.id)
                                    }
                                    className="rounded-xl hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-8" />

                <div className="space-y-4 max-w-2xl">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                    Barra Lateral (Sidebar)
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="sidebarLogo">URL da Logo</Label>
                    <div className="flex gap-2">
                      <Input
                        id="sidebarLogo"
                        placeholder="https://sua-empresa.com/logo.png"
                        value={sidebarLogoUrl}
                        onChange={(e) => setSidebarLogoUrl(e.target.value)}
                        className="rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
                      />
                      <Button
                        onClick={async () => {
                          try {
                            await SettingsService.update(
                              "SIDEBAR_LOGO_URL",
                              sidebarLogoUrl,
                            );
                            toast.success(
                              "Logo da barra lateral atualizada! Recarregue a página para ver a mudança.",
                            );
                          } catch (err) {
                            toast.error(
                              "Erro ao salvar logo da barra lateral.",
                            );
                          }
                        }}
                        className="rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-sm shrink-0"
                      >
                        Salvar Logo
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Insira o link direto para a imagem que aparecerá no topo
                      da barra lateral. Recomendamos imagens com fundo
                      transparente (PNG).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <UserFormDialog
        open={isUserModalOpen}
        onOpenChange={setIsUserModalOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["users"] });
        }}
        userToEdit={editingUser}
      />

      <ConfirmDialog
        open={!!deleteUserTarget}
        onOpenChange={(open) => !open && setDeleteUserTarget(null)}
        title="Excluir usuário"
        description={`Tem certeza que deseja excluir o usuário "${deleteUserTarget?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={() =>
          deleteUserTarget && deleteUserMutation.mutate(deleteUserTarget.id)
        }
      />
    </div>
  );
}
