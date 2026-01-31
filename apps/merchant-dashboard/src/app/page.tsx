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
  LanguageToggle,
  useRTL,
} from '@pointly/ui';
import { ArrowUpRight, CreditCard, DollarSign, Menu, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-muted/30 overflow-x-hidden">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar - slides from left for LTR, from right for RTL */}
      {mounted && (
        <div
          className={`fixed top-0 h-full w-64 bg-card z-50 transform transition-transform duration-300 ease-in-out md:hidden shadow-lg ltr:left-0 rtl:right-0 ${
            mobileMenuOpen
              ? 'translate-x-0'
              : 'ltr:-translate-x-full rtl:translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b ltr:flex-row rtl:flex-row-reverse">
            <Logo width={100} />
            <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex flex-col p-4 gap-1">
            <Button variant="ghost" className="justify-start" onClick={() => setMobileMenuOpen(false)}>
              {t('navigation.dashboard')}
            </Button>
            <Button variant="ghost" className="justify-start" onClick={() => setMobileMenuOpen(false)}>
              {t('navigation.customers')}
            </Button>
            <Button variant="ghost" className="justify-start" onClick={() => setMobileMenuOpen(false)}>
              {t('navigation.transactions')}
            </Button>
            <Button variant="ghost" className="justify-start" onClick={() => setMobileMenuOpen(false)}>
              {t('navigation.settings')}
            </Button>
          </nav>
        </div>
      )}

      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-30">
        <Container>
          <Flex justify="between" align="center" className="h-14 md:h-16">
            {/* Hamburger on left for LTR, on right for RTL */}
            <div className="flex items-center gap-2 ltr:flex-row rtl:flex-row-reverse">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Logo width={120} className="md:w-35" />
            </div>
            <Flex gap="2" align="center">
              {/* Hide nav on mobile, show on md+ */}
              <nav className="hidden md:flex md:gap-2">
                <Button variant="ghost" size="sm">
                  {t('navigation.dashboard')}
                </Button>
                <Button variant="ghost" size="sm">
                  {t('navigation.customers')}
                </Button>
                <Button variant="ghost" size="sm">
                  {t('navigation.transactions')}
                </Button>
                <Button variant="ghost" size="sm">
                  {t('navigation.settings')}
                </Button>
              </nav>
              <LanguageToggle />
            </Flex>
          </Flex>
        </Container>
      </header>

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
                <p className="text-xs text-muted-foreground truncate">{t('dashboard.pointsRate')}</p>
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
