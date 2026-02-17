
import React, { useState } from 'react';
import { X, ShieldCheck, ScrollText, Link as LinkIcon, Check } from 'lucide-react';
import { PRIVACY_POLICY } from '../constants';

interface PrivacyModalProps {
    isOpen: boolean;
    onClose: () => void;
    isStandalone?: boolean; // وضع الصفحة المستقلة
}

const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose, isStandalone = false }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopyLink = () => {
        const url = `${window.location.origin}/?page=privacy`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        window.addToast("تم نسخ رابط السياسة للمشاركة", "success");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`fixed inset-0 z-[300] flex flex-col ${isStandalone ? 'bg-black' : 'bg-black/90 backdrop-blur-xl items-center justify-center p-4 md:p-10'} animate-fadeIn`}>
            <div className={`bg-neutral-900 w-full flex flex-col shadow-2xl overflow-hidden border border-white/10 ${isStandalone ? 'h-full rounded-none' : 'max-w-2xl max-h-[85vh] rounded-[3rem]'}`}>
                
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand/20 rounded-2xl text-brand">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-black text-white">سياسة الخصوصية</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">شروط الاستخدام الموحدة</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleCopyLink} 
                            className="flex items-center gap-2 px-4 py-2 bg-brand/10 border border-brand/20 rounded-xl text-brand hover:bg-brand/20 transition-all active:scale-95"
                            title="نسخ الرابط للمشاركة"
                        >
                            {copied ? <Check size={18} /> : <LinkIcon size={18} />}
                            <span className="hidden sm:inline text-xs font-bold">{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
                        </button>
                        
                        {!isStandalone && (
                            <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl text-gray-500 hover:text-white transition-all">
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    <div className="prose prose-invert max-w-none">
                        <div className="bg-black/40 p-6 rounded-3xl border border-white/5 mb-6">
                            <div className="flex items-center gap-3 text-brand mb-4">
                                <ScrollText size={18} />
                                <span className="font-black text-sm uppercase">اتفاقية المستخدم</span>
                            </div>
                            <pre className="whitespace-pre-wrap font-cairo text-sm leading-loose text-gray-300 text-right">
                                {PRIVACY_POLICY}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Footer - Only show if not standalone */}
                {!isStandalone && (
                    <div className="p-6 md:p-8 bg-black/40 border-t border-white/5 shrink-0">
                        <button onClick={onClose} className="w-full py-4 bg-brand text-black font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                            فهمت وأوافق على هذه الشروط
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PrivacyModal;
