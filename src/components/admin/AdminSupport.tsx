import * as React from "react";
import { useSchool } from "@/src/contexts/SchoolContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AdminSupport() {
  const { forumQuestions, answerForumQuestion, courses } = useSchool();
  const [replyText, setReplyText] = React.useState("");
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null);

  return (
    <Card className="bg-zinc-900 border-white/10">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Central de Suporte</CardTitle>
          <CardDescription>Responda às dúvidas dos alunos e gerencie anexos.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open('https://keep.google.com/', '_blank')} className="border-white/10 hover:bg-white/10">
            Anotações (Keep)
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open('https://drive.google.com/', '_blank')} className="bg-[#1967d2]/10 text-[#4285f4] hover:bg-[#1967d2]/20 border-none">
            Anexos (Drive)
          </Button>
        </div>
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
