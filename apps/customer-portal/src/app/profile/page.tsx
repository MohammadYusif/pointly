'use client';

import { CustomerLayout } from '@/components/CustomerLayout';
import { useCustomer, useDeleteAccount, useUpdateCustomer } from '@/hooks/api';
import { signOut } from '@/lib/auth';
import { useTranslation } from '@pointly/i18n';
import { formatDate, formatPhone } from '@pointly/shared';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, useRTL } from '@pointly/ui';
import { LogOut, Trash2 } from 'lucide-react';
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
  const updateCustomer = useUpdateCustomer();
  const deleteAccountMutation = useDeleteAccount();

  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

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

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate(undefined, {
      onSuccess: () => {
        signOut();
        router.push('/');
      },
      onError: () => {
        toast.error(t('errors.serverError'));
      },
    });
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

        <Button variant="destructive" className="w-full stagger-item" onClick={handleSignOut}>
          <LogOut className={`h-4 w-4 me-2 ${flipIcon}`} />
          {t('auth.logout')}
        </Button>

        {/* Danger Zone — Delete Account */}
        <Card className="stagger-item border-red-200">
          <CardHeader>
            <CardTitle className="text-base text-red-600">{t('profile.dangerZone')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                className="w-full border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className={`h-4 w-4 me-2 ${flipIcon}`} />
                {t('profile.deleteAccount')}
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-red-600">
                  {t('profile.deleteConfirmTitle')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('profile.deleteConfirmDescription')}
                </p>
                <div>
                  <label
                    htmlFor="delete-confirm"
                    className="text-xs font-medium text-muted-foreground block mb-1"
                  >
                    {t('profile.deleteConfirmLabel')}
                  </label>
                  <Input
                    id="delete-confirm"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder="DELETE"
                    dir="ltr"
                    className="text-center"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={deleteInput !== 'DELETE' || deleteAccountMutation.isPending}
                    onClick={handleDeleteAccount}
                  >
                    {deleteAccountMutation.isPending
                      ? t('common.loading')
                      : t('profile.deleteConfirmButton')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteInput('');
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}
