
import ReactGA from "react-ga4";
import { supabase } from './supabase';

// معرف القياس الخاص بك
const MEASUREMENT_ID: string = "G-8E8HHRJMLR"; 

export const initGA = () => {
  // التحقق من أننا في بيئة المتصفح
  if (typeof window !== "undefined" && MEASUREMENT_ID.startsWith("G-")) {
    ReactGA.initialize(MEASUREMENT_ID, {
        // إعدادات لضمان إرسال البيانات فوراً وبدقة
        gaOptions: {
            siteSpeedSampleRate: 100, // إرسال 100% من بيانات سرعة الموقع
            alwaysSendReferrer: true
        }
    });
    console.log("GA Initialized with High Precision");
  }
};

const logToSupabase = async (path: string, eventName: string = 'page_view', metadata: any = {}) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        // نتجاهل التسجيل الداخلي إذا لم يكن هناك مستخدم لتخفيف الضغط، أو نسجله كزائر
        await supabase.from('analytics_logs').insert({
            page: path,
            event: eventName,
            user_id: session?.user?.id || null,
            // يمكن توسيع الجدول لاحقاً لتخزين metadata إذا لزم الأمر
        });
    } catch (e) {
        // Silently fail
    }
};

export const logPageView = (path: string) => {
  if (typeof window !== "undefined" && MEASUREMENT_ID.startsWith("G-")) {
    ReactGA.send({ hitType: "pageview", page: path, title: document.title });
    logToSupabase(path, 'page_view');
  }
};

export const logEvent = (category: string, action: string, label?: string, value?: number) => {
  if (typeof window !== "undefined" && MEASUREMENT_ID.startsWith("G-")) {
    ReactGA.event({
      category,
      action,
      label,
      value
    });
    // Log meaningful events internally
    if (category === 'Game' || category === 'Auth') {
        logToSupabase(action, 'event', { category, label, value });
    }
  }
};
