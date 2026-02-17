
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User } from '../types';
import { 
    Send, Loader2, ArrowRight, Globe, LayoutGrid, 
    MessageCircle, Heart, Sparkles, Reply, X, Smile, MoreVertical, Trash2, CheckCheck,
    Image as ImageIcon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { playMessageSentSound, playClickSound, playLifelineSound } from '../utils/audio';
import { ALL_SUBJECTS_LIST } from '../constants';
import { CacheManager } from '../lib/cache';

// --- Types & Constants ---

type CommunityTab = 'posts' | 'communities';

const REACTIONS_LIST = ['👍', '❤️', '😂', '😮', '😢', '👏'];

const SUBJECT_VISUALS: Record<string, { gradient: string; icon: string }> = {
    'arabic': { gradient: 'from-emerald-600/20 to-black', icon: '📖' },
    'philosophy': { gradient: 'from-purple-600/20 to-black', icon: '🤔' },
    'history': { gradient: 'from-amber-600/20 to-black', icon: '📜' },
    'geography': { gradient: 'from-blue-600/20 to-black', icon: '🗺️' },
    'islamic': { gradient: 'from-teal-600/20 to-black', icon: '🕌' },
    'math': { gradient: 'from-cyan-600/20 to-black', icon: '📐' },
    'english': { gradient: 'from-red-600/20 to-black', icon: '🇬🇧' },
    'french': { gradient: 'from-indigo-600/20 to-black', icon: '🇫🇷' },
};

interface CommunityScreenProps {
    user: User;
    unreadSubjects: Set<string>;
    onMarkRead: (subjectId: string) => void;
}

interface ReplyContext {
    id: number;
    user_name: string;
    content: string;
}

interface MessageType {
    id: number;
    user_id: string;
    subject_id: string;
    content: string;
    image_url?: string;
    user_name: string;
    user_avatar?: string;
    created_at: string;
    reactions?: { detailed?: Record<string, string>; likes?: string[] };
    reply_to?: ReplyContext;
    isOptimistic?: boolean;
}

// --- Sub Component: Message Item with Gestures ---
const MessageItem = ({ 
    msg, 
    user, 
    isMe, 
    isFirstInSequence, 
    onReply, 
    onReact, 
    onDelete, 
    onLongPress,
    formatTime 
}: any) => {
    const [translateX, setTranslateX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const touchStartX = useRef(0);
    const touchStartY = useRef(0); // To detect scrolling
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTapTime = useRef(0);
    const contentRef = useRef<HTMLDivElement>(null);

    // Process Reactions
    const reactionsMap = msg.reactions?.detailed || {};
    const reactionCounts: Record<string, number> = {};
    Object.values(reactionsMap).forEach((r: any) => {
        reactionCounts[r] = (reactionCounts[r] || 0) + 1;
    });
    const topReactions = Object.entries(reactionCounts).sort((a,b) => b[1] - a[1]).slice(0, 3);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        setIsDragging(true);
        
        // Long Press Logic (Menu)
        longPressTimer.current = setTimeout(() => {
            onLongPress(msg.id);
            if (window.navigator.vibrate) window.navigator.vibrate(50); // Haptic feedback
            setIsDragging(false); // Cancel drag if long press activates
        }, 500);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        
        const deltaX = e.touches[0].clientX - touchStartX.current;
        const deltaY = e.touches[0].clientY - touchStartY.current;

        // If scrolling vertically, cancel gestures
        if (Math.abs(deltaY) > 10) {
            clearTimeout(longPressTimer.current!);
            setTranslateX(0);
            return;
        }

        // Horizontal Swipe Logic
        if (Math.abs(deltaX) > 10) {
            clearTimeout(longPressTimer.current!); // Cancel long press if moving
            
            // RTL Logic: 
            // If isMe (Left aligned) -> Swipe Right (positive X) to reply
            // If !isMe (Right aligned) -> Swipe Left (negative X) to reply
            // Limit swipe distance visually
            const resistance = 0.4;
            if (isMe && deltaX > 0) setTranslateX(Math.min(deltaX * resistance, 60));
            else if (!isMe && deltaX < 0) setTranslateX(Math.max(deltaX * resistance, -60));
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        clearTimeout(longPressTimer.current!);
        setIsDragging(false);

        // Check Swipe for Reply
        if (Math.abs(translateX) > 40) {
            onReply(msg);
            if (window.navigator.vibrate) window.navigator.vibrate(20);
        }
        
        // Snap back
        setTranslateX(0);

        // Check for Double Tap (Heart)
        const now = Date.now();
        if (now - lastTapTime.current < 300 && Math.abs(translateX) < 5) {
            // Double Tap Detected
            onReact(msg.id, '❤️');
            lastTapTime.current = 0; // Reset
        } else {
            lastTapTime.current = now;
        }
    };

    return (
        <div 
            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative select-none touch-pan-y`}
        >
            {/* Reply Icon Indicator (Behind the message) */}
            <div 
                className={`absolute top-1/2 -translate-y-1/2 transition-opacity duration-300 ${
                    Math.abs(translateX) > 40 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                } ${isMe ? 'left-2' : 'right-2'}`}
            >
                <div className="bg-neutral-800 p-2 rounded-full border border-white/10 text-brand shadow-lg">
                    <Reply size={16} />
                </div>
            </div>

            {/* Message Bubble Container */}
            <div 
                className={`flex max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 relative z-10 transition-transform duration-200 ease-out`}
                style={{ transform: `translateX(${translateX}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Avatar (Only for others, first in sequence) */}
                {!isMe && (
                    <div className={`w-8 shrink-0 flex flex-col items-center ${!isFirstInSequence ? 'opacity-0' : ''}`}>
                        <div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shadow-md">
                            {msg.user_avatar ? <img src={msg.user_avatar} className="w-full h-full object-cover" alt="avatar"/> : <div className="w-full h-full flex items-center justify-center text-xs font-black text-gray-500">{msg.user_name?.charAt(0)}</div>}
                        </div>
                    </div>
                )}

                {/* Bubble */}
                <div className="relative" ref={contentRef}>
                    {/* Name Tag for others */}
                    {!isMe && isFirstInSequence && (
                        <span className="text-[10px] font-black text-gray-500 ml-3 mb-1 block">{msg.user_name}</span>
                    )}

                    {/* Reply Context View (Nested) */}
                    {msg.reply_to && (
                        <div className={`mb-1 px-3 py-2 rounded-xl text-[10px] border-l-4 bg-white/5 flex flex-col gap-0.5 opacity-80 ${isMe ? 'border-brand/50 self-end items-end text-right' : 'border-blue-500/50 self-start items-start text-left'} max-w-full overflow-hidden`}>
                            <span className="font-bold text-brand">{msg.reply_to.user_name}</span>
                            <span className="truncate text-gray-400 block w-full">{msg.reply_to.content}</span>
                        </div>
                    )}

                    <div 
                        onContextMenu={(e) => { e.preventDefault(); onLongPress(msg.id); }}
                        className={`px-4 py-2.5 min-w-[80px] relative transition-all active:scale-[0.98] ${
                        isMe 
                        ? 'bg-brand text-black rounded-2xl rounded-tr-none shadow-[0_4px_15px_rgba(255,198,51,0.15)]' 
                        : 'bg-[#1a1a1a] text-gray-200 rounded-2xl rounded-tl-none border border-white/5 shadow-md'
                    }`}>
                        {/* Image Display */}
                        {msg.image_url && (
                            <div className="mb-2 -mx-2 -mt-2">
                                <img 
                                    src={msg.image_url} 
                                    alt="مرفق" 
                                    className="rounded-xl max-h-64 object-cover w-full border border-black/10 pointer-events-none" // pointer-events-none to pass touches to parent
                                    loading="lazy"
                                />
                            </div>
                        )}

                        <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                        
                        <div className={`flex items-center gap-1 mt-1 opacity-60 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[9px] font-mono">{formatTime(msg.created_at)}</span>
                            {isMe && (
                                msg.isOptimistic ? <div className="w-2.5 h-2.5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div> : <CheckCheck size={12} className="text-black"/>
                            )}
                        </div>

                        {/* Reactions Display */}
                        {topReactions.length > 0 && (
                            <div 
                                className={`absolute -bottom-3 ${isMe ? 'right-0' : 'left-0'} flex items-center bg-neutral-800 border border-white/10 rounded-full px-1.5 py-0.5 shadow-lg z-10 animate-bounceIn`}
                            >
                                {topReactions.map(([react, count]) => (
                                    <span key={react} className="text-[10px] flex items-center select-none">{react}<span className="text-[8px] font-mono ml-0.5 text-gray-400">{count > 1 ? count : ''}</span></span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Desktop Hover Actions (Optional, kept for non-touch) */}
                    <div className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-10' : '-right-10'} opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 hidden lg:flex`}>
                        <button onClick={() => onReply(msg)} className="p-1.5 bg-neutral-800 rounded-full text-gray-400 hover:text-brand hover:bg-white/10 shadow-lg"><Reply size={14}/></button>
                        {isMe && <button onClick={() => onDelete(msg.id)} className="p-1.5 bg-neutral-800 rounded-full text-red-500 hover:bg-white/10 shadow-lg"><Trash2 size={14}/></button>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Screen ---

const CommunityScreen: React.FC<CommunityScreenProps> = ({ user, unreadSubjects, onMarkRead }) => {
    const [activeTab, setActiveTab] = useState<CommunityTab>('communities');
    const [selectedSubject, setSelectedSubject] = useState<{id: string, name: string} | null>(null);
    const [messages, setMessages] = useState<MessageType[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [replyTo, setReplyTo] = useState<ReplyContext | null>(null);
    const [activeReactionMsgId, setActiveReactionMsgId] = useState<number | null>(null);
    
    // Image Upload States
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const chatEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Initial Load & Realtime ---

    useEffect(() => {
        if (selectedSubject) {
            const cached = CacheManager.getMessages(selectedSubject.id);
            if (cached) {
                setMessages(cached);
                setLoading(false);
                setTimeout(scrollToBottom, 50);
            } else {
                fetchMessages();
            }

            onMarkRead(selectedSubject.id);
            updateReadStatus();

            const channel = supabase
                .channel(`chat_room_${selectedSubject.id}`)
                .on(
                    'postgres_changes' as any, 
                    { event: '*', schema: 'public', table: 'community_messages', filter: `subject_id=eq.${selectedSubject.id}` }, 
                    (payload: any) => {
                        if (payload.eventType === 'INSERT') {
                            const newMsg = payload.new as MessageType;
                            setMessages(prev => {
                                if (prev.some(m => m.id === newMsg.id || (m.isOptimistic && m.content === newMsg.content && m.user_id === newMsg.user_id))) {
                                    return prev.map(m => (m.isOptimistic && m.content === newMsg.content) ? newMsg : m);
                                }
                                const newList = [...prev, newMsg];
                                CacheManager.setMessages(selectedSubject.id, newList);
                                return newList;
                            });
                            playLifelineSound();
                            setTimeout(scrollToBottom, 100);
                        } else if (payload.eventType === 'UPDATE') {
                            setMessages(prev => {
                                const newList = prev.map(m => m.id === payload.new.id ? payload.new : m);
                                CacheManager.setMessages(selectedSubject.id, newList);
                                return newList;
                            });
                        } else if (payload.eventType === 'DELETE') {
                            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
                        }
                    }
                )
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [selectedSubject]);

    const updateReadStatus = async () => {
        if (!selectedSubject) return;
        await supabase.from('community_reads').upsert({
            user_id: user.id,
            subject_id: selectedSubject.id,
            last_read_at: new Date().toISOString()
        }, { onConflict: 'user_id,subject_id' });
    };

    const fetchMessages = async () => {
        if (!selectedSubject) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('community_messages')
                .select('*')
                .eq('subject_id', selectedSubject.id)
                .order('created_at', { ascending: true })
                .limit(75);
            
            if (data) {
                setMessages(data);
                CacheManager.setMessages(selectedSubject.id, data);
            }
        } catch (e) {
            console.error("Fetch Error:", e);
        } finally {
            setLoading(false);
            setTimeout(scrollToBottom, 200);
        }
    };

    // --- Actions ---

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) return;
            if (file.size > 5 * 1024 * 1024) return window.addToast("حجم الصورة كبير جداً", "error");
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const clearImageSelection = () => { setImageFile(null); setImagePreview(null); };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const text = newMessage.trim();
        if ((!text && !imageFile) || !selectedSubject) return;

        setIsUploading(true);
        const tempId = Date.now();
        const optimisticMsg: MessageType = {
            id: tempId,
            user_id: user.id,
            subject_id: selectedSubject.id,
            content: text,
            image_url: imagePreview || undefined,
            user_name: user.name,
            user_avatar: user.avatar,
            reactions: {},
            created_at: new Date().toISOString(),
            isOptimistic: true,
            reply_to: replyTo || undefined
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');
        setReplyTo(null);
        playMessageSentSound();
        setTimeout(scrollToBottom, 50);
        inputRef.current?.focus();

        try {
            let uploadedImageUrl = null;
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${selectedSubject.id}/${user.id}_${Date.now()}.${fileExt}`;
                const { data: uploadData, error: uploadError } = await supabase.storage.from('community_images').upload(fileName, imageFile);
                if (uploadError) throw uploadError;
                const { data: publicUrlData } = supabase.storage.from('community_images').getPublicUrl(fileName);
                uploadedImageUrl = publicUrlData.publicUrl;
            }

            const { error } = await supabase.from('community_messages').insert({
                user_id: user.id,
                subject_id: selectedSubject.id,
                content: text,
                image_url: uploadedImageUrl,
                user_name: user.name,
                user_avatar: user.avatar,
                reactions: {},
                reply_to: replyTo
            });
            if (error) throw error;
            setImageFile(null); setImagePreview(null);
        } catch (err) {
            window.addToast("فشل الإرسال، تحقق من الاتصال", "error");
            setMessages(prev => prev.filter(m => m.id !== tempId));
        } finally {
            setIsUploading(false);
        }
    };

    const handleReaction = async (msgId: number, reaction: string) => {
        setActiveReactionMsgId(null);
        setMessages(prev => prev.map(m => {
            if (m.id === msgId) {
                const currentDetailed = m.reactions?.detailed || {};
                const newDetailed = { ...currentDetailed, [user.id]: reaction };
                return { ...m, reactions: { ...m.reactions, detailed: newDetailed } };
            }
            return m;
        }));
        playLifelineSound();
        try {
            const { data: currentMsg } = await supabase.from('community_messages').select('reactions').eq('id', msgId).single();
            if (currentMsg) {
                const existingDetailed = currentMsg.reactions?.detailed || {};
                const updatedDetailed = { ...existingDetailed, [user.id]: reaction };
                await supabase.from('community_messages').update({ reactions: { ...currentMsg.reactions, detailed: updatedDetailed } }).eq('id', msgId);
            }
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (msgId: number) => {
        if (!confirm("هل تريد حذف هذه الرسالة نهائياً؟")) return;
        setMessages(prev => prev.filter(m => m.id !== msgId));
        await supabase.from('community_messages').delete().eq('id', msgId);
    };

    const scrollToBottom = () => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' }); };
    const formatTime = (dateStr: string) => { return new Date(dateStr).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }); };

    if (selectedSubject) {
        return createPortal(
            <div className="fixed inset-0 z-[60] bg-[#050505] flex flex-col animate-fadeIn overflow-hidden gpu-accelerated touch-action-manipulation">
                {/* Header */}
                <div className="h-16 bg-neutral-900/95 backdrop-blur-xl border-b border-white/5 px-4 flex items-center justify-between shrink-0 safe-area-top z-20">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedSubject(null)} className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors active:scale-90"><ArrowRight size={22} /></button>
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-neutral-800 to-black border border-white/10 flex items-center justify-center text-xl shadow-lg">
                                {SUBJECT_VISUALS[selectedSubject.id]?.icon || '💬'}
                            </div>
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-black rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex flex-col">
                            <h3 className="font-black text-white text-sm leading-tight">{selectedSubject.name}</h3>
                            <p className="text-[10px] text-green-400 font-bold flex items-center gap-1">متصل الآن</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2"><button className="p-2 text-gray-500 hover:text-white transition-colors"><MoreVertical size={20}/></button></div>
                </div>

                {/* Chat Area */}
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#050505] custom-scrollbar relative optimize-scrolling" style={{ backgroundImage: 'radial-gradient(circle at center, #111 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                    {loading && <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10"><Loader2 className="animate-spin text-brand" size={32} /></div>}

                    {messages.map((msg, i) => {
                        const isMe = msg.user_id === user.id;
                        const prevMsg = i > 0 ? messages[i - 1] : null;
                        const isFirstInSequence = !prevMsg || prevMsg.user_id !== msg.user_id;
                        
                        return (
                            <React.Fragment key={msg.id || i}>
                                <MessageItem 
                                    msg={msg}
                                    user={user}
                                    isMe={isMe}
                                    isFirstInSequence={isFirstInSequence}
                                    onReply={(m: any) => { setReplyTo({ id: m.id, user_name: m.user_name, content: m.content || 'صورة' }); inputRef.current?.focus(); }}
                                    onReact={handleReaction}
                                    onDelete={handleDelete}
                                    onLongPress={setActiveReactionMsgId}
                                    formatTime={formatTime}
                                />
                                {activeReactionMsgId === msg.id && (
                                    <>
                                        <div className="fixed inset-0 z-[60]" onClick={() => setActiveReactionMsgId(null)}></div>
                                        <div className="fixed inset-x-0 bottom-20 z-[70] flex justify-center animate-bounceIn">
                                            <div className="bg-neutral-900/90 border border-white/20 rounded-full p-3 flex gap-4 shadow-2xl backdrop-blur-md">
                                                {REACTIONS_LIST.map(r => (
                                                    <button key={r} onClick={() => handleReaction(msg.id, r)} className="text-2xl hover:scale-125 transition-transform active:scale-95">{r}</button>
                                                ))}
                                                {isMe && <div className="w-px bg-white/20 mx-1"></div>}
                                                {isMe && <button onClick={() => { handleDelete(msg.id); setActiveReactionMsgId(null); }} className="text-red-500 flex items-center justify-center"><Trash2 size={20}/></button>}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </React.Fragment>
                        );
                    })}
                    <div ref={chatEndRef} className="h-4" />
                </div>

                {/* Reply Banner */}
                {replyTo && (
                    <div className="bg-neutral-900 border-t border-white/5 px-4 py-2 flex items-center justify-between animate-slideUp z-20">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <Reply className="text-brand shrink-0" size={16}/>
                            <div className="flex flex-col text-xs border-r-2 border-brand pr-2">
                                <span className="text-brand font-black">الرد على {replyTo.user_name}</span>
                                <span className="text-gray-400 truncate max-w-[200px]">{replyTo.content}</span>
                            </div>
                        </div>
                        <button onClick={() => setReplyTo(null)} className="p-1 text-gray-500 hover:text-white bg-white/5 rounded-full"><X size={16}/></button>
                    </div>
                )}

                {/* Input Area */}
                <div className="bg-neutral-900/95 backdrop-blur-xl border-t border-white/10 p-3 shrink-0 pb-safe z-20">
                    {imagePreview && (
                        <div className="flex items-center gap-3 mb-2 px-2 animate-slideIn">
                            <div className="relative group">
                                <img src={imagePreview} className="w-16 h-16 rounded-xl object-cover border border-brand/50 shadow-lg" alt="preview" />
                                <button onClick={clearImageSelection} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"><X size={12} strokeWidth={3}/></button>
                            </div>
                            <span className="text-xs font-bold text-gray-400">جاهز للإرسال</span>
                        </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex gap-2 items-end bg-[#1a1a1a] rounded-3xl p-1.5 border border-white/5 shadow-inner transition-all focus-within:border-brand/30">
                        <div className="flex items-center pb-2 pr-2 gap-2 text-gray-500">
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="hover:text-brand transition-colors p-1.5 hover:bg-white/5 rounded-full" disabled={isUploading}><ImageIcon size={22} /></button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                        </div>
                        <input ref={inputRef} value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={replyTo ? "اكتب ردك..." : `رسالة في ${selectedSubject.name}...`} className="flex-1 bg-transparent px-2 py-3 text-sm font-bold text-white outline-none placeholder:text-gray-600 max-h-32" disabled={isUploading} autoComplete="off" dir="auto" />
                        <button type="submit" disabled={(!newMessage.trim() && !imageFile) || isUploading} className={`p-3 rounded-full transition-all duration-300 ${newMessage.trim() || imageFile ? 'bg-brand text-black shadow-[0_0_15px_rgba(255,198,51,0.4)] scale-100 rotate-0' : 'bg-white/5 text-gray-600 scale-90 rotate-45'}`}>
                            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className={(newMessage.trim() || imageFile) ? 'rtl:-rotate-90' : ''} />}
                        </button>
                    </form>
                </div>
            </div>,
            document.body
        );
    }

    // --- Main Subjects Grid ---
    return (
        <div className="h-full bg-black flex flex-col font-cairo overflow-hidden">
            <div className="bg-neutral-900/60 border-b border-white/5 h-14 flex items-center justify-around px-4 shrink-0">
                {[
                    { id: 'communities', icon: Globe, label: 'المجتمعات' },
                    { id: 'posts', icon: LayoutGrid, label: 'المنشورات' }
                ].map(tab => (
                    <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); playClickSound(); }} className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all ${activeTab === tab.id ? 'bg-brand text-black font-black shadow-lg scale-105' : 'text-gray-500 text-[10px]'}`}>
                        <tab.icon size={14}/>
                        <span className="font-black uppercase tracking-tighter">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto pb-24 custom-scrollbar bg-gradient-to-b from-black to-neutral-900/20 optimize-scrolling">
                {activeTab === 'posts' ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10 animate-fadeIn gpu-accelerated">
                        <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mb-6"><Sparkles className="text-brand w-8 h-8 animate-pulse" /></div>
                        <h2 className="text-xl font-black text-white mb-2">ركن المنشورات</h2>
                        <p className="text-gray-500 text-[8px] font-black uppercase tracking-[0.4em]">قريباً في التحديثات القادمة</p>
                    </div>
                ) : (
                    <div className="p-4 animate-fadeIn max-w-2xl mx-auto space-y-6 gpu-accelerated">
                        <div className="text-center py-4">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">اختر المجتمع الدراسي</p>
                            <div className="w-8 h-1 bg-brand mx-auto mt-2 rounded-full"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 w-full">
                            {ALL_SUBJECTS_LIST.map((sub) => {
                                const v = SUBJECT_VISUALS[sub.id] || { gradient: 'from-neutral-600/20 to-black', icon: '📚' };
                                const hasUnread = unreadSubjects.has(sub.id);
                                return (
                                    <div key={sub.id} onClick={() => { setSelectedSubject(sub); playClickSound(); }} className="bg-neutral-900/40 backdrop-blur-2xl border border-white/5 shadow-xl hover:border-brand/30 active:scale-[0.97] transition-all duration-300 cursor-pointer aspect-square rounded-[2rem] flex flex-col items-center justify-center gap-2 text-center overflow-hidden relative group">
                                        <div className={`absolute inset-0 bg-gradient-to-b ${v.gradient} opacity-20 transition-opacity group-hover:opacity-40`}></div>
                                        {hasUnread && <div className="absolute top-4 right-4 z-20 animate-bounce"><div className="w-3 h-3 bg-brand rounded-full shadow-[0_0_10px_#ffc633]"></div></div>}
                                        <span className="text-3xl relative z-10 group-hover:scale-110 transition-transform">{v.icon}</span>
                                        <h3 className="font-black text-[11px] text-white relative z-10 px-2 line-clamp-1">{sub.name}</h3>
                                        <div className="absolute bottom-3 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1"><MessageCircle size={8} className="text-brand" /><span className="text-[7px] text-brand font-black uppercase tracking-tighter">دخول</span></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommunityScreen;
