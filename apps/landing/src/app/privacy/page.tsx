'use client';

import { PageShell } from '@/components/PageShell';

const EN_CONTENT = [
  {
    heading: '1. Information We Collect',
    body: 'We collect information you provide when registering as a merchant or customer, including business name, contact name, email address, and phone number. We also collect transaction data processed through the Pointly platform (points earned, redeemed, and gifted), customer loyalty activity and tier progression, usage data such as login times and dashboard interactions, and device and browser information for security and fraud prevention.',
  },
  {
    heading: '2. How We Use Your Information',
    body: 'We use the information to operate and improve the Pointly platform, process loyalty transactions on your behalf, send transactional SMS notifications (point updates, tier changes, decay warnings), send marketing SMS only to customers who have explicitly opted in, comply with legal obligations under Saudi law, and generate anonymised analytics to improve our network.',
  },
  {
    heading: '3. SMS Communications',
    body: 'We send two categories of SMS: (a) Transactional messages — OTP codes, point confirmations, tier changes, and decay warnings. These are sent as part of the service and do not require separate consent. (b) Marketing messages — campaign promotions and merchant offers. These are sent only to customers who explicitly opt in during registration. You may withdraw your SMS marketing consent at any time by contacting us at privacy@pointly.sa or updating your profile settings.',
  },
  {
    heading: '4. Data Sharing',
    body: 'We do not sell your personal data. We share data only with: (a) Service providers necessary to deliver the platform, including cloud hosting (AWS), payment processors (Moyasar), and SMS providers (Taqnyat); (b) Other merchants in the Pointly network, strictly for the purpose of cross-merchant loyalty redemptions — your loyalty activity (points balance and tier) may be visible to merchants you transact with; (c) Regulatory authorities when required by the laws of the Kingdom of Saudi Arabia. All service providers are contractually bound to process data only as instructed.',
  },
  {
    heading: '5. Cross-Border Data Transfers',
    body: 'Our platform infrastructure is currently hosted on AWS in the EU West (Ireland) region. This means your personal data is transferred outside the Kingdom of Saudi Arabia. We are working to comply with Article 29 of the Saudi Personal Data Protection Law (PDPL) regarding cross-border transfers and are implementing appropriate safeguards. By using Pointly, you acknowledge this transfer. We will notify users when data processing moves to a KSA-based region.',
  },
  {
    heading: '6. Data Retention',
    body: 'We retain merchant account data for the duration of your subscription and for up to five years thereafter to meet legal and audit requirements. Transaction records are retained for seven years in accordance with Saudi regulatory standards. Inactive customer accounts are subject to our point decay policy. You may request deletion of your personal data at any time; we will fulfill requests within 14 business days, subject to legal retention obligations.',
  },
  {
    heading: '7. Security',
    body: 'We use industry-standard encryption (TLS in transit, AES-256 at rest) and restrict access to your data to authorised personnel only. In the event of a personal data breach that is likely to affect your rights, we will notify the Saudi Data & AI Authority (SDAIA) within 72 hours of becoming aware of the breach and will inform affected users without undue delay.',
  },
  {
    heading: '8. Your Rights Under PDPL',
    body: "Under the Saudi Personal Data Protection Law (PDPL), you have the following rights regarding your personal data: (a) Access — request a copy of the personal data we hold about you; (b) Correction — request correction of inaccurate or incomplete data; (c) Deletion — request erasure of your data, subject to legal retention requirements; (d) Portability — request your data in a structured, machine-readable format; (e) Objection — object to processing of your data for specific purposes; (f) Restriction — request that we limit how we process your data while a dispute is resolved. To exercise any of these rights, contact us at privacy@pointly.sa. We will respond within 14 business days (within PDPL's 30-day statutory limit).",
  },
  {
    heading: '9. Contact',
    body: 'For privacy-related enquiries or to exercise your rights, contact us at privacy@pointly.sa. For general support, contact support@pointly.sa.',
  },
];

const AR_CONTENT = [
  {
    heading: '1. المعلومات التي نجمعها',
    body: 'نجمع المعلومات التي تقدمها عند التسجيل كتاجر أو عميل، بما في ذلك اسم النشاط التجاري واسم جهة الاتصال وعنوان البريد الإلكتروني ورقم الهاتف. كما نجمع بيانات المعاملات المعالجة عبر منصة بوينتلي (النقاط المكتسبة والمستردة والمُهداة)، ونشاط ولاء العملاء والارتقاء في المستويات، وبيانات الاستخدام مثل أوقات تسجيل الدخول وتفاعلات لوحة التحكم، ومعلومات الجهاز والمتصفح لأغراض الأمن ومكافحة الاحتيال.',
  },
  {
    heading: '2. كيف نستخدم معلوماتك',
    body: 'نستخدم المعلومات لتشغيل منصة بوينتلي وتحسينها، ومعالجة معاملات الولاء نيابةً عنك، وإرسال إشعارات الرسائل النصية التعاملية (تحديثات النقاط وتغيير المستويات وتحذيرات انتهاء الصلاحية)، وإرسال رسائل تسويقية عبر الرسائل النصية فقط للعملاء الذين وافقوا صراحةً، والامتثال للالتزامات القانونية بموجب النظام السعودي، وإنشاء تحليلات مجهولة الهوية لتحسين شبكتنا.',
  },
  {
    heading: '3. الرسائل النصية القصيرة (SMS)',
    body: 'نرسل فئتين من الرسائل النصية: (أ) الرسائل التعاملية — رموز OTP وتأكيدات النقاط وتغييرات المستويات وتحذيرات انتهاء الصلاحية. تُرسل هذه الرسائل كجزء من الخدمة ولا تستلزم موافقة منفصلة. (ب) الرسائل التسويقية — العروض الترويجية وعروض التجار. تُرسل فقط للعملاء الذين وافقوا صراحةً عند التسجيل. يمكنك سحب موافقتك على الرسائل التسويقية في أي وقت عبر التواصل معنا على privacy@pointly.sa أو من خلال إعدادات ملفك الشخصي.',
  },
  {
    heading: '4. مشاركة البيانات',
    body: 'لا نبيع بياناتك الشخصية. نشارك البيانات فقط مع: (أ) مزودي الخدمات الضروريين لتقديم المنصة، بما في ذلك الاستضافة السحابية (AWS) ومعالجات الدفع (Moyasar) ومزودي خدمات الرسائل النصية (Taqnyat)؛ (ب) التجار الآخرين في شبكة بوينتلي، حصراً لأغراض استرداد النقاط عبر المتاجر — قد يكون نشاط ولائك (رصيد النقاط والمستوى) مرئياً للتجار الذين تتعامل معهم؛ (ج) الجهات التنظيمية عند الاقتضاء بموجب نظام المملكة العربية السعودية. جميع مزودو الخدمات مُلزمون تعاقدياً بمعالجة البيانات وفق التعليمات فحسب.',
  },
  {
    heading: '5. نقل البيانات عبر الحدود',
    body: 'تستضاف بنيتنا التحتية حالياً على AWS في منطقة أوروبا الغربية (أيرلندا)، مما يعني نقل بياناتك الشخصية خارج المملكة العربية السعودية. نعمل على الامتثال للمادة 29 من نظام حماية البيانات الشخصية السعودي (PDPL) المتعلقة بالنقل عبر الحدود، وننفّذ الضمانات المناسبة. باستخدامك لبوينتلي، تُقرّ بهذا النقل. سنُعلم المستخدمين عند انتقال معالجة البيانات إلى منطقة سحابية داخل المملكة.',
  },
  {
    heading: '6. الاحتفاظ بالبيانات',
    body: 'نحتفظ ببيانات حساب التاجر طوال مدة اشتراكك ولمدة خمس سنوات بعد ذلك لتلبية المتطلبات القانونية ومتطلبات التدقيق. يتم الاحتفاظ بسجلات المعاملات لمدة سبع سنوات وفقاً للمعايير التنظيمية السعودية. يمكنك طلب حذف بياناتك الشخصية في أي وقت؛ سنستجيب خلال 14 يوم عمل، مع مراعاة التزامات الاحتفاظ القانونية.',
  },
  {
    heading: '7. الأمن',
    body: 'نستخدم تشفيراً بمعايير الصناعة (TLS أثناء النقل وAES-256 في حالة الراحة) ونقصر الوصول إلى بياناتك على الموظفين المخوّلين فقط. في حال وقوع خرق للبيانات الشخصية من المحتمل أن يؤثر على حقوقك، سنُخطر الهيئة السعودية للبيانات والذكاء الاصطناعي (SDAIA) خلال 72 ساعة من اكتشاف الخرق، وسنُعلم المستخدمين المتضررين دون تأخير.',
  },
  {
    heading: '8. حقوقك بموجب نظام PDPL',
    body: 'بموجب نظام حماية البيانات الشخصية السعودي (PDPL)، يحق لك فيما يخص بياناتك الشخصية: (أ) الوصول — طلب نسخة من البيانات الشخصية التي نحتفظ بها عنك؛ (ب) التصحيح — طلب تصحيح البيانات غير الدقيقة أو الناقصة؛ (ج) الحذف — طلب مسح بياناتك، مع مراعاة متطلبات الاحتفاظ القانونية؛ (د) قابلية النقل — طلب بياناتك بتنسيق منظم وقابل للقراءة آلياً؛ (هـ) الاعتراض — الاعتراض على معالجة بياناتك لأغراض محددة؛ (و) التقييد — طلب تحديد كيفية معالجة بياناتك خلال حل النزاع. لممارسة أي من هذه الحقوق، تواصل معنا على privacy@pointly.sa. سنرد خلال 14 يوم عمل (ضمن المهلة القانونية البالغة 30 يوماً بموجب PDPL).',
  },
  {
    heading: '9. التواصل',
    body: 'للاستفسارات المتعلقة بالخصوصية أو لممارسة حقوقك، تواصل معنا على privacy@pointly.sa. للدعم العام، تواصل معنا على support@pointly.sa.',
  },
];

export default function PrivacyPage() {
  return (
    <PageShell>
      {(t, isRtl) => {
        const content = isRtl ? AR_CONTENT : EN_CONTENT;
        return (
          <div className="container">
            <div className="inner-hero">
              <h1>{t.pages.privacy.title}</h1>
              <p>{t.pages.privacy.updated}</p>
            </div>
            <div className="legal-body">
              {content.map((section) => (
                <div key={section.heading}>
                  <h2>{section.heading}</h2>
                  <p>{section.body}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }}
    </PageShell>
  );
}
