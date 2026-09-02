import {
  catalogStockDisplay,
  productSlug,
  whatsappEnquiryUrl,
} from '@billwise/shared';
import { ArrowRight, ImageOff, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

type CatalogProductCardProps = {
  slug: string;
  businessName: string;
  catalogWhatsapp: string | null;
  showPrice: boolean;
  showStockCount?: boolean;
  product: {
    id: string;
    name: string;
    salePrice: string;
    imageUrls: string[];
    categoryName: string | null;
    stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
    currentStock: string;
    trackInventory: boolean;
    unitShortName: string | null;
  };
};

export function CatalogProductCard({
  slug,
  businessName,
  catalogWhatsapp,
  showPrice,
  showStockCount = true,
  product: p,
}: CatalogProductCardProps) {
  const cover = p.imageUrls?.[0];
  const productHref = `/store/${slug}/${productSlug(p.name, p.id)}`;
  const stock = catalogStockDisplay(p.currentStock, p.trackInventory, p.unitShortName, p.stockStatus);
  const numericPrice = Number(p.salePrice) || 0;

  const stockLabel = p.trackInventory && showStockCount
    ? stock.isOut
      ? 'Out of stock'
      : `${stock.formatted}${stock.unit} left`
    : stock.isOut
      ? 'Out of stock'
      : 'In stock';

  const pWhatsapp = whatsappEnquiryUrl(
    catalogWhatsapp,
    `Hi ${businessName}, I would like to order "${p.name}"${
      showPrice ? ` (₹${numericPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })})` : ''
    }${
      p.trackInventory && showStockCount && !stock.isOut
        ? ` — saw ${stock.formatted}${stock.unit} in stock`
        : ''
    }. Please confirm availability and pickup/delivery!`,
  );

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition-all duration-200 hover:border-primary/30 hover:shadow-md ${
        stock.isOut ? 'opacity-85' : ''
      }`}
    >
      <Link
        href={productHref}
        className="relative block aspect-square overflow-hidden bg-muted/30"
      >
        {cover ? (
          <Image
            src={cover}
            alt={p.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className={`object-cover transition-transform duration-300 group-hover:scale-[1.03] ${
              stock.isOut ? 'grayscale-[0.5]' : ''
            }`}
            unoptimized
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground/40">
            <ImageOff className="size-8" />
          </div>
        )}

        {stock.isOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              Sold Out
            </span>
          </div>
        )}

        {stock.isLow && (
          <span className="absolute left-1.5 top-1.5 rounded-md bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-black">
            Low stock
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        {p.categoryName && (
          <p className="truncate text-[10px] font-medium text-muted-foreground">{p.categoryName}</p>
        )}

        <Link href={productHref}>
          <h4 className="line-clamp-2 text-xs font-semibold leading-tight text-foreground group-hover:text-primary">
            {p.name}
          </h4>
        </Link>

        <div className="flex items-center justify-between gap-1.5">
          {showPrice ? (
            <p className="tabular text-sm font-bold text-foreground">
              ₹{numericPrice.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              {p.unitShortName && (
                <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">
                  /{p.unitShortName}
                </span>
              )}
            </p>
          ) : (
            <p className="text-[11px] font-medium text-primary">Ask price</p>
          )}

          <span
            className={`shrink-0 text-[10px] font-medium tabular-nums ${
              stock.isOut
                ? 'text-rose-600'
                : stock.isLow
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {stockLabel}
          </span>
        </div>

        {pWhatsapp && !stock.isOut ? (
          <a
            href={pWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <MessageCircle className="size-3 shrink-0" />
            <span>WhatsApp</span>
          </a>
        ) : pWhatsapp && stock.isOut ? (
          <a
            href={pWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto flex w-full items-center justify-center gap-1 rounded-lg border border-dashed px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/40"
          >
            <MessageCircle className="size-3 shrink-0" />
            <span>Enquire</span>
          </a>
        ) : (
          <Link
            href={productHref}
            className="mt-auto flex w-full items-center justify-center gap-1 rounded-lg border bg-muted/30 px-2 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted/50"
          >
            <span>View</span>
            <ArrowRight className="size-3" />
          </Link>
        )}
      </div>
    </article>
  );
}
