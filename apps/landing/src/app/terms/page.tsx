'use client';

import { PageShell } from '@/components/PageShell';
import type { ReactNode } from 'react';

type Section = { heading: string; body: ReactNode };

const EN_CONTENT: Section[] = [
  {
    heading: '1. Service Description',
    body: 'Pointly is a SaaS loyalty platform that enables Saudi merchants to run a unified loyalty program. Merchants access the platform via a web dashboard to record transactions, award points to customers, and manage redemptions. Customers participate through a shared loyalty network across all enrolled merchants.',
  },
  {
    heading: '2. Merchant Account',
    body: (
      <>
        To use Pointly you must register a merchant account and provide accurate business
        information. You are responsible for maintaining the confidentiality of your login
        credentials and for all activity that occurs under your account. You must notify us
        immediately at <a href="mailto:support@pointly.sa">support@pointly.sa</a> if you suspect
        unauthorised access.
      </>
    ),
  },
  {
    heading: '3. Subscription and Billing',
    body: (
      <>
        <strong>
          ⚠ Auto-renewal notice: Pointly subscriptions automatically renew every month. Your payment
          method will be charged on the same date each month unless you cancel before the renewal
          date.
        </strong>
        <br />
        <br />
        Fees are as published on our pricing page and are billed in Saudi Riyals (SAR).{' '}
        <strong>
          All prices are exclusive of 15% Value Added Tax (VAT / ضريبة القيمة المضافة) as required
          by ZATCA.
        </strong>{' '}
        VAT will be added at checkout. We reserve the right to update pricing with 30 days written
        notice sent to your registered email address.
        <br />
        <br />
        Merchants who cancel within 3 business days of their first subscription payment may submit a
        refund request to <a href="mailto:support@pointly.sa">support@pointly.sa</a> for review. No
        refunds are issued for partial periods after the cooling-off window.
      </>
    ),
  },
  {
    heading: '4. Acceptable Use',
    body: 'You agree to use Pointly only for lawful business purposes in compliance with Saudi regulations. You must not misuse the points system, create fictitious transactions, or attempt to manipulate the loyalty network. Violations may result in immediate account termination without refund.',
  },
  {
    heading: '5. Intellectual Property',
    body: 'All software, trademarks, and content on the Pointly platform are owned by Pointly or its licensors. Your subscription grants you a limited, non-transferable licence to use the platform. You retain ownership of your merchant data and customer data.',
  },
  {
    heading: '6. Limitation of Liability',
    body: 'Pointly is provided "as is". To the maximum extent permitted by Saudi law, our liability to you is limited to the fees paid in the three months preceding the event giving rise to the claim. We are not liable for indirect, consequential, or lost profit damages.',
  },
  {
    heading: '7. Termination',
    body: 'Either party may terminate the subscription with 30 days written notice. We may terminate immediately for breach of these terms. Upon termination, your data will be exported and made available for 30 days before deletion.',
  },
  {
    heading: '8. Governing Law',
    body: 'These terms are governed by the laws of the Kingdom of Saudi Arabia. Any disputes shall be submitted to the competent courts of Riyadh.',
  },
  {
    heading: '9. Contact',
    body: (
      <>
        For questions about these terms, email{' '}
        <a href="mailto:legal@pointly.sa">legal@pointly.sa</a>.
      </>
    ),
  },
];

const AR_CONTENT: Section[] = [
  {
    heading: '1. وصف الخدمة',
    body: 'بوينتلي هي منصة ولاء SaaS تُمكّن التجار السعوديين من إدارة برنامج ولاء موحّد. يصل التجار إلى المنصة عبر لوحة تحكم ويب لتسجيل المعاملات ومنح النقاط للعملاء وإدارة عمليات الاسترداد. يشارك العملاء من خلال شبكة ولاء مشتركة عبر جميع التجار المسجلين.',
  },
  {
    heading: '2. حساب التاجر',
    body: (
      <>
        لاستخدام بوينتلي، يجب عليك تسجيل حساب تاجر وتقديم معلومات تجارية دقيقة. أنت مسؤول عن الحفاظ
        على سرية بيانات تسجيل الدخول وعن جميع الأنشطة التي تجري تحت حسابك. يجب إخطارنا فوراً على{' '}
        <a href="mailto:support@pointly.sa">support@pointly.sa</a> في حال اشتبهت بوصول غير مصرح به.
      </>
    ),
  },
  {
    heading: '3. الاشتراك والفواتير',
    body: (
      <>
        <strong>
          ⚠ تنبيه التجديد التلقائي: تتجدد اشتراكات بوينتلي تلقائياً كل شهر. سيتم خصم المبلغ من طريقة
          الدفع الخاصة بك في نفس التاريخ كل شهر ما لم تقم بالإلغاء قبل تاريخ التجديد.
        </strong>
        <br />
        <br />
        الرسوم كما هو منشور في صفحة الأسعار وتُفوتر بالريال السعودي.{' '}
        <strong>
          جميع الأسعار لا تشمل ضريبة القيمة المضافة بنسبة 15% (VAT) وفقاً لمتطلبات هيئة الزكاة
          والضريبة والجمارك (زاتكا).
        </strong>{' '}
        ستُضاف ضريبة القيمة المضافة عند الدفع. نحتفظ بالحق في تحديث الأسعار مع إشعار كتابي مدته 30
        يوماً يُرسل إلى بريدك الإلكتروني المسجل.
        <br />
        <br />
        يجوز للتجار الذين يلغون خلال 3 أيام عمل من دفعة الاشتراك الأولى تقديم طلب استرداد إلى{' '}
        <a href="mailto:support@pointly.sa">support@pointly.sa</a> للمراجعة. لا يتم استرداد أموال
        للفترات الجزئية بعد نافذة التراجع.
      </>
    ),
  },
  {
    heading: '4. الاستخدام المقبول',
    body: 'توافق على استخدام بوينتلي لأغراض تجارية مشروعة فقط وفقاً للأنظمة السعودية. يُحظر إساءة استخدام نظام النقاط أو إنشاء معاملات وهمية أو محاولة التلاعب بشبكة الولاء. قد تؤدي الانتهاكات إلى إنهاء الحساب فوراً دون استرداد.',
  },
  {
    heading: '5. الملكية الفكرية',
    body: 'جميع البرامج والعلامات التجارية والمحتوى على منصة بوينتلي مملوكة لبوينتلي أو مرخصيها. يمنحك اشتراكك ترخيصاً محدوداً وغير قابل للتحويل لاستخدام المنصة. تحتفظ بملكية بيانات تاجرك وبيانات عملائك.',
  },
  {
    heading: '6. تحديد المسؤولية',
    body: 'يُقدَّم بوينتلي "كما هو". في أقصى حد تسمح به الأنظمة السعودية، تقتصر مسؤوليتنا تجاهك على الرسوم المدفوعة في الأشهر الثلاثة السابقة للحدث المُنشئ للمطالبة. لسنا مسؤولين عن الأضرار غير المباشرة أو التبعية أو خسارة الأرباح.',
  },
  {
    heading: '7. الإنهاء',
    body: 'يجوز لأي من الطرفين إنهاء الاشتراك بإشعار كتابي مدته 30 يوماً. يجوز لنا الإنهاء الفوري في حالة انتهاك هذه الشروط. عند الإنهاء، ستُصدَّر بياناتك وتُتاح لمدة 30 يوماً قبل الحذف.',
  },
  {
    heading: '8. القانون الحاكم',
    body: 'تخضع هذه الشروط لأنظمة المملكة العربية السعودية. تُحال أي نزاعات إلى المحاكم المختصة في الرياض.',
  },
  {
    heading: '9. التواصل',
    body: (
      <>
        للاستفسارات حول هذه الشروط، راسلنا على{' '}
        <a href="mailto:legal@pointly.sa">legal@pointly.sa</a>.
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <PageShell>
      {(t, isRtl) => {
        const content = isRtl ? AR_CONTENT : EN_CONTENT;
        return (
          <div className="container">
            <div className="inner-hero">
              <h1>{t.pages.terms.title}</h1>
              <p>{t.pages.terms.updated}</p>
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
