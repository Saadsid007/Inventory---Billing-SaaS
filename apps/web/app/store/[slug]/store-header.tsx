'use client';

import { ThemeIconButton, ThemeToggle } from '@billwise/ui';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  ShieldCheck,
  Store,
  Truck,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';

type StoreHeaderProps = {
  slug: string;
  businessName: string;
  logoUrl: string | null;
  address: string;
  phone: string | null;
  whatsapp: string | undefined;
  badgeText: string;
  storeTimings: string;
  tagline: string;
  trustBadge1: string;
  trustBadge2: string;
  trustBadge3: string;
};

export function CatalogStoreHeader({
  slug,
  businessName,
  logoUrl,
  address,
  phone,
  whatsapp,
  badgeText,
  storeTimings,
  tagline,
  trustBadge1,
  trustBadge2,
  trustBadge3,
}: StoreHeaderProps) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 shadow-sm backdrop-blur-lg supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          {/* Mobile menu */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid size-9 shrink-0 place-items-center rounded-lg border bg-card text-foreground shadow-xs sm:hidden"
            aria-label="Open store menu"
          >
            <Menu className="size-4" />
          </button>

          <Link
            href={`/store/${slug}`}
            className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3"
            onClick={close}
          >
            {logoUrl ? (
              <div className="relative size-9 shrink-0 overflow-hidden rounded-lg border bg-card shadow-xs sm:size-11 sm:rounded-xl">
                <Image
                  src={logoUrl}
                  alt={businessName}
                  fill
                  sizes="44px"
                  className="object-contain p-0.5"
                  unoptimized
                  priority
                />
              </div>
            ) : (
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-xs sm:size-11 sm:rounded-xl">
                <Store className="size-4 sm:size-5" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h1 className="truncate text-sm font-bold tracking-tight text-foreground sm:text-lg">
                  {businessName}
                </h1>
                <CheckCircle2
                  className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-label={badgeText}
                />
              </div>
              {address && (
                <p className="hidden items-center gap-1 truncate text-[11px] text-muted-foreground sm:flex">
                  <MapPin className="size-3 shrink-0" />
                  {address}
                </p>
              )}
            </div>
          </Link>

          {/* Desktop actions */}
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            {phone && (
              <a
                href={`tel:${phone}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-muted"
              >
                <Phone className="size-3.5 text-muted-foreground" />
                Call
              </a>
            )}

            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
              >
                <MessageCircle className="size-4 shrink-0" />
                WhatsApp
              </a>
            )}

            <ThemeToggle />
          </div>

          {/* Mobile: WhatsApp only in header */}
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white shadow-xs transition-colors hover:bg-emerald-700 sm:hidden"
              aria-label="Chat on WhatsApp"
            >
              <MessageCircle className="size-4" />
            </a>
          )}
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] sm:hidden"
          onClick={close}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col border-r bg-background shadow-xl transition-transform duration-300 ease-out sm:hidden ${
          open ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-bold text-foreground">Store Menu</p>
          <button
            type="button"
            onClick={close}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Store className="size-4 text-primary shrink-0" />
              <p className="font-bold text-sm leading-tight">{businessName}</p>
            </div>
            <p className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              {badgeText}
            </p>
            {address && (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5 shrink-0 mt-0.5" />
                {address}
              </p>
            )}
            <p className="text-xs text-muted-foreground leading-relaxed">{tagline}</p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
            <Clock className="size-3.5 shrink-0 text-primary" />
            {storeTimings}
          </div>

          <div className="space-y-2">
            {phone && (
              <a
                href={`tel:${phone}`}
                onClick={close}
                className="flex w-full items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-xs transition-colors hover:bg-muted"
              >
                <Phone className="size-4 text-muted-foreground" />
                Call {phone}
              </a>
            )}

            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="flex w-full items-center gap-3 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
              >
                <MessageCircle className="size-4" />
                Order on WhatsApp
              </a>
            )}
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
              Why buy from us
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
                {trustBadge2}
              </li>
              <li className="flex items-center gap-2">
                <Truck className="size-3.5 text-emerald-600 shrink-0" />
                {trustBadge3}
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="size-3.5 text-emerald-600 shrink-0" />
                {trustBadge1}
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-muted-foreground">Appearance</span>
            <ThemeIconButton />
          </div>
        </div>
      </aside>
    </>
  );
}
