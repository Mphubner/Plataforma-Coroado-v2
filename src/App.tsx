import * as React from "react"
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  MapPin, 
  BookOpen, 
  ShoppingBag, 
  ArrowRight,
  CheckCircle2,
  Clock,
  ChevronRight,
  Star,
  Plus,
  Filter,
  Search,
  Download,
  QrCode,
  Share2,
  MessageSquare,
  Heart,
  Gift,
  CheckSquare,
  DollarSign,
  UserPlus,
  Shield,
  Settings,
  Bell,
  X,
  Image as ImageIcon,
  Video,
  Paperclip,
  Youtube,
  Play,
  Link as LinkIcon,
  FileText,
  Check,
  ListTodo,
  User,
  MoreVertical,
  RefreshCw,
  Award,
  Sparkles,
  PlayCircle,
  Captions,
  AlertTriangle,
  CreditCard,
  Mail
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { Layout } from "./components/Layout"
import { HomeView } from "./components/HomeView"
import { AdminDashboardMetrics } from "./components/AdminDashboardMetrics"
import { AdminAutomations } from "./components/AdminAutomations"
import { AdminView } from "./components/AdminView"
import { JornadaView } from "./components/JornadaView"
import { PastorsView } from "./components/PastorsView"
import { SocialView } from "./components/SocialView"
import { UnitsView } from "./components/UnitsView"
import { SocialMediaView } from "./components/SocialMediaView"
import { CellView, CellProvider } from "./components/CellsView"
import { StoreView } from "./components/StoreView"
import { MinistriesView } from "./components/MinistriesView"
import { PastoralCareView } from "./components/PastoralCareView"
import { FinanceView } from "./components/FinanceView"
import { EventsView } from "./components/EventsView"
import { AuthView } from "./components/AuthView"
import { SchoolView } from "./components/SchoolView"
import { MembersView } from "./components/MembersView"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'

import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from "@/components/ui/carousel"

import QRCode from "react-qr-code"

export type QuizQuestion = { id: string; question: string; options: string[]; correctAnswerIndex: number; };
export type OpenQuestion = { id: string; question: string; rubric: string; };
export type Quiz = { id: string; questions: QuizQuestion[]; passingScore: number; openQuestions?: OpenQuestion[]; };
export type Lesson = { 
  id: string; title: string; videoId: string; duration: string; 
  quiz?: Quiz; 
  summary?: string; 
  transcript?: string; 
  subtitles?: { time: string; text: string }[]; 
};
export type Module = { id: string; title: string; lessons: Lesson[]; };
export type Course = {
  id: string; title: string; description: string; level: string; duration: string;
  students: number; img: string; modules: Module[]; professor: string;
  status: 'published' | 'draft'; category: string; learningOutcomes: string[];
  rating: number; price?: number;
};
export type Note = { id: string; courseId: string; lessonId: string; timestamp: number; text: string; };
export type ForumQuestion = { id: string; courseId: string; lessonId: string; user: string; text: string; answer?: string; isOfficial?: boolean; createdAt: string; };
export type Enrollment = {
  courseId: string; progress: number; completedLessons: string[];
  lastLessonId?: string; enrolledAt: string; finalGrade?: number; completedAt?: string;
  mistakes?: { lessonId: string; questionId: string; questionText: string }[];
};
export type Badge = { id: string; name: string; description: string; icon: string; earnedAt: string; };
export type CourseRecommendation = { id: string; courseId: string; memberId: string; recommendedBy: string; date: string; };
export type LearningTrack = { id: string; title: string; description: string; courseIds: string[]; };
export type Plan = { id: string; name: string; price: number; interval: 'monthly' | 'yearly'; features: string[]; type: 'individual' | 'family' };
export type Transaction = { id: string; userId: string; amount: number; type: 'course' | 'subscription'; itemId: string; status: 'completed' | 'pending'; date: string; method: 'pix' | 'card' };
export type Coupon = { id: string; code: string; discountPercent: number; active: boolean };
export type AutomationRule = { id: string; name: string; trigger: string; action: string; active: boolean };



export function AdminJornadaTab() {
  const { tracks, courses, addTrack } = useSchool();
  const [isCreating, setIsCreating] = React.useState(false);
  const [newTrack, setNewTrack] = React.useState<LearningTrack>({ id: '', title: '', description: '', courseIds: [] });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Trilhas de Aprendizado (A Jornada)</h2>
          <p className="text-white/60">Crie e gerencie caminhos sequenciais de desenvolvimento.</p>
        </div>
        <Button className="bg-primary text-black" onClick={() => {
          setNewTrack({ id: `t${Date.now()}`, title: '', description: '', courseIds: [] });
          setIsCreating(true);
        }}>
          <Plus className="mr-2 h-4 w-4" /> Nova Trilha
        </Button>
      </div>

      {isCreating && (
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader>
            <CardTitle>Criar Nova Trilha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">Título da Trilha</label>
              <Input 
                value={newTrack.title} 
                onChange={e => setNewTrack({...newTrack, title: e.target.value})} 
                className="bg-black border-white/10" 
                placeholder="Ex: Trilha de Liderança"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">Descrição</label>
              <textarea 
                value={newTrack.description} 
                onChange={e => setNewTrack({...newTrack, description: e.target.value})} 
                className="w-full bg-black border border-white/10 rounded-md p-3 text-sm min-h-[100px]" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">Cursos da Trilha (Selecione na ordem)</label>
              <div className="grid gap-2">
                {courses.map(course => (
                  <div key={course.id} className="flex items-center gap-2 p-2 rounded bg-white/5 border border-white/10">
                    <input 
                      type="checkbox" 
                      checked={newTrack.courseIds.includes(course.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewTrack({...newTrack, courseIds: [...newTrack.courseIds, course.id]});
                        } else {
                          setNewTrack({...newTrack, courseIds: newTrack.courseIds.filter(id => id !== course.id)});
                        }
                      }}
                    />
                    <span className="text-sm">{course.title}</span>
                    {newTrack.courseIds.includes(course.id) && (
                      <Badge className="ml-auto bg-primary/20 text-primary border-none">
                        Passo {newTrack.courseIds.indexOf(course.id) + 1}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreating(false)}>Cancelar</Button>
              <Button className="bg-primary text-black" onClick={() => {
                if (newTrack.title && newTrack.courseIds.length > 0) {
                  addTrack(newTrack);
                  setIsCreating(false);
                }
              }}>Salvar Trilha</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {tracks.map(track => (
          <Card key={track.id} className="bg-zinc-900 border-white/10">
            <CardHeader>
              <CardTitle className="text-xl text-primary">{track.title}</CardTitle>
              <CardDescription>{track.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                {track.courseIds.map((courseId, index) => {
                  const course = courses.find(c => c.id === courseId);
                  if (!course) return null;
                  return (
                    <div key={courseId} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white/20 bg-zinc-900 text-white/60 group-[.is-active]:bg-primary group-[.is-active]:text-black group-[.is-active]:border-primary shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/10 bg-white/5 shadow-sm">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div className="font-bold text-white">{course.title}</div>
                        </div>
                        <div className="text-xs text-white/60">{course.category}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AdminSchoolTab() {
  const [activeTab, setActiveTab] = React.useState("courses");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="bg-zinc-900 border border-white/10 p-1 rounded-full">
        <TabsTrigger value="courses" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Cursos</TabsTrigger>
        <TabsTrigger value="quizzes" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Quizzes</TabsTrigger>
        <TabsTrigger value="support" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Central de Suporte</TabsTrigger>
        <TabsTrigger value="finance" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Financeiro</TabsTrigger>
        <TabsTrigger value="automations" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Notificações</TabsTrigger>
      </TabsList>
      
      <TabsContent value="courses" className="space-y-6">
        <AdminCourses />
      </TabsContent>
      <TabsContent value="quizzes" className="space-y-6">
        <AdminQuizzes />
      </TabsContent>
      <TabsContent value="support" className="space-y-6">
        <AdminSupport />
      </TabsContent>
      <TabsContent value="finance" className="space-y-6">
        <AdminFinance />
      </TabsContent>
      <TabsContent value="automations" className="space-y-6">
        <AdminAutomations />
      </TabsContent>
    </Tabs>
  );
}

function AdminFinance() {
  const transactions: any[] = [];
  const plans: any[] = [];
  const coupons: any[] = [];
  const mrr = transactions.filter(t => t.type === 'subscription').reduce((acc, t) => acc + t.amount, 0);
  const totalRevenue = transactions.reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Financeiro</h2>
          <p className="text-white/60">Acompanhamento de MRR, assinaturas e vendas avulsas.</p>
        </div>
        <Button className="bg-primary text-black"><Plus className="mr-2 h-4 w-4" /> Novo Plano</Button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-white/10">
          <CardContent className="p-6">
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2">MRR (Receita Recorrente)</p>
            <p className="text-3xl font-bold tracking-tight text-primary">R$ {mrr.toFixed(2).replace('.', ',')}</p>
            <p className="text-xs text-green-400 mt-2 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> +12% este mês</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardContent className="p-6">
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2">Receita Total</p>
            <p className="text-3xl font-bold tracking-tight text-white">R$ {totalRevenue.toFixed(2).replace('.', ',')}</p>
            <p className="text-xs text-white/60 mt-2">Vendas de cursos e planos</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardContent className="p-6">
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2">Assinantes Ativos</p>
            <p className="text-3xl font-bold tracking-tight text-secondary">42</p>
            <p className="text-xs text-white/60 mt-2">Churn: 2.5%</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardContent className="p-6">
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2">LTV Médio</p>
            <p className="text-3xl font-bold tracking-tight text-white">R$ 350,00</p>
            <p className="text-xs text-white/60 mt-2">Tempo médio: 12 meses</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader>
            <CardTitle>Planos de Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {plans.map(plan => (
              <div key={plan.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
                <div>
                  <h4 className="font-bold">{plan.name}</h4>
                  <p className="text-xs text-white/60">{plan.interval === 'monthly' ? 'Mensal' : 'Anual'} • {plan.type === 'individual' ? 'Individual' : 'Família'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">R$ {plan.price.toFixed(2).replace('.', ',')}</p>
                  <Button variant="ghost" size="sm" className="text-xs h-6 mt-1 text-white/40 hover:text-white">Editar</Button>
                </div>
              </div>
            ))}
            {plans.length === 0 && <div className="text-sm text-white/40">Nenhum plano cadastrado.</div>}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10">
          <CardHeader>
            <CardTitle>Transações Recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {transactions.map(tx => (
              <div key={tx.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.method === 'pix' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {tx.method === 'pix' ? <CheckSquare className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{tx.type === 'subscription' ? 'Assinatura' : 'Curso Avulso'}</p>
                    <p className="text-xs text-white/60">{new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="font-bold">R$ {tx.amount.toFixed(2).replace('.', ',')}</p>
                   <p className={`text-[10px] uppercase font-bold ${tx.status === 'success' ? 'text-green-400' : 'text-yellow-400'}`}>{tx.status}</p>
                </div>
              </div>
            ))}
            {transactions.length === 0 && <div className="text-sm text-white/40">Nenhuma transação recente.</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AdminCourses() {
  const { courses, addCourse, updateCourse, deleteCourse } = useSchool();
  const [editingCourse, setEditingCourse] = React.useState<Course | null>(null);
  const [editingLesson, setEditingLesson] = React.useState<{ moduleId: string, lesson: Lesson } | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = React.useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCourse) {
      if (courses.find(c => c.id === editingCourse.id)) {
        updateCourse(editingCourse);
      } else {
        addCourse(editingCourse);
      }
      setEditingCourse(null);
    }
  };

  const handleNewCourse = () => {
    setEditingCourse({
      id: `c${Date.now()}`,
      title: "Novo Curso",
      description: "",
      level: "Iniciante",
      duration: "0h",
      students: 0,
      img: "https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?q=80&w=600&auto=format&fit=crop",
      professor: "",
      status: "draft",
      category: "Geral",
      learningOutcomes: [],
      rating: 0,
      modules: []
    });
  };

  const handleSaveLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCourse && editingLesson) {
      const updatedModules = editingCourse.modules.map(m => {
        if (m.id === editingLesson.moduleId) {
          const lessonExists = m.lessons.find(l => l.id === editingLesson.lesson.id);
          if (lessonExists) {
            return { ...m, lessons: m.lessons.map(l => l.id === editingLesson.lesson.id ? editingLesson.lesson : l) };
          } else {
            return { ...m, lessons: [...m.lessons, editingLesson.lesson] };
          }
        }
        return m;
      });
      setEditingCourse({ ...editingCourse, modules: updatedModules });
      setEditingLesson(null);
    }
  };

  const generateAIContent = async () => {
    if (!editingLesson) return;
    setIsGeneratingAI(true);
    // Simulate AI processing (Whisper + Gemini)
    setTimeout(() => {
      setEditingLesson({
        ...editingLesson,
        lesson: {
          ...editingLesson.lesson,
          summary: `Resumo gerado por IA para a aula "${editingLesson.lesson.title}". Esta aula aborda os principais conceitos e práticas essenciais para o desenvolvimento do aluno neste módulo.`,
          transcript: `[00:00] Olá, bem-vindos a mais uma aula.\n[00:05] Hoje vamos falar sobre ${editingLesson.lesson.title}.\n[00:15] É muito importante prestar atenção aos detalhes...`,
          subtitles: [
            { time: "0:00", text: "Olá, bem-vindos a mais uma aula." },
            { time: "0:05", text: `Hoje vamos falar sobre ${editingLesson.lesson.title}.` },
            { time: "0:15", text: "É muito importante prestar atenção aos detalhes..." }
          ]
        }
      });
      setIsGeneratingAI(false);
    }, 2000);
  };

  if (editingLesson) {
    return (
      <Card className="bg-zinc-900 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Editar Aula</CardTitle>
            <CardDescription>Configure o vídeo e os recursos da aula.</CardDescription>
          </div>
          <Button variant="ghost" onClick={() => setEditingLesson(null)}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveLesson} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">Título da Aula</label>
                <Input value={editingLesson.lesson.title} onChange={e => setEditingLesson({...editingLesson, lesson: {...editingLesson.lesson, title: e.target.value}})} className="bg-black border-white/10" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">ID do Vídeo (YouTube)</label>
                <Input value={editingLesson.lesson.videoId} onChange={e => setEditingLesson({...editingLesson, lesson: {...editingLesson.lesson, videoId: e.target.value}})} className="bg-black border-white/10" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Duração (ex: 15:00)</label>
                <Input value={editingLesson.lesson.duration} onChange={e => setEditingLesson({...editingLesson, lesson: {...editingLesson.lesson, duration: e.target.value}})} className="bg-black border-white/10" required />
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Recursos de IA</h4>
                <Button type="button" variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={generateAIContent} disabled={isGeneratingAI}>
                  {isGeneratingAI ? 'Processando...' : 'Gerar Transcrição e Resumo (Whisper)'}
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold">Resumo Inteligente</label>
                  <textarea 
                    value={editingLesson.lesson.summary || ''} 
                    onChange={e => setEditingLesson({...editingLesson, lesson: {...editingLesson.lesson, summary: e.target.value}})} 
                    className="w-full min-h-[80px] p-3 rounded-md bg-black border border-white/10 text-sm" 
                    placeholder="Resumo gerado por IA..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">Transcrição</label>
                  <textarea 
                    value={editingLesson.lesson.transcript || ''} 
                    onChange={e => setEditingLesson({...editingLesson, lesson: {...editingLesson.lesson, transcript: e.target.value}})} 
                    className="w-full min-h-[100px] p-3 rounded-md bg-black border border-white/10 text-sm font-mono" 
                    placeholder="Transcrição do vídeo..."
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" className="border-white/10" onClick={() => setEditingLesson(null)}>Cancelar</Button>
              <Button type="submit" className="bg-primary text-black">Salvar Aula</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (editingCourse) {
    return (
      <Card className="bg-zinc-900 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{courses.find(c => c.id === editingCourse.id) ? "Editar Curso" : "Novo Curso"}</CardTitle>
            <CardDescription>Preencha os detalhes do curso.</CardDescription>
          </div>
          <Button variant="ghost" onClick={() => setEditingCourse(null)}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">Título</label>
                <Input value={editingCourse.title} onChange={e => setEditingCourse({...editingCourse, title: e.target.value})} className="bg-black border-white/10" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Professor</label>
                <Input value={editingCourse.professor} onChange={e => setEditingCourse({...editingCourse, professor: e.target.value})} className="bg-black border-white/10" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Categoria</label>
                <Input value={editingCourse.category} onChange={e => setEditingCourse({...editingCourse, category: e.target.value})} className="bg-black border-white/10" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Nível</label>
                <Input value={editingCourse.level} onChange={e => setEditingCourse({...editingCourse, level: e.target.value})} className="bg-black border-white/10" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Duração</label>
                <Input value={editingCourse.duration} onChange={e => setEditingCourse({...editingCourse, duration: e.target.value})} className="bg-black border-white/10" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Status</label>
                <select 
                  value={editingCourse.status} 
                  onChange={e => setEditingCourse({...editingCourse, status: e.target.value as 'published' | 'draft'})}
                  className="w-full h-10 px-3 rounded-md bg-black border border-white/10 text-sm"
                >
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">URL da Imagem</label>
              <Input value={editingCourse.img} onChange={e => setEditingCourse({...editingCourse, img: e.target.value})} className="bg-black border-white/10" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">Descrição</label>
              <textarea 
                value={editingCourse.description} 
                onChange={e => setEditingCourse({...editingCourse, description: e.target.value})} 
                className="w-full min-h-[100px] p-3 rounded-md bg-black border border-white/10 text-sm" 
                required 
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Módulos e Aulas</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  const newModuleId = `m${Date.now()}`;
                  setEditingCourse({...editingCourse, modules: [...editingCourse.modules, { id: newModuleId, title: "Novo Módulo", lessons: [] }]});
                }}>Adicionar Módulo</Button>
              </div>
              
              <div className="space-y-4">
                {editingCourse.modules.map((mod, mIdx) => (
                  <div key={mod.id} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <Input 
                        value={mod.title} 
                        onChange={e => {
                          const newModules = [...editingCourse.modules];
                          newModules[mIdx].title = e.target.value;
                          setEditingCourse({...editingCourse, modules: newModules});
                        }} 
                        className="bg-black border-white/10 max-w-[300px]" 
                      />
                      <Button type="button" variant="ghost" size="sm" className="text-primary hover:text-primary/80" onClick={() => {
                        setEditingLesson({
                          moduleId: mod.id,
                          lesson: { id: `l${Date.now()}`, title: "Nova Aula", videoId: "", duration: "00:00" }
                        });
                      }}>
                        <Plus className="h-4 w-4 mr-2" /> Adicionar Aula
                      </Button>
                    </div>
                    
                    <div className="space-y-2 pl-4 border-l-2 border-white/10">
                      {mod.lessons.map(lesson => (
                        <div key={lesson.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
                          <div className="flex items-center gap-3">
                            <PlayCircle className="h-4 w-4 text-white/40" />
                            <span className="text-sm">{lesson.title}</span>
                            {lesson.summary && <Badge className="bg-primary/20 text-primary border-none text-[10px]">IA</Badge>}
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setEditingLesson({ moduleId: mod.id, lesson })}>Editar</Button>
                        </div>
                      ))}
                      {mod.lessons.length === 0 && <p className="text-xs text-white/40 italic">Nenhuma aula neste módulo.</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" className="border-white/10" onClick={() => setEditingCourse(null)}>Cancelar</Button>
              <Button type="submit" className="bg-primary text-black">Salvar Curso</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciamento de Cursos</h2>
        <Button className="bg-primary text-black" onClick={handleNewCourse}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Curso
        </Button>
      </div>

      <Card className="bg-zinc-900 border-white/10">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/60">Curso</TableHead>
                <TableHead className="text-white/60">Categoria</TableHead>
                <TableHead className="text-white/60">Alunos</TableHead>
                <TableHead className="text-white/60">Status</TableHead>
                <TableHead className="text-right text-white/60">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id} className="border-white/10 hover:bg-white/5">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-zinc-800 overflow-hidden">
                        <img src={course.img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <p className="font-bold">{course.title}</p>
                        <p className="text-xs text-white/40">{course.professor}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{course.category}</TableCell>
                  <TableCell>{course.students}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={course.status === 'published' ? 'border-primary text-primary' : 'border-white/20 text-white/60'}>
                      {course.status === 'published' ? 'Publicado' : 'Rascunho'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingCourse(course)}>Editar</Button>
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => deleteCourse(course.id)}>Excluir</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminQuizzes() {
  const { courses, updateCourse } = useSchool();
  const [selectedLesson, setSelectedLesson] = React.useState<{courseId: string, moduleId: string, lesson: Lesson} | null>(null);

  if (selectedLesson) {
    const quiz = selectedLesson.lesson.quiz || { id: `q${Date.now()}`, passingScore: 70, questions: [], openQuestions: [] };
    return (
      <Card className="bg-zinc-900 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Editar Quiz: {selectedLesson.lesson.title}</CardTitle>
            <CardDescription>Configure as questões e a nota de aprovação.</CardDescription>
          </div>
          <Button variant="ghost" onClick={() => setSelectedLesson(null)}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold">Nota Mínima para Aprovação (%)</label>
            <Input 
              type="number" 
              min="0" max="100" 
              value={quiz.passingScore} 
              onChange={(e) => {
                const updatedLesson = { ...selectedLesson.lesson, quiz: { ...quiz, passingScore: Number(e.target.value) } };
                setSelectedLesson({ ...selectedLesson, lesson: updatedLesson });
              }}
              className="bg-black border-white/10 w-32" 
            />
          </div>
          
          <div className="space-y-4">
            <h3 className="font-bold">Questões de Múltipla Escolha</h3>
            {quiz.questions.map((q, qIdx) => (
              <Card key={q.id} className="bg-black/50 border-white/10">
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <Input 
                      value={q.question} 
                      onChange={(e) => {
                        const newQuestions = [...quiz.questions];
                        newQuestions[qIdx].question = e.target.value;
                        const updatedLesson = { ...selectedLesson.lesson, quiz: { ...quiz, questions: newQuestions } };
                        setSelectedLesson({ ...selectedLesson, lesson: updatedLesson });
                      }}
                      className="bg-black border-white/10 font-bold"
                      placeholder="Digite a pergunta"
                    />
                    <Button variant="ghost" size="icon" className="text-red-400 ml-2" onClick={() => {
                      const newQuestions = quiz.questions.filter((_, i) => i !== qIdx);
                      const updatedLesson = { ...selectedLesson.lesson, quiz: { ...quiz, questions: newQuestions } };
                      setSelectedLesson({ ...selectedLesson, lesson: updatedLesson });
                    }}><X className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-2 pl-4">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name={`correct-${q.id}`} 
                          checked={q.correctAnswerIndex === optIdx}
                          onChange={() => {
                            const newQuestions = [...quiz.questions];
                            newQuestions[qIdx].correctAnswerIndex = optIdx;
                            const updatedLesson = { ...selectedLesson.lesson, quiz: { ...quiz, questions: newQuestions } };
                            setSelectedLesson({ ...selectedLesson, lesson: updatedLesson });
                          }}
                        />
                        <Input 
                          value={opt} 
                          onChange={(e) => {
                            const newQuestions = [...quiz.questions];
                            newQuestions[qIdx].options[optIdx] = e.target.value;
                            const updatedLesson = { ...selectedLesson.lesson, quiz: { ...quiz, questions: newQuestions } };
                            setSelectedLesson({ ...selectedLesson, lesson: updatedLesson });
                          }}
                          className="bg-black border-white/10 h-8 text-sm"
                          placeholder={`Alternativa ${optIdx + 1}`}
                        />
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => {
                      const newQuestions = [...quiz.questions];
                      newQuestions[qIdx].options.push("");
                      const updatedLesson = { ...selectedLesson.lesson, quiz: { ...quiz, questions: newQuestions } };
                      setSelectedLesson({ ...selectedLesson, lesson: updatedLesson });
                    }}>+ Adicionar Alternativa</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" className="w-full border-dashed border-white/20" onClick={() => {
              const newQuestions = [...quiz.questions, { id: `qq${Date.now()}`, question: "", options: ["", ""], correctAnswerIndex: 0 }];
              const updatedLesson = { ...selectedLesson.lesson, quiz: { ...quiz, questions: newQuestions } };
              setSelectedLesson({ ...selectedLesson, lesson: updatedLesson });
            }}>
              <Plus className="mr-2 h-4 w-4" /> Nova Questão Múltipla Escolha
            </Button>
          </div>

          <div className="space-y-4 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2">
              <h3 className="font-bold">Questões Abertas (Correção por IA)</h3>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            {(quiz.openQuestions || []).map((q, qIdx) => (
              <Card key={q.id} className="bg-black/50 border-white/10">
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60">Pergunta</label>
                        <Input 
                          value={q.question} 
                          onChange={(e) => {
                            const newQuestions = [...(quiz.openQuestions || [])];
                            newQuestions[qIdx].question = e.target.value;
                            const updatedLesson = { ...selectedLesson.lesson, quiz: { ...quiz, openQuestions: newQuestions } };
                            setSelectedLesson({ ...selectedLesson, lesson: updatedLesson });
                          }}
                          className="bg-black border-white/10 font-bold"
                          placeholder="Digite a pergunta aberta"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60">Gabarito / Critérios de Correção (IA usará isso para avaliar)</label>
                        <textarea 
                          value={q.rubric} 
                          onChange={(e) => {
                            const newQuestions = [...(quiz.openQuestions || [])];
                            newQuestions[qIdx].rubric = e.target.value;
                            const updatedLesson = { ...selectedLesson.lesson, quiz: { ...quiz, openQuestions: newQuestions } };
                            setSelectedLesson({ ...selectedLesson, lesson: updatedLesson });
                          }}
                          className="w-full min-h-[80px] p-3 rounded-md bg-black border border-white/10 text-sm"
                          placeholder="Ex: O aluno deve mencionar X, Y e Z. A resposta deve demonstrar entendimento de..."
                        />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-red-400 ml-4 shrink-0" onClick={() => {
                      const newQuestions = (quiz.openQuestions || []).filter((_, i) => i !== qIdx);
                      const updatedLesson = { ...selectedLesson.lesson, quiz: { ...quiz, openQuestions: newQuestions } };
                      setSelectedLesson({ ...selectedLesson, lesson: updatedLesson });
                    }}><X className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" className="w-full border-dashed border-primary/50 text-primary hover:bg-primary/10" onClick={() => {
              const newQuestions = [...(quiz.openQuestions || []), { id: `oq${Date.now()}`, question: "", rubric: "" }];
              const updatedLesson = { ...selectedLesson.lesson, quiz: { ...quiz, openQuestions: newQuestions } };
              setSelectedLesson({ ...selectedLesson, lesson: updatedLesson });
            }}>
              <Plus className="mr-2 h-4 w-4" /> Nova Questão Aberta (IA)
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
            <Button variant="outline" onClick={() => setSelectedLesson(null)}>Cancelar</Button>
            <Button className="bg-primary text-black" onClick={() => {
              const course = courses.find(c => c.id === selectedLesson.courseId);
              if (course) {
                const updatedCourse = {
                  ...course,
                  modules: course.modules.map(m => m.id === selectedLesson.moduleId ? {
                    ...m,
                    lessons: m.lessons.map(l => l.id === selectedLesson.lesson.id ? selectedLesson.lesson : l)
                  } : m)
                };
                updateCourse(updatedCourse);
                setSelectedLesson(null);
              }
            }}>Salvar Quiz</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-white/10">
      <CardHeader>
        <CardTitle>Gerenciamento de Quizzes</CardTitle>
        <CardDescription>Selecione uma aula para adicionar ou editar seu quiz.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {courses.map(course => (
            <div key={course.id} className="space-y-2">
              <h3 className="font-bold text-lg text-primary">{course.title}</h3>
              <div className="space-y-2 pl-4 border-l border-white/10">
                {course.modules.map(mod => (
                  <div key={mod.id} className="space-y-1">
                    <h4 className="text-sm font-bold text-white/80">{mod.title}</h4>
                    <div className="space-y-1 pl-4">
                      {mod.lessons.map(lesson => (
                        <div key={lesson.id} className="flex items-center justify-between p-2 rounded bg-white/5 hover:bg-white/10">
                          <span className="text-sm">{lesson.title}</span>
                          <Button variant="ghost" size="sm" className={lesson.quiz ? "text-primary" : "text-white/40"} onClick={() => setSelectedLesson({courseId: course.id, moduleId: mod.id, lesson})}>
                            {lesson.quiz ? "Editar Quiz" : "Adicionar Quiz"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AdminSupport() {
  const { forumQuestions, answerForumQuestion, courses } = useSchool();
  const [replyText, setReplyText] = React.useState("");
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null);

  return (
    <Card className="bg-zinc-900 border-white/10">
      <CardHeader>
        <CardTitle>Central de Suporte</CardTitle>
        <CardDescription>Responda às dúvidas dos alunos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {forumQuestions.length === 0 ? (
          <p className="text-center text-white/40 py-8">Nenhuma dúvida registrada.</p>
        ) : (
          forumQuestions.map(q => {
            const course = courses.find(c => c.id === q.courseId);
            const lesson = course?.modules.flatMap(m => m.lessons).find(l => l.id === q.lessonId);
            return (
              <div key={q.id} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm">{q.user}</span>
                      <span className="text-xs text-white/40">{new Date(q.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-primary mb-2">{course?.title} - {lesson?.title}</p>
                    <p className="text-sm">{q.text}</p>
                  </div>
                  {q.answer && <Badge className="bg-green-500/20 text-green-500 border-none">Respondido</Badge>}
                </div>
                
                {q.answer ? (
                  <div className="p-3 bg-black/50 rounded-lg border border-white/5">
                    <p className="text-xs font-bold text-white/60 mb-1">Sua Resposta {q.isOfficial && "(Oficial)"}:</p>
                    <p className="text-sm text-white/80">{q.answer}</p>
                  </div>
                ) : replyingTo === q.id ? (
                  <div className="space-y-2 mt-4 pt-4 border-t border-white/10">
                    <textarea 
                      placeholder="Sua resposta oficial..." 
                      className="w-full bg-black border border-white/10 rounded-md p-3 text-sm min-h-[100px]"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setReplyingTo(null); setReplyText(""); }}>Cancelar</Button>
                      <Button size="sm" className="bg-primary text-black" onClick={() => {
                        if (replyText.trim()) {
                          answerForumQuestion(q.id, replyText, true);
                          setReplyingTo(null);
                          setReplyText("");
                        }
                      }}>Enviar Resposta</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="border-white/10" onClick={() => setReplyingTo(q.id)}>
                    Responder
                  </Button>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

const SchoolContext = React.createContext<{
  courses: Course[],
  tracks: LearningTrack[],
  forumQuestions: ForumQuestion[],
  addCourse: (c: Course) => void,
  updateCourse: (c: Course) => void,
  deleteCourse: (id: string) => void,
  addTrack: (t: LearningTrack) => void,
  answerForumQuestion: (id: string, ans: string, isOfficial: boolean) => void
} | null>(null);

export function useSchool() {
  const ctx = React.useContext(SchoolContext);
  if (!ctx) throw new Error("useSchool must be used within SchoolProvider");
  return ctx;
}

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [tracks, setTracks] = React.useState<LearningTrack[]>([]);
  const [forumQuestions, setForumQuestions] = React.useState<ForumQuestion[]>([]);

  const addCourse = (c: Course) => setCourses([...courses, c]);
  const updateCourse = (c: Course) => setCourses(courses.map(xc => xc.id === c.id ? c : xc));
  const deleteCourse = (id: string) => setCourses(courses.filter(c => c.id !== id));
  
  const addTrack = (t: LearningTrack) => setTracks([...tracks, t]);
  const answerForumQuestion = (id: string, ans: string, isOfficial: boolean) => setForumQuestions(forumQuestions.map(q => q.id === id ? { ...q, answer: ans, isOfficial } : q));

  return (
    <SchoolContext.Provider value={{
      courses, addCourse, updateCourse, deleteCourse,
      tracks, addTrack,
      forumQuestions, answerForumQuestion
    }}>
      {children}
    </SchoolContext.Provider>
  )
}

import { auth, db, googleProvider } from '@/lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

import { handleFirestoreError, OperationType } from '@/lib/firestoreUtils';

export default function App() {
  const [activeTab, setActiveTab] = React.useState("home");
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [userData, setUserData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Check for payment status
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    if (paymentStatus === 'success') {
       alert("Pagamento aprovado com sucesso! Seus itens estão sendo processados.");
       window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'failure') {
       alert("O pagamento não foi aprovado. Tente novamente.");
       window.history.replaceState({}, document.title, window.location.pathname);
    }

    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setIsLoggedIn(true);
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef).catch(error => handleFirestoreError(error, OperationType.GET, `users/${user.uid}`));
        
        let localUserData;
        if (userDoc && userDoc.exists()) {
          localUserData = { id: user.uid, ...userDoc.data() };
        } else {
          // Auto-provision standard user with default tenant
          localUserData = {
            name: user.displayName || 'Novo Usuário',
            email: user.email || '',
            roles: ['member'], // Must be 'member' initially to pass security rules
            isApproved: false, // Must be false initially to pass security rules
            tenantId: 'tenant-1',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          try {
            await setDoc(userRef, localUserData);
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
            console.error("Error creating user profile:", error);
            // If creation fails, we still set it locally so they can see public views without crashing
          }
          localUserData.id = user.uid;
        }
        setUserData(localUserData);
      } else {
        setIsLoggedIn(false);
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6">
        <h1 className="text-4xl font-bold font-serif italic text-primary">Igreja Next</h1>
        <p className="text-white/60">Faça o login para acessar a plataforma.</p>
        <button 
          onClick={handleLogin}
          className="bg-white text-black font-bold px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition"
        >
          Entrar com Google
        </button>
      </div>
    );
  }

  const renderView = () => {
     switch(activeTab) {
       case "home": return <HomeView onTabChange={setActiveTab} userData={userData} />;
       case "admin": return <AdminView />;
       case "jornada": return <JornadaView />;
       case "pastors": return <PastorsView />;
       case "social": return <SocialView />;
       case "units": return <UnitsView />;
       case "media": return <SocialMediaView />;
       case "store": return <StoreView />;
       case "ministries": return <MinistriesView isLoggedIn={isLoggedIn} userData={userData} />;
       case "pastoral": return <PastoralCareView isLoggedIn={isLoggedIn} userData={userData} />;
       case "finance": return <FinanceView />;
       case "events": return <EventsView userData={userData} />;
       case "school": return <SchoolView />;
       case "members": return <MembersView userData={userData} />;
       case "cell": return <CellView isLoggedIn={isLoggedIn} isLeader={true} onTabChange={setActiveTab} userData={userData} />;
       default: return <HomeView onTabChange={setActiveTab} userData={userData} />;
     }
  }

  return (
    <SchoolProvider>
      <CellProvider>
        <Layout activeTab={activeTab} setActiveTab={setActiveTab} isLoggedIn={isLoggedIn} userRole={(userData?.roles?.includes('admin') || userData?.roles?.includes('pastor')) ? 'admin' : (userData?.roles?.includes('leader') ? 'leader' : 'member')} userData={userData}>
          {renderView()}
        </Layout>
      </CellProvider>
    </SchoolProvider>
  )
}
