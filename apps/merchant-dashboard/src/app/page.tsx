'use client';

import { Logo } from '@/components/Logo';
import { useTranslation } from '@pointly/i18n';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
  Flex,
  type NavItem,
  Navbar,
  useRTL,
} from '@pointly/ui';
import { ArrowUpRight, CreditCard, DollarSign, Users } from 'lucide-react';

// Mock data for the dashboard
const mockStats = {
  totalCustomers: 1234,
  activeCustomers: 987,
  totalTransactions: 5678,
  totalPointsIssued: 125000,
  totalRevenue: 45678.5,
  recentTransactions: [
    {
      id: '1',
      customer: 'أحمد الراشد',
      customerEn: 'Ahmed Al-Rashid',
      amount: 150,
      points: 150,
      date: '2024-01-15T10:30:00Z',
    },
    {
      id: '2',
      customer: 'فاطمة حسن',
      customerEn: 'Fatima Hassan',
      amount: 89.5,
      points: 89,
      date: '2024-01-15T09:15:00Z',
    },
    {
      id: '3',
      customer: 'محمد علي',
      customerEn: 'Mohammed Ali',
      amount: 250,
      points: 250,
      date: '2024-01-15T08:45:00Z',
    },
  ],
};

export default function DashboardPage() {
  const { t, formatCurrency, formatNumber, language } = useTranslation();
  const { textStart, textEnd, flipIcon } = useRTL();

  // Define navigation items
  const navItems: NavItem[] = [
    { key: 'dashboard', label: t('navigation.dashboard') },
    { key: 'customers', label: t('navigation.customers') },
    { key: 'transactions', label: t('navigation.transactions') },
    { key: 'settings', label: t('navigation.settings') },
  ];

  return (
    <div className="min-h-screen bg-muted/30 overflow-x-hidden">
      {/* Navbar */}
      <Navbar items={navItems} logo={<Logo width={120} className="md:w-35" />} showLanguageToggle />

      {/* Main Content */}
      <main className="py-4 md:py-8">
        <Container>
          <div className="mb-6 md:mb-8">
            <h1 className={`text-2xl md:text-3xl font-bold text-foreground ${textStart}`}>
              {t('dashboard.title')}
            </h1>
            <p className={`text-sm md:text-base text-muted-foreground mt-1 ${textStart}`}>
              {t('dashboard.welcomeMessage')}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
                <CardTitle className="text-xs md:text-sm font-medium">
                  {t('dashboard.totalCustomers')}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardHeader>
              <CardContent className="px-3 md:px-6">
                <div className="text-lg md:text-2xl font-bold truncate">
                  {formatNumber(mockStats.totalCustomers)}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {t('dashboard.activeCustomers', {
                    count: mockStats.activeCustomers,
                  })}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
                <CardTitle className="text-xs md:text-sm font-medium">
                  {t('dashboard.totalTransactions')}
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardHeader>
              <CardContent className="px-3 md:px-6">
                <div className="text-lg md:text-2xl font-bold truncate">
                  {formatNumber(mockStats.totalTransactions)}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {t('dashboard.fromLastMonth', { percent: 12 })}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
                <CardTitle className="text-xs md:text-sm font-medium">
                  {t('dashboard.pointsIssued')}
                </CardTitle>
                <ArrowUpRight className={`h-4 w-4 text-muted-foreground shrink-0 ${flipIcon}`} />
              </CardHeader>
              <CardContent className="px-3 md:px-6">
                <div className="text-lg md:text-2xl font-bold truncate">
                  {formatNumber(mockStats.totalPointsIssued)}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {t('dashboard.pointsRate')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
                <CardTitle className="text-xs md:text-sm font-medium">
                  {t('dashboard.totalRevenue')}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardHeader>
              <CardContent className="px-3 md:px-6">
                <div className="text-base md:text-2xl font-bold truncate">
                  {formatCurrency(mockStats.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {t('dashboard.fromLastMonth', { percent: 8 })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.recentTransactions')}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'أحدث معاملات عملائك' : 'Your latest customer transactions'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 md:space-y-4">
                {mockStats.recentTransactions.map((transaction) => (
                  <Flex
                    key={transaction.id}
                    justify="between"
                    align="center"
                    className="p-3 md:p-4 border rounded-lg"
                  >
                    <div className={textStart}>
                      <p className="font-medium">
                        {language === 'ar' ? transaction.customer : transaction.customerEn}
                      </p>
                      <p className="text-sm text-muted-foreground" suppressHydrationWarning>
                        {new Date(transaction.date).toLocaleString(
                          language === 'ar' ? 'ar-SA' : 'en-SA',
                        )}
                      </p>
                    </div>
                    <div className={textEnd}>
                      <p className="font-medium">{formatCurrency(transaction.amount)}</p>
                      <p className="text-sm text-green-600">
                        +{formatNumber(transaction.points)} {t('common.points')}
                      </p>
                    </div>
                  </Flex>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                {t('common.viewAll')} {t('navigation.transactions')}
              </Button>
            </CardContent>
          </Card>
        </Container>
      </main>
    </div>
  );
}
