'use client';

import { Combobox, type ComboboxItem } from '@billwise/ui';
import { User, UserPlus } from 'lucide-react';
import * as React from 'react';
import { CustomerDialog } from '../app/app/seva/customers/customer-dialog';

export type CustomerOption = {
  id: string;
  name: string;
  phone?: string | null;
  outstanding?: string | number | null;
};

export function CustomerCombobox({
  value,
  onChange,
  customers,
  allowWalkIn = true,
  placeholder = 'Select or search customer (or walk-in)…',
  className,
  id,
  onCustomerCreated,
}: {
  value: string;
  onChange: (id: string) => void;
  customers: readonly CustomerOption[];
  allowWalkIn?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  onCustomerCreated?: (partyId: string) => void;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const items = React.useMemo<ComboboxItem<string>[]>(() => {
    const list: ComboboxItem<string>[] = [];

    if (allowWalkIn) {
      list.push({
        value: '',
        label: 'Walk-in / New Customer',
        sublabel: 'Unsaved customer',
        icon: User,
      });
    }

    for (const c of customers) {
      const due = Number(c.outstanding || 0);
      list.push({
        value: c.id,
        label: c.name,
        sublabel: c.phone || undefined,
        badge: due > 0 ? `₹${due.toFixed(0)} due` : undefined,
        badgeTone: due > 0 ? 'warning' : undefined,
      });
    }

    return list;
  }, [customers, allowWalkIn]);

  return (
    <>
      <Combobox
        id={id}
        value={value}
        onChange={onChange}
        items={items}
        placeholder={placeholder}
        searchPlaceholder="Type customer name or mobile…"
        emptyText="No existing customer found with that name or mobile."
        className={className}
        onClear={() => onChange('')}
        footerAction={{
          label: '+ Add New Customer',
          icon: UserPlus,
          onClick: () => setDialogOpen(true),
        }}
      />

      <CustomerDialog
        trigger="none"
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(partyId) => {
          onChange(partyId);
          setDialogOpen(false);
          if (onCustomerCreated) onCustomerCreated(partyId);
        }}
      />
    </>
  );
}
