export type Locale = 'en' | 'ar';

export const translations = {
  en: {
    nav: {
      features: 'Features',
      network: 'Network',
      tiers: 'Tiers',
      pricing: 'Pricing',
      about: 'About',
      getStarted: 'Get Started',
      login: 'Merchant Login',
    },
    hero: {
      badge: 'Now live in Saudi Arabia',
      title: 'One loyalty card.',
      titleHighlight: 'Every merchant.',
      subtitle:
        'Pointly connects Saudi businesses into a unified rewards network. Customers earn points everywhere — merchants grow together.',
      cta: 'Start free trial',
      secondary: 'See how it works',
    },
    stats: {
      merchants: 'Active Merchants',
      customers: 'Enrolled Customers',
      points: 'Points Issued',
      cities: 'Cities',
    },
    features: {
      label: 'Features',
      title: 'Everything you need to run a loyalty program',
      subtitle:
        'No hardware. No integration headaches. Just a simple dashboard and a network that grows with every merchant.',
      items: [
        {
          title: 'Instant Setup',
          desc: 'Sign up and start rewarding customers in minutes. No POS integration required.',
        },
        {
          title: 'Dual Points System',
          desc: 'Customers earn global Pointly points and your store-specific points simultaneously.',
        },
        {
          title: 'Smart Tiers',
          desc: 'Four automatic tiers — Bronze to Diamond — with higher multipliers as customers engage more.',
        },
        {
          title: 'Manual Entry',
          desc: "Enter any transaction amount manually — we'll calculate and award points instantly.",
        },
        {
          title: 'Real-time Dashboard',
          desc: 'Track customers, transactions, and tier distribution from a clean merchant portal.',
        },
        {
          title: 'Easy Redemption',
          desc: 'Customers redeem at 0.01 SAR per point. Simple, transparent, and trusted.',
        },
      ],
    },
    network: {
      label: 'The Pointly Network',
      title: 'One card, every store',
      subtitle:
        'When you join Pointly, your customers can earn and spend their global points at any merchant in the network — giving them more reasons to come back to you.',
      pointOne: 'Earn global points at any Pointly merchant',
      pointTwo: 'Plus earn bonus points specific to each store',
      pointThree: 'Redeem anywhere in the network',
      merchants: ['☕ Café', '🍕 Restaurant', '💇 Salon', '🛒 Grocery', '🏋️ Gym', '📚 Bookstore'],
    },
    tiers: {
      label: 'Customer Tiers',
      title: 'Loyalty that rewards engagement',
      subtitle:
        'Customers automatically progress through tiers as they earn points. Higher tiers earn faster — and they stay loyal because the rewards are real.',
      items: [
        { name: 'Bronze', emoji: '🥉', threshold: '0 pts', multiplier: '1.0×', color: 'bronze' },
        { name: 'Gold', emoji: '🥇', threshold: '5,000 pts', multiplier: '1.1×', color: 'gold' },
        {
          name: 'Platinum',
          emoji: '💎',
          threshold: '10,000 pts',
          multiplier: '1.15×',
          color: 'platinum',
        },
        {
          name: 'Diamond',
          emoji: '👑',
          threshold: '15,000 pts',
          multiplier: '1.2×',
          color: 'diamond',
        },
      ],
      multiplierLabel: 'earn rate',
      thresholdLabel: 'to unlock',
    },
    pricing: {
      label: 'Simple Pricing',
      title: 'Transparent, flat-rate plans',
      subtitle: 'No per-transaction fees. No hidden costs. Pick the plan that fits your business.',
      plans: [
        {
          name: 'Starter',
          price: '75',
          desc: 'Perfect for small shops just getting started with loyalty.',
          features: [
            'Up to 500 enrolled customers',
            'Manual transaction entry',
            'Basic analytics',
            'Email support',
            'Pointly network access',
          ],
          cta: 'Start free trial',
          popular: false,
        },
        {
          name: 'Professional',
          price: '105',
          desc: 'For growing businesses that want more insights and customers.',
          features: [
            'Up to 2,000 enrolled customers',
            'Advanced analytics & reports',
            'Priority support',
            'Custom tier branding',
            'Pointly network access',
          ],
          cta: 'Start free trial',
          popular: true,
        },
        {
          name: 'Enterprise',
          price: '175',
          desc: 'For established merchants with high volume and team needs.',
          features: [
            'Unlimited customers',
            'Full analytics suite',
            'Dedicated account manager',
            'API access',
            'Pointly network access',
          ],
          cta: 'Contact sales',
          popular: false,
        },
      ],
      perMonth: '/ month SAR',
      mostPopular: 'MOST POPULAR',
    },
    about: {
      label: 'About Pointly',
      title: 'Built for Saudi SMBs',
      subtitle:
        'We believe loyalty programs should be simple enough for a corner café and powerful enough for a growing chain. Pointly was built from the ground up for the Saudi market.',
      values: [
        {
          title: 'Saudi-first',
          desc: 'Designed for the Saudi retail environment, with Arabic support, SAR pricing, and local compliance.',
        },
        {
          title: 'No hardware needed',
          desc: 'Works on any device with a browser. No expensive terminals or integrations required.',
        },
        {
          title: 'Network effects',
          desc: 'Every new merchant makes the network more valuable for everyone — customers and businesses alike.',
        },
      ],
      cards: [
        { label: 'Founded', value: '2024' },
        { label: 'Region', value: 'KSA' },
        { label: 'Merchants', value: '200+' },
      ],
    },
    cta: {
      label: 'Get Started',
      title: 'Ready to grow with loyalty?',
      subtitle:
        'Join hundreds of Saudi merchants already using Pointly to retain customers and grow revenue.',
      primary: 'Start your free trial',
      note: 'No credit card required. 14-day free trial.',
    },
    footer: {
      copy: '© 2025 Pointly. All rights reserved.',
      links: ['Privacy Policy', 'Terms of Service', 'Contact'],
    },
  },
  ar: {
    nav: {
      features: 'المميزات',
      network: 'الشبكة',
      tiers: 'المستويات',
      pricing: 'الأسعار',
      about: 'عن بوينتلي',
      getStarted: 'ابدأ الآن',
      login: 'دخول التاجر',
    },
    hero: {
      badge: 'متاح الآن في المملكة العربية السعودية',
      title: 'بطاقة ولاء واحدة.',
      titleHighlight: 'كل التجار.',
      subtitle:
        'بوينتلي يربط الشركات السعودية في شبكة مكافآت موحدة. يكسب العملاء النقاط في كل مكان — ويكبر التجار معاً.',
      cta: 'ابدأ تجربتك المجانية',
      secondary: 'شاهد كيف يعمل',
    },
    stats: {
      merchants: 'تاجر نشط',
      customers: 'عميل مسجل',
      points: 'نقطة تم إصدارها',
      cities: 'مدن',
    },
    features: {
      label: 'المميزات',
      title: 'كل ما تحتاجه لإدارة برنامج ولاء',
      subtitle: 'بدون أجهزة. بدون تعقيدات تكنولوجية. فقط لوحة تحكم بسيطة وشبكة تنمو مع كل تاجر.',
      items: [
        {
          title: 'إعداد فوري',
          desc: 'سجّل وابدأ بمكافأة العملاء في دقائق. لا حاجة لدمج نظام نقاط البيع.',
        },
        {
          title: 'نظام نقاط مزدوج',
          desc: 'يكسب العملاء نقاط بوينتلي العالمية ونقاط متجرك في آنٍ واحد.',
        },
        {
          title: 'مستويات ذكية',
          desc: 'أربعة مستويات تلقائية — برونز إلى ألماس — مع مضاعفات أعلى كلما زاد تفاعل العميل.',
        },
        {
          title: 'إدخال يدوي',
          desc: 'أدخل أي مبلغ معاملة يدوياً — وسنحسب النقاط ونمنحها فوراً.',
        },
        {
          title: 'لوحة تحكم حية',
          desc: 'تتبع العملاء والمعاملات وتوزيع المستويات من بوابة التاجر البسيطة.',
        },
        {
          title: 'استرداد سهل',
          desc: 'يسترد العملاء بمعدل 0.01 ريال لكل نقطة. بسيط وشفاف وموثوق.',
        },
      ],
    },
    network: {
      label: 'شبكة بوينتلي',
      title: 'بطاقة واحدة، كل المتاجر',
      subtitle:
        'عندما تنضم إلى بوينتلي، يمكن لعملائك كسب نقاطهم العالمية وإنفاقها في أي متجر في الشبكة — مما يمنحهم أسباباً أكثر للعودة إليك.',
      pointOne: 'اكسب نقاطاً عالمية في أي متجر بوينتلي',
      pointTwo: 'بالإضافة إلى نقاط إضافية خاصة بكل متجر',
      pointThree: 'استرد في أي مكان في الشبكة',
      merchants: ['☕ مقهى', '🍕 مطعم', '💇 صالون', '🛒 بقالة', '🏋️ نادي رياضي', '📚 مكتبة'],
    },
    tiers: {
      label: 'مستويات العملاء',
      title: 'ولاء يكافئ التفاعل',
      subtitle:
        'يتقدم العملاء تلقائياً عبر المستويات مع كسب النقاط. المستويات الأعلى تكسب أسرع — ويبقى العملاء لأن المكافآت حقيقية.',
      items: [
        { name: 'برونز', emoji: '🥉', threshold: '0 نقطة', multiplier: '1.0×', color: 'bronze' },
        { name: 'ذهبي', emoji: '🥇', threshold: '5,000 نقطة', multiplier: '1.1×', color: 'gold' },
        {
          name: 'بلاتيني',
          emoji: '💎',
          threshold: '10,000 نقطة',
          multiplier: '1.15×',
          color: 'platinum',
        },
        {
          name: 'ألماس',
          emoji: '👑',
          threshold: '15,000 نقطة',
          multiplier: '1.2×',
          color: 'diamond',
        },
      ],
      multiplierLabel: 'معدل الكسب',
      thresholdLabel: 'للوصول',
    },
    pricing: {
      label: 'أسعار بسيطة',
      title: 'خطط بأسعار ثابتة وشفافة',
      subtitle: 'بدون رسوم لكل معاملة. بدون تكاليف خفية. اختر الخطة المناسبة لعملك.',
      plans: [
        {
          name: 'المبتدئ',
          price: '75',
          desc: 'مثالي للمتاجر الصغيرة التي تبدأ برنامج الولاء.',
          features: [
            'حتى 500 عميل مسجل',
            'إدخال يدوي للمعاملات',
            'تحليلات أساسية',
            'دعم بالبريد الإلكتروني',
            'الوصول إلى شبكة بوينتلي',
          ],
          cta: 'ابدأ تجربتك المجانية',
          popular: false,
        },
        {
          name: 'الاحترافي',
          price: '105',
          desc: 'للشركات المتنامية التي تريد المزيد من الإحصاءات والعملاء.',
          features: [
            'حتى 2,000 عميل مسجل',
            'تحليلات وتقارير متقدمة',
            'دعم ذو أولوية',
            'تخصيص علامة المستويات',
            'الوصول إلى شبكة بوينتلي',
          ],
          cta: 'ابدأ تجربتك المجانية',
          popular: true,
        },
        {
          name: 'المؤسسات',
          price: '175',
          desc: 'للتجار الراسخين ذوي الحجم الكبير واحتياجات الفريق.',
          features: [
            'عملاء غير محدودين',
            'مجموعة تحليلات كاملة',
            'مدير حساب مخصص',
            'وصول API',
            'الوصول إلى شبكة بوينتلي',
          ],
          cta: 'تواصل مع المبيعات',
          popular: false,
        },
      ],
      perMonth: '/ شهر ريال',
      mostPopular: 'الأكثر شعبية',
    },
    about: {
      label: 'عن بوينتلي',
      title: 'مصمم للشركات الصغيرة والمتوسطة في السعودية',
      subtitle:
        'نؤمن بأن برامج الولاء يجب أن تكون بسيطة بما يكفي لمقهى صغير وقوية بما يكفي لسلسلة متنامية. بوينتلي مبني من الصفر للسوق السعودي.',
      values: [
        {
          title: 'السوق السعودي أولاً',
          desc: 'مصمم للبيئة التجارية السعودية، مع دعم اللغة العربية وأسعار الريال والامتثال المحلي.',
        },
        {
          title: 'لا حاجة لأجهزة',
          desc: 'يعمل على أي جهاز بمتصفح. لا حاجة لمحطات مكلفة أو دمج.',
        },
        {
          title: 'تأثيرات الشبكة',
          desc: 'كل تاجر جديد يجعل الشبكة أكثر قيمة للجميع — العملاء والشركات على حد سواء.',
        },
      ],
      cards: [
        { label: 'تأسست', value: '2024' },
        { label: 'المنطقة', value: 'المملكة العربية السعودية' },
        { label: 'التجار', value: '+200' },
      ],
    },
    cta: {
      label: 'ابدأ الآن',
      title: 'هل أنت مستعد للنمو مع برنامج الولاء؟',
      subtitle:
        'انضم إلى مئات التجار السعوديين الذين يستخدمون بوينتلي بالفعل لاستبقاء العملاء وزيادة الإيرادات.',
      primary: 'ابدأ تجربتك المجانية',
      note: 'لا حاجة لبطاقة ائتمان. تجربة مجانية لمدة 14 يومًا.',
    },
    footer: {
      copy: '© 2025 بوينتلي. جميع الحقوق محفوظة.',
      links: ['سياسة الخصوصية', 'شروط الخدمة', 'تواصل معنا'],
    },
  },
} as const;

export type TranslationKeys = (typeof translations)[Locale];
