'use client';

import { ConsentToggle } from '@/components/ConsentToggle';
import { CustomerLayout } from '@/components/CustomerLayout';
import { useCustomer, useMyMerchants, useUpdateCustomer } from '@/hooks/api';
import { signOut } from '@/lib/auth';
import { useTranslation } from '@pointly/i18n';
import { formatDate, formatPhone } from '@pointly/shared';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, useRTL } from '@pointly/ui';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="h-4 w-28 rounded-md bg-muted animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-16 rounded-md bg-muted animate-pulse" />
              <div className="h-5 w-32 rounded-md bg-muted animate-pulse" />
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
    </div>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { textStart, flipIcon } = useRTL();
  const router = useRouter();

  const { data: customer, isLoading } = useCustomer();
  const { data: merchants = [] } = useMyMerchants();
  const updateCustomer = useUpdateCustomer();

  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = () => {
    setName(customer?.name || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    updateCustomer.mutate(
      { name },
      {
        onSuccess: () => {
          toast.success(t('success.saved'));
          setIsEditing(false);
        },
        onError: () => {
          toast.error(t('errors.serverError'));
        },
      },
    );
  };

  const handleSignOut = () => {
    signOut();
    router.push('/');
  };

  if (isLoading) {
    return (
      <CustomerLayout>
        <h1 className={`text-xl font-bold mb-4 ${textStart}`}>{t('navigation.profile')}</h1>
        <ProfileSkeleton />
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <h1 className={`text-xl font-bold mb-4 ${textStart}`}>{t('navigation.profile')}</h1>

      <div className="space-y-4">
        {/* Personal Info */}
        <Card className="stagger-item">
          <CardHeader>
            <CardTitle className="text-base">{t('profile.personalInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">{t('customer.phone')}</p>
              <p className="font-medium" dir="ltr">
                {formatPhone(customer?.phone || '')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('customer.name')}</p>
              {isEditing ? (
                <div className="flex gap-2 mt-1">
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                  <Button size="sm" onClick={handleSave} disabled={updateCustomer.isPending}>
                    {t('common.save')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="font-medium">{customer?.name || '-'}</p>
                  <Button size="sm" variant="ghost" onClick={handleEdit}>
                    {t('common.edit')}
                  </Button>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('customer.tier')}</p>
              <p className="font-medium">{customer?.tierDisplayName}</p>
            </div>
            {customer?.createdAt && (
              <div>
                <p className="text-sm text-muted-foreground">{t('profile.memberSince')}</p>
                <p className="font-medium">{formatDate(customer.createdAt)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Consent */}
        {merchants.length > 0 && (
          <Card className="stagger-item">
            <CardHeader>
              <CardTitle className="text-base">{t('consent.title')}</CardTitle>
              <p className="text-xs text-muted-foreground">{t('consent.description')}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {merchants.map((m) => (
                <ConsentToggle key={m.merchantId} merchant={m} />
              ))}
            </CardContent>
          </Card>
        )}

        <Button variant="destructive" className="w-full stagger-item" onClick={handleSignOut}>
          <LogOut className={`h-4 w-4 me-2 ${flipIcon}`} />
          {t('auth.logout')}
        </Button>
      </div>
    </CustomerLayout>
  );
}
