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
import { Button, buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"

interface LayoutProps {
  children: React.ReactNode
  activeTab: string
  setActiveTab: (tab: string) => void
  isLoggedIn?: boolean
  userRole?: 'member' | 'leader' | 'pastor' | 'admin'
  onLoginClick?: () => void
  onLogoutClick?: () => void
  userData?: any
}

const navItems = [
  { id: "home", label: "Início", icon: Home, category: "public" },
  { id: "cell", label: "Células", icon: Users, category: "public" },
  { id: "school", label: "Escola IDE", icon: GraduationCap, category: "member" },
  { id: "members", label: "Membros", icon: Users, category: "member" },
  { id: "ministries", label: "Ministérios", icon: Users, category: "public" },
  { id: "admin", label: "Gestão", icon: LayoutDashboard, category: "admin" },
  { id: "pastoral", label: "Cuidado Pastoral", icon: Users, category: "admin" },
  { id: "events", label: "Eventos", icon: Calendar, category: "public" },
  { id: "finance", label: "Contribuições", icon: Gift, category: "member" },
  { id: "jornada", label: "A Jornada", icon: Gamepad2, category: "member" },
  { id: "units", label: "Unidades", icon: MapPin, category: "public" },
  { id: "pastors", label: "Pastores", icon: Users, category: "public" },
  { id: "social", label: "Social", icon: Heart, category: "public" },
  { id: "store", label: "Loja", icon: ShoppingBag, category: "public" },
  { id: "media", label: "Mídia", icon: Radio, category: "public" },
]

export function Layout({ children, activeTab, setActiveTab, isLoggedIn = true, userRole = 'leader', onLoginClick, onLogoutClick, userData }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  // Navigation Logic
  const getBottomNavItems = () => {
    if (!isLoggedIn) {
      return ["home", "cell", "events", "ministries", "social"]
    }
    const base = ["home", "cell", "school", "finance"]
    const last = (userRole === 'leader' || userRole === 'pastor' || userRole === 'admin') ? "admin" : "jornada"
    return [...base, last]
  }

  const getDesktopPrimaryItems = () => {
    if (!isLoggedIn) {
      return ["home", "cell", "events", "ministries", "social", "units", "store", "media"]
    }
    const adminItems = (userRole === 'pastor' || userRole === 'admin') ? ["admin", "pastoral"] : (userRole === 'leader' ? ["admin"] : [])
    return ["home", "cell", "school", "members", "ministries", "events", "finance", "jornada", ...adminItems]
  }

  const bottomNavIds = getBottomNavItems()
  const desktopPrimaryIds = getDesktopPrimaryItems()

  const primaryNav = navItems.filter(item => desktopPrimaryIds.includes(item.id))
  const secondaryNav = navItems.filter(item => !desktopPrimaryIds.includes(item.id) && (isLoggedIn || item.category === 'public'))

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-primary selection:text-black scroll-smooth">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-2xl">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 lg:gap-8">
            <motion.div 
              className="flex items-center gap-2 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab("home")}
            >
              <img src="/simbolob.png" alt="Coroado Icon" className="h-10 w-auto object-contain text-white" />
              <img src="/logomarcab.png" alt="Coroado" className="h-5 w-auto object-contain hidden lg:block mt-1 text-white" />
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
                      <AvatarImage src={userData?.photoURL || ""} alt={userData?.name || "User"} />
                      <AvatarFallback>{getInitials(userData?.name)}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-zinc-900 border-white/10 text-white" align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{userData?.name || 'Carregando...'}</p>
                          <p className="text-xs leading-none text-white/50">
                            {userData?.roles?.includes('admin') ? 'Administrador' : (userRole === 'pastor' ? 'Pastor' : (userRole === 'leader' ? 'Líder' : 'Membro'))}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem className="hover:bg-white/5 focus:bg-white/5 cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Perfil</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="hover:bg-white/5 focus:bg-white/5 cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Configurações</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
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
                      <img src="/simbolob.png" alt="Coroado Icon" className="h-6 w-auto object-contain text-white" />
                      <img src="/logomarcab.png" alt="Coroado" className="h-3 w-auto object-contain mt-0.5 text-white" />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                      <X className="h-6 w-6" />
                    </Button>
                  </div>
                  <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
                    {(() => {
                      const visibleItems = navItems.filter(item => isLoggedIn || item.category === 'public');
                      
                      const categories = [
                        { id: 'main', label: 'Principal', items: visibleItems.filter(i => ['home', 'jornada', 'events'].includes(i.id)) },
                        { id: 'igreja', label: 'Conexão & Igreja', items: visibleItems.filter(i => ['cell', 'members', 'ministries', 'pastoral'].includes(i.id)) },
                        { id: 'estudos', label: 'Crescimento', items: visibleItems.filter(i => ['school', 'finance', 'store'].includes(i.id)) },
                        { id: 'public', label: 'Institucional', items: visibleItems.filter(i => ['units', 'social', 'media'].includes(i.id)) },
                        { id: 'admin', label: 'Gestão', items: visibleItems.filter(i => ['admin'].includes(i.id)) }
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
                  <div className="p-6 border-t border-white/10">
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

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/10 bg-black/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 px-1">
          {navItems.filter(item => bottomNavIds.includes(item.id)).map((item) => {
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
