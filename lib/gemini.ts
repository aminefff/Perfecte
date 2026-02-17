
import { GoogleGenAI } from "@google/genai";

/**
 * تهيئة عميل Gemini باستخدام نظام تدوير المفاتيح (Key Rotation).
 * تم تحسين الكود ليتوافق تماماً مع Vite في بيئة الإنتاج (Vercel).
 */
export const initGemini = () => {
  const availableKeys: string[] = [];

  // 1. الوصول للمتغيرات عبر import.meta.env (الطريقة الصحيحة لـ Vite Production)
  // @ts-ignore
  const env = import.meta.env || {};
  
  // المفتاح الأساسي
  if (env.VITE_API_KEY && typeof env.VITE_API_KEY === 'string' && env.VITE_API_KEY.trim().length > 0) {
    availableKeys.push(env.VITE_API_KEY);
  }

  // تدوير المفاتيح من 1 إلى 20 (VITE_API_KEY_1 ... etc)
  for (let i = 1; i <= 20; i++) {
    const key = env[`VITE_API_KEY_${i}`];
    if (key && typeof key === 'string' && key.trim().length > 0) {
      availableKeys.push(key);
    }
  }

  // 2. محاولة احتياطية (Fallback) للمتغيرات العامة في حالة وجود إعدادات خاصة
  // ملاحظة: في Vercel Client-Side، عادة ما تكون process.env فارغة، لذا الاعتماد الأساسي على ما سبق
  if (availableKeys.length === 0 && typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      if (process.env.VITE_API_KEY) availableKeys.push(process.env.VITE_API_KEY);
  }

  // إزالة التكرارات
  const uniqueKeys = [...new Set(availableKeys)];

  // التحقق النهائي
  if (uniqueKeys.length === 0) {
      // رسالة خطأ داخلية للمطور فقط في الكونسول
      console.error("Gemini Error: No VITE_API_KEY found.");
      // رمي خطأ يتم التقاطه بواسطة formatGeminiError لعرض رسالة ودية
      throw new Error("API_KEY_MISSING");
  }

  // 3. اختيار مفتاح عشوائي لتوزيع الحمل
  const randomKey = uniqueKeys[Math.floor(Math.random() * uniqueKeys.length)];

  return new GoogleGenAI({ apiKey: randomKey });
};

/**
 * معالج أخطاء ذكي يعيد رسائل مفهومة للمستخدم العادي (يخفي التفاصيل التقنية).
 */
export const formatGeminiError = (error: any): string => {
  // تسجيل الخطأ التقني في الكونسول فقط للمطورين
  console.error("System Error Log:", error);

  if (!error) return "حدث خطأ غير متوقع، يرجى المحاولة.";

  const message = (error.message || error.toString()).toLowerCase();

  // 1. أخطاء الضغط والحدود (429 - 503) - تم التخصيص حسب طلبك
  if (message.includes('429') || message.includes('resource_exhausted') || message.includes('quota') || message.includes('overloaded') || message.includes('503')) {
    return "⚠️ هناك ضغط عالٍ على الخوادم حالياً نظراً لكثرة الطلبات. يرجى الانتظار دقيقة واحدة ثم إعادة المحاولة، سيتم إعطاء طلبك الأولوية.";
  }

  // 2. أخطاء الإدخال والمحتوى (400)
  if (message.includes('400') || message.includes('invalid_argument')) {
    return "تعذر معالجة هذا المحتوى لأنه قد يكون غير واضح أو مخالف للسياسات. حاول صياغته بشكل مختلف.";
  }

  // 3. أخطاء الصلاحيات والمفاتيح (403 - API Keys)
  if (message.includes('403') || message.includes('permission') || message.includes('key') || message.includes('api_key_missing')) {
    return "نواجه خللاً مؤقتاً في مفاتيح الاتصال، جاري التبديل للمفاتيح الاحتياطية. حاول مجدداً.";
  }

  // 4. أخطاء السيرفر الداخلية (500)
  if (message.includes('500') || message.includes('internal')) {
    return "حدث خطأ داخلي في الخادم، يرجى المحاولة بعد لحظات.";
  }

  // 5. أخطاء الشبكة والإنترنت
  if (message.includes('fetch') || message.includes('network') || message.includes('failed to fetch') || message.includes('offline')) {
    return "يرجى التحقق من اتصالك بالإنترنت.";
  }

  // رسالة عامة لأي خطأ آخر غير معروف
  return "حدث خطأ بسيط أثناء المعالجة، يرجى إعادة المحاولة.";
};
