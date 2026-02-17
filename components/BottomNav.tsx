
import React from 'react';
import { Home, BookOpen, Gamepad2, Users, GraduationCap } from 'lucide-react';
import { AppTab } from '../types';
import { playClickSound } from '../utils/audio';

interface BottomNavProps {
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  hasUnreadCommunity?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, hasUnreadCommunity }) => {

  const tabs = [
    { 
      id: 'lessons' as AppTab, 
      label: 'الدروس', 
      icon: <BookOpen className="w-5 h-5" strokeWidth={2.5} />,
      activeColor: 'text-green-400',
      glowColor: 'drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]'
    },
    { 
      id: 'teachers' as AppTab, 
      label: 'الأساتذة', 
      icon: <GraduationCap className="w-5 h-5" strokeWidth={2.5} />,
      activeColor: 'text-pink-400',
      glowColor: 'drop-shadow-[0_0_8px_rgba(244,114,182,0.5)]'
    },
    { 
      id: 'home' as AppTab, 
      label: 'الرئيسية', 
      icon: <Home className="w-5 h-5" strokeWidth={2.5} />,
      activeColor: 'text-brand',
      glowColor: 'drop-shadow-[0_0_12px_rgba(255,198,51,0.5)]',
    },
    { 
      id: 'community' as AppTab, 
      label: 'المجتمع', 
      icon: <Users className="w-5 h-5" strokeWidth={2.5} />,
      activeColor: 'text-orange-400',
      glowColor: 'drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]'
    },
    { 
      id: 'game' as AppTab, 
      label: 'الألعاب', 
      icon: <Gamepad2 className="w-5 h-5" strokeWidth={2.5} />,
      activeColor: 'text-purple-400',
      glowColor: 'drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]'
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-black border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] h-16 sm:h-20 flex justify-around items-center px-1 pb-safe">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              
              return (
                <button
                    key={tab.id}
                    onClick={() => { onTabChange(tab.id); playClickSound(); }}
                    className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 relative flex-1 h-full
                    ${isActive ? `${tab.activeColor}` : 'text-gray-500 hover:text-gray-400'}`}
                >
                    <div className={`transition-all duration-400 transform ${isActive ? 'scale-110 -translate-y-0.5 ' + tab.glowColor : 'scale-100'}`}>
                        {tab.icon}
                        {/* Unread Indicator for Community */}
                        {tab.id === 'community' && hasUnreadCommunity && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-brand"></span>
                            </span>
                        )}
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-tighter transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                        {tab.label}
                    </span>
                    {isActive && (
                        <div className={`absolute bottom-1 w-1 h-1 rounded-full bg-current ${tab.glowColor}`}></div>
                    )}
                </button>
              );
            })}
        </div>
    </div>
  );
};

export default BottomNav;
