
import React, { useEffect, useRef } from 'react';
import { GameState, AppTab } from '../types';
import { logPageView, logEvent } from '../lib/analytics';
import { supabase } from '../lib/supabase';

interface AnalyticsTrackerProps {
  gameState: GameState;
  currentTab: AppTab;
}

const AnalyticsTracker: React.FC<AnalyticsTrackerProps> = ({ gameState, currentTab }) => {
  const prevTab = useRef<AppTab>(currentTab);
  const prevState = useRef<GameState>(gameState);

  // 1. تسجيل التنقل بين الصفحات (Page Views)
  useEffect(() => {
    let path = '/';
    let title = 'Home';

    if (gameState === 'AUTH') { path = '/auth'; title = 'Authentication'; }
    else if (gameState === 'ADMIN') { path = '/admin'; title = 'Admin Panel'; }
    else if (gameState === 'PLAYING') { path = '/game/playing'; title = 'Playing Game'; }
    else if (gameState === 'VICTORY') { path = '/game/victory'; title = 'Victory Screen'; }
    else if (gameState === 'GAME_OVER') { path = '/game/game-over'; title = 'Game Over'; }
    else if (gameState === 'SELECTION') { path = '/game/selection'; title = 'Game Selection'; }
    else if (gameState === 'APP') {
        path = `/app/${currentTab}`;
        title = `App - ${currentTab}`;
    } else {
        path = `/${gameState.toLowerCase()}`;
        title = gameState;
    }

    // تعيين العنوان للمتصفح لتظهر بشكل صحيح في التحليلات
    document.title = `المتميز - ${title}`;
    logPageView(path);

  }, [gameState, currentTab]);

  // 2. تسجيل الأحداث الدقيقة (Detailed Events)
  useEffect(() => {
      // رصد تغيير التبويب
      if (prevTab.current !== currentTab && gameState === 'APP') {
          logEvent('Navigation', 'Tab Switch', currentTab);
          prevTab.current = currentTab;
      }

      // رصد تغيير حالة اللعبة (بدء، خسارة، فوز)
      if (prevState.current !== gameState) {
          if (gameState === 'PLAYING') logEvent('Game', 'Start Session', 'New Game');
          if (gameState === 'VICTORY') logEvent('Game', 'Victory', 'Win');
          if (gameState === 'GAME_OVER') logEvent('Game', 'Game Over', 'Loss');
          
          prevState.current = gameState;
      }
  }, [gameState, currentTab]);

  // 3. نظام "نبضة القلب" (Heartbeat): تحديث last_seen كل 30 ثانية (أسرع لدقة أعلى)
  useEffect(() => {
    const updatePresence = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await supabase.from('profiles').update({ 
                    last_seen: new Date().toISOString() 
                }).eq('id', session.user.id);
            }
        } catch (e) {
            console.error("Presence check failed", e);
        }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 30000); // كل 30 ثانية بدلاً من دقيقة

    return () => clearInterval(interval);
  }, []);

  return null;
};

export default AnalyticsTracker;
