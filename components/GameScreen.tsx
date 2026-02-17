
import React, { useState, useEffect, useRef } from 'react';
import { Question, Lifelines, MoneyTier } from '../types';
import { Users, Phone, XCircle, Timer as TimerIcon, Trophy, Sparkles, BookOpen, Star, X, Minus, Plus, GripVertical, CheckCircle2 } from 'lucide-react';
import { playClickSound, playCorrectSound, playLifelineSound, playWrongSound } from '../utils/audio';
import { MONEY_LADDER } from '../constants';
import { logEvent } from '../lib/analytics'; // Import Analytics

interface GameScreenProps {
  questions: Question[];
  onGameOver: (amountWon: string, numericValue: number) => void;
  onVictory: (amountWon: string, numericValue: number) => void;
  onExit: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ questions, onGameOver, onVictory, onExit }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [lifelines, setLifelines] = useState<Lifelines>({ fiftyFifty: true, askAudience: true, callFriend: true });
  const [disabledOptions, setDisabledOptions] = useState<number[]>([]);
  const [timer, setTimer] = useState(60);
  const [isPaused, setIsPaused] = useState(false);
  const [showLadder, setShowLadder] = useState(false);
  const [scale, setScale] = useState(0.9);

  const controlRef = useRef<HTMLDivElement>(null);
  const controlPosition = useRef({ x: 20, y: window.innerHeight - 150 });
  const isDraggingControl = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const question = questions[currentIdx] || questions[0];

  useEffect(() => {
    if (revealed || isPaused) return;
    const t = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) { handleWrong(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [currentIdx, revealed, isPaused]);

  useEffect(() => {
    const moveHandler = (e: MouseEvent | TouchEvent) => {
        if (!isDraggingControl.current || !controlRef.current) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const deltaX = clientX - lastPos.current.x;
        const deltaY = clientY - lastPos.current.y;
        controlPosition.current.x = Math.max(0, Math.min(window.innerWidth - 80, controlPosition.current.x + deltaX));
        controlPosition.current.y = Math.max(0, Math.min(window.innerHeight - 80, controlPosition.current.y + deltaY));
        controlRef.current.style.left = `${controlPosition.current.x}px`;
        controlRef.current.style.top = `${controlPosition.current.y}px`;
        lastPos.current = { x: clientX, y: clientY };
    };
    const stopHandler = () => { isDraggingControl.current = false; };
    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', stopHandler);
    window.addEventListener('touchmove', moveHandler, { passive: false });
    window.addEventListener('touchend', stopHandler);
    return () => {
        window.removeEventListener('mousemove', moveHandler);
        window.removeEventListener('mouseup', stopHandler);
        window.removeEventListener('touchmove', moveHandler);
        window.removeEventListener('touchend', stopHandler);
    };
  }, []);

  const handleWrong = () => {
    playWrongSound();
    logEvent('Game', 'Answer Result', 'Wrong', currentIdx); // Log Wrong Answer
    
    let safeLevel = 0;
    if (currentIdx >= 10) safeLevel = 10;
    else if (currentIdx >= 5) safeLevel = 5;
    const wonTier = MONEY_LADDER.find(t => t.level === safeLevel);
    onGameOver(wonTier ? wonTier.amount : "0", safeLevel);
  };

  const onSelect = (idx: number) => {
    if (revealed || disabledOptions.includes(idx) || selected !== null) return;
    playClickSound();
    setSelected(idx);
    
    // Log Interaction immediately
    logEvent('Game', 'Select Option', `Question ${currentIdx + 1}`);

    setTimeout(() => {
      setRevealed(true);
      if (idx === question.correctAnswerIndex) {
        playCorrectSound();
        logEvent('Game', 'Answer Result', 'Correct', currentIdx + 1); // Log Correct Answer
        
        setTimeout(() => {
          if (currentIdx < 14) {
            setCurrentIdx(prev => prev + 1);
            setSelected(null);
            setRevealed(false);
            setDisabledOptions([]);
            setTimer(60);
          } else { 
              logEvent('Game', 'Completion', 'Millionaire');
              onVictory("1,000,000", 1000000); 
          }
        }, 2500);
      } else { 
          setTimeout(handleWrong, 2000); 
      }
    }, 2000);
  };

  const useLifeline = (type: keyof Lifelines, name: string) => {
      if (!lifelines[type] || revealed) return;
      playLifelineSound();
      logEvent('Game', 'Use Lifeline', name); // Log Lifeline Usage
      
      if (type === 'fiftyFifty') {
          setDisabledOptions([0,1,2,3].filter(i=>i!==question.correctAnswerIndex).sort(()=>0.5-Math.random()).slice(0,2));
      } else if (type === 'askAudience') {
          alert("الجمهور يميل لـ: "+['أ','ب','ج','د'][question.correctAnswerIndex]);
      } else if (type === 'callFriend') {
          alert("الأستاذ يرجح: " + question.options[question.correctAnswerIndex]);
      }
      setLifelines({...lifelines, [type]: false});
  };

  return (
    <div className="h-screen w-full bg-[#020617] text-white flex flex-col font-cairo overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e1b4b_0%,_#020617_100%)] opacity-90"></div>
      
      {/* Stages Indicator (Bar) */}
      <div className="absolute top-20 left-0 right-0 z-10 flex justify-center px-4">
          <div className="flex gap-1 md:gap-2 items-center bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/5">
              {Array.from({ length: 15 }).map((_, i) => {
                  const stageNum = i + 1;
                  const isCurrent = stageNum === currentIdx + 1;
                  const isPassed = stageNum <= currentIdx;
                  const isSafe = stageNum === 5 || stageNum === 10 || stageNum === 15;
                  
                  return (
                      <div key={i} className="relative group">
                          <div className={`
                              w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-500
                              ${isCurrent ? 'bg-brand scale-150 shadow-[0_0_10px_#ffc633]' : ''}
                              ${isPassed && !isCurrent ? 'bg-green-500' : ''}
                              ${!isPassed && !isCurrent ? 'bg-white/20' : ''}
                          `}></div>
                          {isSafe && <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isPassed ? 'bg-brand' : 'bg-white/30'}`}></div>}
                      </div>
                  );
              })}
          </div>
      </div>

      <div 
            ref={controlRef}
            style={{ left: controlPosition.current.x, top: controlPosition.current.y, touchAction: 'none' }}
            className="fixed z-[120] flex items-center bg-white/10 backdrop-blur-md border border-white/10 p-1 rounded-full shadow-lg cursor-move select-none opacity-60 hover:opacity-100 transition-opacity"
            onMouseDown={(e) => { isDraggingControl.current = true; lastPos.current = { x: e.clientX, y: e.clientY }; }}
            onTouchStart={(e) => { isDraggingControl.current = true; lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        >
            <div className="p-1 text-gray-400 mr-0.5"><GripVertical size={12}/></div>
            <button onClick={() => setScale(prev => Math.max(0.6, prev - 0.05))} className="w-7 h-7 bg-white/5 rounded-full flex items-center justify-center text-white active:scale-90"><Minus size={12} /></button>
            <div className="px-1.5 min-w-[30px] text-center"><span className="text-[8px] font-black text-brand">{Math.round(scale * 100)}%</span></div>
            <button onClick={() => setScale(prev => Math.min(1.2, prev + 0.05))} className="w-7 h-7 bg-white/5 rounded-full flex items-center justify-center text-white active:scale-90"><Plus size={12} /></button>
        </div>

      <header className="p-4 flex justify-between items-center z-20 bg-black/40 border-b border-white/5 backdrop-blur-xl shrink-0 h-16">
        <button onClick={onExit} className="p-2 bg-red-900/10 text-red-500 rounded-full border border-red-500/20"><XCircle size={20}/></button>
        <div className="flex flex-col items-center">
            <div className={`flex items-center gap-2 px-6 py-1.5 rounded-full border-2 transition-all ${timer <= 15 ? 'border-red-500 bg-red-500/10 animate-pulse' : 'border-brand bg-black/60'}`}>
                <TimerIcon className={timer <= 15 ? 'text-red-500' : 'text-brand'} size={16}/><span className="text-xl font-black font-mono tracking-tighter">{timer}</span>
            </div>
        </div>
        <button onClick={() => setShowLadder(!showLadder)} className="bg-brand/10 px-4 py-1.5 rounded-full border border-brand/20 shadow-xl flex items-center gap-2">
            <p className="text-[10px] text-brand font-black uppercase tracking-widest"><Trophy size={14} className="inline mb-0.5"/> الجائزة</p>
            <div className="w-px h-3 bg-brand/30"></div>
            <p className="text-xs font-black text-white">{MONEY_LADDER[14 - currentIdx]?.amount || '0'}</p>
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center overflow-hidden">
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center', width: '100%', maxWidth: '1024px' }} className="flex flex-col items-center justify-center p-4 space-y-6 mt-8">
              
              <div className="w-full bg-gradient-to-b from-[#1e1b4b] to-[#020617] border-x-[4px] border-brand p-6 text-center rounded-[3rem] shadow-2xl relative animate-fadeIn group min-h-[140px] flex items-center justify-center">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand text-black px-6 py-1 rounded-full text-[10px] font-black shadow-xl border-2 border-black flex items-center gap-2">
                      <span>المرحلة {currentIdx + 1}</span>
                      <span className="opacity-50">|</span>
                      <span>15</span>
                  </div>
                  <h2 className="text-lg md:text-2xl font-black leading-relaxed text-gray-100">{question.text}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                  {question.options.map((opt, i) => {
                      let statusCls = "bg-black/40 border-white/10 text-gray-300";
                      let indicator = ['أ', 'ب', 'ج', 'د'][i];
                      
                      if (selected === i) statusCls = "bg-brand/40 border-brand text-white ring-2 ring-brand/20 animate-pulse";
                      if (revealed) {
                          if (i === question.correctAnswerIndex) {
                              statusCls = "bg-green-600 border-green-400 text-white scale-[1.02] z-20 shadow-[0_0_20px_rgba(34,197,94,0.4)]";
                              indicator = "✔";
                          }
                          else if (selected === i) {
                              statusCls = "bg-red-600 border-red-400 text-white";
                              indicator = "✘";
                          }
                      }
                      if (disabledOptions.includes(i)) statusCls = "opacity-10 pointer-events-none grayscale";
                      
                      return (
                          <button key={i} onClick={() => onSelect(i)} disabled={revealed || disabledOptions.includes(i)} className={`p-3 border-2 rounded-[1.5rem] text-right font-black transition-all flex items-center gap-4 h-16 sm:h-20 ${statusCls}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border border-white/10 shrink-0 ${selected === i || (revealed && i === question.correctAnswerIndex) ? 'bg-white text-black' : 'bg-black/40 text-brand'}`}>
                                  {indicator}
                              </div>
                              <span className="text-xs md:text-sm flex-1 line-clamp-2 leading-tight">{opt}</span>
                          </button>
                      );
                  })}
              </div>

              <footer className="flex gap-4 mt-2">
                  <div className="flex flex-col items-center gap-1">
                      <button onClick={() => useLifeline('fiftyFifty', '50:50')} disabled={!lifelines.fiftyFifty || revealed} className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-black transition-all ${!lifelines.fiftyFifty ? 'opacity-20 grayscale' : 'bg-brand/10 border-brand text-brand hover:bg-brand hover:text-black'}`}><span className="text-[10px]">50:50</span></button>
                      <span className="text-[8px] text-gray-500 font-black">حذف إجابتين</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                      <button onClick={() => useLifeline('askAudience', 'Audience')} disabled={!lifelines.askAudience || revealed} className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all ${!lifelines.askAudience ? 'opacity-20 grayscale' : 'bg-blue-600/10 border-blue-500 text-blue-500'}`}><Users size={20}/></button>
                      <span className="text-[8px] text-gray-500 font-black">الجمهور</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                      <button onClick={() => useLifeline('callFriend', 'Friend')} disabled={!lifelines.callFriend || revealed} className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all ${!lifelines.callFriend ? 'opacity-20 grayscale' : 'bg-purple-600/10 border-purple-500 text-purple-500'}`}><BookOpen size={20}/></button>
                      <span className="text-[8px] text-gray-500 font-black">المعلم</span>
                  </div>
              </footer>
          </div>
      </main>

      <aside className={`fixed top-0 left-0 h-full w-64 bg-[#020617]/95 backdrop-blur-2xl border-r border-white/10 z-50 transition-transform duration-500 flex flex-col ${showLadder ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 border-b border-white/5 flex justify-between items-center"><h3 className="text-brand font-black uppercase text-xs flex items-center gap-2"><Trophy size={16}/> سلم المليون</h3><button onClick={() => setShowLadder(false)}><X size={20}/></button></div>
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {MONEY_LADDER.map((tier, idx) => {
                  const isActive = 15 - tier.level === currentIdx;
                  const isPassed = 15 - tier.level < currentIdx;
                  return (
                      <div key={idx} className={`px-4 py-2 rounded-xl text-[10px] font-black border flex items-center justify-between gap-3 transition-all ${isActive ? 'bg-brand text-black border-brand scale-105 shadow-lg' : isPassed ? 'bg-green-900/20 border-green-900/50 text-green-500' : 'bg-white/5 border-white/5 text-gray-500 opacity-60'}`}>
                          <span className={`w-5 h-5 flex items-center justify-center rounded-full border ${isActive ? 'border-black' : 'border-current'}`}>{tier.level}</span>
                          <span className="flex-1 text-right">{tier.amount}</span>
                          {tier.isSafeHaven && <Star size={10} fill="currentColor" />}
                          {isPassed && <CheckCircle2 size={12} />}
                      </div>
                  );
              })}
          </div>
      </aside>
    </div>
  );
};

export default GameScreen;
