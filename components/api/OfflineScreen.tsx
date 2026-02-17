
import React from 'react';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

interface OfflineScreenProps {
    onRetry: () => void;
}

const OfflineScreen: React.FC<OfflineScreenProps> = ({ onRetry }) => {
    return (
        <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-center p-6 text-center font-cairo animate-fadeIn">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e1b4b_0%,_#000000_100%)] opacity-50 pointer-events-none"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-dots opacity-20 pointer-events-none"></div>

            <div className="relative z-10 max-w-md w-full bg-neutral-900/60 backdrop-blur-xl border border-white/10 p-10 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6">
                
                <div className="relative mb-4">
                    <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full animate-pulse"></div>
                    <div className="w-24 h-24 bg-neutral-800 rounded-full flex items-center justify-center border-4 border-neutral-700 shadow-xl relative z-10">
                        <WifiOff className="w-10 h-10 text-red-500" />
                    </div>
                    <div className="absolute bottom-0 right-0 bg-neutral-900 rounded-full p-1.5 border border-neutral-700">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white">انقطع الاتصال</h2>
                    <p className="text-gray-400 text-sm font-bold leading-relaxed">
                        يبدو أنك غير متصل بالإنترنت.
                        <br />
                        تطبيق المتميز يحتاج لاتصال نشط ليعمل بكفاءة.
                    </p>
                </div>

                <button 
                    onClick={onRetry}
                    className="group relative w-full py-4 bg-brand hover:bg-brand-light text-black rounded-2xl font-black text-lg shadow-[0_0_20px_rgba(255,198,51,0.3)] hover:shadow-[0_0_30px_rgba(255,198,51,0.5)] transition-all active:scale-95 flex items-center justify-center gap-3 mt-4"
                >
                    <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                    <span>إعادة المحاولة</span>
                </button>

                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-4">
                    يرجى التحقق من الشبكة والمحاولة مجدداً
                </p>
            </div>
        </div>
    );
};

export default OfflineScreen;
