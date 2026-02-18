'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { useAddLocation, useMerchant, useUpdateMerchant } from '@/hooks/api';
import { useAuth } from '@/lib/auth-context';
import type { MerchantResponse } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, useRTL } from '@pointly/ui';
import { useState } from 'react';
import { toast } from 'sonner';

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: settings page with edit mode and location management
export default function SettingsPage() {
  const { t, formatNumber, language } = useTranslation();
  const { textStart } = useRTL();
  const { merchant: authMerchant } = useAuth();

  const { data: merchantData, isLoading } = useMerchant();
  const merchant = merchantData as MerchantResponse | undefined;
  const updateMerchant = useUpdateMerchant();
  const addLocation = useAddLocation();

  const [isEditing, setIsEditing] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');

  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');
  const [newLocationCity, setNewLocationCity] = useState('');

  const startEditing = () => {
    setBusinessName(merchant?.businessName || '');
    setContactName(merchant?.contactName || '');
    setPhone(merchant?.phone || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!authMerchant?.merchantId) return;
    try {
      await updateMerchant.mutateAsync({
        merchantId: authMerchant.merchantId,
        data: { businessName, contactName, phone },
      });
      toast.success(t('success.saved'));
      setIsEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errors.serverError'));
    }
  };

  const handleAddLocation = async () => {
    if (!authMerchant?.merchantId) return;
    try {
      await addLocation.mutateAsync({
        merchantId: authMerchant.merchantId,
        data: { name: newLocationName, address: newLocationAddress, city: newLocationCity },
      });
      toast.success(t('success.created'));
      setShowAddLocation(false);
      setNewLocationName('');
      setNewLocationAddress('');
      setNewLocationCity('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errors.serverError'));
    }
  };

  const canManageLocations = merchant?.tier === 'PROFESSIONAL' || merchant?.tier === 'ENTERPRISE';

  if (isLoading) {
    return (
      <DashboardLayout>
        <p className="text-center text-muted-foreground py-8">{t('common.loading')}</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className={`text-2xl md:text-3xl font-bold text-foreground ${textStart}`}>
          {t('settings.title')}
        </h1>
        {!isEditing && (
          <Button variant="outline" onClick={startEditing}>
            {t('common.edit')}
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Business Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t('merchant.contactInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isEditing ? (
              <>
                <div>
                  <label
                    htmlFor="settings-business-name"
                    className="text-sm text-muted-foreground block mb-1"
                  >
                    {t('merchant.name')}
                  </label>
                  <Input
                    id="settings-business-name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="settings-contact-name"
                    className="text-sm text-muted-foreground block mb-1"
                  >
                    {t('merchant.contactName')}
                  </label>
                  <Input
                    id="settings-contact-name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="settings-phone"
                    className="text-sm text-muted-foreground block mb-1"
                  >
                    {t('customer.phone')}
                  </label>
                  <Input
                    id="settings-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('auth.email')}</p>
                  <p className="font-medium text-muted-foreground" dir="ltr">
                    {merchant?.email || authMerchant?.email}
                    <span className="text-xs ms-2">({t('common.readOnly')})</span>
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleSave} disabled={updateMerchant.isPending}>
                    {updateMerchant.isPending ? t('common.loading') : t('common.save')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">{t('merchant.name')}</p>
                  <p className="font-medium">
                    {merchant?.businessName || authMerchant?.businessName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('auth.email')}</p>
                  <p className="font-medium" dir="ltr">
                    {merchant?.email || authMerchant?.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('customer.phone')}</p>
                  <p className="font-medium" dir="ltr">
                    {merchant?.phone}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('merchant.tier')}</p>
                  <p className="font-medium">{merchant?.tier || authMerchant?.tier}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Loyalty Config */}
        <Card>
          <CardHeader>
            <CardTitle>{t('navigation.loyalty')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">{t('merchant.pointsRate')}</p>
              <p className="font-medium">
                {merchant?.loyaltyConfig?.pointsPerSAR ?? '-'} {t('common.points')} / SAR
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.pointsRate')}</p>
              <p className="font-medium">
                {merchant?.loyaltyConfig?.globalPointsPerSAR ?? '-'} {t('common.points')} / SAR
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('transaction.minAmount')}</p>
              <p className="font-medium">{merchant?.loyaltyConfig?.minimumPurchase ?? '-'} SAR</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('settings.redemptionRate')}</p>
              <p className="font-medium">
                {merchant?.loyaltyConfig?.redemptionRate ?? '-'} SAR / {t('common.points')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* SMS Quota */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.sms')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">{t('settings.used')}</p>
              <p className="font-medium">
                {formatNumber(merchant?.smsQuota?.currentUsage ?? 0)} /{' '}
                {formatNumber(merchant?.smsQuota?.monthlyLimit ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.totalCustomers')}</p>
              <p className="font-medium">{formatNumber(merchant?.totalCustomers ?? 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.totalTransactions')}</p>
              <p className="font-medium">{formatNumber(merchant?.totalTransactions ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Locations Section */}
      {canManageLocations && (
        <div className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('merchant.locations')}</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddLocation(!showAddLocation)}
              >
                {t('merchant.addLocation')}
              </Button>
            </CardHeader>
            <CardContent>
              {showAddLocation && (
                <div className="mb-4 p-4 border rounded-md space-y-3">
                  <Input
                    placeholder={t('merchant.locationName')}
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                  />
                  <Input
                    placeholder={t('merchant.address')}
                    value={newLocationAddress}
                    onChange={(e) => setNewLocationAddress(e.target.value)}
                  />
                  <Input
                    placeholder={t('merchant.city')}
                    value={newLocationCity}
                    onChange={(e) => setNewLocationCity(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setShowAddLocation(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button
                      onClick={handleAddLocation}
                      disabled={
                        addLocation.isPending ||
                        !newLocationName ||
                        !newLocationAddress ||
                        !newLocationCity
                      }
                    >
                      {addLocation.isPending ? t('common.loading') : t('common.save')}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {merchant?.locations?.map((loc) => (
                  <div
                    key={loc.locationId}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div>
                      <p className="font-medium">{loc.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {loc.city}
                        {loc.address ? ` - ${loc.address}` : ''}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${loc.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      {loc.isActive ? t('common.active') : t('common.inactive')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
