'use client';

import { formatCatalogStock, whatsappEnquiryUrl } from '@billwise/shared';
import {
  AlertTriangle,
  Check,
  CreditCard,
  Flame,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  MessageCircle,
  Phone,
  Share2,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import * as React from 'react';

export function InteractiveBuyBox({
  businessName,
  businessPhone,
  catalogWhatsapp,
  productName,
  salePrice,
  showPrice,
  stockStatus,
  currentStock,
  trackInventory,
  unitShortName,
  storeCity,
  storeAddress,
}: {
  businessName: string;
  businessPhone: string | null;
  catalogWhatsapp: string | null;
  productName: string;
  salePrice: string;
  showPrice: boolean;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  currentStock: string;
  trackInventory: boolean;
  unitShortName: string | null;
  storeCity?: string | null;
  storeAddress?: string | null;
}) {
  const rawStock = Number.parseFloat(currentStock) || 0;
  const formattedStock = formatCatalogStock(rawStock);
  const unit = unitShortName ? ` ${unitShortName}` : ' units';
  const isAvailable = stockStatus !== 'out_of_stock' && (!trackInventory || rawStock > 0);

  const maxQty = trackInventory && rawStock > 0 ? Math.floor(rawStock) : 999;
  const [qty, setQty] = React.useState(1);
  const [copied, setCopied] = React.useState(false);

  const numericPrice = Number(salePrice) || 0;
  const totalPrice = (numericPrice * qty).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Dynamic WhatsApp text including exact quantity, price, and current stock reference
  const stockRef = trackInventory ? ` (Saw ${formattedStock}${unit} in stock)` : '';
  const message = `Hi ${businessName}, I would like to order: ${qty}x ${productName}${
    showPrice ? ` (Total ₹${totalPrice})` : ''
  }${stockRef}. Please confirm availability and pickup/delivery!`;

  const whatsappUrl = whatsappEnquiryUrl(catalogWhatsapp, message);

  const handleShare = async () => {
    if (typeof window !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${productName} at ${businessName}`,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    if (typeof window !== 'undefined') {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-5 rounded-3xl border bg-card p-5 sm:p-7 shadow-xs">
      {/* Real-time Available Stock Banner */}
      {trackInventory ? (
        <div
          className={`flex items-center justify-between rounded-2xl p-3.5 border transition-all ${
            rawStock <= 0
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
              : rawStock <= 10
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {rawStock <= 0 ? (
              <AlertTriangle className="size-4.5 text-rose-600 shrink-0" />
            ) : rawStock <= 10 ? (
              <Flame className="size-4.5 text-amber-600 animate-pulse shrink-0" />
            ) : (
              <PackageCheck className="size-4.5 text-emerald-600 shrink-0" />
            )}

            <div>
              <p className="text-xs font-bold leading-tight">
                {rawStock <= 0
                  ? 'Currently Out of Stock'
                  : rawStock <= 10
                    ? `Limited Stock: Only ${formattedStock}${unit} remaining in store!`
                    : `Available Stock: ${formattedStock}${unit} ready in store`}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5">
                {rawStock <= 0
                  ? 'Send WhatsApp message to be notified when fresh stock arrives.'
                  : storeCity
                    ? `Counter pickup ready in 15 mins • Fast ${storeCity} doorstep delivery.`
                    : 'Counter pickup ready in 15 mins • Fast local doorstep delivery.'}
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-extrabold px-2.5 py-1 rounded-full shrink-0 ${
              rawStock <= 0
                ? 'bg-rose-200 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200'
                : rawStock <= 10
                  ? 'bg-amber-200 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'
                  : 'bg-emerald-200 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200'
            }`}
          >
            {formattedStock} Left
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold">In Stock & Ready for Order</span>
        </div>
      )}

      {/* Price & Quantity Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Price per unit
          </p>
          {showPrice ? (
            <div className="flex items-baseline gap-2 mt-1">
              <span className="tabular text-3xl sm:text-4xl font-extrabold text-foreground">
                ₹{numericPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              {unitShortName && (
                <span className="text-sm font-semibold text-muted-foreground">
                  / {unitShortName}
                </span>
              )}
              <span className="text-xs text-muted-foreground font-medium">
                (All taxes incl.)
              </span>
            </div>
          ) : (
            <p className="text-base font-semibold text-primary mt-1">
              Enquire on WhatsApp for best price
            </p>
          )}
        </div>

        {/* Quantity Controls */}
        {isAvailable && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-muted-foreground">Select Quantity</p>
              {trackInventory && rawStock > 0 && (
                <span className="text-[10px] text-muted-foreground">Max: {maxQty}</span>
              )}
            </div>
            <div className="inline-flex items-center rounded-xl border bg-muted/40 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className="grid size-8 place-items-center rounded-lg bg-card text-foreground shadow-xs transition-colors hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Decrease quantity"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="tabular w-12 text-center text-sm font-bold text-foreground">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={qty >= maxQty}
                className="grid size-8 place-items-center rounded-lg bg-card text-foreground shadow-xs transition-colors hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Increase quantity"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Subtotal Calculation summary if qty > 1 */}
      {showPrice && qty > 1 && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <span className="font-medium">Subtotal for {qty} {unit}:</span>
          <span className="tabular font-bold text-sm">₹{totalPrice}</span>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="space-y-2.5 pt-1">
        {whatsappUrl &&
          (isAvailable ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 px-6 py-4 text-sm sm:text-base font-bold text-white shadow-md transition-all hover:bg-emerald-700 active:scale-98"
            >
              <MessageCircle className="size-5" />
              <span>Order {qty} on WhatsApp</span>
              {showPrice && <span className="opacity-90 font-normal">· ₹{totalPrice}</span>}
            </a>
          ) : (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-muted border px-6 py-4 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted/80"
            >
              <MessageCircle className="size-5" />
              <span>Enquire for Next Restock on WhatsApp</span>
            </a>
          ))}

        <div className="grid grid-cols-2 gap-2.5">
          {businessPhone && (
            <a
              href={`tel:${businessPhone}`}
              className="flex items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors"
            >
              <Phone className="size-4 text-muted-foreground" />
              <span>Call Shop</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors"
          >
            {copied ? (
              <>
                <Check className="size-4 text-emerald-600" />
                <span className="text-emerald-600">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="size-4 text-muted-foreground" />
                <span>Share Item</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Trust & Guarantee points */}
      <div className="space-y-2.5 pt-2 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-2.5">
          <Truck className="size-4 text-emerald-600 shrink-0" />
          <span>
            Counter Pickup in 15 mins • {storeCity ? `Local ${storeCity}` : 'Local'} Doorstep Delivery
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
          <span>100% Original Brand Sealed Packaging</span>
        </div>
        <div className="flex items-center gap-2.5">
          <CreditCard className="size-4 text-emerald-600 shrink-0" />
          <span>Pay at Counter or on Delivery with Cash / UPI</span>
        </div>
        {storeAddress && (
          <div className="flex items-start gap-2.5 pt-1 text-[11px]">
            <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
            <span className="truncate leading-tight">Pick up at: {storeAddress}</span>
          </div>
        )}
      </div>
    </div>
  );
}
