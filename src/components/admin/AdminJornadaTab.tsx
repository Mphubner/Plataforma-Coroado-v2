import * as React from "react";
import { Plus } from "lucide-react";
import { useSchool } from "@/src/contexts/SchoolContext";
import type { LearningTrack } from "@/src/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function AdminJornadaTab() {
  const { tracks, courses, addTrack } = useSchool();
  const [isCreating, setIsCreating] = React.useState(false);
  const [newTrack, setNewTrack] = React.useState<LearningTrack>({ id: '', title: '', description: '', courseIds: [] });

  const funnelData = [
    { stage: "Membros Totais", count: 1200, percentage: 100, color: "bg-blue-500" },
    { stage: "Iniciaram a Jornada", count: 850, percentage: 70, color: "bg-green-500" },
    { stage: "Nivelamento Concluído", count: 500, percentage: 41, color: "bg-yellow-500" },
    { stage: "Escola de Líderes", count: 200, percentage: 16, color: "bg-orange-500" },
    { stage: "Líderes Formados", count: 80, percentage: 6, color: "bg-red-500" },
  ];

  return (
    <div className="space-y-10">
      {/* Funil da Jornada IDE */}
      <div className="space-y-4">
        <div className="space-y-1">
           <h3 className="text-2xl font-black font-serif italic text-white">Funil da Jornada IDE</h3>
           <p className="text-white/50 text-sm">Acompanhamento da conversão de membros em líderes multiplicadores.</p>
        </div>
        <Card className="bg-zinc-900 border-white/10 p-6">
          <div className="flex flex-col items-center justify-center space-y-2">
            {funnelData.map((item, i) => (
              <div key={i} className="flex items-center w-full max-w-2xl gap-4">
                <div className="w-32 text-right text-xs font-bold text-white/60 uppercase">{item.stage}</div>
                <div className="flex-1 flex justify-center">
                   <div 
                     className={`h-12 rounded-lg flex items-center justify-center font-black text-white shadow-lg ${item.color}`}
                     style={{ width: `${Math.max(item.percentage, 15)}%`, transition: 'width 1s ease-in-out' }}
                   >
                      {item.count}
                   </div>
                </div>
                <div className="w-16 text-left text-xs font-bold text-white/60">{item.percentage}%</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
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
