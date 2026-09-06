'use client';

import type { NavItem } from '@billwise/ui';
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  QrCode,
  Receipt,
  Settings,
  Users,
  Wrench,
} from 'lucide-react';

/**
 * Navigation for a Jan Seva Kendra.
 *
 * A client module, because the entries carry icon *components* and a server
 * layout cannot hand a function to a client component. Marking this file makes
 * each icon a client reference, which does cross that boundary — the same
 * reason the shop nav lives inside app-frame.tsx.
 *
 * Deliberately shorter than the shop nav. Everything to do with stock is gone —
 * a CSC has nothing on a shelf — and the wording follows the trade: receipts
 * rather than invoices, services rather than products.
 *
 * "Work" sits second, above receipts, because it is the screen this business
 * opens most. A shop's day is billing; a CSC's day is billing plus chasing a
 * dozen applications that are still with the government, and "has my card
 * come?" is the question the counter answers all day.
 *
 * Receipts, services, customers, subscription billing and settings point at the
 * existing shop
 * screens on purpose. They are the same data and the same forms, and forking
 * them would mean fixing every bug twice.
 */
export const SEVA_NAV: readonly NavItem[] = [
  { href: '/app/seva', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/seva/work', label: 'Work', icon: ClipboardList, section: 'Counter' },
  { href: '/app/invoices', label: 'Receipts', icon: Receipt, section: 'Counter' },
  { href: '/app/parties', label: 'Customers', icon: Users, section: 'Counter' },
  { href: '/app/products', label: 'Services & rates', icon: Wrench, section: 'Setup' },
  { href: '/app/catalog', label: 'Public rate list', icon: QrCode, section: 'Setup' },
  { href: '/app/reports', label: 'Reports', icon: BarChart3, section: 'Business' },
  { href: '/app/billing', label: 'Subscription', icon: CreditCard, section: 'Business' },
  { href: '/app/settings', label: 'Settings', icon: Settings, section: 'Business' },
];
