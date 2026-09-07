import type { BusinessType } from '@billwise/shared';
import type { NavItem } from '@billwise/ui';
import {
  ArrowLeftRight,
  BarChart3,
  ClipboardList,
  CreditCard,
  FileText,
  FolderTree,
  IndianRupee,
  LayoutDashboard,
  Package,
  PackageCheck,
  Palette,
  QrCode,
  Receipt,
  Settings,
  Undo2,
  Users,
  Wrench,
} from 'lucide-react';

/**
 * Navigation, one list per kind of business.
 *
 * A client module because the entries carry icon *components*, and a server
 * layout cannot hand a function across to a client component. Marking the file
 * makes each icon a client reference, which does cross that boundary.
 *
 * Every layout that renders the shell reads from `navFor` rather than picking a
 * list itself. Miss one — as `/app/billing` did — and a Jan Seva owner sees a
 * shop's sidebar with Stock and Products on it, in the middle of paying.
 */

const RETAIL_NAV: readonly NavItem[] = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/invoices', label: 'Invoices', icon: FileText, section: 'Billing' },
  { href: '/app/parties', label: 'Customers', icon: Users, section: 'Billing' },
  { href: '/app/returns', label: 'Returns', icon: Undo2, section: 'Billing' },
  { href: '/app/products', label: 'Products', icon: Package, section: 'Catalogue' },
  { href: '/app/categories', label: 'Categories', icon: FolderTree, section: 'Catalogue' },
  { href: '/app/stock', label: 'Stock in / out', icon: ArrowLeftRight, section: 'Catalogue' },
  { href: '/app/catalog', label: 'Online catalog', icon: QrCode, section: 'Catalogue' },
  { href: '/app/storefront', label: 'Store Customizer', icon: Palette, section: 'Catalogue' },
  { href: '/app/reports', label: 'Reports', icon: BarChart3, section: 'Business' },
  { href: '/app/billing', label: 'Billing', icon: CreditCard, section: 'Business' },
  { href: '/app/settings', label: 'Settings', icon: Settings, section: 'Business' },
];

/**
 * A Jan Seva Kendra's sidebar. Nine entries against the shop's twelve, and
 * every one of them lands inside `/app/seva`.
 *
 * That last part is the whole point. Pointing "Receipts" at the shop's invoice
 * list looked like sensible reuse and was not: the sidebar swapped to the shop
 * nav mid-session, with Stock and Categories appearing out of nowhere. Same
 * tables underneath, but never the same screens.
 *
 * "Work" sits first under Counter because it is what this business opens most.
 * A shop's day is billing; a CSC's day is billing plus chasing a dozen
 * applications sitting with a government portal.
 */
const SEVA_NAV: readonly NavItem[] = [
  { href: '/app/seva', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/seva/work', label: 'Work', icon: ClipboardList, section: 'Counter' },
  // The handover desk. Its own entry rather than a tab on Work, because it is
  // the busiest ten minutes of the day and should be one tap from anywhere.
  { href: '/app/seva/deliveries', label: 'Deliveries', icon: PackageCheck, section: 'Counter' },
  { href: '/app/seva/receipts', label: 'Receipts', icon: Receipt, section: 'Counter' },
  { href: '/app/seva/customers', label: 'Customers', icon: Users, section: 'Counter' },
  { href: '/app/seva/services', label: 'Services & rates', icon: Wrench, section: 'Setup' },
  { href: '/app/seva/reports', label: 'Reports', icon: BarChart3, section: 'Business' },
  { href: '/app/seva/settings', label: 'Settings', icon: Settings, section: 'Business' },
  { href: '/app/billing', label: 'Subscription', icon: IndianRupee, section: 'Business' },
];

export function navFor(type: BusinessType | string | undefined): readonly NavItem[] {
  return type === 'jan_seva' ? SEVA_NAV : RETAIL_NAV;
}

export { RETAIL_NAV, SEVA_NAV };
