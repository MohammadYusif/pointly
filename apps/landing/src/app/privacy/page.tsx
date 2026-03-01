'use client';

import { PageShell } from '@/components/PageShell';

const EN_CONTENT = [
  {
    heading: '1. Information We Collect',
    body: 'We collect information you provide when registering as a merchant, including your business name, contact details, and payment information. We also collect transaction data processed through the Pointly platform, customer loyalty activity (points earned and redeemed), and usage data such as login times and dashboard interactions.',
  },
  {
    heading: '2. How We Use Your Information',
    body: 'We use the information to operate and improve the Pointly platform, process loyalty transactions on your behalf, send you service communications and product updates, comply with legal obligations under Saudi law, and generate anonymised analytics to improve our network.',
  },
  {
    heading: '3. Data Sharing',
    body: 'We do not sell your personal data. We share data only with service providers necessary to deliver the platform (e.g. cloud hosting, payment processors), other merchants in the Pointly network strictly for the purpose of cross-merchant loyalty redemptions, and regulatory authorities when required by Saudi law.',
  },
  {
    heading: '4. Data Retention',
    body: 'We retain merchant account data for the duration of your subscription and for up to five years thereafter to meet legal and audit requirements. Transaction records are retained for seven years in accordance with Saudi regulatory standards.',
  },
  {
    heading: '5. Security',
    body: 'We use industry-standard encryption (TLS in transit, AES-256 at rest) and restrict access to your data to authorised personnel only. Our infrastructure is hosted in the AWS Middle East (Bahrain) region.',
  },
  {
    heading: '6. Your Rights',
    body: 'You have the right to access, correct, or delete your personal data at any time. To exercise these rights, contact us through our website. We will respond within 14 business days.',
  },
  {
    heading: '7. Contact',
    body: 'For privacy-related enquiries, please reach out through our website.',
  },
];

const AR_CONTENT = [
  {
    heading: '1. المعلومات التي نجمعها',
    body: 'نجمع المعلومات التي تقدمها عند التسجيل كتاجر، بما في ذلك اسم نشاطك التجاري وبيانات الاتصال ومعلومات الدفع. كما نجمع بيانات المعاملات المعالجة عبر منصة بوينتلي، ونشاط ولاء العملاء (النقاط المكتسبة والمستردة)، وبيانات الاستخدام مثل أوقات تسجيل الدخول وتفاعلات لوحة التحكم.',
  },
  {
    heading: '2. كيف نستخدم معلوماتك',
    body: 'نستخدم المعلومات لتشغيل منصة بوينتلي وتحسينها، ومعالجة معاملات الولاء نيابةً عنك، وإرسال اتصالات الخدمة وتحديثات المنتج، والامتثال للالتزامات القانونية بموجب النظام السعودي، وإنشاء تحليلات مجهولة الهوية لتحسين شبكتنا.',
  },
  {
    heading: '3. مشاركة البيانات',
    body: 'لا نبيع بياناتك الشخصية. نشارك البيانات فقط مع مزودي الخدمات الضروريين لتقديم المنصة (مثل الاستضافة السحابية ومعالجات الدفع)، والتجار الآخرين في شبكة بوينتلي حصراً لأغراض استرداد النقاط عبر المتاجر، والجهات التنظيمية عند الاقتضاء بموجب النظام السعودي.',
  },
  {
    heading: '4. الاحتفاظ بالبيانات',
    body: 'نحتفظ ببيانات حساب التاجر طوال مدة اشتراكك ولمدة خمس سنوات بعد ذلك لتلبية المتطلبات القانونية ومتطلبات التدقيق. يتم الاحتفاظ بسجلات المعاملات لمدة سبع سنوات وفقاً للمعايير التنظيمية السعودية.',
  },
  {
    heading: '5. الأمن',
    body: 'نستخدم تشفيراً بمعايير الصناعة (TLS أثناء النقل وAES-256 في حالة الراحة) ونقصر الوصول إلى بياناتك على الموظفين المخوّلين فقط. بنيتنا التحتية مستضافة في منطقة AWS الشرق الأوسط (البحرين).',
  },
  {
    heading: '6. حقوقك',
    body: 'يحق لك الوصول إلى بياناتك الشخصية أو تصحيحها أو حذفها في أي وقت. لممارسة هذه الحقوق، تواصل معنا عبر موقعنا. سنرد خلال 14 يوم عمل.',
  },
  {
    heading: '7. التواصل',
    body: 'للاستفسارات المتعلقة بالخصوصية، تواصل معنا عبر موقعنا.',
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
