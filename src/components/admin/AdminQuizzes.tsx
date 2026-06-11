import * as React from "react";
import { Plus, X, Sparkles } from "lucide-react";
import { useSchool } from "@/src/contexts/SchoolContext";
import type { Lesson } from "@/src/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function AdminQuizzes() {
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
