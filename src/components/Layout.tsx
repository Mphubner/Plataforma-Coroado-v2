import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  Home, 
  ShoppingBag, 
  GraduationCap, 
  Users, 
  LayoutDashboard, 
  Menu, 
  X,
  Bell,
  User,
  LogOut,
  Settings,
  Gamepad2,
  Heart,
  MapPin,
  Radio,
  Search,
  LogIn,
  Gift,
  Calendar
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
  appRoutes,
  visibleRoutes,
  type RouteConfig,
  type RouteId,
  type UserProfile,
} from "@/src/lib/permissions"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { can } from "@/src/lib/permissions"
import { auth, db, googleWorkspaceProvider } from "@/lib/firebase"
import { signInWithPopup } from "firebase/auth"
import { doc, serverTimestamp, updateDoc } from "firebase/firestore"

interface LayoutProps {
  children: React.ReactNode
  activeTab: string
  setActiveTab: (tab: string) => void
  isLoggedIn?: boolean
  userRole?: string
  onLoginClick?: () => void
  onLogoutClick?: () => void
  userData?: UserProfile | null
}

type NavItem = RouteConfig & { icon: LucideIcon }

const iconByRoute: Record<RouteId, LucideIcon> = {
  home: Home,
  cell: Users,
  school: GraduationCap,
  members: Users,
  ministries: Users,
  admin: LayoutDashboard,
  pastoral: Users,
  events: Calendar,
  finance: Gift,
  jornada: Gamepad2,
  units: MapPin,
  pastors: Users,
  social: Heart,
  store: ShoppingBag,
  media: Radio,
}

const routeOrder: RouteId[] = [
  "home",
  "cell",
  "school",
  "members",
  "ministries",
  "events",
  "finance",
  "jornada",
  "admin",
  "pastoral",
  "units",
  "pastors",
  "social",
  "store",
  "media",
]

export function Layout({ children, activeTab, setActiveTab, isLoggedIn = true, userRole = 'Membro', onLoginClick, onLogoutClick, userData }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const permittedNav = React.useMemo<NavItem[]>(() => {
    const routes = isLoggedIn
      ? visibleRoutes(userData)
      : appRoutes.filter(route => route.id === "home" || route.capability === "view:public")

    return routeOrder
      .map(routeId => routes.find(route => route.id === routeId))
      .filter((route): route is RouteConfig => Boolean(route))
      .map(route => ({ ...route, icon: iconByRoute[route.id] || Home }))
  }, [isLoggedIn, userData])

  const getBottomNavItems = () => permittedNav.filter(item => item.bottom).slice(0, 5).map(item => item.id)

  const getDesktopPrimaryItems = () => {
    const preferredLogged: RouteId[] = ["home", "cell", "school", "members", "ministries", "events", "finance", "jornada", "admin", "pastors"];
    const preferredPublic: RouteId[] = ["home", "cell", "ministries", "events", "units", "pastors", "social", "store", "media"];
    const preferred = isLoggedIn ? preferredLogged : preferredPublic;
    
    const permittedIds = new Set(permittedNav.map(item => item.id));
    return preferred.filter(id => permittedIds.has(id));
  }

  const bottomNavIds = getBottomNavItems()
  const desktopPrimaryIds = getDesktopPrimaryItems()

  const primaryNav = permittedNav.filter(item => desktopPrimaryIds.includes(item.id))
  const secondaryNav = permittedNav.filter(item => !desktopPrimaryIds.includes(item.id))

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-primary selection:text-black scroll-smooth">
      {/* Navbar Fixa no Topo */}
      <header className="fixed top-0 left-0 right-0 h-16 md:h-20 bg-black/80 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="container mx-auto px-4 md:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            <motion.div 
              className="flex items-center gap-3 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              onClick={() => setActiveTab('home')}
            >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-tr from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                <Heart className="h-5 w-5 md:h-6 md:w-6 text-black fill-current" />
              </div>
              <span className="text-xl md:text-2xl font-black tracking-tight hidden sm:block">Coroado</span>
            </motion.div>
            
            <nav className="hidden md:flex items-center gap-1">
              {primaryNav.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "relative px-3 lg:px-4 py-2 text-sm font-semibold transition-all duration-300 hover:text-primary rounded-full",
                    activeTab === item.id ? "text-primary bg-white/5" : "text-white/60"
                  )}
                  onClick={() => setActiveTab(item.id)}
                >
                  {item.label}
                  {activeTab === item.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -bottom-1 left-4 right-4 h-0.5 bg-primary rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Button>
              ))}
              
              {secondaryNav.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger 
                    className={cn(
                      buttonVariants({ variant: "ghost" }), 
                      "text-white/60 hover:text-primary gap-1 px-3 lg:px-4"
                    )}
                  >
                    Mais <Menu className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-zinc-900 border-white/10 text-white w-48">
                    <DropdownMenuGroup>
                      {secondaryNav.map((item) => (
                        <DropdownMenuItem 
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={`hover:bg-white/5 focus:bg-white/5 cursor-pointer ${activeTab === item.id ? "text-primary" : ""}`}
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {!isLoggedIn ? (
              <Button onClick={() => onLoginClick && onLoginClick()} variant="outline" className="border-primary/50 text-primary hover:bg-primary hover:text-black rounded-full px-6">
                <LogIn className="mr-2 h-4 w-4" />
                Área do Membro
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
                  <Bell className="h-5 w-5" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger className="relative h-8 w-8 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <Avatar className="h-8 w-8 border border-white/10">
                      <AvatarImage src={String(userData?.photoURL || "")} alt={String(userData?.name || "User")} />
                      <AvatarFallback>{getInitials(userData?.name)}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-zinc-900 border-white/10 text-white" align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{userData?.name || 'Carregando...'}</p>
                          <p className="text-xs leading-none text-white/50">
                            {userRole}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-white/10" />
                      
                      {can(userData, 'manage:seed') && (
                        <DropdownMenuItem 
                          onClick={async () => {
                            try {
                              await signInWithPopup(auth, googleWorkspaceProvider);
                              await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
                                googleWorkspaceConnected: true,
                                googleWorkspaceConnectedAt: serverTimestamp(),
                                updatedAt: serverTimestamp()
                              });
                              alert('Google Workspace conectado com sucesso!');
                            } catch (e) {
                              console.error(e);
                              alert('Erro ao conectar Google Workspace');
                            }
                          }}
                          className="hover:bg-white/5 focus:bg-white/5 cursor-pointer text-primary"
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                          </svg>
                          <span>Conectar Google Workspace</span>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem onClick={() => onLogoutClick && onLogoutClick()} className="hover:bg-white/5 focus:bg-white/5 text-red-400 cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sair</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-white/10 hover:text-white text-white/60 h-10 w-10 outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Menu className="h-6 w-6" />
              </SheetTrigger>
              <SheetContent side="right" className="bg-black border-white/10 text-white p-0">
                <div className="flex flex-col h-full">
                  <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src="https://i.imgur.com/QVg57L1.png" alt="Coroado Icon" className="h-6 w-auto object-contain text-white" />
                      <img src="https://i.imgur.com/ItH3qGm.png" alt="Coroado" className="h-3 w-auto object-contain mt-0.5 text-white" />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                      <X className="h-6 w-6" />
                    </Button>
                  </div>
                  <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
                    {(() => {
                      const visibleItems = permittedNav;

                      const categories = isLoggedIn ? [
                        { id: 'main', label: 'Principal', items: visibleItems.filter(i => ['home', 'jornada', 'events'].includes(i.id)) },
                        { id: 'igreja', label: 'Conexão & Igreja', items: visibleItems.filter(i => ['cell', 'members', 'ministries', 'pastors'].includes(i.id)) },
                        { id: 'estudos', label: 'Crescimento', items: visibleItems.filter(i => ['school', 'finance', 'store'].includes(i.id)) },
                        { id: 'public', label: 'Institucional', items: visibleItems.filter(i => ['units', 'social', 'media'].includes(i.id)) },
                        { id: 'admin', label: 'Gestão', items: visibleItems.filter(i => ['admin'].includes(i.id)) }
                      ] : [
                        { id: 'public', label: 'Conheça a Igreja', items: visibleItems.filter(i => ['home', 'cell', 'ministries', 'events'].includes(i.id)) },
                        { id: 'institucional', label: 'Institucional', items: visibleItems.filter(i => ['pastors', 'units', 'social'].includes(i.id)) },
                        { id: 'media', label: 'Mídia & Loja', items: visibleItems.filter(i => ['media', 'store'].includes(i.id)) }
                      ];

                      return categories.map(cat => (
                        cat.items.length > 0 && (
                          <div key={cat.id} className="space-y-1">
                            <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 px-4">{cat.label}</h4>
                            {cat.items.map((item) => (
                              <Button
                                key={item.id}
                                variant="ghost"
                                className={`w-full justify-start gap-4 h-11 text-base font-medium rounded-xl ${
                                  activeTab === item.id ? "text-primary bg-primary/10" : "text-white/70 hover:text-white hover:bg-white/5"
                                }`}
                                onClick={() => {
                                  setActiveTab(item.id)
                                  setIsMobileMenuOpen(false)
                                }}
                              >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                              </Button>
                            ))}
                          </div>
                        )
                      ));
                    })()}
                  </nav>
                  <div className="p-6 border-t border-white/10 space-y-3">
                    {isLoggedIn && can(userData, 'manage:seed') && (
                      <Button 
                        onClick={async () => {
                          try {
                            await signInWithPopup(auth, googleWorkspaceProvider);
                            await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
                              googleWorkspaceConnected: true,
                              googleWorkspaceConnectedAt: serverTimestamp(),
                              updatedAt: serverTimestamp()
                            });
                            alert('Google Workspace conectado com sucesso!');
                          } catch (e) {
                            console.error(e);
                            alert('Erro ao conectar Google Workspace');
                          }
                        }}
                        variant="outline" 
                        className="w-full border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Conectar Workspace
                      </Button>
                    )}
                    {isLoggedIn ? (
                      <Button onClick={() => onLogoutClick && onLogoutClick()} variant="outline" className="w-full border-white/10 hover:bg-white/5">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair da Conta
                      </Button>
                    ) : (
                      <Button onClick={() => onLoginClick && onLoginClick()} className="w-full bg-primary text-black hover:bg-primary/90">
                        <LogIn className="mr-2 h-4 w-4" />
                        Faça Login
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="container mx-auto px-4 py-8"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-zinc-950 pt-16 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-16 text-white/60 text-sm">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white">
                <img src="https://i.imgur.com/QVg57L1.png" alt="Coroado Icon" className="h-8 w-auto object-contain" />
                <img src="https://i.imgur.com/ItH3qGm.png" alt="Coroado" className="h-4 w-auto object-contain mt-1" />
              </div>
              <p className="max-w-xs">Uma igreja em células, apaixonada por Jesus para transformar o mundo.</p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-bold text-white uppercase tracking-widest text-xs">Políticas</h4>
              <ul className="space-y-2">
                <li><a href="/politicas/privacidade" className="hover:text-primary transition-colors">Política de Privacidade</a></li>
                <li><a href="/politicas/servico" className="hover:text-primary transition-colors">Termos de Serviço</a></li>
                <li><a href="/politicas/devolucao" className="hover:text-primary transition-colors">Política de Devolução</a></li>
                <li><a href="/politicas/frete" className="hover:text-primary transition-colors">Política de Frete e Envio</a></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-white uppercase tracking-widest text-xs">Atendimento</h4>
              <ul className="space-y-2">
                <li>Precisa de ajuda com a plataforma, loja ou doações?</li>
                <li><a href="mailto:Suporte@coroado.org" className="text-white hover:text-primary font-medium transition-colors">Suporte@coroado.org</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
            <p>&copy; {new Date().getFullYear()} Igreja Coroado. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/10 bg-black/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 px-1">
          {permittedNav.filter(item => bottomNavIds.includes(item.id)).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                  isActive ? "text-primary" : "text-white/40 hover:text-white/60"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveTab"
                    className="absolute top-1 bottom-1 left-1 right-1 bg-primary/10 rounded-xl"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <motion.div
                  animate={{ 
                    scale: isActive ? 1.15 : 1,
                    y: isActive ? -2 : 0
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="relative z-10"
                >
                  <item.icon className="h-[18px] w-[18px]" />
                </motion.div>
                <motion.span 
                  animate={{
                    opacity: isActive ? 1 : 0.7,
                    y: isActive ? 0 : 2
                  }}
                  className="text-[9px] uppercase tracking-wider font-bold relative z-10"
                >
                  {item.label}
                </motion.span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  )
}
