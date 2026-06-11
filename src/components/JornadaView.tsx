import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MapPin, ChevronRight, X, Check, ArrowRight, Play, RefreshCw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ZONES, SQUARES, PATH, QS, CHALLENGES, BLESSINGS, SETBACKS, PCOLORS } from '../lib/jornada-data';
import { drawRoad, drawTile, drawDirectionArrows, drawZoneLabels, drawPawns, drawZoneStrip, getBoardBounds, PGRID_SORTED, isoXY, sqStyle } from '../lib/jornada-engine';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Mocks removed

type Screen = 'intro' | 'setup' | 'game' | 'victory';
type Phase = 'roll' | 'moving' | 'card' | 'wait';

export function JornadaView({ isLoggedIn = true, userData }: { isLoggedIn?: boolean; userData?: any }) {
  const [screen, setScreen] = useState<Screen>('intro');
  const [players, setPlayers] = useState<any[]>([]);
  const [cur, setCur] = useState(0);
  const [phase, setPhase] = useState<Phase>('roll');
  const [logs, setLogs] = useState<string[]>([]);
  const [cardData, setCardData] = useState<any>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [diceValue, setDiceValue] = useState('🎲');
  const [isRolling, setIsRolling] = useState(false);
  const [isGameLoading, setIsGameLoading] = useState(false);
  
  // Game state refs for canvas loop
  const gameState = useRef({
    players: [] as any[],
    cur: 0,
    skipNext: {} as Record<number, boolean>,
    usedQ: {} as Record<string, { easy: number[], hard: number[] }>,
    cam: { x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 1 },
    followPi: -1,
    drag: false,
    dragStart: { x: 0, y: 0 },
    camAtDrag: { x: 0, y: 0 },
    lastDist: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();

  // Initialize game state
  useEffect(() => {
    const initUsedQ: any = {};
    ZONES.forEach(z => { initUsedQ[z.id] = { easy: [], hard: [] }; });
    gameState.current.usedQ = initUsedQ;
  }, []);

  // Sync state to ref for canvas
  useEffect(() => {
    gameState.current.players = players;
    gameState.current.cur = cur;
  }, [players, cur]);

  const addLog = (html: string) => {
    setLogs(prev => [html, ...prev].slice(0, 35));
  };

  const focusAll = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const W = cv.clientWidth || 400;
    const H = cv.clientHeight || 400;
    const { x0, x1, y0, y1 } = getBoardBounds();
    gameState.current.cam.tx = (x0 + x1) / 2;
    gameState.current.cam.ty = (y0 + y1) / 2;
    const sx = (W - 80) / (x1 - x0), sy = (H - 80) / (y1 - y0);
    gameState.current.cam.tz = Math.max(.18, Math.min(sx, sy, 1.8));
    gameState.current.followPi = -1;
  }, []);

  const focusPlayer = useCallback((pi: number) => {
    const p = gameState.current.players[pi];
    if (!p) return;
    const { c, r } = PATH[p.pos];
    const { x, y } = isoXY(c, r);
    gameState.current.cam.tx = x;
    gameState.current.cam.ty = y + 39 / 2; // TH/2
    const cv = canvasRef.current;
    const W = cv?.clientWidth || 400;
    gameState.current.cam.tz = Math.min(W / (78 * 3), 3.5); // TW*3
    gameState.current.followPi = pi;
  }, []);

  // Canvas render loop
  useEffect(() => {
    if (screen !== 'game') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const cv = canvasRef.current;
    if (!cv) return;

    let cvW = 0, cvH = 0;

    const syncCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const W = cv.clientWidth, H = cv.clientHeight;
      const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
      if (cv.width === pw && cv.height === ph) return false;
      cv.width = pw; cv.height = ph;
      cvW = W; cvH = H;
      return true;
    };

    const render = () => {
      syncCanvas();
      const dpr = window.devicePixelRatio || 1;
      const W = cvW || cv.clientWidth || 400;
      const H = cvH || cv.clientHeight || 300;
      const ctx = cv.getContext('2d');
      if (!ctx) return;

      // Update camera
      const state = gameState.current;
      if (state.followPi >= 0 && state.players[state.followPi]) {
        const { c, r } = PATH[state.players[state.followPi].pos];
        const { x, y } = isoXY(c, r);
        state.cam.tx = x; state.cam.ty = y + 39 / 2;
      }
      state.cam.x += (state.cam.tx - state.cam.x) * .1;
      state.cam.y += (state.cam.ty - state.cam.y) * .1;
      state.cam.z += (state.cam.tz - state.cam.z) * .1;

      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.save();
      ctx.scale(dpr, dpr);
      
      const bg = ctx.createRadialGradient(W / 2, H * .33, 0, W / 2, H / 2, W * .7);
      bg.addColorStop(0, '#0e0c0a'); bg.addColorStop(1, '#070707');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      
      ctx.translate(W / 2, H / 2);
      ctx.scale(state.cam.z, state.cam.z);
      ctx.translate(-state.cam.x, -state.cam.y);
      
      drawRoad(ctx);
      PGRID_SORTED.forEach(({ c, r, i }) => drawTile(ctx, i, c, r));
      drawDirectionArrows(ctx);
      drawZoneLabels(ctx);
      if (state.players.length) drawPawns(ctx, state.players);
      
      ctx.restore();
      drawZoneStrip(ctx, W, H);
    };

    const loop = () => {
      render();
      rafRef.current = requestAnimationFrame(loop);
    };

    // Initial setup
    syncCanvas();
    focusAll();
    gameState.current.cam.x = gameState.current.cam.tx;
    gameState.current.cam.y = gameState.current.cam.ty;
    gameState.current.cam.z = gameState.current.cam.tz;
    
    rafRef.current = requestAnimationFrame(loop);

    // Hide loader after a short delay to ensure canvas is rendered
    const loaderTimer = setTimeout(() => {
      setIsGameLoading(false);
    }, 800);

    // Input handling
    const handleMouseDown = (e: MouseEvent) => {
      gameState.current.drag = true;
      gameState.current.dragStart = { x: e.clientX, y: e.clientY };
      gameState.current.camAtDrag = { x: gameState.current.cam.tx, y: gameState.current.cam.ty };
      gameState.current.followPi = -1;
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!gameState.current.drag) return;
      gameState.current.cam.tx = gameState.current.camAtDrag.x - (e.clientX - gameState.current.dragStart.x) / gameState.current.cam.z;
      gameState.current.cam.ty = gameState.current.camAtDrag.y - (e.clientY - gameState.current.dragStart.y) / gameState.current.cam.z;
    };
    const handleMouseUp = () => gameState.current.drag = false;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 0.93;
      gameState.current.cam.tz = Math.max(.15, Math.min(4, gameState.current.cam.tz * factor));
    };

    cv.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    cv.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(loaderTimer);
      cv.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      cv.removeEventListener('wheel', handleWheel);
    };
  }, [screen, focusAll]);

  // Game Logic
  const handleRollDice = () => {
    if (phase !== 'roll' || isRolling) return;
    
    const p = players[cur];
    if (gameState.current.skipNext[cur]) {
      gameState.current.skipNext[cur] = false;
      addLog(`<span class="text-primary">${p.name}</span> esperou uma rodada.`);
      nextTurn();
      return;
    }

    setPhase('moving');
    setIsRolling(true);
    
    let t = 0;
    const DICE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];
    
    const iv = setInterval(() => {
      setDiceValue(DICE_FACES[Math.floor(Math.random() * 6)]);
      if (++t > 10) {
        clearInterval(iv);
        const roll = Math.floor(Math.random() * 6) + 1;
        setDiceValue(DICE_FACES[roll - 1]);
        setIsRolling(false);
        addLog(`<span class="text-primary">${p.name}</span> rolou ${roll}.`);
        doMove(roll);
      }
    }, 72);
  };

  const doMove = (steps: number) => {
    const p = players[cur];
    const to = Math.min(p.pos + steps, 39);
    focusPlayer(cur);
    
    let s = p.pos;
    const iv = setInterval(() => {
      if (s >= to) {
        clearInterval(iv);
        setPlayers(prev => {
          const next = [...prev];
          next[cur].pos = to;
          return next;
        });
        setTimeout(() => activateSquare(to), 200);
        return;
      }
      s++;
      setPlayers(prev => {
        const next = [...prev];
        next[cur].pos = s;
        return next;
      });
    }, 140);
  };

  const activateSquare = (pos: number) => {
    const sq = SQUARES[pos];
    const p = players[cur];
    const z = ZONES[sq.zone];
    
    if (sq.t === 'final') {
      setScreen('victory');
      return;
    }
    
    if (sq.t === 'start') {
      showCard('🏁 Início', `Bem-vindo, ${p.name}! A jornada começa agora.`, '#C9922A', 'INÍCIO', [
        { lbl: 'Continuar →', gold: true, cb: () => { setCardData(null); nextTurn(); } }
      ]);
      return;
    }
    
    if (sq.t === 'ms') {
      showCard(z.em + ' ' + z.lbl + '!', `${p.name} completou a etapa ${z.lbl}! A próxima fase começa agora.`, z.col, 'MARCO', [
        { lbl: 'Continuar →', gold: true, cb: () => { setCardData(null); nextTurn(); } }
      ]);
      addLog(`<span class="text-primary">${p.name}</span> completou ${z.lbl}! 🎉`);
      return;
    }
    
    if (sq.t === 'q') {
      showDiffChoice(z);
      return;
    }
    
    if (sq.t === 'ch') {
      const pool = CHALLENGES[sq.c as keyof typeof CHALLENGES] || [];
      const ch = pool[Math.floor(Math.random() * pool.length)];
      showCard('⚡ ' + ch.ti, ch.bo, z.col, z.lbl + ' · DESAFIO', [
        { lbl: '✅ Cumpriu +2 casas', gold: true, cb: () => {
          setPlayers(prev => { const n = [...prev]; n[cur].pos = Math.min(n[cur].pos + 2, 39); return n; });
          addLog(`<span class="text-primary">${p.name}</span> cumpriu! +2.`);
          setCardData(null); nextTurn();
        }},
        { lbl: '❌ Não cumpriu', gold: false, cb: () => {
          addLog(`<span class="text-primary">${p.name}</span> ficou.`);
          setCardData(null); nextTurn();
        }}
      ]);
      return;
    }
    
    if (sq.t === 'bl') {
      const b = BLESSINGS[Math.floor(Math.random() * BLESSINGS.length)];
      showCard(b.ic + ' ' + b.ti, b.bo, '#059669', 'BÊNÇÃO', [
        { lbl: '🙌 Receber +3 casas', gold: true, cb: () => {
          setPlayers(prev => { const n = [...prev]; n[cur].pos = Math.min(n[cur].pos + 3, 39); return n; });
          addLog(`<span class="text-primary">${p.name}</span> bênção! +3.`);
          setCardData(null); nextTurn();
        }}
      ]);
      return;
    }
    
    if (sq.t === 'rv') {
      const rv = SETBACKS[Math.floor(Math.random() * SETBACKS.length)];
      showCard(rv.ic + ' ' + rv.ti, rv.bo, '#DC2626', 'REVÉS', [
        { lbl: 'Aceitar e continuar', gold: false, cb: () => {
          if (rv.mv === 0) {
            gameState.current.skipNext[cur] = true;
            addLog(`<span class="text-primary">${p.name}</span> pula rodada.`);
          } else {
            setPlayers(prev => { const n = [...prev]; n[cur].pos = Math.max(n[cur].pos + rv.mv, 0); return n; });
            addLog(`<span class="text-primary">${p.name}</span> voltou ${Math.abs(rv.mv)} casas.`);
          }
          setCardData(null); nextTurn();
        }}
      ]);
      return;
    }
    
    nextTurn();
  };

  const showCard = (title: string, body: string, color: string, tag: string, actions: any[]) => {
    setPhase('card');
    setCardData({ type: 'info', title, body, color, tag, actions });
  };

  const showDiffChoice = (zone: any) => {
    setPhase('card');
    setCardData({
      type: 'diff',
      zone,
      tag: zone.lbl + ' · PERGUNTA',
      color: zone.col,
      title: 'Escolha a dificuldade:',
      body: 'Fácil é mais seguro. Difícil dá mais recompensa — e tem penalidade.',
      onEasy: () => showQuestion(zone, 'easy'),
      onHard: () => showQuestion(zone, 'hard')
    });
  };

  const showQuestion = (zone: any, diff: 'easy' | 'hard') => {
    const pool = QS[zone.id as keyof typeof QS][diff];
    const used = gameState.current.usedQ[zone.id][diff];
    let avail = pool.map((_, i) => i).filter(i => !used.includes(i));
    
    if (!avail.length) {
      gameState.current.usedQ[zone.id][diff] = [];
      avail = pool.map((_, i) => i);
    }
    
    const idx = avail[Math.floor(Math.random() * avail.length)];
    gameState.current.usedQ[zone.id][diff].push(idx);
    
    const card = pool[idx];
    const accent = diff === 'easy' ? '#C9922A' : '#DC2626';
    
    setCardData({
      type: 'question',
      card,
      diff,
      zone,
      tag: (diff === 'easy' ? '🟡 FÁCIL' : '🔴 DIFÍCIL') + ' · ' + zone.lbl,
      color: accent,
      answered: null
    });
  };

  const handleAnswer = (chosenIdx: number) => {
    if (cardData.answered !== null) return;
    
    const isCorrect = chosenIdx === cardData.card.ans;
    const p = players[cur];
    const diff = cardData.diff;
    
    let gain = 0;
    if (isCorrect) {
      gain = diff === 'easy' ? 1 : 3;
      setPlayers(prev => { const n = [...prev]; n[cur].pos = Math.min(n[cur].pos + gain, 39); return n; });
      addLog(`<span class="text-primary">${p.name}</span> acertou (${diff === 'easy' ? 'fácil' : 'difícil'})! +${gain}.`);
    } else {
      if (diff === 'hard') {
        setPlayers(prev => { const n = [...prev]; n[cur].pos = Math.max(n[cur].pos - 1, 0); return n; });
      }
      addLog(`<span class="text-primary">${p.name}</span> errou (${diff === 'easy' ? 'fácil' : 'difícil'}).${diff === 'hard' ? ' -1.' : ''}`);
    }
    
    setCardData({ ...cardData, answered: chosenIdx, isCorrect, gain });
    setPhase('wait');
  };

  const nextTurn = () => {
    setCur((prev) => (prev + 1) % players.length);
    setPhase('roll');
    setDiceValue('🎲');
    focusPlayer((cur + 1) % players.length);
  };

  // Setup Screen Component
  const SetupScreen = () => {
    const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
    const [availableMembers, setAvailableMembers] = useState<any[]>([]);

    useEffect(() => {
      const fetchMembers = async () => {
        if (!userData?.tenantId) return;
        const q = query(collection(db, 'members'), where('tenantId', '==', userData.tenantId));
        const snap = await getDocs(q);
        setAvailableMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      };
      fetchMembers();
    }, [userData?.tenantId]);

    const toggleMember = (member: any) => {
      if (selectedMembers.find(m => m.id === member.id)) {
        setSelectedMembers(selectedMembers.filter(m => m.id !== member.id));
      } else {
        if (selectedMembers.length < 6) {
          setSelectedMembers([...selectedMembers, member]);
        }
      }
    };

    const selectGroup = (group: string) => {
      let toSelect: any[] = [];
      if (group === 'celula') toSelect = availableMembers.filter(m => m.cell === 'Esperança');
      if (group === 'lideres') toSelect = availableMembers.filter(m => m.role === 'Líder' || m.role === 'Supervisor' || m.role === 'leader' || m.role === 'admin');
      
      const newSelection = [...selectedMembers];
      toSelect.forEach(m => {
        if (!newSelection.find(s => s.id === m.id) && newSelection.length < 6) {
          newSelection.push(m);
        }
      });
      setSelectedMembers(newSelection);
    };

    const handleStart = () => {
      if (selectedMembers.length < 2) return;
      const newPlayers = selectedMembers.map((m, i) => ({
        ...m,
        color: PCOLORS[i % PCOLORS.length],
        pos: 0
      }));
      setPlayers(newPlayers);
      setCur(0);
      setPhase('roll');
      setLogs([]);
      setCardData(null);
      setIsGameLoading(true);
      setScreen('game');
    };

    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 bg-zinc-950 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl opacity-50" />
          <div 
            className="absolute inset-0 opacity-[0.02]" 
            style={{ backgroundImage: 'radial-gradient(#C9922A 1px, transparent 1px)', backgroundSize: '40px 40px' }}
          />
        </div>

        <div className="glass-card w-full max-w-xl rounded-[2.5rem] relative z-10 overflow-hidden">
          <div className="p-10 md:p-16 space-y-10">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 mb-2 transform rotate-3">
                <Trophy className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-4xl font-black tracking-tight text-white font-serif italic">Preparar Jornada</h2>
              <p className="text-white/50 text-lg font-medium">Selecione de 2 a 6 jogadores para iniciar sua caminhada de discipulado.</p>
            </div>

            <div className="space-y-6">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                <Button variant="outline" size="sm" className="border-white/10 rounded-full px-6 h-10 font-bold whitespace-nowrap bg-white/5 hover:bg-primary hover:text-black transition-all" onClick={() => selectGroup('celula')}>
                  Minha Célula
                </Button>
                <Button variant="outline" size="sm" className="border-white/10 rounded-full px-6 h-10 font-bold whitespace-nowrap bg-white/5 hover:bg-primary hover:text-black transition-all" onClick={() => selectGroup('lideres')}>
                  Líderes
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full px-6 h-10 font-bold whitespace-nowrap text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => setSelectedMembers([])}>
                  Limpar
                </Button>
              </div>

              <div className="bg-black/40 rounded-[2rem] border border-white/5 p-6 max-h-72 overflow-y-auto space-y-3 custom-scrollbar">
                {availableMembers.length === 0 && <p className="text-white/40 text-center py-4">Nenhum membro encontrado.</p>}
                {availableMembers.map(member => {
                  const isSelected = selectedMembers.find(m => m.id === member.id);
                  return (
                    <motion.div 
                      key={member.id}
                      whileHover={{ x: 5 }}
                      onClick={() => toggleMember(member)}
                      className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${
                        isSelected ? 'bg-primary/10 border-primary/50 shadow-lg shadow-primary/5' : 'bg-white/5 border-transparent hover:bg-white/10'
                      } border`}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-white/10">
                          <AvatarImage src={member.avatar || member.photoUrl} />
                          <AvatarFallback className="bg-zinc-800 text-white font-bold">{member.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-base font-bold text-white">{member.name}</p>
                          <p className="text-xs text-white/40 font-medium uppercase tracking-widest">{member.role} {member.cell ? `• ${member.cell}` : ''}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-black" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="pt-8 border-t border-white/10 space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-white/40 font-bold uppercase tracking-widest text-xs">Jogadores Selecionados</span>
                <Badge className="bg-primary text-black font-black px-4 py-1 rounded-full text-sm">{selectedMembers.length} / 6</Badge>
              </div>
              <div className="flex gap-4">
                <Button variant="ghost" className="flex-1 h-14 rounded-full font-bold text-white/60 hover:text-white" onClick={() => setScreen('intro')}>
                  Voltar
                </Button>
                <Button 
                  className="flex-1 bg-primary text-black hover:bg-primary/90 font-black h-14 rounded-full text-lg shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95" 
                  disabled={selectedMembers.length < 2}
                  onClick={handleStart}
                >
                  COMEÇAR <Play className="w-5 h-5 ml-2 fill-current" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-950 text-white font-sans overflow-hidden">
      <AnimatePresence mode="wait">
        {screen === 'intro' && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center p-6 relative"
          >
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse at 50% 15%, #1c1200 0%, #070707 65%)'
            }}>
              <div className="absolute inset-0 opacity-[0.018]" style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 72px, #C9922A 72px, #C9922A 73px), repeating-linear-gradient(90deg, transparent, transparent 72px, #C9922A 72px, #C9922A 73px)'
              }} />
            </div>
            
            <div className="relative z-10 space-y-10 max-w-xl mx-auto">
              <div className="space-y-4">
                <motion.img 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  src="/simbolob.png" 
                  alt="Coroado Icon" 
                  className="w-48 mx-auto drop-shadow-[0_0_40px_rgba(201,146,42,0.5)] text-white"
                />
                <img src="/logomarcab.png" alt="Coroado" className="h-8 mx-auto drop-shadow-[0_0_10px_rgba(201,146,42,0.45)] text-white" />
              </div>
              
              <div className="space-y-2">
                <Badge variant="outline" className="border-primary/50 text-primary px-4 py-1.5 rounded-full uppercase tracking-[0.3em] text-[10px] font-black bg-primary/5">
                  A Experiência Digital
                </Badge>
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter font-serif italic text-white leading-none">O JOGO</h1>
              </div>
              
              <p className="text-xl text-white/60 leading-relaxed font-medium">
                Discipulado, fé e liderança. Percorra as 4 etapas fundamentais: <br />
                <span className="text-white font-serif italic">Ganhar · Consolidar · Treinar · Enviar</span>
              </p>
              
              <div className="pt-4">
                <Button 
                  size="lg" 
                  className="w-full bg-primary text-black hover:bg-primary/90 font-black text-xl tracking-widest h-16 rounded-full shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                  onClick={() => setScreen('setup')}
                >
                  COMEÇAR A JORNADA
                </Button>
              </div>
              
              <div className="flex flex-wrap justify-center gap-3 pt-4">
                <Badge variant="outline" className="border-white/10 bg-white/5 text-white/40 text-[10px] tracking-widest uppercase px-3 py-1 rounded-full">2-6 Jogadores</Badge>
                <Badge variant="outline" className="border-white/10 bg-white/5 text-white/40 text-[10px] tracking-widest uppercase px-3 py-1 rounded-full">45-90 min</Badge>
                <Badge variant="outline" className="border-white/10 bg-white/5 text-white/40 text-[10px] tracking-widest uppercase px-3 py-1 rounded-full">DNA Coroado</Badge>
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'setup' && <SetupScreen key="setup" />}

        {screen === 'game' && (
          <motion.div 
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col md:flex-row h-[calc(100vh-4rem)] w-full overflow-hidden relative"
          >
            {isGameLoading && (
              <div className="absolute inset-0 z-50 flex flex-col md:flex-row bg-zinc-950">
                {/* Canvas Skeleton */}
                <div className="flex-1 relative p-4 flex flex-col items-center justify-center">
                  <div className="w-64 h-10 bg-white/5 animate-pulse rounded-full mb-8" />
                  <div className="w-full max-w-2xl aspect-video bg-white/5 animate-pulse rounded-3xl" />
                </div>
                {/* Side Panel Skeleton */}
                <div className="w-full md:w-80 bg-zinc-900 border-t md:border-t-0 md:border-l border-white/10 flex flex-col h-[50vh] md:h-full flex-shrink-0 p-4 gap-6">
                  <div className="h-6 w-24 bg-white/5 animate-pulse rounded" />
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-14 bg-white/5 animate-pulse rounded-lg" />
                    ))}
                  </div>
                  <div className="flex-1 bg-white/5 animate-pulse rounded-xl mt-4" />
                  <div className="h-24 bg-white/5 animate-pulse rounded-xl mt-4" />
                </div>
              </div>
            )}

            {/* Canvas Area */}
            <div className="flex-1 relative min-h-[50vh] md:min-h-0 bg-zinc-950" ref={wrapRef} id="cwrap">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-black/90 border border-primary/25 rounded-full p-1.5 backdrop-blur-md max-w-[90%] overflow-x-auto scrollbar-hide">
                <button 
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${gameState.current.followPi === -1 ? 'bg-primary/20 text-primary' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                  onClick={focusAll}
                >
                  🗺️ Tudo
                </button>
                <span className="text-white/20 mx-1">|</span>
                {players.map((p, i) => (
                  <button 
                    key={i}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${gameState.current.followPi === i ? 'bg-primary/20 text-primary' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                    onClick={() => focusPlayer(i)}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name.split(' ')[0]}
                  </button>
                ))}
              </div>
              
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none" />
            </div>

            {/* Side Panel */}
            <div className="w-full md:w-96 bg-zinc-900 border-t md:border-t-0 md:border-l border-white/10 flex flex-col h-[50vh] md:h-full flex-shrink-0">
              <div className="p-6 border-b border-white/10 flex items-center gap-4 flex-shrink-0 bg-zinc-900/50 backdrop-blur-sm">
                <img src="/logomarcab.png" alt="Coroado" className="h-5 opacity-80 text-white" />
                <Badge variant="outline" className="border-primary/30 text-primary px-3 py-0.5 rounded-full uppercase tracking-[0.2em] text-[8px] font-black bg-primary/5">
                  Jornada Digital
                </Badge>
              </div>
              
              <div className="p-6 border-b border-white/10 flex-shrink-0 bg-zinc-900/30">
                <div className="text-[10px] tracking-[0.2em] text-white/30 uppercase font-black mb-4">Jogadores em Campo</div>
                <div className="flex flex-col gap-3">
                  {players.map((p, i) => {
                    const z = ZONES[Math.min(Math.floor(p.pos / 10), 3)];
                    return (
                      <motion.div 
                        key={i} 
                        whileHover={{ x: 5 }}
                        onClick={() => focusPlayer(i)}
                        className={`flex items-center gap-4 p-3 rounded-2xl border cursor-pointer transition-all ${i === cur ? 'border-primary bg-primary/10 shadow-lg shadow-primary/5' : 'border-white/5 bg-black/20 hover:border-white/20'}`}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10 border-2" style={{ borderColor: p.color }}>
                            <AvatarImage src={p.avatar} />
                            <AvatarFallback style={{ backgroundColor: p.color, color: '#000' }} className="font-bold">{p.name[0]}</AvatarFallback>
                          </Avatar>
                          {i === cur && (
                            <motion.div 
                              layoutId="active-indicator"
                              className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-zinc-900 flex items-center justify-center"
                            >
                              <div className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" />
                            </motion.div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate text-white">{p.name}</p>
                          <p className="text-[10px] truncate font-black uppercase tracking-widest opacity-60" style={{ color: z.col }}>{z.lbl}</p>
                        </div>
                        <div className="font-serif italic text-2xl text-primary font-black">{p.pos}</div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  <div className="glass-card border-primary/20 bg-primary/5 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(201,146,42,0.5)]" style={{ backgroundColor: players[cur]?.color }} />
                    <div className="text-sm text-white/60 font-medium">Vez de <span className="text-primary font-black">{players[cur]?.name}</span></div>
                  </div>

                  {phase === 'roll' && (
                    <div className="flex flex-col items-center justify-center py-8 space-y-4">
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleRollDice}
                        disabled={isRolling}
                        className={`w-24 h-24 glass-card border-2 border-white/10 rounded-[2rem] flex items-center justify-center text-6xl transition-all ${isRolling ? 'animate-bounce' : 'hover:border-primary hover:shadow-[0_0_30px_rgba(201,146,42,0.3)] cursor-pointer'}`}
                      >
                        {diceValue}
                      </motion.button>
                      <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">Toque para rolar</p>
                    </div>
                  )}

                  {phase === 'card' && cardData && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card border-white/10 rounded-[2rem] p-6 space-y-6 shadow-2xl"
                    >
                      <div className="inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase" style={{ backgroundColor: cardData.color + '22', color: cardData.color }}>
                        {cardData.tag}
                      </div>
                      <h3 className="font-black text-xl leading-tight font-serif italic text-white">{cardData.title}</h3>
                      {cardData.body && <p className="text-sm text-white/50 leading-relaxed font-medium">{cardData.body}</p>}
                      
                      {cardData.type === 'diff' && (
                        <div className="space-y-3 pt-2">
                          <button onClick={cardData.onEasy} className="w-full text-left p-4 rounded-2xl border border-primary/20 bg-primary/5 text-primary transition-all hover:scale-[1.02] active:scale-[0.98]">
                            <div className="font-black text-xs mb-1 uppercase tracking-widest">🟡 FÁCIL</div>
                            <div className="text-[10px] opacity-60 font-medium">Acertar → +1 casa • Errar → fica</div>
                          </button>
                          <button onClick={cardData.onHard} className="w-full text-left p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 transition-all hover:scale-[1.02] active:scale-[0.98]">
                            <div className="font-black text-xs mb-1 uppercase tracking-widest">🔴 DIFÍCIL</div>
                            <div className="text-[10px] opacity-60 font-medium">Acertar → +3 casas • Errar → volta 1</div>
                          </button>
                        </div>
                      )}

                      {cardData.type === 'question' && (
                        <div className="space-y-3 pt-2">
                          {cardData.card.opts.map((opt: string, i: number) => (
                            <button 
                              key={i}
                              disabled={cardData.answered !== null}
                              onClick={() => handleAnswer(i)}
                              className={`w-full text-left p-4 rounded-2xl border text-sm transition-all font-medium ${
                                cardData.answered === null 
                                  ? 'border-white/5 bg-white/5 hover:border-primary hover:bg-primary/5' 
                                  : i === cardData.card.ans 
                                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                    : cardData.answered === i
                                      ? 'border-red-500 bg-red-500/10 text-red-400'
                                      : 'border-white/5 bg-white/5 opacity-30'
                              }`}
                            >
                              <span className="font-black mr-2 opacity-40">{String.fromCharCode(65 + i)}.</span> {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {cardData.type === 'info' && (
                        <div className="space-y-3 pt-2">
                          {cardData.actions.map((a: any, i: number) => (
                            <Button 
                              key={i} 
                              className={`w-full h-14 rounded-2xl ${a.gold ? 'bg-primary text-black hover:bg-primary/90 font-black uppercase tracking-widest text-xs' : 'bg-white/5 border border-white/10 hover:border-primary font-bold'}`}
                              onClick={a.cb}
                            >
                              {a.lbl}
                            </Button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {phase === 'wait' && cardData?.answered !== null && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-6 rounded-[2rem] border text-sm leading-relaxed ${cardData.isCorrect ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-400' : 'bg-red-500/5 border-red-500/30 text-red-400'}`}
                    >
                      <div className="font-black uppercase tracking-widest text-[10px] mb-2">
                        {cardData.isCorrect ? '✅ Excelente!' : '❌ Ops!'}
                      </div>
                      <p className="font-medium">
                        {cardData.isCorrect 
                          ? `Correto! Você avançou ${cardData.gain} casa${cardData.gain > 1 ? 's' : ''}. ` 
                          : `A resposta correta era ${String.fromCharCode(65 + cardData.card.ans)}. ${cardData.diff === 'hard' ? 'Você voltou 1 casa. ' : ''}`
                        }
                      </p>
                      <em className="block mt-4 opacity-60 text-xs border-t border-white/5 pt-4">{cardData.card.v}</em>
                      
                      <Button className="w-full mt-6 bg-primary text-black hover:bg-primary/90 font-black h-14 rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-primary/10" onClick={() => { setCardData(null); nextTurn(); }}>
                        Próximo Jogador <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>

              <div className="p-6 border-t border-white/10 bg-zinc-900/80 backdrop-blur-sm flex-shrink-0">
                <div className="text-[10px] tracking-widest text-white/30 uppercase font-black mb-4">Histórico da Jornada</div>
                <div className="h-24 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {logs.map((log, i) => (
                    <div key={i} className="text-[11px] text-white/50 border-b border-white/5 pb-2 font-medium" dangerouslySetInnerHTML={{ __html: log }} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'victory' && (
          <motion.div 
            key="victory"
            initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center p-6 relative bg-zinc-950"
          >
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(circle at 50% 50%, #1c1200 0%, #070707 100%)'
            }} />
            
            <div className="relative z-10 space-y-10 max-w-2xl mx-auto">
              <div className="space-y-6">
                <motion.img 
                  animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  src="/simbolob.png" 
                  alt="Coroado Icon" 
                  className="w-56 mx-auto drop-shadow-[0_0_60px_rgba(201,146,42,0.6)] text-white"
                />
                <div className="space-y-2">
                  <Badge variant="outline" className="border-primary/50 text-primary px-6 py-2 rounded-full uppercase tracking-[0.4em] text-xs font-black bg-primary/10">
                    Jornada Concluída
                  </Badge>
                  <h1 className="text-7xl md:text-9xl font-black tracking-tighter font-serif italic text-primary leading-none">
                    {players[cur]?.name.split(' ')[0].toUpperCase()}
                  </h1>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl font-black font-serif italic text-white">"FOI ENVIADO" 👑</h2>
                <p className="max-w-md mx-auto text-lg text-white/50 italic leading-relaxed font-medium">
                  "Portanto ide, fazei discípulos de todas as nações, batizando-os em nome do Pai, do Filho e do Espírito Santo." <br />
                  <span className="text-primary not-italic font-bold mt-2 block">— Mateus 28:19</span>
                </p>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4 justify-center pt-6">
                <Button className="bg-primary text-black hover:bg-primary/90 font-black px-12 h-16 rounded-full text-lg shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95" onClick={() => setScreen('setup')}>
                  <RefreshCw className="w-6 h-6 mr-3" /> JOGAR DE NOVO
                </Button>
                <Button variant="outline" className="border-white/10 hover:bg-white/5 rounded-full px-12 h-16 font-bold text-lg backdrop-blur-sm transition-all hover:scale-105 active:scale-95" onClick={() => setScreen('intro')}>
                  Menu Principal
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
