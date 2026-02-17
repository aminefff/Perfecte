
// نظام تخزين مؤقت في الذاكرة (RAM) لجعل الانتقال فورياً
// هذا يمنع طلب البيانات من السيرفر عند العودة لصفحة سابقة

type CacheStore = {
    lessons: Record<string, any[]>; // key: section_id
    exams: Record<string, any[]>;   // key: subject
    community: Record<string, any[]>; // key: subject_id
    progress: Set<string>; // 'user_id:lesson_id'
};

const appCache: CacheStore = {
    lessons: {},
    exams: {},
    community: {},
    progress: new Set()
};

export const CacheManager = {
    // الدروس
    getLessons: (sectionId: string) => appCache.lessons[sectionId],
    setLessons: (sectionId: string, data: any[]) => { appCache.lessons[sectionId] = data; },
    
    // الامتحانات
    getExams: (subject: string) => appCache.exams[subject],
    setExams: (subject: string, data: any[]) => { appCache.exams[subject] = data; },

    // المجتمع (الرسائل)
    getMessages: (subjectId: string) => appCache.community[subjectId],
    setMessages: (subjectId: string, data: any[]) => { appCache.community[subjectId] = data; },
    appendMessage: (subjectId: string, msg: any) => {
        if (!appCache.community[subjectId]) appCache.community[subjectId] = [];
        appCache.community[subjectId].push(msg);
    },

    // التقدم
    hasCompleted: (lessonId: number) => appCache.progress.has(lessonId.toString()),
    toggleCompletion: (lessonId: number) => {
        const id = lessonId.toString();
        if (appCache.progress.has(id)) appCache.progress.delete(id);
        else appCache.progress.add(id);
    },
    setAllProgress: (ids: string[]) => {
        ids.forEach(id => appCache.progress.add(id));
    },

    // مسح الذاكرة (عند الخروج)
    clear: () => {
        appCache.lessons = {};
        appCache.exams = {};
        appCache.community = {};
        appCache.progress = new Set();
    }
};
