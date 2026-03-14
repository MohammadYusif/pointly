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
      customerPortal: 'Customer Portal',
    },
    hero: {
      badge: 'Coming soon to Saudi Arabia',
      title: 'One loyalty card.',
      titleHighlight: 'Every merchant.',
      subtitle:
        'Pointly connects Saudi businesses into a unified rewards network. Customers earn points everywhere — merchants grow together.',
      cta: 'Start free trial',
      secondary: 'See how it works',
      floatEarned: '+240 pts earned',
      floatRedeemed: '−500 pts redeemed',
      cardMerchant: 'Al-Noor Coffee',
      globalPoints: 'global points',
      cardToTier: 'to Diamond',
    },
    stats: {
      merchants: 'Merchant Plans',
      customers: 'Loyalty Tiers',
      points: 'SAR to Points',
      cities: 'Region',
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
      merchants: ['Café', 'Restaurant', 'Salon', 'Grocery', 'Gym', 'Bookstore'],
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
          name: 'Basic',
          price: '75',
          desc: 'For single-location businesses starting their loyalty program.',
          features: [
            '1 point per SAR spent',
            'Min purchase: 10 SAR',
            '50-point welcome bonus',
            '1 store location',
            '100 SMS / month',
            'Pointly network access',
          ],
          cta: 'Start free trial',
          popular: false,
        },
        {
          name: 'Professional',
          price: '105',
          desc: 'For growing businesses managing multiple locations.',
          features: [
            '1 point per SAR spent',
            'Min purchase: 5 SAR',
            '100-point welcome bonus',
            'Up to 3 locations',
            '500 SMS / month',
            'Pointly network access',
          ],
          cta: 'Start free trial',
          popular: true,
        },
        {
          name: 'Enterprise',
          price: '175',
          desc: 'For high-volume merchants with an unlimited store network.',
          features: [
            '1 point per SAR spent',
            'No minimum purchase',
            '200-point welcome bonus',
            'Unlimited locations',
            '2,000 SMS / month',
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
      stats: [
        { label: 'Founded', value: '2026' },
        { label: 'Region', value: 'KSA' },
        { label: 'Merchant Plans', value: '3' },
        { label: 'Loyalty Tiers', value: '4' },
      ],
    },
    cta: {
      label: 'Get Started',
      title: 'Ready to grow with loyalty?',
      subtitle:
        'Be among the first Saudi merchants to launch a loyalty program that keeps customers coming back.',
      primary: 'Start your free trial',
      note: 'No credit card required. 14-day free trial.',
    },
    footer: {
      tagline: 'The unified loyalty network for Saudi merchants.',
      copy: '© 2026 Pointly. All rights reserved.',
      legal: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
      ],
      columns: [
        {
          title: 'Product',
          links: [
            { label: 'Features', href: '/#features' },
            { label: 'Pricing', href: '/#pricing' },
            { label: 'Tiers', href: '/#tiers' },
            { label: 'Network', href: '/#network' },
          ],
        },
        {
          title: 'Company',
          links: [
            { label: 'About', href: '/#about' },
            { label: 'Blog', href: '/blog' },
            { label: 'Careers', href: '/careers' },
          ],
        },
        {
          title: 'Support',
          links: [
            { label: 'Contact', href: '/contact' },
            { label: 'Help Center', href: '/help' },
          ],
        },
      ],
    },
    pages: {
      blog: {
        title: 'Blog',
        subtitle:
          "Insights on loyalty, Saudi retail, and growing your business. We're just getting started.",
        empty: "No posts yet — we're building the product first. Check back soon.",
      },
      careers: {
        title: 'Careers',
        subtitle: "We're building the loyalty network for Saudi Arabia. Come build it with us.",
        body: "No open roles at the moment. We'll announce opportunities here when they open up.",
      },
      contact: {
        title: 'Contact Us',
        subtitle: 'Have a question or want to learn more about Pointly?',
        body: "We're setting up our contact channels. Check back soon.",
      },
      help: {
        title: 'Help Center',
        subtitle: 'Guides and support for Pointly merchants.',
        body: "We're building our help documentation. Check back soon.",
      },
      privacy: {
        title: 'Privacy Policy',
        updated: 'Last updated: March 2026',
      },
      terms: {
        title: 'Terms of Service',
        updated: 'Last updated: March 2026',
      },
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
      customerPortal: 'بوابة العميل',
    },
    hero: {
      badge: 'قادم قريباً إلى المملكة العربية السعودية',
      title: 'بطاقة ولاء واحدة.',
      titleHighlight: 'كل التجار.',
      subtitle:
        'بوينتلي يربط الشركات السعودية في شبكة مكافآت موحدة. يكسب العملاء النقاط في كل مكان — ويكبر التجار معاً.',
      cta: 'ابدأ تجربتك المجانية',
      secondary: 'شاهد كيف يعمل',
      floatEarned: '+240 نقطة مكتسبة',
      floatRedeemed: '−500 نقطة مستردة',
      cardMerchant: 'قهوة النور',
      globalPoints: 'نقطة عالمية',
      cardToTier: 'إلى ألماس',
    },
    stats: {
      merchants: 'خطط التجار',
      customers: 'مستويات الولاء',
      points: 'ريال مقابل نقطة',
      cities: 'المنطقة',
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
      merchants: ['مقهى', 'مطعم', 'صالون', 'بقالة', 'نادي رياضي', 'مكتبة'],
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
          name: 'الأساسي',
          price: '75',
          desc: 'للمتاجر ذات الفرع الواحد التي تبدأ برنامج الولاء.',
          features: [
            'نقطة واحدة لكل ريال',
            'الحد الأدنى للشراء: 10 ريال',
            'مكافأة ترحيبية 50 نقطة',
            'فرع واحد',
            '100 رسالة SMS / شهرياً',
            'الوصول إلى شبكة بوينتلي',
          ],
          cta: 'ابدأ تجربتك المجانية',
          popular: false,
        },
        {
          name: 'الاحترافي',
          price: '105',
          desc: 'للشركات المتنامية التي تدير فروعاً متعددة.',
          features: [
            'نقطة واحدة لكل ريال',
            'الحد الأدنى للشراء: 5 ريال',
            'مكافأة ترحيبية 100 نقطة',
            'حتى 3 فروع',
            '500 رسالة SMS / شهرياً',
            'الوصول إلى شبكة بوينتلي',
          ],
          cta: 'ابدأ تجربتك المجانية',
          popular: true,
        },
        {
          name: 'المؤسسات',
          price: '175',
          desc: 'للتجار ذوي الحجم الكبير وشبكة الفروع غير المحدودة.',
          features: [
            'نقطة واحدة لكل ريال',
            'بدون حد أدنى للشراء',
            'مكافأة ترحيبية 200 نقطة',
            'فروع غير محدودة',
            '2,000 رسالة SMS / شهرياً',
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
      stats: [
        { label: 'تأسست', value: '2026' },
        { label: 'المنطقة', value: 'KSA' },
        { label: 'خطط التجار', value: '3' },
        { label: 'مستويات الولاء', value: '4' },
      ],
    },
    cta: {
      label: 'ابدأ الآن',
      title: 'هل أنت مستعد للنمو مع برنامج الولاء؟',
      subtitle: 'كن من أوائل التجار السعوديين الذين يطلقون برنامج ولاء يجعل العملاء يعودون دائماً.',
      primary: 'ابدأ تجربتك المجانية',
      note: 'لا حاجة لبطاقة ائتمان. تجربة مجانية لمدة 14 يومًا.',
    },
    footer: {
      tagline: 'شبكة الولاء الموحدة للتجار السعوديين.',
      copy: '© 2026 بوينتلي. جميع الحقوق محفوظة.',
      legal: [
        { label: 'سياسة الخصوصية', href: '/privacy' },
        { label: 'شروط الخدمة', href: '/terms' },
      ],
      columns: [
        {
          title: 'المنتج',
          links: [
            { label: 'المميزات', href: '/#features' },
            { label: 'الأسعار', href: '/#pricing' },
            { label: 'المستويات', href: '/#tiers' },
            { label: 'الشبكة', href: '/#network' },
          ],
        },
        {
          title: 'الشركة',
          links: [
            { label: 'عن بوينتلي', href: '/#about' },
            { label: 'المدونة', href: '/blog' },
            { label: 'الوظائف', href: '/careers' },
          ],
        },
        {
          title: 'الدعم',
          links: [
            { label: 'تواصل معنا', href: '/contact' },
            { label: 'مركز المساعدة', href: '/help' },
          ],
        },
      ],
    },
    pages: {
      blog: {
        title: 'المدونة',
        subtitle: 'رؤى حول الولاء والتجزئة السعودية ونمو أعمالك. نحن بدأنا للتو.',
        empty: 'لا مقالات بعد — نحن نبني المنتج أولاً. تابعنا قريباً.',
      },
      careers: {
        title: 'الوظائف',
        subtitle: 'نحن نبني شبكة الولاء للمملكة العربية السعودية. انضم إلينا.',
        body: 'لا توجد وظائف شاغرة حالياً. سنعلن عن الفرص هنا عند توفرها.',
      },
      contact: {
        title: 'تواصل معنا',
        subtitle: 'هل لديك سؤال أو تريد معرفة المزيد عن بوينتلي؟',
        body: 'نحن نُجهّز قنوات التواصل. تابعنا قريباً.',
      },
      help: {
        title: 'مركز المساعدة',
        subtitle: 'أدلة ودعم لتجار بوينتلي.',
        body: 'نبني توثيق المساعدة. تابعنا قريباً.',
      },
      privacy: {
        title: 'سياسة الخصوصية',
        updated: 'آخر تحديث: مارس 2026',
      },
      terms: {
        title: 'شروط الخدمة',
        updated: 'آخر تحديث: مارس 2026',
      },
    },
  },
} as const;

export type TranslationKeys = (typeof translations)[Locale];
