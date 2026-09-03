'use client';

import { Tabs, TabsContent } from '@billwise/ui';
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
      {/* Full-width Settings Tab Bar with visible background & active tab highlight */}
      <div className="w-full rounded-xl border border-slate-300/80 bg-slate-200/80 p-1.5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onTabChange('profile')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'profile'
                ? 'bg-primary text-white shadow-md shadow-primary/30 ring-1 ring-primary/40'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Building2 className="size-3.5" />
            <span>Profile & Branding</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('invoicing')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'invoicing'
                ? 'bg-primary text-white shadow-md shadow-primary/30 ring-1 ring-primary/40'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <FileText className="size-3.5" />
            <span>Invoices & Catalog</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('units')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'units'
                ? 'bg-primary text-white shadow-md shadow-primary/30 ring-1 ring-primary/40'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Scale className="size-3.5" />
            <span>Units of Measure</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('custom-fields')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'custom-fields'
                ? 'bg-primary text-white shadow-md shadow-primary/30 ring-1 ring-primary/40'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <SlidersHorizontal className="size-3.5" />
            <span>Custom Fields</span>
          </button>
        </div>
      </div>

      <TabsContent value="profile" className="space-y-6 mt-0 animate-in fade-in-50 duration-150">
        {profileContent}
      </TabsContent>

      <TabsContent value="invoicing" className="space-y-6 mt-0 animate-in fade-in-50 duration-150">
        {invoicingContent}
      </TabsContent>

      <TabsContent value="units" className="space-y-6 mt-0 animate-in fade-in-50 duration-150">
        {unitsContent}
      </TabsContent>

      <TabsContent value="custom-fields" className="space-y-6 mt-0 animate-in fade-in-50 duration-150">
        {customFieldsContent}
      </TabsContent>
    </Tabs>
  );
}
