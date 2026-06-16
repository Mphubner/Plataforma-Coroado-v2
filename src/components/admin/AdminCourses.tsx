import * as React from "react";
import { Plus, X, PlayCircle, Sparkles } from "lucide-react";
import { useSchool } from "@/src/contexts/SchoolContext";
import type { Course, Lesson } from "@/src/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ImageUpload } from "../ui/ImageUpload";

export function AdminCourses() {
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
              <label className="text-sm font-bold">Imagem da Capa</label>
              <ImageUpload 
                value={editingCourse.img} 
                onChange={url => setEditingCourse({...editingCourse, img: url})} 
                folder="images/cursos"
              />
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
