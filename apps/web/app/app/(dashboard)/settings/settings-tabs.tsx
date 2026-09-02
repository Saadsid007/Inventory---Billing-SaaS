'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@billwise/ui';
import { Building2, FileText, Scale, SlidersHorizontal } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

const VALID_TABS = ['profile', 'invoicing', 'units', 'custom-fields'] as const;
type TabKey = (typeof VALID_TABS)[number];

export function SettingsTabs({
  profileContent,
  invoicingContent,
  unitsContent,
  customFieldsContent,
}: {
  profileContent: React.ReactNode;
  invoicingContent: React.ReactNode;
  unitsContent: React.ReactNode;
  customFieldsContent: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab = searchParams.get('tab');
  const activeTab: TabKey =
    currentTab && (VALID_TABS as readonly string[]).includes(currentTab)
      ? (currentTab as TabKey)
      : 'profile';

  const onTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
      <div className="overflow-x-auto pb-1">
        <TabsList className="h-auto p-1.5 flex-wrap gap-1">
          <TabsTrigger value="profile" className="py-2 px-3.5">
            <Building2 className="size-4 text-muted-foreground" />
            <span>Profile & Branding</span>
          </TabsTrigger>
          <TabsTrigger value="invoicing" className="py-2 px-3.5">
            <FileText className="size-4 text-muted-foreground" />
            <span>Invoices & Catalog</span>
          </TabsTrigger>
          <TabsTrigger value="units" className="py-2 px-3.5">
            <Scale className="size-4 text-muted-foreground" />
            <span>Units</span>
          </TabsTrigger>
          <TabsTrigger value="custom-fields" className="py-2 px-3.5">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            <span>Custom Fields</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="profile" className="space-y-6 mt-0">
        {profileContent}
      </TabsContent>

      <TabsContent value="invoicing" className="space-y-6 mt-0">
        {invoicingContent}
      </TabsContent>

      <TabsContent value="units" className="space-y-6 mt-0">
        {unitsContent}
      </TabsContent>

      <TabsContent value="custom-fields" className="space-y-6 mt-0">
        {customFieldsContent}
      </TabsContent>
    </Tabs>
  );
}
