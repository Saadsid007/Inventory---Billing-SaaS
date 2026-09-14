'use server';

import { createParty } from '@billwise/db';
import { revalidatePath } from 'next/cache';
import { requireBusiness } from '@/lib/auth/require-business';

export type CreateCustomerInput = {
  name: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  pincode?: string;
  openingBalance?: string;
  note?: string;
};

export async function createSevaCustomerAction(input: CreateCustomerInput) {
  const ctx = await requireBusiness();

  const name = input.name?.trim();
  if (!name) {
    return { ok: false as const, error: 'Customer name is required' };
  }

  const phone = input.phone?.trim() || null;
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      return { ok: false as const, error: 'Enter a valid 10-digit mobile number' };
    }
  }

  try {
    const party = await createParty(ctx, {
      type: 'customer',
      name,
      phone,
      addressLine1: input.addressLine1?.trim() || null,
      city: input.city?.trim() || null,
      pincode: input.pincode?.trim() || null,
      openingBalance: input.openingBalance?.trim() || '0',
      customFields: input.note?.trim() ? { notes: input.note.trim() } : {},
    });

    if (!party) {
      return { ok: false as const, error: 'Failed to create customer record' };
    }

    revalidatePath('/app/seva/customers');
    revalidatePath('/app/seva/work');
    revalidatePath('/app/seva/receipts');

    return { ok: true as const, partyId: party.id };
  } catch (err: unknown) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : 'Failed to create customer',
    };
  }
}
