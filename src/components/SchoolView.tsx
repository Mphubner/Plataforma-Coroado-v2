import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { 
  Play, BookOpen, Award, Clock, Star, ChevronRight, ChevronLeft, 
  Search, Filter, Download, MessageSquare, CheckCircle2, Lock, 
  Unlock, FileText, Video, Headphones, CheckSquare, Settings,
  BarChart as BarChartIcon, Users, DollarSign, LayoutDashboard, Plus, MoreVertical,
  Share2, ArrowRight, Flame, Trophy, Target, Zap, ArrowLeft,
  ThumbsUp, HelpCircle, FileDown, Edit3, Shield, GraduationCap,
  AlertCircle, BookMarked, AlertTriangle, WifiOff, XCircle, Loader2, X
} from "lucide-react"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { db, auth } from "@/lib/firebase"
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { AdminQuizzes } from "./admin";
import { postJson } from '@/src/lib/api/http';
import {
  createCourse,
  createCourseLesson,
  createCourseModule,
  createLearningPath,
  updateLearningPathCourses,
} from '@/src/lib/services/schoolService';

// Simple Progress component
function Progress({ value, className }: { value: number, className?: string }) {
  return (
    <div className={`w-full bg-black rounded-full overflow-hidden ${className}`}>
      <div className="h-full bg-primary transition-all duration-500" style={{ width: `${value}%` }} />
    </div>
  )
}

function escapeCertificateText(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char] || char));
}

function downloadCertificateHtml(cert: { name: string; course: string; date: string; code: string }) {
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Certificado ${escapeCertificateText(cert.code)}</title>
  <style>
    body { margin: 0; font-family: Georgia, serif; background: #111; color: #111; }
    .page { width: 1120px; min-height: 760px; margin: 32px auto; background: #f8f4ea; border: 18px solid #c9a227; padding: 72px; box-sizing: border-box; text-align: center; }
    .eyebrow { letter-spacing: 0.28em; text-transform: uppercase; font: 700 13px Arial, sans-serif; color: #7c6518; }
    h1 { font-size: 72px; margin: 36px 0 16px; font-style: italic; }
    .body { font: 22px Arial, sans-serif; line-height: 1.7; max-width: 760px; margin: 0 auto; }
    .name { font-size: 44px; font-weight: 700; margin: 36px 0 12px; border-bottom: 2px solid #222; display: inline-block; padding: 0 48px 10px; }
    .course { font-weight: 700; color: #7c6518; }
    .footer { display: flex; justify-content: space-between; align-items: end; margin-top: 96px; font: 14px Arial, sans-serif; text-align: left; }
    .signature { border-top: 1px solid #222; padding-top: 10px; min-width: 260px; text-align: center; }
    @media print { body { background: white; } .page { margin: 0; width: auto; min-height: 95vh; } }
  </style>
</head>
<body>
  <main class="page">
    <div class="eyebrow">Igreja Coroado - Escola IDE</div>
    <h1>Certificado</h1>
    <p class="body">Certificamos que</p>
    <div class="name">${escapeCertificateText(cert.name)}</div>
    <p class="body">concluiu o curso <span class="course">${escapeCertificateText(cert.course)}</span>, conforme registros acadêmicos da plataforma.</p>
    <div class="footer">
      <div>
        <strong>Emissão:</strong> ${escapeCertificateText(cert.date)}<br />
        <strong>Código:</strong> ${escapeCertificateText(cert.code)}
      </div>
      <div class="signature">Coordenação Escola IDE</div>
    </div>
  </main>
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${cert.code}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

export function SchoolView({ userRole = [], isAdmin = false }: { userRole?: string[], isAdmin?: boolean }) {
  const [activeTab, setActiveTab] = React.useState("dashboard")
  const [selectedCourse, setSelectedCourse] = React.useState<any>(null)
  const [playCourse, setPlayCourse] = React.useState<boolean>(false)
  const [playLesson, setPlayLesson] = React.useState<any | null>(null)
  const [user, setUser] = React.useState<any>(null)
  const [isSubscribed, setIsSubscribed] = React.useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = React.useState(false)
  const [loadingSubscription, setLoadingSubscription] = React.useState(false)

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const docSnap = await getDoc(doc(db, "users", u.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setIsSubscribed(data.subscriptionStatus === 'active' || data.role?.includes('admin') || data.profileType === 'admin');
        }
      }
    })
    return () => unsub()
  }, [])

  const handleSubscribe = async () => {
    if (!user?.uid) return;
    setLoadingSubscription(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert("Sessao expirada. Entre novamente para assinar a Escola IDE.");
        return;
      }

      const data = await postJson<{ initPoint: string; subscriptionId: string; preapprovalId: string }>('/api/school/subscriptions', {
        planTitle: 'Escola IDE Premium',
        amount: 29.90,
      }, { token });
      
      if (data.initPoint) {
        window.location.href = data.initPoint;
        setShowSubscriptionModal(false);
      } else {
        alert("Erro ao gerar link de assinatura.");
      }
    } catch(e) {
      console.error(e);
      alert("Nao foi possivel gerar a assinatura agora. Nenhum acesso foi liberado sem confirmacao de pagamento.");
    } finally {
      setLoadingSubscription(false);
    }
  };

  if (selectedCourse && playCourse) {
    return <LessonPlayer course={selectedCourse} initialLesson={playLesson} user={user} isSubscribed={isSubscribed} onSubscribeClick={() => setShowSubscriptionModal(true)} onBack={() => { setPlayCourse(false); setPlayLesson(null) }} />
  }

  if (selectedCourse) {
    return <CourseDetails course={selectedCourse} onBack={() => setSelectedCourse(null)} onStartLesson={(lesson) => { setPlayLesson(lesson); setPlayCourse(true); }} user={user} isSubscribed={isSubscribed} onSubscribeClick={() => setShowSubscriptionModal(true)} />
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Escola Online</h1>
          <p className="text-white/60">A Jornada / Ensino</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold">Seu Progresso</p>
            <p className="text-xs text-white/40">Nível: Discípulo</p>
          </div>
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-white/10 flex items-center justify-center font-bold">
            40%
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <ScrollArea className="w-full whitespace-nowrap pb-4">
          <TabsList className="bg-zinc-900 border border-white/10 p-1 rounded-full inline-flex w-max">
            <TabsTrigger value="dashboard" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Início</TabsTrigger>
            <TabsTrigger value="catalog" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Catálogo</TabsTrigger>
            <TabsTrigger value="paths" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Trilhas</TabsTrigger>
            <TabsTrigger value="my-learning" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Meu Aprendizado</TabsTrigger>
            <TabsTrigger value="certificates" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Certificados</TabsTrigger>
            <TabsTrigger value="achievements" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Conquistas</TabsTrigger>
            {(isAdmin || userRole?.includes('teacher') || userRole?.includes('Pastor da Sede')) && (
              <TabsTrigger value="admin" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Gestão</TabsTrigger>
            )}
          </TabsList>
        </ScrollArea>
        
        <TabsContent value="dashboard">
          <SchoolDashboard onSelectCourse={setSelectedCourse} user={user} />
        </TabsContent>
        
        <TabsContent value="catalog">
          <SchoolCatalog onSelectCourse={setSelectedCourse} user={user} />
        </TabsContent>

        <TabsContent value="paths">
          <SchoolPaths user={user} />
        </TabsContent>

        <TabsContent value="my-learning">
          <SchoolMyLearning onSelectCourse={setSelectedCourse} user={user} />
        </TabsContent>

        <TabsContent value="certificates">
          <SchoolCertificates />
        </TabsContent>

        <TabsContent value="achievements">
          <SchoolAchievements />
        </TabsContent>

        <TabsContent value="admin">
          <SchoolAdmin />
        </TabsContent>
      </Tabs>

      {!isSubscribed && activeTab === 'dashboard' && (
        <div className="fixed bottom-24 right-6 z-50">
          <Button onClick={() => setShowSubscriptionModal(true)} className="bg-gradient-to-r from-primary to-primary/80 text-black font-black shadow-2xl rounded-full h-14 px-8 border border-white/20 hover:scale-105 transition-transform">
            <Star className="w-5 h-5 mr-2 fill-black" /> Assinar Escola IDE
          </Button>
        </div>
      )}

      {/* Subscription Modal */}
      <AnimatePresence>
        {showSubscriptionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSubscriptionModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md glass-card p-8 rounded-[2rem] space-y-6 text-center">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/50">
                <Star className="w-10 h-10 text-primary fill-primary" />
              </div>
              <h3 className="font-black font-serif italic text-3xl">Escola IDE Premium</h3>
              <p className="text-white/60">Tenha acesso ilimitado a todos os cursos, trilhas de formação e materiais complementares.</p>
              
              <div className="bg-black/50 border border-white/10 rounded-2xl p-6 text-left space-y-4">
                <div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /> <span className="text-sm">Acesso a todos os cursos</span></div>
                <div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /> <span className="text-sm">Certificados Ilimitados</span></div>
                <div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /> <span className="text-sm">Fórum de Dúvidas Direto com Professores</span></div>
              </div>

              <div className="pt-4">
                <p className="text-xs text-white/40 mb-2 uppercase tracking-widest font-bold">Plano Mensal</p>
                <p className="text-4xl font-black mb-6">R$ 29,90<span className="text-lg text-white/40 font-normal">/mês</span></p>
                
                <Button onClick={handleSubscribe} disabled={loadingSubscription} className="w-full h-14 bg-primary text-black font-bold text-lg rounded-full">
                  {loadingSubscription ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Assinar Agora"}
                </Button>
                <Button variant="ghost" onClick={() => setShowSubscriptionModal(false)} className="w-full mt-2 text-white/40 hover:text-white">Agora Não</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SchoolDashboard({ onSelectCourse, user }: { onSelectCourse: (course: any) => void, user?: any }) {
  const [currentCourse, setCurrentCourse] = React.useState<any>(null)
  
  React.useEffect(() => {
    if (!user?.uid) return;
    
    // Simplification for the current course. Fetch first enrollment.
    const enrollmentsQuery = query(collection(db, "enrollments"), where("userId", "==", user.uid));
    const unsub = onSnapshot(enrollmentsQuery, async (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const enrData = docSnap.data();
        // Load the course
        const courseRef = doc(db, "courses", enrData.courseId);
        const courseSnap = await getDoc(courseRef);
        if (courseSnap.exists()) {
          setCurrentCourse({
             id: courseSnap.id,
             ...courseSnap.data(),
             progress: enrData.progress,
             lesson: "Continuar de onde parou",
          });
        }
      } else {
        setCurrentCourse(null)
      }
    });
    
    return () => unsub();
  }, [user?.uid])

  return (
    <div className="space-y-8">
      {/* Header de Boas-Vindas */}
      <div className="flex items-center gap-4 bg-zinc-900 border border-white/10 p-6 rounded-[2rem]">
        <Avatar className="h-16 w-16 border-2 border-primary">
          <AvatarImage src={user?.photoURL || "https://i.pravatar.cc/150?img=11"} />
          <AvatarFallback>{user?.displayName?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Olá, {user?.displayName?.split(" ")[0] || "Aluno"}!</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="border-white/10">Estudante</Badge>
            <Badge className="bg-orange-500/20 text-orange-500 border-none"><Flame className="w-3 h-3 mr-1" /> 1 dia seguido</Badge>
          </div>
        </div>
      </div>

      {/* Card Continuar Estudando */}
      {currentCourse ? (
        <Card className="bg-zinc-900 border-white/10 overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/3 aspect-video relative group cursor-pointer" onClick={() => onSelectCourse(currentCourse)}>
              {currentCourse.img ? (
                <img src={currentCourse.img} alt="Curso" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                 <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                    <BookOpen className="w-10 h-10 text-white/20" />
                 </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" className="h-12 w-12 rounded-full bg-primary text-black scale-90 group-hover:scale-100 transition-transform">
                  <Play className="h-5 w-5 ml-1" />
                </Button>
              </div>
            </div>
            <div className="p-6 md:w-2/3 flex flex-col justify-center space-y-4">
              <div>
                <p className="text-sm text-white/60 font-medium">Continuar Estudando</p>
                <h3 className="text-2xl font-bold mt-1">{currentCourse.title}</h3>
                <p className="text-white/80 mt-1">{currentCourse.lesson}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Progresso do Curso</span>
                  <span className="font-bold">{currentCourse.progress || 0}%</span>
                </div>
                <Progress value={currentCourse.progress || 0} className="h-2" />
              </div>
              <div className="flex gap-4 pt-2">
                <Button className="bg-primary text-black font-bold" onClick={() => onSelectCourse(currentCourse)}>Continuar Aula</Button>
                <Button variant="outline" className="border-white/10" onClick={() => document.querySelector('button[value="my-learning"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}>Ver todos os meus cursos</Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="bg-zinc-900 border-dashed border-white/10 overflow-hidden">
          <div className="p-12 text-center space-y-4">
            <BookOpen className="w-12 h-12 text-white/20 mx-auto" />
            <div>
               <h3 className="text-xl font-bold">Nenhum curso em andamento</h3>
               <p className="text-white/60 mt-1">Inscreva-se em um curso para começar a estudar</p>
            </div>
            <Button onClick={() => document.querySelector('button[value="catalog"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}>Explorar Catálogo</Button>
          </div>
        </Card>
      )}

      {/* Resumo de Atividade */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Horas Assistidas", value: "24h", icon: Clock, color: "text-blue-400" },
          { label: "Cursos Concluídos", value: "3", icon: CheckCircle2, color: "text-green-400" },
          { label: "Média de Notas", value: "9.5", icon: Star, color: "text-yellow-400" },
          { label: "Badges", value: "8", icon: Award, color: "text-purple-400" },
        ].map((stat, i) => (
          <Card key={i} className="bg-zinc-900 border-white/10">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-xs text-white/60 uppercase tracking-wider font-bold">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trilhas Recomendadas */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">Recomendado para você em Louvor</h3>
          <Button variant="link" className="text-primary">Ver tudo</Button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-zinc-900 border-white/10 min-w-[300px] shrink-0 cursor-pointer hover:border-primary/50 transition-colors">
              <div className="aspect-video relative overflow-hidden rounded-t-xl">
                <img src={`https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop&sig=${i}`} alt="Trilha" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <Badge className="absolute bottom-3 left-3 bg-primary text-black border-none">Trilha</Badge>
              </div>
              <CardContent className="p-4">
                <h4 className="font-bold text-lg">Formação de Músicos</h4>
                <p className="text-sm text-white/60 mt-1">4 cursos • 0% concluído</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Próximas Aulas, Mural & Ranking */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Lock className="w-5 h-5 text-primary" /> Próximas Aulas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
              <div>
                <p className="font-bold text-sm">Aula 4 — Prática</p>
                <p className="text-xs text-white/60">Liderança de Célula</p>
              </div>
              <Badge variant="outline" className="border-primary/50 text-primary">Em 3 dias</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
              <div>
                <p className="font-bold text-sm">Aula 5 — Setlist</p>
                <p className="text-xs text-white/60">Liderança de Célula</p>
              </div>
              <Badge variant="outline" className="border-white/20 text-white/60">Em 10 dias</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Trophy className="w-5 h-5 text-yellow-500" /> Conquistas</CardTitle>
            <Button variant="link" className="text-xs text-primary p-0">Ver todas</Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 mt-2">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50" title="Primeiro Passo">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/50" title="Dedicado">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50" title="Estudioso">
                <BookOpen className="w-6 h-6 text-blue-500" />
              </div>
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 opacity-50" title="Mestre (Bloqueado)">
                <Lock className="w-5 h-5 text-white/40" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Users className="w-5 h-5 text-secondary" /> Ranking da Célula</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-secondary/10 border border-secondary/20 rounded-xl text-center">
              <p className="text-sm font-bold text-secondary">Você está em 2º na sua célula!</p>
            </div>
            <div className="space-y-3">
              {[
                { name: "Maria Costa", pts: "1.450 XP", pos: 1 },
                { name: "João (Você)", pts: "1.250 XP", pos: 2 },
                { name: "Pedro Oliveira", pts: "980 XP", pos: 3 },
              ].map((user, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`font-black text-sm ${user.pos === 1 ? 'text-yellow-500' : user.pos === 2 ? 'text-secondary' : 'text-white/40'}`}>{user.pos}º</span>
                    <Avatar className="w-8 h-8"><AvatarFallback>{user.name[0]}</AvatarFallback></Avatar>
                    <span className={`text-sm ${user.pos === 2 ? 'font-bold' : ''}`}>{user.name}</span>
                  </div>
                  <span className="text-xs font-mono text-white/60">{user.pts}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SchoolCatalog({ onSelectCourse, user }: { onSelectCourse: (course: any) => void, user?: any }) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [courses, setCourses] = React.useState<CourseData[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    if (!auth.currentUser) return;

    let unsubscribe = () => {};

    const loadCourses = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
        if (userDoc.exists()) {
          const tenantId = userDoc.data().tenantId;
          const q = query(
            collection(db, 'courses'), 
            where('tenantId', '==', tenantId),
            where('status', '==', 'Publicado')
          );
          
          unsubscribe = onSnapshot(q, (snapshot) => {
            const loaded: CourseData[] = [];
            snapshot.forEach(doc => {
              loaded.push({ id: doc.id, ...doc.data() } as CourseData);
            });
            setCourses(loaded);
            setIsLoading(false);
          });
        }
      } catch (error) {
        console.error("Error fetching catalog", error);
        setIsLoading(false);
      }
    };
    
    loadCourses();
    return () => unsubscribe();
  }, []);

  const filteredCourses = courses.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <Input 
            placeholder="Buscar cursos..." 
            className="pl-12 bg-zinc-900 border-white/10 rounded-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Buscar cursos"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-white/10 rounded-full" aria-label="Filtros"><Filter className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Filtros</span></Button>
          <select className="bg-zinc-900 border border-white/10 rounded-full px-4 text-sm outline-none focus:ring-1 focus:ring-primary" aria-label="Ordenar por">
            <option>Mais recentes</option>
            <option>Mais populares</option>
            <option>Maior avaliação</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse bg-zinc-900 rounded-xl h-64 border border-white/10" />
          ))}
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="bg-zinc-900 border-white/10 overflow-hidden group hover:border-primary/50 transition-all cursor-pointer focus-within:ring-2 focus-within:ring-primary" onClick={() => onSelectCourse(course)} tabIndex={0} role="button" aria-label={`Ver curso ${course.title}`}>
              <div className="aspect-video bg-zinc-800 relative overflow-hidden">
                {course.img ? (
                  <img src={course.img} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-500" aria-hidden="true" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center">
                     <BookOpen className="w-8 h-8 text-white/20" />
                   </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  <Badge className="bg-black/60 backdrop-blur-md border-white/10"><Video className="w-3 h-3 mr-1" aria-hidden="true"/> Vídeo</Badge>
                  <Badge className="bg-black/60 backdrop-blur-md border-white/10">{course.level}</Badge>
                </div>
              </div>
              <CardContent className="p-4 space-y-3">
                <Badge variant="outline" className="border-white/10 text-[10px] uppercase">{course.category}</Badge>
                <h3 className="font-bold text-lg leading-tight line-clamp-2">{course.title}</h3>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Avatar className="w-5 h-5"><AvatarFallback>ID</AvatarFallback></Avatar>
                  <span>Membro IDE</span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/40 pt-2 border-t border-white/5">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" aria-hidden="true" /> {course.duration}</span>
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" aria-hidden="true" /> 4.8</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 space-y-4 border border-dashed border-white/10 rounded-2xl">
          <Search className="w-12 h-12 text-white/20 mx-auto" />
          <div>
            <h3 className="font-bold text-lg">Nenhum curso encontrado</h3>
            <p className="text-white/60 text-sm">Tente ajustar seus filtros ou termo de busca.</p>
          </div>
          <Button variant="outline" className="border-white/10" onClick={() => setSearchQuery("")}>Limpar filtros</Button>
        </div>
      )}
    </div>
  )
}

function SchoolPaths({ user }: { user?: any }) {
  const [paths, setPaths] = React.useState<any[]>([]);
  const [tenantId, setTenantId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user?.uid) return;
    const fetchTenant = async () => {
      const uDoc = await getDoc(doc(db, 'users', user.uid));
      if (uDoc.exists()) setTenantId(uDoc.data().tenantId);
    };
    fetchTenant();
  }, [user?.uid]);

  React.useEffect(() => {
    if (!tenantId) return;
    const q = query(collection(db, 'paths'), where('tenantId', '==', tenantId));
    const unsub = onSnapshot(q, snap => {
      setPaths(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [tenantId]);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {paths.length > 0 ? paths.map((path) => (
          <Card key={path.id} className="bg-zinc-900 border-white/10 hover:border-primary/50 transition-colors cursor-pointer group">
            <div className="flex flex-col sm:flex-row h-full">
              <div className="sm:w-1/3 aspect-video sm:aspect-square bg-zinc-800 relative overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Target className="w-12 h-12 text-primary opacity-50" />
                </div>
              </div>
              <div className="p-6 sm:w-2/3 flex flex-col justify-center space-y-2">
                <Badge className="w-max bg-primary/20 text-primary border-none">{path.stage || "Geral"}</Badge>
                <h3 className="text-xl font-bold line-clamp-2">{path.title}</h3>
                <p className="text-sm text-white/60 line-clamp-2">{path.description}</p>
                <p className="text-xs font-bold text-white/40 pt-2 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {(path.courses || []).length} cursos nesta trilha
                </p>
              </div>
            </div>
          </Card>
        )) : (
          <div className="col-span-1 border border-dashed border-white/10 p-12 text-center rounded-2xl w-full text-white/40 md:col-span-2">
            Nenhuma trilha encontrada.
          </div>
        )}
      </div>
    </div>
  )
}

function SchoolMyLearning({ onSelectCourse, user }: { onSelectCourse: (course: any) => void, user?: any }) {
  const [enrollments, setEnrollments] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [courses, setCourses] = React.useState<any[]>([])

  React.useEffect(() => {
    if (!user?.uid) {
      setEnrollments([])
      setLoading(false)
      return
    }

    const enrollmentsQuery = query(collection(db, "enrollments"), where("userId", "==", user.uid))
    const unsubEnrollments = onSnapshot(enrollmentsQuery, (snapshot) => {
      const enrData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setEnrollments(enrData)
      setLoading(false)
    })

    const coursesQuery = query(collection(db, "courses"), where("status", "==", "published"))
    const unsubCourses = onSnapshot(coursesQuery, (snapshot) => {
      const cData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setCourses(cData)
    })

    return () => {
      unsubEnrollments()
      unsubCourses()
    }
  }, [user?.uid])

  const enrollmentsWithDetails = enrollments.map(enr => {
    const course = courses.find(c => c.id === enr.courseId)
    return { ...enr, course }
  }).filter(enr => enr.course)

  return (
    <div className="space-y-6">
      <Tabs defaultValue="in-progress" className="w-full">
        <TabsList className="bg-transparent border-b border-white/10 rounded-none w-full justify-start h-auto p-0 space-x-6">
          <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3">Todos</TabsTrigger>
          <TabsTrigger value="in-progress" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3">Em andamento</TabsTrigger>
          <TabsTrigger value="completed" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3">Concluídos</TabsTrigger>
          <TabsTrigger value="wishlist" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3">Lista de Desejos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="wishlist" className="pt-6">
          <div className="text-center py-12 space-y-4 border border-dashed border-white/10 rounded-2xl">
            <BookMarked className="w-12 h-12 text-white/20 mx-auto" />
            <div>
              <h3 className="font-bold text-lg">Sua lista está vazia</h3>
              <p className="text-white/60 text-sm">Explore o catálogo e adicione cursos que deseja fazer no futuro.</p>
            </div>
            <Button variant="outline" className="border-white/10">Explorar Catálogo</Button>
          </div>
        </TabsContent>

        <TabsContent value="in-progress" className="pt-6">
          {loading ? (
             <div className="flex items-center justify-center p-12">
               <Loader2 className="w-8 h-8 animate-spin text-white/20" />
             </div>
          ) : enrollmentsWithDetails.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {enrollmentsWithDetails.map(enr => (
                <Card key={enr.id} className="bg-zinc-900 border-white/10 overflow-hidden">
                  <div className="flex">
                    <div className="w-1/3 aspect-square relative">
                      {enr.course.img ? (
                        <img src={enr.course.img} alt={enr.course.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-white/20" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 w-2/3 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold line-clamp-1">{enr.course.title}</h3>
                        <p className="text-xs text-white/60 mt-1">Último acesso: recent</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-white/60">{enr.progress}% concluído</span>
                        </div>
                        <Progress value={enr.progress} className="h-1.5" />
                      </div>
                      <Button size="sm" className="w-full bg-primary text-black mt-2" onClick={() => onSelectCourse(enr.course)}>Continuar</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
             <div className="text-center py-12 space-y-4 border border-dashed border-white/10 rounded-2xl">
               <BookOpen className="w-12 h-12 text-white/20 mx-auto" />
               <div>
                 <h3 className="font-bold text-lg">Nenhum curso em andamento</h3>
                 <p className="text-white/60 text-sm">Inscreva-se em um curso para começar sua jornada de aprendizado.</p>
               </div>
               <Button variant="outline" className="border-white/10">Explorar Catálogo</Button>
             </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SchoolCertificates() {
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
        {[1, 2].map((i) => (
          <Card key={i} className="bg-zinc-900 border-white/10 text-center p-6 space-y-4 hover:border-primary/50 transition-colors">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Award className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h3 className="font-bold">Fundamentos da Fé</h3>
              <p className="text-xs text-white/60 mt-1">Concluído em 10 Mar 2026</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button size="sm" variant="outline" className="border-white/10"><FileDown className="w-4 h-4 mr-2" /> PDF</Button>
              <Button size="sm" variant="outline" className="border-white/10"><Share2 className="w-4 h-4" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function SchoolAchievements() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6 bg-zinc-900 border border-white/10 p-6 rounded-[2rem]">
        <div className="w-24 h-24 rounded-full border-4 border-primary flex items-center justify-center bg-black">
          <span className="text-2xl font-black text-primary">LVL 3</span>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold">Discípulo</h2>
              <p className="text-sm text-white/60">1.250 XP total</p>
            </div>
            <span className="text-xs font-bold text-primary">Faltam 250 XP para Líder</span>
          </div>
          <Progress value={80} className="h-3" />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold">Badges Conquistadas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
          <div className="bg-zinc-900 border border-white/10 p-4 rounded-2xl flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs font-bold">Primeiro Passo</span>
          </div>
          <div className="bg-zinc-900 border border-white/10 p-4 rounded-2xl flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Flame className="w-6 h-6 text-orange-500" />
            </div>
            <span className="text-xs font-bold">Dedicado</span>
          </div>
          <div className="bg-zinc-900 border border-white/10 p-4 rounded-2xl flex flex-col items-center text-center gap-2 opacity-50 grayscale">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-bold">Maratonista</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold">Histórico de XP</h3>
        <Card className="bg-zinc-900 border-white/10">
          <CardContent className="p-0">
            <div className="divide-y divide-white/10">
              {[
                { action: "Aula Concluída: Fundamentos da Adoração", xp: "+50 XP", date: "Hoje, 14:30", icon: Play },
                { action: "Quiz Aprovado: Módulo 1 (100%)", xp: "+100 XP", date: "Ontem, 20:15", icon: CheckSquare },
                { action: "Badge Desbloqueada: Dedicado", xp: "+200 XP", date: "Ontem, 20:15", icon: Flame },
                { action: "Dúvida Respondida no Fórum", xp: "+20 XP", date: "10 Abr 2026", icon: MessageSquare },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-white/60" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{item.action}</p>
                      <p className="text-xs text-white/40">{item.date}</p>
                    </div>
                  </div>
                  <span className="font-bold text-primary">{item.xp}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

type CourseData = {
  id: string;
  title: string;
  description: string;
  level: string;
  duration: string;
  img: string;
  status: string;
  category: string;
  students: number;
};

function AdminCourseDetails({ course, onBack, tenantId }: { course: CourseData, onBack: () => void, tenantId: string | null }) {
  const [modules, setModules] = React.useState<any[]>([]);
  const [lessons, setLessons] = React.useState<any[]>([]);
  const [showAddModule, setShowAddModule] = React.useState(false);
  const [showAddLesson, setShowAddLesson] = React.useState<string | null>(null); // moduleId
  const [newModuleTitle, setNewModuleTitle] = React.useState('');
  const [newLessonData, setNewLessonData] = React.useState({ title: '', videoUrl: '', isFree: false, description: '', standalonePrice: '' });

  React.useEffect(() => {
    if (!tenantId) return;

    // Fetch Modules
    const qm = query(collection(db, 'modules'), where('courseId', '==', course.id));
    const unsubM = onSnapshot(qm, (snapshot) => {
      setModules(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)).sort((a: any, b: any) => a.order - b.order));
    });

    // Fetch Lessons
    const ql = query(collection(db, 'lessons'), where('courseId', '==', course.id));
    const unsubL = onSnapshot(ql, (snapshot) => {
      setLessons(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)).sort((a: any, b: any) => a.order - b.order));
    });

    return () => { unsubM(); unsubL(); };
  }, [course.id, tenantId]);

  const handleAddModule = async () => {
    if (!newModuleTitle || !tenantId) return;
    try {
      await createCourseModule({
        title: newModuleTitle,
        courseId: course.id,
        tenantId,
        order: modules.length,
      });
      setShowAddModule(false);
      setNewModuleTitle('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddLesson = async (moduleId: string) => {
    if (!newLessonData.title || !tenantId) return;
    try {
      const moduleLessons = lessons.filter(l => l.moduleId === moduleId);
      await createCourseLesson({
        title: newLessonData.title,
        description: newLessonData.description,
        videoUrl: newLessonData.videoUrl,
        moduleId,
        courseId: course.id,
        tenantId,
        order: moduleLessons.length,
        isFree: newLessonData.isFree,
        standalonePrice: Number(newLessonData.standalonePrice) || 0,
      });
      setShowAddLesson(null);
      setNewLessonData({ title: '', videoUrl: '', isFree: false, description: '', standalonePrice: '' });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="text-white/60 hover:text-white p-0 h-auto">
          <ArrowLeft className="w-5 h-5 mr-2" /> Voltar
        </Button>
        <h2 className="text-2xl font-bold text-white flex-1">{course.title}</h2>
        <Button variant="outline" size="sm" onClick={() => window.open('https://classroom.google.com/', '_blank')} className="bg-[#1967d2] hover:bg-[#1967d2]/80 text-white border-none hidden md:flex">
          Vincular Google Classroom
        </Button>
        <Badge className={course.status === 'Publicado' ? 'bg-green-500/20 text-green-400 border-none' : 'bg-zinc-500/20 text-zinc-400 border-none'}>
          {course.status}
        </Badge>
      </div>

      <Card className="bg-zinc-900 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Módulos e Aulas</CardTitle>
            <CardDescription>Estruture as aulas do seu curso.</CardDescription>
          </div>
          <Button onClick={() => setShowAddModule(true)} size="sm" className="bg-white text-black hover:bg-white/90">
            <Plus className="w-4 h-4 mr-2" /> Adicionar Módulo
          </Button>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {modules.map((m, mIndex) => {
            const modLessons = lessons.filter(l => l.moduleId === m.id);
            return (
              <div key={m.id} className="border border-white/10 rounded-xl overflow-hidden">
                <div className="bg-black/20 p-4 flex items-center justify-between">
                  <h4 className="font-bold">Módulo {mIndex + 1}: {m.title}</h4>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddLesson(m.id)} className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10">
                    <Plus className="w-3 h-3 mr-1" /> Nova Aula
                  </Button>
                </div>
                <div className="divide-y divide-white/5">
                  {modLessons.length === 0 ? (
                    <div className="p-4 text-sm text-white/40 text-center">Nenhuma aula neste módulo.</div>
                  ) : (
                    modLessons.map((l, lIndex) => (
                      <div key={l.id} className="p-4 flex items-center justify-between hover:bg-white/5 group">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white/40">
                            {lIndex + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold flex items-center gap-2">
                              {l.title}
                              {l.isFree && <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary border-none">Grátis</Badge>}
                            </p>
                            <p className="text-xs text-white/40 flex items-center gap-1 mt-1">
                              <Video className="w-3 h-3" /> {l.videoUrl || 'Sem vídeo atribuído'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white"><Edit3 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}

          {modules.length === 0 && (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
              <p className="text-white/40 mb-4">Seu curso ainda não possui módulos.</p>
              <Button onClick={() => setShowAddModule(true)} variant="outline" className="border-white/10">Criar Primeiro Módulo</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Module Modal */}
      <AnimatePresence>
        {showAddModule && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModule(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm glass-card p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-lg">Novo Módulo</h3>
              <Input placeholder="Título do Módulo" value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} className="bg-black/50 border-white/10" />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setShowAddModule(false)}>Cancelar</Button>
                <Button onClick={handleAddModule} disabled={!newModuleTitle} className="bg-primary text-black">Adicionar</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Lesson Modal */}
      <AnimatePresence>
        {showAddLesson && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddLesson(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md glass-card p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-lg">Nova Aula</h3>
              <div className="space-y-3">
                <Input placeholder="Título da Aula" value={newLessonData.title} onChange={e => setNewLessonData({...newLessonData, title: e.target.value})} className="bg-black/50 border-white/10" />
                <Input placeholder="URL do Vídeo (Ex: YouTube, Vimeo...)" value={newLessonData.videoUrl} onChange={e => setNewLessonData({...newLessonData, videoUrl: e.target.value})} className="bg-black/50 border-white/10" />
                <textarea 
                  className="w-full bg-black/50 border border-white/10 rounded-md p-3 text-sm text-white resize-none h-24"
                  placeholder="Descrição da aula..."
                  value={newLessonData.description}
                  onChange={e => setNewLessonData({...newLessonData, description: e.target.value})}
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newLessonData.isFree} onChange={e => setNewLessonData({...newLessonData, isFree: e.target.checked})} className="accent-primary w-4 h-4" />
                  <span className="text-sm text-white/80">Aula gratuita (degustação)</span>
                </label>
                {!newLessonData.isFree && (
                  <div className="space-y-1">
                    <label className="text-xs text-white/60">Preço para compra avulsa (R$)</label>
                    <Input type="number" placeholder="0.00 (Deixe em branco se for apenas via assinatura)" value={newLessonData.standalonePrice} onChange={e => setNewLessonData({...newLessonData, standalonePrice: e.target.value})} className="bg-black/50 border-white/10" />
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" onClick={() => setShowAddLesson(null)}>Cancelar</Button>
                <Button onClick={() => handleAddLesson(showAddLesson)} disabled={!newLessonData.title} className="bg-primary text-black">Adicionar Aula</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

function SchoolAdmin() {
  const [courses, setCourses] = React.useState<CourseData[]>([]);
  const [paths, setPaths] = React.useState<any[]>([]);
  const [tenantId, setTenantId] = React.useState<string | null>(null);
  const [showAddCourse, setShowAddCourse] = React.useState(false);
  const [showAddPath, setShowAddPath] = React.useState(false);
  const [newCourse, setNewCourse] = React.useState({ title: '', category: 'Geral', status: 'Rascunho', isSubscriptionOnly: true, monthlyPrice: '', description: '', level: 'Básico' });
  const [newPath, setNewPath] = React.useState({ title: '', description: '', stage: 'Geral' });
  const [selectedCourseId, setSelectedCourseId] = React.useState<string | null>(null);
  const [selectedPathForCourses, setSelectedPathForCourses] = React.useState<string | null>(null);

  const [adminActiveTab, setAdminActiveTab] = React.useState("overview");
  const [showCertificatesModal, setShowCertificatesModal] = React.useState(false);

  const handleExportCoursesCSV = () => {
    if (courses.length === 0) return;
    const headers = ["ID Curso", "Titulo", "Categoria", "Status", "Alunos Matriculados"];
    const csvContent = [
      headers.join(","),
      ...courses.map(c => [
        `"${c.id || ''}"`,
        `"${c.title || ''}"`,
        `"${c.category || ''}"`,
        `"${c.status || ''}"`,
        `"${c.students || 0}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_cursos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  React.useEffect(() => {
    if (!auth.currentUser) return;
    const fetchTenant = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
        if (userDoc.exists()) {
          setTenantId(userDoc.data().tenantId);
        }
      } catch (error) {
        console.error("Error fetching user tenant:", error);
      }
    };
    fetchTenant();
  }, []);

  React.useEffect(() => {
    if (!tenantId || !auth.currentUser) return;
    
    const q = query(collection(db, 'courses'), where('tenantId', '==', tenantId));
    const unsubscribeTasks = onSnapshot(q, (snapshot) => {
      const loadedCourses: CourseData[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        loadedCourses.push({
          id: doc.id,
          title: data.title,
          description: data.description || '',
          level: data.level || 'Básico',
          duration: data.duration || '0h',
          img: data.img || '',
          status: data.status,
          category: data.category || 'Geral',
          students: data.students || 0
        });
      });
      setCourses(loadedCourses);
    }, (error) => {
      console.error("Error fetching courses", error);
    });

    const qPaths = query(collection(db, 'paths'), where('tenantId', '==', tenantId));
    const unsubscribePaths = onSnapshot(qPaths, (snapshot) => {
      setPaths(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching paths", error);
    });

    return () => { unsubscribeTasks(); unsubscribePaths(); };
  }, [tenantId]);

  const handleAddCourse = async () => {
    if (!tenantId || !auth.currentUser) return;
    if (!newCourse.title) return;
    
    try {
      await createCourse({
        title: newCourse.title,
        status: newCourse.status,
        category: newCourse.category,
        description: newCourse.description || '',
          level: newCourse.level || 'Básico',
          duration: '0h',
        img: '',
        students: 0,
        isSubscriptionOnly: newCourse.isSubscriptionOnly,
        monthlyPrice: Number(newCourse.monthlyPrice) || 0,
        tenantId: tenantId,
        createdBy: auth.currentUser.uid,
      });
      setShowAddCourse(false);
      setNewCourse({ title: '', category: 'Geral', status: 'Rascunho', isSubscriptionOnly: true, monthlyPrice: '', description: '', level: 'Básico' });
    } catch (error) {
      console.error("Error adding course", error);
    }
  };

  const handleAddPath = async () => {
    if (!tenantId || !newPath.title) return;
    try {
      await createLearningPath({
        title: newPath.title,
        description: newPath.description,
        stage: newPath.stage,
        courses: [],
        tenantId,
      });
      setShowAddPath(false);
      setNewPath({ title: '', description: '', stage: 'Geral' });
    } catch (e) {
      console.error("Error adding path", e);
    }
  };

  if (selectedCourseId) {
    const course = courses.find(c => c.id === selectedCourseId)
    if (course) {
      return <AdminCourseDetails course={course} onBack={() => setSelectedCourseId(null)} tenantId={tenantId} />
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={adminActiveTab} onValueChange={setAdminActiveTab} className="w-full">
        <ScrollArea className="w-full whitespace-nowrap pb-4">
          <TabsList className="bg-transparent border-b border-white/10 rounded-none w-full justify-start h-auto p-0 space-x-6">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3">Visão Geral</TabsTrigger>
            <TabsTrigger value="engagement" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3">Engajamento (Eclesiástico)</TabsTrigger>
            <TabsTrigger value="financial" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3">Financeiro</TabsTrigger>
            <TabsTrigger value="courses" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3">Gestão de Cursos</TabsTrigger>
            <TabsTrigger value="paths" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3">Gestão de Trilhas</TabsTrigger>
            <TabsTrigger value="quizzes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3">Quizzes</TabsTrigger>
            <TabsTrigger value="members" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3">Membros</TabsTrigger>
            <TabsTrigger value="support" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3">Suporte (Dúvidas)</TabsTrigger>
          </TabsList>
        </ScrollArea>

        <TabsContent value="overview" className="pt-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-zinc-900 border-white/10"><CardContent className="p-6"><p className="text-xs text-white/40 uppercase font-bold">Alunos Ativos</p><p className="text-3xl font-bold text-primary mt-2">1.240</p></CardContent></Card>
            <Card className="bg-zinc-900 border-white/10"><CardContent className="p-6"><p className="text-xs text-white/40 uppercase font-bold">Cursos Publicados</p><p className="text-3xl font-bold text-white mt-2">24</p></CardContent></Card>
            <Card className="bg-zinc-900 border-white/10"><CardContent className="p-6"><p className="text-xs text-white/40 uppercase font-bold">Taxa de Conclusão</p><p className="text-3xl font-bold text-secondary mt-2">68%</p></CardContent></Card>
            <Card className="bg-zinc-900 border-white/10"><CardContent className="p-6"><p className="text-xs text-white/40 uppercase font-bold">NPS da Plataforma</p><p className="text-3xl font-bold text-yellow-500 mt-2">9.2</p></CardContent></Card>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-zinc-900 border-white/10">
              <CardHeader><CardTitle>Alertas Prioritários</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="font-bold text-sm">Dúvidas sem resposta</p>
                      <p className="text-xs text-white/60">Mais de 48h aguardando professor</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/20">Responder</Button>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="font-bold text-sm">Alunos "esfriando"</p>
                      <p className="text-xs text-white/60">45 membros sem acesso há 15+ dias</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20">Notificar</Button>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="font-bold text-sm">Cursos com problemas</p>
                      <p className="text-xs text-white/60">Vídeo quebrado detectado em 1 curso</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20">Editar</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-white/10">
              <CardHeader><CardTitle>Ações Rápidas</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-white/10 hover:bg-white/5 hover:border-primary/50" onClick={() => setShowAddCourse(true)}>
                  <Plus className="w-6 h-6 text-primary" />
                  <span>Criar Curso</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-white/10 hover:bg-white/5 hover:border-primary/50" onClick={() => setAdminActiveTab("quizzes")}>
                  <FileText className="w-6 h-6 text-secondary" />
                  <span>Novo Quiz</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-white/10 hover:bg-white/5 hover:border-primary/50" onClick={() => setShowCertificatesModal(true)}>
                  <Award className="w-6 h-6 text-yellow-500" />
                  <span>Certificados</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-white/10 hover:bg-white/5 hover:border-primary/50" onClick={handleExportCoursesCSV}>
                  <Download className="w-6 h-6 text-blue-500" />
                  <span>Relatórios</span>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-zinc-900 border-white/10">
              <CardHeader><CardTitle>Matrículas (Últimos 30 dias)</CardTitle></CardHeader>
              <CardContent className="h-[250px] w-full">
                <ResponsiveContainer width="99%" height={250}>
                  <LineChart data={[{name: '01', val: 12}, {name: '05', val: 19}, {name: '10', val: 15}, {name: '15', val: 25}, {name: '20', val: 22}, {name: '25', val: 30}, {name: '30', val: 28}]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="val" stroke="#C0FF00" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-white/10">
              <CardHeader><CardTitle>Engajamento por Ministério</CardTitle></CardHeader>
              <CardContent className="h-[250px] flex items-center justify-center w-full">
                <ResponsiveContainer width="99%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Louvor', value: 400 },
                        { name: 'Células', value: 300 },
                        { name: 'Jovens', value: 300 },
                        { name: 'Kids', value: 200 },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#C0FF00" />
                      <Cell fill="#F5C207" />
                      <Cell fill="#3b82f6" />
                      <Cell fill="#8b5cf6" />
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="pt-6 space-y-6">
          <Card className="bg-zinc-900 border-white/10">
            <CardHeader>
              <CardTitle>Funil de Engajamento</CardTitle>
              <CardDescription>Distribuição dos membros da igreja na plataforma de ensino</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { level: "Sem acesso", desc: "Nunca acessou a plataforma", count: 350, pct: 100, color: "bg-zinc-700" },
                  { level: "Explorador", desc: "Acessou mas não matriculou", count: 210, pct: 60, color: "bg-zinc-500" },
                  { level: "Iniciante", desc: "Completou 1 curso", count: 145, pct: 41, color: "bg-blue-500" },
                  { level: "Ativo", desc: "De 2 a 9 cursos concluídos", count: 85, pct: 24, color: "bg-primary" },
                  { level: "Avançado", desc: "10+ cursos (Potenciais Líderes)", count: 32, pct: 9, color: "bg-secondary" },
                ].map((tier, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-32 shrink-0">
                      <p className="font-bold text-sm">{tier.level}</p>
                      <p className="text-[10px] text-white/40">{tier.desc}</p>
                    </div>
                    <div className="flex-1 h-8 bg-black rounded-r-full overflow-hidden flex items-center">
                      <div className={`h-full ${tier.color} flex items-center px-3`} style={{ width: `${tier.pct}%` }}>
                        <span className="text-xs font-bold text-black">{tier.count}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="shrink-0 text-white/40 hover:text-white">Ver lista</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="financial" className="pt-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-zinc-900 border-white/10"><CardContent className="p-6"><p className="text-xs text-white/40 uppercase font-bold">MRR (Receita Mensal)</p><p className="text-2xl font-bold text-primary mt-2">R$ 15.400</p></CardContent></Card>
            <Card className="bg-zinc-900 border-white/10"><CardContent className="p-6"><p className="text-xs text-white/40 uppercase font-bold">ARR (Receita Anual)</p><p className="text-2xl font-bold text-white mt-2">R$ 184.800</p></CardContent></Card>
            <Card className="bg-zinc-900 border-white/10"><CardContent className="p-6"><p className="text-xs text-white/40 uppercase font-bold">LTV Médio</p><p className="text-2xl font-bold text-white mt-2">R$ 450,00</p></CardContent></Card>
            <Card className="bg-zinc-900 border-white/10"><CardContent className="p-6"><p className="text-xs text-white/40 uppercase font-bold">Churn Rate</p><p className="text-2xl font-bold text-red-500 mt-2">2.5%</p></CardContent></Card>
          </div>
          <Card className="bg-zinc-900 border-white/10">
            <CardHeader><CardTitle>Transações Recentes</CardTitle></CardHeader>
            <CardContent>
              {/* Mobile View */}
              <div className="md:hidden space-y-4">
                {[
                  { date: "Hoje, 10:23", user: "João Silva", prod: "Assinatura Mensal", val: "R$ 49,90", status: "Pago", color: "text-green-500" },
                  { date: "Hoje, 09:15", user: "Maria Costa", prod: "Curso: Liderança", val: "R$ 97,00", status: "Pago", color: "text-green-500" },
                  { date: "Ontem, 18:40", user: "Pedro Alves", prod: "Assinatura Anual", val: "R$ 499,00", status: "Pendente", color: "text-yellow-500" },
                ].map((tx, i) => (
                  <div key={i} className="bg-black/30 p-4 rounded-lg border border-white/5 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold">{tx.user}</span>
                      <span className={`font-bold ${tx.color}`}>{tx.status}</span>
                    </div>
                    <div className="text-white/60 text-xs flex justify-between">
                      <span>{tx.prod}</span>
                      <span>{tx.date}</span>
                    </div>
                    <div className="text-right font-mono font-bold mt-2">{tx.val}</div>
                  </div>
                ))}
              </div>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-white/40 uppercase border-b border-white/10">
                    <tr><th className="pb-3 font-bold">Data</th><th className="pb-3 font-bold">Membro</th><th className="pb-3 font-bold">Produto</th><th className="pb-3 font-bold">Valor</th><th className="pb-3 font-bold">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      { date: "Hoje, 10:23", user: "João Silva", prod: "Assinatura Mensal", val: "R$ 49,90", status: "Pago", color: "text-green-500" },
                      { date: "Hoje, 09:15", user: "Maria Costa", prod: "Curso: Liderança", val: "R$ 97,00", status: "Pago", color: "text-green-500" },
                      { date: "Ontem, 18:40", user: "Pedro Alves", prod: "Assinatura Anual", val: "R$ 499,00", status: "Pendente", color: "text-yellow-500" },
                    ].map((tx, i) => (
                      <tr key={i} className="hover:bg-white/5">
                        <td className="py-3 text-white/60">{tx.date}</td>
                        <td className="py-3 font-bold">{tx.user}</td>
                        <td className="py-3">{tx.prod}</td>
                        <td className="py-3 font-mono">{tx.val}</td>
                        <td className={`py-3 font-bold ${tx.color}`}>{tx.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="pt-6 space-y-6">
          <div className="flex justify-between items-center">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input placeholder="Buscar cursos..." className="pl-9 bg-zinc-900 border-white/10" />
            </div>
            <Button className="bg-primary text-black" onClick={() => setShowAddCourse(true)}><Plus className="w-4 h-4 mr-2" /> Novo Curso</Button>
          </div>

          <Card className="bg-zinc-900 border-white/10">
            {/* Mobile View */}
            <div className="md:hidden p-4 space-y-4">
              {courses.length === 0 ? (
                <div className="text-center text-white/40 font-bold py-8">Nenhum curso cadastrado ainda.</div>
              ) : (
                courses.map(c => (
                  <div key={c.id} className="bg-black/30 p-4 rounded-lg border border-white/5 space-y-2 relative" onClick={() => setSelectedCourseId(c.id)}>
                    <div className="flex justify-between items-start">
                      <div className="font-bold pr-8">{c.title}</div>
                      <Badge className={`absolute top-4 right-4 ${c.status === 'Publicado' ? 'bg-green-500/20 text-green-400 border-none' : 'bg-zinc-500/20 text-zinc-400 border-none'}`}>{c.status}</Badge>
                    </div>
                    <div className="flex gap-2">
                       <Badge variant="outline" className="text-[10px] border-white/10">{c.category}</Badge>
                    </div>
                    <div className="text-sm pt-2 text-white/60">
                      <strong>{c.students}</strong> matrículas
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-white/40 uppercase border-b border-white/10 bg-black/20">
                  <tr><th className="p-4 font-bold">Curso</th><th className="p-4 font-bold">Categoria</th><th className="p-4 font-bold">Matrículas</th><th className="p-4 font-bold">Status</th><th className="p-4 font-bold"></th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {courses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-white/40 font-bold">
                        Nenhum curso cadastrado ainda.
                      </td>
                    </tr>
                  ) : (
                    courses.map((c) => (
                      <tr key={c.id} className="hover:bg-white/5 cursor-pointer" onClick={() => setSelectedCourseId(c.id)}>
                        <td className="p-4 font-bold">{c.title}</td>
                        <td className="p-4"><Badge variant="outline" className="border-white/10">{c.category}</Badge></td>
                        <td className="p-4">{c.students}</td>
                        <td className="p-4">
                          <Badge className={c.status === 'Publicado' ? 'bg-green-500/20 text-green-400 border-none' : 'bg-zinc-500/20 text-zinc-400 border-none'}>{c.status}</Badge>
                        </td>
                        <td className="p-4 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white" onClick={(e) => { e.stopPropagation(); setSelectedCourseId(c.id); }}><Edit3 className="w-4 h-4" /></Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <AnimatePresence>
          {showAddCourse && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowAddCourse(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md glass-card p-8 rounded-[2.5rem] space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-2xl font-black font-serif italic text-white">Novo Curso</h3>
                  <p className="text-sm text-white/60">Crie a base do curso para adicionar os módulos e aulas.</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Título do Curso</label>
                    <Input 
                      className="bg-zinc-900 border-white/10" 
                      placeholder="Ex: Treinamento de Líderes" 
                      value={newCourse.title}
                      onChange={e => setNewCourse({...newCourse, title: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">Descrição (Visível para Alunos)</label>
                      <textarea 
                        className="w-full bg-zinc-900 border border-white/10 rounded-md p-3 text-sm text-white resize-none h-20 outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Descreva o que será ensinado neste curso..."
                        value={newCourse.description}
                        onChange={e => setNewCourse({...newCourse, description: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase">Nível</label>
                        <select 
                          className="w-full h-10 bg-zinc-900 border border-white/10 rounded-md px-3 text-white"
                          value={newCourse.level}
                          onChange={e => setNewCourse({...newCourse, level: e.target.value})}
                        >
                          <option value="Básico">Básico</option>
                          <option value="Intermediário">Intermediário</option>
                          <option value="Avançado">Avançado</option>
                        </select>
                      </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">Categoria</label>
                      <select 
                        className="w-full h-10 bg-zinc-900 border border-white/10 rounded-md px-3 text-white"
                        value={newCourse.category}
                        onChange={e => setNewCourse({...newCourse, category: e.target.value})}
                      >
                        <option value="Geral">Geral</option>
                        <option value="Liderança">Liderança</option>
                        <option value="Ministérios">Ministérios</option>
                        <option value="Jovens">Jovens</option>
                        <option value="Kids">Kids</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">Status Inicial</label>
                      <select 
                        className="w-full h-10 bg-zinc-900 border border-white/10 rounded-md px-3 text-white"
                        value={newCourse.status}
                        onChange={e => setNewCourse({...newCourse, status: e.target.value})}
                      >
                        <option value="Rascunho">Rascunho</option>
                        <option value="Publicado">Publicado</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">Acesso Liberado Por</label>
                      <select 
                        className="w-full h-10 bg-zinc-900 border border-white/10 rounded-md px-3 text-white"
                        value={newCourse.isSubscriptionOnly ? 'true' : 'false'}
                        onChange={e => setNewCourse({...newCourse, isSubscriptionOnly: e.target.value === 'true'})}
                      >
                        <option value="true">Assinatura Mensal (Escola IDE)</option>
                        <option value="false">Curso à Parte / Pagamento Único</option>
                      </select>
                    </div>
                    {!newCourse.isSubscriptionOnly && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase">Preço de Venda Avulsa (R$)</label>
                        <Input type="number" placeholder="0.00 (Deixe 0 para Gratuito)" value={newCourse.monthlyPrice} onChange={e => setNewCourse({...newCourse, monthlyPrice: e.target.value})} className="bg-zinc-900 border-white/10" />
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 flex gap-2">
                    <Button variant="ghost" onClick={() => setShowAddCourse(false)} className="flex-1">Cancelar</Button>
                    <Button onClick={handleAddCourse} disabled={!newCourse.title} className="flex-1 bg-primary text-black font-bold">Criar Curso</Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <TabsContent value="paths" className="pt-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Gestão de Trilhas</h2>
            <Button className="bg-primary text-black" onClick={() => setShowAddPath(true)}><Plus className="w-4 h-4 mr-2" /> Nova Trilha</Button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {paths.map(path => (
              <Card key={path.id} className="bg-zinc-900 border-white/10">
                <CardHeader>
                  <div className="flex justify-between">
                    <Badge variant="outline" className="text-primary border-primary/20 bg-primary/10">{path.stage}</Badge>
                    <div className="flex gap-2">
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40"><Edit3 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <CardTitle className="mt-2">{path.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-white/60 mb-4">{path.description}</p>
                  <div className="space-y-2">
                    <p className="text-xs text-white/40 font-bold uppercase">Cursos vinculados ({(path.courses || []).length})</p>
                    <div className="flex flex-wrap gap-2">
                      {(path.courses || []).map((cid: string, i: number) => {
                        const c = courses.find(cc => cc.id === cid);
                        return c ? <Badge key={i} variant="outline" className="border-white/10 text-white/60 bg-white/5">{c.title}</Badge> : null;
                      })}
                      {(path.courses || []).length === 0 && <span className="text-xs text-white/20 italic">Vazio</span>}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-4 border-white/10 hover:bg-white/5" onClick={() => setSelectedPathForCourses(path.id)}>Vincular Curso</Button>
                </CardContent>
              </Card>
            ))}
            {paths.length === 0 && (
               <div className="col-span-2 text-center p-8 border border-dashed border-white/10 rounded-xl text-white/40">
                 Nenhuma trilha criada.
               </div>
            )}
          </div>
        </TabsContent>

        <AnimatePresence>
          {showAddPath && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddPath(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm glass-card p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-lg">Nova Trilha de Aprendizado</h3>
                <div className="space-y-3">
                  <Input placeholder="Título da Trilha" value={newPath.title} onChange={e => setNewPath({...newPath, title: e.target.value})} className="bg-black/50 border-white/10" />
                  <Input placeholder="Estágio (ex: Ganhar, Consolidar)" value={newPath.stage} onChange={e => setNewPath({...newPath, stage: e.target.value})} className="bg-black/50 border-white/10" />
                  <textarea 
                    className="w-full bg-black/50 border border-white/10 rounded-md p-3 text-sm text-white resize-none h-20"
                    placeholder="Descrição..."
                    value={newPath.description}
                    onChange={e => setNewPath({...newPath, description: e.target.value})}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setShowAddPath(false)}>Cancelar</Button>
                  <Button onClick={handleAddPath} disabled={!newPath.title} className="bg-primary text-black">Adicionar</Button>
                </div>
              </motion.div>
            </div>
          )}
          
          {selectedPathForCourses && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedPathForCourses(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md glass-card p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-lg">Vincular Cursos à Trilha</h3>
                <p className="text-sm text-white/60">Selecione os cursos que deseja adicionar à trilha.</p>
                
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                  {courses.map(course => {
                    const path = paths.find(p => p.id === selectedPathForCourses);
                    const isLinked = (path?.courses || []).includes(course.id);
                    
                    return (
                      <div key={course.id} className="flex items-center justify-between p-3 bg-black/50 border border-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-sm font-bold line-clamp-1">{course.title}</p>
                            <p className="text-xs text-white/40">{course.category}</p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant={isLinked ? "outline" : "default"}
                          className={isLinked ? "border-red-500/50 text-red-500 hover:bg-red-500/10" : "bg-primary text-black"}
                          onClick={async () => {
                            if (!path) return;
                            try {
                              let newCourses = [...(path.courses || [])];
                              if (isLinked) {
                                newCourses = newCourses.filter((id: string) => id !== course.id);
                              } else {
                                newCourses.push(course.id);
                              }
                              await updateLearningPathCourses(path.id, newCourses);
                            } catch(e) { console.error('Error updating path course:', e) }
                          }}
                        >
                          {isLinked ? 'Remover' : 'Adicionar'}
                        </Button>
                      </div>
                    )
                  })}
                  {courses.length === 0 && <p className="text-xs text-white/40 text-center py-4">Nenhum curso cadastrado ainda.</p>}
                </div>
                
                <div className="flex justify-end pt-2">
                  <Button className="bg-white/10 hover:bg-white/20 text-white" onClick={() => setSelectedPathForCourses(null)}>Concluído</Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <TabsContent value="quizzes" className="pt-6 space-y-6">
          <AdminQuizzes />
        </TabsContent>

        <TabsContent value="members" className="pt-6 space-y-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input placeholder="Buscar membros..." className="pl-9 bg-zinc-900 border-white/10" />
            </div>
            <Button variant="outline" className="border-white/10"><Filter className="w-4 h-4 mr-2" /> Filtros</Button>
          </div>
          <Card className="bg-zinc-900 border-white/10">
            {/* Mobile Cards */}
            <div className="grid grid-cols-1 gap-4 md:hidden p-4">
              {[
                { name: "João Silva", min: "Louvor", courses: "4 / 2", access: "Hoje", status: "active" },
                { name: "Maria Costa", min: "Jovens", courses: "2 / 0", access: "Há 2 dias", status: "active" },
                { name: "Pedro Alves", min: "Células", courses: "1 / 1", access: "Há 20 dias", status: "inactive" },
              ].map((m, i) => (
                <div key={i} className="bg-black/50 border border-white/5 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10"><AvatarFallback>{m.name[0]}</AvatarFallback></Avatar>
                      <span className="font-bold">{m.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">Ver Perfil</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-white/5 mt-2">
                    <div>
                      <p className="text-[10px] text-white/40 uppercase font-bold">Ministério</p>
                      <p className="text-white/80">{m.min}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 uppercase font-bold">Cursos</p>
                      <p className="text-white/80">{m.courses}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] text-white/40 uppercase font-bold">Último Acesso</p>
                      <span className={`text-sm flex items-center gap-2 ${m.status === 'inactive' ? 'text-red-400' : 'text-white/80'}`}>
                        <div className={`w-2 h-2 rounded-full ${m.status === 'inactive' ? 'bg-red-500' : 'bg-green-500'}`} />
                        {m.access}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-white/40 uppercase border-b border-white/10 bg-black/20">
                  <tr><th className="p-4 font-bold">Membro</th><th className="p-4 font-bold">Ministério</th><th className="p-4 font-bold">Cursos (Matr/Concl)</th><th className="p-4 font-bold">Último Acesso</th><th className="p-4 font-bold"></th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { name: "João Silva", min: "Louvor", courses: "4 / 2", access: "Hoje", status: "active" },
                    { name: "Maria Costa", min: "Jovens", courses: "2 / 0", access: "Há 2 dias", status: "active" },
                    { name: "Pedro Alves", min: "Células", courses: "1 / 1", access: "Há 20 dias", status: "inactive" },
                  ].map((m, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="p-4 flex items-center gap-3">
                        <Avatar className="w-8 h-8"><AvatarFallback>{m.name[0]}</AvatarFallback></Avatar>
                        <span className="font-bold">{m.name}</span>
                      </td>
                      <td className="p-4 text-white/60">{m.min}</td>
                      <td className="p-4">{m.courses}</td>
                      <td className="p-4">
                        <span className={`flex items-center gap-2 ${m.status === 'inactive' ? 'text-red-400' : 'text-white/80'}`}>
                          <div className={`w-2 h-2 rounded-full ${m.status === 'inactive' ? 'bg-red-500' : 'bg-green-500'}`} />
                          {m.access}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">Ver Perfil</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="support" className="pt-6 space-y-6">
          <Card className="bg-zinc-900 border-white/10">
            <CardHeader><CardTitle>Fila de Dúvidas (Fórum)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { student: "Maria Costa", course: "Liderança de Célula", lesson: "Aula 3 - Adoração", time: "Há 2 horas", text: "Como lidar quando ninguém na célula sabe tocar um instrumento?", urgent: false },
                  { student: "Pedro Alves", course: "Fundamentos da Fé", lesson: "Aula 1 - Salvação", time: "Há 2 dias", text: "Não entendi muito bem a diferença entre graça e misericórdia. Podem explicar melhor?", urgent: true },
                ].map((q, i) => (
                  <div key={i} className={`p-4 rounded-xl border ${q.urgent ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/10'} space-y-3`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8"><AvatarFallback>{q.student[0]}</AvatarFallback></Avatar>
                        <div>
                          <p className="font-bold text-sm">{q.student}</p>
                          <p className="text-xs text-white/60">{q.course} • {q.lesson}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={q.urgent ? 'border-red-500/50 text-red-400' : 'border-white/20 text-white/60'}>{q.time}</Badge>
                    </div>
                    <p className="text-sm text-white/80 pl-11">{q.text}</p>
                    <div className="pl-11 pt-2">
                      <Button size="sm" className="bg-primary text-black font-bold">Responder Aluno</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Certificados Emitidos (Admin) */}
      <AnimatePresence>
        {showCertificatesModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCertificatesModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-xl glass-card p-8 rounded-[2rem] space-y-6 flex flex-col max-h-[85vh]">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                  <h3 className="font-black font-serif italic text-2xl text-white flex items-center gap-2">
                    <Award className="w-6 h-6 text-primary" /> Certificados Emitidos
                  </h3>
                  <p className="text-xs text-white/40 font-bold uppercase tracking-wider mt-1">Lista de alunos graduados na Escola IDE</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowCertificatesModal(false)} className="rounded-full hover:bg-white/5">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {[
                  { name: "João Silva", course: "Fundamentos da Fé", date: "10 Mar 2026", code: "CERT-FF-2026-981" },
                  { name: "Maria Costa", course: "Liderança de Célula", date: "05 Abr 2026", code: "CERT-LC-2026-102" },
                  { name: "Carlos Eduardo", course: "Treinamento de Diáconos", date: "20 Mai 2026", code: "CERT-TD-2026-554" },
                  { name: "Ana Beatriz", course: "Fundamentos da Fé", date: "12 Jun 2026", code: "CERT-FF-2026-113" }
                ].map((cert, index) => (
                  <div key={index} className="p-4 bg-zinc-900 border border-white/10 rounded-2xl flex items-center justify-between hover:border-primary/30 transition-colors">
                    <div className="space-y-1">
                      <p className="font-bold text-white text-base">{cert.name}</p>
                      <p className="text-sm text-primary font-medium">{cert.course}</p>
                      <p className="text-[10px] text-white/40 font-mono">Código: {cert.code} • Emissão: {cert.date}</p>
                    </div>
                    <Button variant="outline" size="sm" className="border-white/10 hover:bg-primary hover:text-black font-bold" onClick={() => downloadCertificateHtml(cert)}>
                      <FileDown className="w-4 h-4 mr-2" /> HTML
                    </Button>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end">
                <Button onClick={() => setShowCertificatesModal(false)} className="bg-primary text-black font-bold px-6">Fechar</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- DETALHES DO CURSO ---
function CourseDetails({ course, onBack, onStartLesson, user, isSubscribed, onSubscribeClick }: { course: any, onBack: () => void, onStartLesson: (lesson: any, enrollment?: any) => void, user?: any, isSubscribed?: boolean, onSubscribeClick?: () => void }) {
  const [enrollment, setEnrollment] = React.useState<any>(null)
  const [enrolling, setEnrolling] = React.useState(false)
  const [purchasingCourse, setPurchasingCourse] = React.useState(false)
  const [modules, setModules] = React.useState<any[]>([]);
  const [lessons, setLessons] = React.useState<any[]>([]);
  const [expandedModule, setExpandedModule] = React.useState<string | null>(null);
  const [learningAccess, setLearningAccess] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!user?.uid || !course?.id) return;
    const q = query(collection(db, "enrollments"), where("userId", "==", user.uid), where("courseId", "==", course.id));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setEnrollment({ id: snap.docs[0].id, ...snap.docs[0].data() })
      } else {
        setEnrollment(null)
      }
    });

    const qm = query(collection(db, 'modules'), where('courseId', '==', course.id));
    const unsubM = onSnapshot(qm, (snap) => setModules(snap.docs.map(d => ({id: d.id, ...d.data()} as any)).sort((a: any,b: any) => a.order - b.order)));
    
    const ql = query(collection(db, 'lessons'), where('courseId', '==', course.id));
    const unsubL = onSnapshot(ql, (snap) => setLessons(snap.docs.map(d => ({id: d.id, ...d.data()} as any)).sort((a: any,b: any) => a.order - b.order)));

    return () => { unsub(); unsubM(); unsubL(); }
  }, [user?.uid, course?.id])

  React.useEffect(() => {
    if (!user?.uid) return;
    const accessQuery = query(collection(db, 'learning_access'), where('userId', '==', user.uid));
    const unsubAccess = onSnapshot(accessQuery, (snap) => {
      setLearningAccess(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubAccess();
  }, [user?.uid]);

  const hasAccessToLesson = React.useCallback((lesson: any) => {
    if (!lesson) return false;
    if (lesson.isFree || isSubscribed) return true;
    return learningAccess.some(access => (
      access.status === 'active' &&
      (
        (access.targetType === 'lesson' && access.targetId === lesson.id) ||
        (access.targetType === 'course' && (access.targetId === course.id || access.courseId === course.id))
      )
    ));
  }, [course?.id, isSubscribed, learningAccess]);

  const handleEnroll = async () => {
    if (!user?.uid || !course?.id) return;
    setEnrolling(true)
    try {
      const token = await user.getIdToken();
      await postJson('/api/school/enrollments', {
        courseId: course.id,
      }, { token });
    } catch (err) {
      console.error("Error signing up:", err)
    } finally {
      setEnrolling(false)
    }
  }

  const handleBuyCourse = async () => {
    if (!user?.uid || !course?.id) return;
    setPurchasingCourse(true);

    try {
      const token = await user.getIdToken();
      const data = await postJson<{ initPoint: string; orderId: string }>('/api/school/purchases', {
        targetType: 'course',
        targetId: course.id,
      }, { token });

      if (data.initPoint) {
        window.location.href = data.initPoint;
        return;
      }

      alert("Nao foi possivel iniciar o checkout do curso.");
    } catch (error) {
      console.error(error);
      alert("Nao foi possivel iniciar a compra avulsa do curso.");
    } finally {
      setPurchasingCourse(false);
    }
  }

  return (
    <div className="space-y-8 pb-20">
      <Button variant="ghost" onClick={onBack} className="mb-4 hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao catálogo</Button>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="lg:w-2/3 space-y-8">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge className="bg-primary/20 text-primary border-none">{course.category || "Geral"}</Badge>
              <Badge variant="outline" className="border-white/10">{course.level || "Básico"}</Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-black font-serif italic">{course.title || "Liderança de Célula"}</h1>
            <p className="text-xl text-white/60">{course.description || "Aprenda os fundamentos."}</p>
            
            <div className="flex flex-wrap gap-6 text-sm text-white/60 pt-4 items-center">
              <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-500" /> 4.8 (124 avaliações)</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {course.students || 0} alunos</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {course.duration || "12h"} totais</span>
              <Button onClick={() => window.open('https://chat.google.com/', '_blank')} variant="outline" size="sm" className="bg-zinc-800 text-white border-white/10 md:ml-auto">
                <MessageSquare className="w-4 h-4 mr-2"/> Networking (Google Chat)
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-bold">O que você vai aprender</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {["Fundamentos bíblicos da célula", "Como preparar um estudo", "Lidando com conflitos", "Multiplicação saudável"].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm text-white/80">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-bold">Pré-requisitos</h3>
            <Card className="bg-zinc-900 border-white/10 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500"/>
                </div>
                <div>
                  <p className="font-bold">Fundamentos da Fé</p>
                  <p className="text-xs text-white/60">Status: Concluído</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="border-white/10">Revisar</Button>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-bold">Currículo do Curso</h3>
            <div className="space-y-2">
              {modules.length === 0 ? (
                <div className="text-white/40 p-4 border border-dashed border-white/10 rounded-xl text-center">Nenhum módulo cadastrado.</div>
              ) : modules.map((mod, i) => {
                const modLessons = lessons.filter(l => l.moduleId === mod.id);
                const isExpanded = expandedModule === mod.id;
                return (
                  <Card key={mod.id} className="bg-zinc-900 border-white/10 overflow-hidden">
                    <CardHeader 
                      className="p-4 flex flex-row items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => setExpandedModule(isExpanded ? null : mod.id)}
                    >
                      <div>
                        <CardTitle className="text-lg">Módulo {i + 1}: {mod.title}</CardTitle>
                        <CardDescription className="text-xs mt-1">{modLessons.length} aulas</CardDescription>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-white/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </CardHeader>
                    {isExpanded && modLessons.length > 0 && (
                      <CardContent className="bg-black/20 p-0 border-t border-white/5">
                        <div className="divide-y divide-white/5">
                          {modLessons.map((lesson, lIndex) => {
                            const isCompleted = (enrollment?.completedLessons || []).includes(lesson.id);
                            const isLocked = !hasAccessToLesson(lesson);

                            return (
                              <div key={lesson.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => {
                                if (isLocked) {
                                  if (onSubscribeClick) onSubscribeClick();
                                } else {
                                  (enrollment ? onStartLesson(lesson) : handleEnroll())
                                }
                              }}>
                                <div className="flex items-center gap-3">
                                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${isCompleted ? 'bg-primary border-primary text-black' : 'border-white/20'}`}>
                                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : (isLocked ? <Lock className="w-3 h-3" /> : <span className="text-[10px] font-bold">{lIndex + 1}</span>)}
                                  </div>
                                  <div>
                                    <p className={`text-sm ${isCompleted ? 'text-white/60 line-through decoration-white/20' : 'text-white/90 group-hover:text-primary transition-colors'} ${isLocked ? 'text-white/40' : ''}`}>{lesson.title}</p>
                                    <p className="text-xs text-white/40 flex items-center gap-1 mt-1"><Video className="w-3 h-3" /> Vídeo {lesson.isFree ? '(Grátis)' : ''} {isLocked ? '(Premium)' : ''}</p>
                                  </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  {isLocked ? (
                                    <Button variant="ghost" size="sm" className="h-8 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10">Desbloquear</Button>
                                  ) : enrollment ? (
                                    <Button variant="ghost" size="sm" className="h-8 text-primary hover:text-primary hover:bg-primary/10">Assistir</Button>
                                  ) : (
                                    <Lock className="w-4 h-4 text-white/20" />
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-bold">Material de Apoio</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="bg-zinc-900 border-white/10 p-4 flex gap-4 items-center hover:bg-white/5 transition-colors cursor-pointer">
                <div className="w-12 h-16 bg-zinc-800 rounded flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6 text-white/40" />
                </div>
                <div>
                  <p className="font-bold text-sm line-clamp-2">Liderança com Propósito</p>
                  <p className="text-xs text-white/60 mt-1">Rick Warren</p>
                  <Badge variant="outline" className="mt-2 text-[10px] border-white/10">Amazon</Badge>
                </div>
              </Card>
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Sobre o Professor */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold">Sobre o Professor</h3>
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <Avatar className="w-24 h-24 border-2 border-white/10"><AvatarFallback>PR</AvatarFallback></Avatar>
              <div className="space-y-2">
                <h4 className="text-xl font-bold text-primary">Pr. João Silva</h4>
                <p className="text-sm text-white/80 leading-relaxed">Pastor de Louvor e Adoração na Igreja Coroado há 10 anos. Formado em Teologia e Música, tem paixão por treinar líderes que adoram em espírito e em verdade. Já formou mais de 500 líderes de célula.</p>
                <Button variant="link" className="text-primary p-0 h-auto">Ver outros cursos do professor</Button>
              </div>
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Avaliações */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">Avaliações dos Alunos</h3>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-5xl font-black text-yellow-500">4.8</p>
                <div className="flex text-yellow-500 mt-2">
                  <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current opacity-50" />
                </div>
                <p className="text-xs text-white/40 mt-1">124 avaliações</p>
              </div>
              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-2 text-white/60">{star}</span>
                    <Star className="w-3 h-3 text-white/40" />
                    <Progress value={star === 5 ? 80 : star === 4 ? 15 : star === 3 ? 5 : 0} className="h-1.5 flex-1 bg-white/5" />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4 pt-4">
              {[
                { name: "Carlos Eduardo", date: "há 2 semanas", text: "Curso excelente! Mudou completamente a forma como conduzo o louvor na minha célula. Muito prático e bíblico." },
                { name: "Ana Beatriz", date: "há 1 mês", text: "O Pr. João ensina com muita clareza. Os materiais em PDF são muito úteis para revisar com a equipe." }
              ].map((review, i) => (
                <div key={i} className="bg-zinc-900 border border-white/10 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8"><AvatarFallback>{review.name[0]}</AvatarFallback></Avatar>
                      <div>
                        <p className="font-bold text-sm">{review.name}</p>
                        <p className="text-xs text-white/40">{review.date}</p>
                      </div>
                    </div>
                    <div className="flex text-yellow-500">
                      <Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" />
                    </div>
                  </div>
                  <p className="text-sm text-white/80">{review.text}</p>
                </div>
              ))}
              <Button variant="outline" className="w-full border-white/10">Carregar mais avaliações</Button>
            </div>
          </div>
        </div>

        {/* Sidebar Sticky */}
        <div className="lg:w-1/3">
          <div className="sticky top-24 space-y-6">
            <Card className="bg-zinc-900 border-white/10 overflow-hidden">
              <div className="aspect-video relative">
                {course.img ? (
                  <img src={course.img} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <Video className="w-10 h-10 text-white/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Button size="icon" className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-primary hover:text-black transition-all">
                    <Play className="h-8 w-8 ml-1" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="text-3xl font-black text-primary">
                  {Number(course.standalonePrice || course.monthlyPrice || course.price || 0) > 0
                    ? `R$ ${Number(course.standalonePrice || course.monthlyPrice || course.price || 0).toFixed(2).replace('.', ',')}`
                    : 'Gratuito'}
                </div>
                <div className="space-y-3">
                  {enrollment ? (
                    <Button className="w-full h-12 bg-primary text-black font-bold text-lg" onClick={() => onStartLesson({ title: "Aula 1: Introdução" })}>
                      {enrollment.progress > 0 ? "Continuar Curso" : "Começar Agora"}
                    </Button>
                  ) : (
                    <Button 
                      className="w-full h-12 bg-primary text-black font-bold text-lg" 
                      onClick={handleEnroll} 
                      disabled={enrolling || !user?.uid || (course.isSubscriptionOnly !== false && !isSubscribed)}
                    >
                      {enrolling ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Inscrever-se"}
                    </Button>
                  )}
                  {course.isSubscriptionOnly === false && Number(course.standalonePrice || course.monthlyPrice || course.price || 0) > 0 && !learningAccess.some(a => a.targetId === course.id && a.status === 'active') && (
                    <Button
                      variant="outline"
                      className="w-full h-12 border-primary/40 text-primary hover:bg-primary/10"
                      onClick={handleBuyCourse}
                      disabled={purchasingCourse || !user?.uid}
                    >
                      {purchasingCourse ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : `Comprar curso à parte (R$ ${Number(course.standalonePrice || course.monthlyPrice || course.price || 0).toFixed(2).replace('.', ',')})`}
                    </Button>
                  )}
                  {course.isSubscriptionOnly !== false && !isSubscribed && (
                    <Button
                      variant="outline"
                      className="w-full h-12 border-yellow-500/40 text-yellow-500 hover:bg-yellow-500/10"
                      onClick={() => { if (onSubscribeClick) onSubscribeClick() }}
                    >
                      Assinar Escola IDE para Liberar
                    </Button>
                  )}
                  <Button variant="outline" className="w-full h-12 border-white/10">Adicionar à Lista</Button>
                </div>
                <div className="space-y-3 text-sm text-white/60 pt-4 border-t border-white/10">
                  <p className="font-bold text-white">Este curso inclui:</p>
                  <div className="flex items-center gap-2"><Video className="w-4 h-4" /> 12 horas de vídeo sob demanda</div>
                  <div className="flex items-center gap-2"><FileDown className="w-4 h-4" /> 5 recursos para download</div>
                  <div className="flex items-center gap-2"><Award className="w-4 h-4" /> Certificado de conclusão</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- SALA DE AULA (PLAYER) ---
function LessonPlayer({ course, initialLesson, onBack, user, isSubscribed, onSubscribeClick }: { course: any, initialLesson?: any, onBack: () => void, user: any, isSubscribed?: boolean, onSubscribeClick?: () => void }) {
  const [modules, setModules] = React.useState<any[]>([]);
  const [lessons, setLessons] = React.useState<any[]>([]);
  const [activeLesson, setActiveLesson] = React.useState<any | null>(initialLesson || null);
  const [enrollment, setEnrollment] = React.useState<any>(null);
  const [tenantId, setTenantId] = React.useState<string | null>(null);
  const [showBuyLessonModal, setShowBuyLessonModal] = React.useState(false);
  const [buyingLesson, setBuyingLesson] = React.useState(false);
  const [learningAccess, setLearningAccess] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!user?.uid || !course?.id) return;
    const fetchUser = async () => {
      const uDoc = await getDoc(doc(db, 'users', user.uid));
      if (uDoc.exists()) setTenantId(uDoc.data().tenantId);
    };
    fetchUser();
    
    const enrQ = query(collection(db, 'enrollments'), where('userId', '==', user.uid), where('courseId', '==', course.id));
    const unsubEnr = onSnapshot(enrQ, (snap) => {
      if (!snap.empty) setEnrollment({ id: snap.docs[0].id, ...snap.docs[0].data() });
    });
    return () => unsubEnr();
  }, [user?.uid, course?.id]);

  React.useEffect(() => {
    if (!user?.uid) return;
    const accessQuery = query(collection(db, 'learning_access'), where('userId', '==', user.uid));
    const unsubAccess = onSnapshot(accessQuery, (snap) => {
      setLearningAccess(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubAccess();
  }, [user?.uid]);

  React.useEffect(() => {
    if (!tenantId || !course?.id) return;
    const qm = query(collection(db, 'modules'), where('courseId', '==', course.id));
    const unsubM = onSnapshot(qm, (snap) => setModules(snap.docs.map(d => ({id: d.id, ...d.data()} as any)).sort((a: any,b: any) => a.order - b.order)));
    
    const ql = query(collection(db, 'lessons'), where('courseId', '==', course.id));
    const unsubL = onSnapshot(ql, (snap) => {
      const loadedL = snap.docs.map(d => ({id: d.id, ...d.data()} as any)).sort((a: any,b: any) => a.order - b.order);
      setLessons(loadedL);
      if (loadedL.length > 0 && !activeLesson) {
        const uncompleted = loadedL.find(l => !(enrollment?.completedLessons || []).includes(l.id));
        setActiveLesson(uncompleted || loadedL[0]);
      }
    });
    return () => { unsubM(); unsubL(); };
  }, [course?.id, tenantId, enrollment?.completedLessons, activeLesson]);

  const toggleLessonComplete = async (lessonId: string) => {
    if (!enrollment?.id) return;
    const isCompleted = (enrollment.completedLessons || []).includes(lessonId);
    const token = await auth.currentUser?.getIdToken();

    if (!token) {
      alert("Sessao expirada. Entre novamente para atualizar seu progresso.");
      return;
    }

    try {
      await postJson(`/api/school/enrollments/${enrollment.id}/progress`, {
        lessonId,
        completed: !isCompleted,
      }, { token });
    } catch (error) {
      console.error(error);
      alert("Nao foi possivel atualizar o progresso desta aula.");
    }
  };

  const hasAccessToLesson = React.useCallback((lesson: any) => {
    if (!lesson) return false;
    if (lesson.isFree || isSubscribed) return true;
    return learningAccess.some(access => (
      access.status === 'active' &&
      (
        (access.targetType === 'lesson' && access.targetId === lesson.id) ||
        (access.targetType === 'course' && (access.targetId === course.id || access.courseId === course.id))
      )
    ));
  }, [course?.id, isSubscribed, learningAccess]);

  const handleBuyActiveLesson = async () => {
    if (!activeLesson?.id) return;
    const token = await auth.currentUser?.getIdToken();

    if (!token) {
      alert("Sessao expirada. Entre novamente para comprar esta aula.");
      return;
    }

    setBuyingLesson(true);
    try {
      const data = await postJson<{ initPoint: string; orderId: string }>(
        '/api/school/purchases',
        { targetType: 'lesson', targetId: activeLesson.id },
        { token },
      );

      if (data.initPoint) {
        window.location.href = data.initPoint;
        return;
      }

      alert("Nao foi possivel iniciar o checkout desta aula.");
    } catch (error) {
      console.error(error);
      alert("Nao foi possivel iniciar a compra avulsa.");
    } finally {
      setBuyingLesson(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] -m-6 relative bg-zinc-950">
      {/* Sidebar / Modules Map */}
      <div className="w-80 border-r border-white/10 bg-black overflow-y-auto flex-shrink-0 flex flex-col">
        <div className="p-4 border-b border-white/10 sticky top-0 bg-black z-10 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white/60 hover:text-white shrink-0"><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex-1 truncate">
            <h3 className="font-bold text-sm truncate">{course.title}</h3>
            <p className="text-xs text-white/40">{enrollment?.progress || 0}% concluído</p>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {modules.map((m, mIndex) => {
            const modLessons = lessons.filter(l => l.moduleId === m.id);
            return (
              <div key={m.id} className="space-y-1">
                <h4 className="text-xs font-bold text-white/60 uppercase mb-2 mt-4 px-2">Módulo {mIndex + 1}: {m.title}</h4>
                {modLessons.map((l, lIndex) => {
                  const completed = (enrollment?.completedLessons || []).includes(l.id);
                  const isCurrent = activeLesson?.id === l.id;
                  const isLocked = !hasAccessToLesson(l);

                  return (
                    <button 
                      key={l.id}
                      onClick={() => {
                        if (isLocked) setShowBuyLessonModal(true);
                        else setActiveLesson(l);
                      }}
                      className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-colors outline-none focus:ring-2 focus:ring-primary ${isCurrent ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5 border border-transparent'}`}
                    >
                      <div onClick={(e) => { e.stopPropagation(); if (!isLocked) toggleLessonComplete(l.id); }} className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border flex items-center justify-center cursor-pointer transition-all ${completed ? 'bg-primary border-primary text-black' : 'border-white/20 hover:border-white/50'}`}>
                        {completed ? <CheckCircle2 className="w-3 h-3" /> : (isLocked ? <Lock className="w-3 h-3 text-white/40" /> : null)}
                      </div>
                      <div className="flex-1">
                         <p className={`text-sm ${isCurrent ? 'text-primary font-bold' : (isLocked ? 'text-white/40' : 'text-white/80')}`}>{lIndex + 1}. {l.title}</p>
                         <p className="text-xs text-white/40 flex items-center gap-1 mt-1"><Video className="w-3 h-3" /> Vídeo {l.isFree ? '(Grátis)' : ''} {isLocked ? '(Premium)' : ''}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
          {modules.length === 0 && (
            <div className="text-center p-4 text-white/40 text-sm">Este curso ainda não possui módulos.</div>
          )}
        </div>
      </div>

      {/* Main Content / Video Player */}
      <div className="flex-1 overflow-y-auto bg-[#0a0a0a] flex flex-col">
        {activeLesson ? (
          <div className="max-w-4xl mx-auto w-full p-6 space-y-6">
            <div className="aspect-video bg-black rounded-2xl border border-white/10 overflow-hidden relative flex items-center justify-center shadow-2xl">
              {activeLesson.videoUrl ? (
                <iframe 
                  src={activeLesson.videoUrl.replace('watch?v=', 'embed/').split('&')[0]} 
                  className="w-full h-full" 
                  title={activeLesson.title}
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                ></iframe>
              ) : (
                <div className="text-center">
                  <Video className="w-12 h-12 text-white/20 mx-auto mb-2" />
                  <p className="text-white/40">Vídeo não disponível</p>
                </div>
              )}
            </div>
            
            <div className="flex items-start justify-between gap-4 bg-zinc-900 border border-white/10 p-6 rounded-2xl">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">{activeLesson.title}</h2>
                <p className="text-sm text-white/70 leading-relaxed max-w-2xl">
                  {activeLesson.description || "Nenhuma descrição fornecida para esta aula."}
                </p>
              </div>
              <Button 
                onClick={() => toggleLessonComplete(activeLesson.id)}
                variant={(enrollment?.completedLessons || []).includes(activeLesson.id) ? "outline" : "default"}
                className={`shrink-0 h-10 px-6 rounded-full font-bold transition-all ${(enrollment?.completedLessons || []).includes(activeLesson.id) ? "text-primary border-primary/50 hover:bg-primary/10" : "bg-primary text-black hover:bg-primary/90"}`}
              >
                {(enrollment?.completedLessons || []).includes(activeLesson.id) ? (
                  <><CheckCircle2 className="w-4 h-4 mr-2" /> Concluída</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2 opacity-50" /> Marcar Concluída</>
                )}
              </Button>
            </div>
            
            {/* Additional content Tabs to keep the layout complete */}
            <Tabs defaultValue="materials" className="w-full mt-8">
              <TabsList className="bg-transparent border-b border-white/10 rounded-none w-full justify-start h-auto p-0 space-x-6">
                <TabsTrigger value="materials" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3">Materiais</TabsTrigger>
                <TabsTrigger value="qa" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3">Dúvidas (0)</TabsTrigger>
              </TabsList>
              <TabsContent value="materials" className="pt-6">
                <div className="grid gap-3">
                  <div className="p-4 bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-between group hover:bg-white/5 transition-colors cursor-pointer">
                    <div className="flex flex-row items-center gap-3">
                       <div className="w-10 h-10 rounded bg-red-500/20 text-red-500 flex items-center justify-center">
                         <FileText className="w-5 h-5" />
                       </div>
                       <div>
                         <p className="text-sm font-bold group-hover:text-primary transition-colors">Apostila da Aula - {activeLesson.title}</p>
                         <p className="text-xs text-white/40">PDF • 2.4 MB</p>
                       </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-white/40 hover:text-white"><Download className="w-4 h-4" /></Button>
                  </div>
                  <div className="p-4 bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-between group hover:bg-white/5 transition-colors cursor-pointer">
                    <div className="flex flex-row items-center gap-3">
                       <div className="w-10 h-10 rounded bg-blue-500/20 text-blue-500 flex items-center justify-center">
                         <FileText className="w-5 h-5" />
                       </div>
                       <div>
                         <p className="text-sm font-bold group-hover:text-primary transition-colors">Resumo em Slides</p>
                         <p className="text-xs text-white/40">Presentação • 5.1 MB</p>
                       </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-white/40 hover:text-white"><Download className="w-4 h-4" /></Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="qa" className="pt-6 space-y-6">
                <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex gap-3">
                  <Avatar className="w-10 h-10 border border-white/10 shrink-0"><AvatarFallback>EU</AvatarFallback></Avatar>
                  <div className="flex-1 space-y-3">
                    <textarea 
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white resize-none h-20 outline-none focus:border-primary/50"
                      placeholder="Ficou com alguma dúvida? Pergunte aqui..."
                    />
                    <div className="flex justify-end">
                      <Button className="bg-primary text-black" size="sm">Enviar Dúvida</Button>
                    </div>
                  </div>
                </div>
                <div className="p-8 border border-dashed border-white/10 rounded-xl text-white/40 text-sm text-center">
                  <MessageSquare className="w-8 h-8 mx-auto opacity-50 mb-2" />
                  Nenhuma dúvida registrada nesta aula ainda. Seja o primeiro!
                </div>
              </TabsContent>
            </Tabs>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/40 p-6">
            <Video className="w-16 h-16 opacity-20 mb-4" />
            <p>{lessons.length === 0 ? "Este curso ainda não possui aulas cadastradas pelo administrador." : "Selecione uma aula no menu lateral."}</p>
          </div>
        )}
      </div>

      {/* Modal de Comprar Aula Avulsa */}
      <AnimatePresence>
        {showBuyLessonModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBuyLessonModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm glass-card p-8 rounded-[2rem] space-y-6 text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto border border-primary/50 text-primary">
                <Lock className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-xl">Conteúdo Premium</h3>
                <p className="text-sm text-white/60 mt-2">Esta aula é exclusiva para assinantes da Escola IDE ou pode ser adquirida de forma avulsa.</p>
              </div>

              {buyingLesson ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                   <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
                   Preparando checkout seguro...
                </div>
              ) : (
                <div className="space-y-3">
                  <Button 
                    onClick={handleBuyActiveLesson}
                    className="w-full bg-primary text-black font-bold h-12"
                  >
                    Comprar Aula por R$ {Number(activeLesson?.standalonePrice || activeLesson?.price || 9.9).toFixed(2).replace('.', ',')}
                  </Button>
                  <div className="text-xs text-white/40 uppercase">Ou</div>
                  <Button variant="outline" className="w-full border-white/10 text-white/80 h-12" onClick={onSubscribeClick}>
                    Assinar Escola IDE
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SparklesIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  )
}

