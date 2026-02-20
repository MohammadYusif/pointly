'use client';

import { CustomerLayout } from '@/components/CustomerLayout';
import { getCustomer, updateCustomer } from '@/lib/api';
import { signOut } from '@/lib/auth';
import { useTranslation } from '@pointly/i18n';
import type { CustomerResponse } from '@pointly/shared';
import { formatPhone } from '@pointly/shared';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, useRTL } from '@pointly/ui';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface CustomerProfile extends CustomerResponse {
  tierDisplayName: string;
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { textStart } = useRTL();
  const router = useRouter();

  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    getCustomer('me')
      .then((data) => {
        setCustomer(data as CustomerProfile);
        setName(data.name || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      await updateCustomer({ name });
      toast.success(t('success.saved'));
      setIsEditing(false);
      setCustomer((prev) => (prev ? { ...prev, name } : prev));
    } catch {
      toast.error(t('errors.serverError'));
    }
  };

  const handleSignOut = () => {
    signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <CustomerLayout>
        <p className="text-center text-muted-foreground py-8">{t('common.loading')}</p>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <h1 className={`text-xl font-bold mb-4 ${textStart}`}>{t('navigation.profile')}</h1>

      <div className="space-y-4">
        <Card>
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
                  <Button size="sm" onClick={handleSave}>
                    {t('common.save')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="font-medium">{customer?.name || '-'}</p>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                    {t('common.edit')}
                  </Button>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('customer.tier')}</p>
              <p className="font-medium">{customer?.tierDisplayName}</p>
            </div>
          </CardContent>
        </Card>

        {/* Enrolled Merchants */}
        {(customer?.enrollments?.length ?? 0) > 0 && customer && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('dashboard.enrolledMerchants')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {customer.enrollments.map((e) => (
                <div key={e.merchantId} className="flex justify-between items-center py-1">
                  <span className="text-sm">{e.merchantId}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      e.consentStatus === 'GRANTED'
                        ? 'bg-green-100 text-green-800'
                        : e.consentStatus === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {e.consentStatus}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Button variant="destructive" className="w-full" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 me-2" />
          {t('auth.logout')}
        </Button>
      </div>
    </CustomerLayout>
  );
}
