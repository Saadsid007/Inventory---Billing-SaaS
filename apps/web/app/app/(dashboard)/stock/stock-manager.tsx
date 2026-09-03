'use client';

import {
  Badge,
  Button,
  EmptyState,
  FormError,
  FormSuccess,
  Input,
  PageHeader,
  Pagination,
  RowActions,
  StatCard,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@billwise/ui';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Barcode,
  Check,
  CheckCircle2,
  ChevronDown,
  Folder,
  Hash,
  Layers,
  Package,
  PackageMinus,
  PackagePlus,
  PackageX,
  Plus,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { adjustStockAction } from './actions';

export type StockProductRow = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  categoryName: string | null;
  hsnCode: string | null;
  unit: string | null;
  currentStock: string;
  lowStockAlert: string | null;
  salePrice: string;
  purchasePrice: string | null;
  imageUrl?: string | null;
};

type FilterTab = 'all' | 'warning' | 'out_of_stock' | 'in_stock';

const REASON_PRESETS_IN = [
  'Supplier Delivery',
  'Restock',
  'Customer Return',
  'Count Fix',
];

const REASON_PRESETS_OUT = [
  'Damaged',
  'Expired',
  'Internal Use',
  'Audit Fix',
];

/**
 * Searchable Product Combobox with instant number, HSN, barcode, and name search
 */
function SearchableProductDropdown({
  products,
  selectedId,
  onSelect,
  disabled,
}: {
  products: readonly StockProductRow[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const selected = products.find((p) => p.id === selectedId);

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 40);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Filter products by Name, Number/Barcode, SKU, HSN Code, or Category
  const filtered = React.useMemo(() => {
    if (!search.trim()) return products;
    const term = search.toLowerCase().trim();
    return products.filter((p) => {
      return (
        p.name.toLowerCase().includes(term) ||
        (p.barcode && p.barcode.toLowerCase().includes(term)) ||
        (p.hsnCode && p.hsnCode.toLowerCase().includes(term)) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(term)) ||
        p.currentStock.includes(term)
      );
    });
  }, [products, search]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8.5 w-full items-center justify-between rounded-xl border border-border/80 bg-background px-3 text-xs shadow-2xs hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-all"
      >
        {selected ? (
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-bold text-foreground truncate">{selected.name}</span>
            {selected.hsnCode && (
              <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground shrink-0">
                HSN: {selected.hsnCode}
              </span>
            )}
            <span className="rounded-md bg-primary/10 px-1.5 py-0.2 text-[10px] font-extrabold text-primary shrink-0">
              {selected.currentStock} {selected.unit ?? 'PCS'}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-[11px]">Select product or search by HSN/number…</span>
        )}
        <div className="flex items-center gap-1 text-muted-foreground ml-2 shrink-0">
          <Search className="size-3" />
          <ChevronDown className={`size-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-hidden rounded-xl border border-border/90 bg-card shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Quick Search Input with HSN and Number tips */}
          <div className="border-b border-border/70 bg-card/95 p-1.5 backdrop-blur-xs">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type name, barcode, SKU or HSN code…"
                className="h-7.5 w-full rounded-lg border border-border/80 bg-background pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Product Items List */}
          <div className="max-h-40 overflow-y-auto p-1 divide-y divide-border/30">
            {filtered.length === 0 ? (
              <div className="p-2.5 text-center text-xs text-muted-foreground">
                No product found matching &ldquo;{search}&rdquo;
              </div>
            ) : (
              filtered.map((p) => {
                const isSelected = p.id === selectedId;
                const stockNum = Number(p.currentStock);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelect(p.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate text-xs">{p.name}</div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                        {p.hsnCode && (
                          <span
                            className={`rounded px-1 font-mono text-[9px] ${
                              isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-foreground font-bold'
                            }`}
                          >
                            HSN: {p.hsnCode}
                          </span>
                        )}
                        {p.barcode && (
                          <span className={isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground font-mono'}>
                            #{p.barcode}
                          </span>
                        )}
                        {p.sku && (
                          <span className={isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground font-mono'}>
                            SKU:{p.sku}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`tabular text-[10px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${
                        isSelected
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : stockNum <= 0
                            ? 'bg-rose-500/15 text-rose-600'
                            : 'bg-emerald-500/15 text-emerald-600'
                      }`}
                    >
                      {p.currentStock} {p.unit ?? 'PCS'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function StockManager({
  products,
}: {
  products: readonly StockProductRow[];
}) {
  const router = useRouter();

  // Search & Filter state
  const [filter, setFilter] = React.useState('');
  const [tab, setTab] = React.useState<FilterTab>('all');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Quick Adjustment Modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedProductId, setSelectedProductId] = React.useState('');
  const [direction, setDirection] = React.useState<'in' | 'out'>('in');
  const [qty, setQty] = React.useState('');
  const [note, setNote] = React.useState('');
  const [modalState, setModalState] = React.useState<{
    formError?: string;
    fieldErrors?: Record<string, string>;
    done?: string;
  }>({});
  const [pending, startTransition] = React.useTransition();

  const qtyInputRef = React.useRef<HTMLInputElement>(null);

  // Selected product in modal
  const activeProduct = React.useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId],
  );

  // Inventory stats
  const stats = React.useMemo(() => {
    let outOfStock = 0;
    let lowStock = 0;
    let healthy = 0;

    for (const p of products) {
      const stock = Number(p.currentStock);
      const alert = p.lowStockAlert ? Number(p.lowStockAlert) : null;

      if (stock <= 0) {
        outOfStock++;
      } else if (alert !== null && stock <= alert) {
        lowStock++;
      } else {
        healthy++;
      }
    }

    return { total: products.length, outOfStock, lowStock, healthy };
  }, [products]);

  // Projected stock in modal
  const projectedStock = React.useMemo(() => {
    if (!activeProduct || !qty || Number.isNaN(Number(qty))) return null;
    const current = Number(activeProduct.currentStock);
    const amount = Number(qty);
    const result = direction === 'in' ? current + amount : current - amount;
    return Number.isInteger(result) ? result.toString() : result.toFixed(3);
  }, [activeProduct, direction, qty]);

  React.useEffect(() => {
    setPage(1);
  }, [filter, tab]);

  React.useEffect(() => {
    if (modalOpen) {
      setTimeout(() => qtyInputRef.current?.focus(), 60);
    }
  }, [modalOpen]);

  // Open adjustment modal for a specific product
  function openAdjustment(product: StockProductRow, initialDirection: 'in' | 'out' = 'in') {
    setSelectedProductId(product.id);
    setDirection(initialDirection);
    setQty('');
    setNote('');
    setModalState({});
    setModalOpen(true);
  }

  // Open global adjustment modal (allows picking any product)
  function openGlobalAdjustment() {
    setSelectedProductId(products[0]?.id || '');
    setDirection('in');
    setQty('');
    setNote('');
    setModalState({});
    setModalOpen(true);
  }

  // Submit stock adjustment
  function handleAdjust(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!selectedProductId || !qty.trim()) return;

    setModalState({});
    startTransition(async () => {
      const result = await adjustStockAction({
        productId: selectedProductId,
        direction,
        qty: qty.trim(),
        note: note.trim() || undefined,
      });

      if (result.ok) {
        setModalState({ done: `${result.productName} is now at ${result.newStock}.` });
        setQty('');
        setNote('');
        router.refresh();
        setTimeout(() => setModalOpen(false), 800);
      } else {
        setModalState({
          formError: result.formError,
          fieldErrors: result.fieldErrors,
        });
      }
    });
  }

  // Filter products by search (ALL fields: name, sku, barcode, category, hsn) and status tab
  const filteredProducts = React.useMemo(() => {
    const term = filter.toLowerCase().trim();

    return products.filter((p) => {
      const stock = Number(p.currentStock);
      const alert = p.lowStockAlert ? Number(p.lowStockAlert) : null;
      const isOut = stock <= 0;
      const isLow = alert !== null && stock <= alert && stock > 0;
      const isHealthy = !isOut && !isLow;

      // Status Tab filter
      if (tab === 'out_of_stock' && !isOut) return false;
      if (tab === 'warning' && !isLow) return false;
      if (tab === 'in_stock' && !isHealthy) return false;

      // Multi-Field Search (Name, SKU, Barcode, Category, HSN)
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        (p.hsnCode && p.hsnCode.toLowerCase().includes(term)) ||
        (p.barcode && p.barcode.toLowerCase().includes(term)) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(term))
      );
    });
  }, [products, filter, tab]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <PageHeader
        title="Stock & Inventory Management"
        description="Monitor stock levels, track out-of-stock items, and record quick inward/outward adjustments with zero friction."
        actions={
          <Button
            onClick={openGlobalAdjustment}
            className="h-8.5 gap-1.5 px-3.5 text-xs font-bold shadow-xs bg-primary text-primary-foreground"
          >
            <Plus className="size-3.5" />
            <span>Record Movement</span>
          </Button>
        }
      />

      {/* Real-time Inventory Stat Cards */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setTab('all')}
          className="text-left cursor-pointer transition-transform active:scale-[0.99]"
        >
          <StatCard
            label="Tracked Items"
            value={String(stats.total)}
            icon={Package}
            hint="Active inventory items"
          />
        </button>

        <button
          type="button"
          onClick={() => setTab('warning')}
          className="text-left cursor-pointer transition-transform active:scale-[0.99]"
        >
          <StatCard
            label="Low Stock Warnings"
            value={String(stats.lowStock)}
            icon={AlertTriangle}
            tone={stats.lowStock > 0 ? 'warning' : 'default'}
            hint="At or below reorder threshold"
          />
        </button>

        <button
          type="button"
          onClick={() => setTab('out_of_stock')}
          className="text-left cursor-pointer transition-transform active:scale-[0.99]"
        >
          <StatCard
            label="Out of Stock"
            value={String(stats.outOfStock)}
            icon={PackageX}
            tone={stats.outOfStock > 0 ? 'destructive' : 'default'}
            hint="Zero or negative inventory"
          />
        </button>

        <button
          type="button"
          onClick={() => setTab('in_stock')}
          className="text-left cursor-pointer transition-transform active:scale-[0.99]"
        >
          <StatCard
            label="Healthy Stock"
            value={String(stats.healthy)}
            icon={CheckCircle2}
            tone="success"
            hint="Well stocked products"
          />
        </button>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="space-y-3">
        {/* Status Filter Tabs (Visible Track & Vibrant Highlight) */}
        <div className="w-full rounded-xl border border-slate-300/80 bg-slate-200/80 p-1.5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTab('all')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                tab === 'all'
                  ? 'bg-primary text-white font-bold shadow-md shadow-primary/30 ring-1 ring-primary/40'
                  : 'text-slate-700 hover:bg-white/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
              }`}
            >
              <Package className="size-3.5" />
              <span>All Products</span>
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  tab === 'all' ? 'bg-white/25 text-white' : 'bg-slate-300/80 dark:bg-slate-700'
                }`}
              >
                {stats.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab('warning')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                tab === 'warning'
                  ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-600/30 ring-1 ring-amber-600/40'
                  : 'text-slate-700 hover:bg-white/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
              }`}
            >
              <AlertTriangle className="size-3.5 text-amber-500" />
              <span>Low Stock Warnings</span>
              {stats.lowStock > 0 && (
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    tab === 'warning' ? 'bg-white/25 text-white' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {stats.lowStock}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTab('out_of_stock')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                tab === 'out_of_stock'
                  ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30 ring-1 ring-rose-600/40'
                  : 'text-slate-700 hover:bg-white/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
              }`}
            >
              <PackageX className="size-3.5 text-rose-500" />
              <span>Out of Stock</span>
              {stats.outOfStock > 0 && (
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    tab === 'out_of_stock' ? 'bg-white/25 text-white' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {stats.outOfStock}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTab('in_stock')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                tab === 'in_stock'
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30 ring-1 ring-emerald-600/40'
                  : 'text-slate-700 hover:bg-white/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
              }`}
            >
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span>In Stock</span>
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  tab === 'in_stock' ? 'bg-white/25 text-white' : 'bg-slate-300/80 dark:bg-slate-700'
                }`}
              >
                {stats.healthy}
              </span>
            </button>
          </div>
        </div>

        {/* Multi-Field Search Bar (Standardized Width) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72 md:w-80">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, SKU, barcode, HSN…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-8.5 rounded-lg border-border/80 bg-background pl-8 text-xs shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Showing <strong className="text-foreground">{filteredProducts.length}</strong> of {products.length} items
            </span>
          </div>
        </div>

        {/* Products Table */}
        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No inventory tracked products"
            description="Products with 'Track Inventory' switched on will appear here with real-time stock levels."
            action={
              <Link href="/app/products/new">
                <Button className="gap-1.5">
                  <Plus className="size-4" /> Add Product
                </Button>
              </Link>
            }
          />
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
            No products match the selected filter or query &ldquo;{filter}&rdquo;.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
              <Table>
                <THead>
                  <TR>
                    <TH icon={Package}>Product Details</TH>
                    <TH icon={Folder}>Category / HSN</TH>
                    <TH icon={Layers}>Stock Status & Warning</TH>
                    <TH className="text-right">Quick Stock Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {paginatedProducts.map((p) => {
                    const stock = Number(p.currentStock);
                    const alert = p.lowStockAlert ? Number(p.lowStockAlert) : null;
                    const isOut = stock <= 0;
                    const isLow = alert !== null && stock <= alert && stock > 0;

                    return (
                      <TR key={p.id} className="vendor-table-row hover:bg-muted/40 transition-colors">
                        {/* Product Column */}
                        <TD className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative size-9 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-primary/10 shadow-2xs">
                              {p.imageUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="size-full object-cover"
                                />
                              ) : (
                                <div className="flex size-full items-center justify-center text-primary">
                                  <Package className="size-4.5" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <Link
                                href={`/app/products/${p.id}`}
                                className="font-bold text-sm text-foreground hover:text-primary transition-colors truncate block"
                              >
                                {p.name}
                              </Link>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                {p.sku && (
                                  <span className="font-mono bg-muted px-1.5 py-0.2 rounded text-[10px]">
                                    SKU: {p.sku}
                                  </span>
                                )}
                                {p.barcode && (
                                  <span className="inline-flex items-center gap-1 font-mono text-[10px]">
                                    <Barcode className="size-3 text-muted-foreground" />
                                    {p.barcode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TD>

                        {/* Category & HSN */}
                        <TD>
                          <div className="space-y-0.5">
                            {p.categoryName ? (
                              <Badge variant="outline" className="text-[11px] font-semibold">
                                {p.categoryName}
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Uncategorized</span>
                            )}
                            {p.hsnCode && (
                              <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.2 rounded">
                                <Hash className="size-2.5 text-muted-foreground" />
                                HSN: {p.hsnCode}
                              </div>
                            )}
                          </div>
                        </TD>

                        {/* Stock Level & Warning Status */}
                        <TD>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-extrabold text-foreground tracking-tight">
                                {p.currentStock} {p.unit ?? 'PCS'}
                              </span>

                              {isOut ? (
                                <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-400 animate-pulse">
                                  <AlertCircle className="size-3" />
                                  Out of Stock
                                </span>
                              ) : isLow ? (
                                <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                  <AlertTriangle className="size-3" />
                                  Low Stock Warning
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                  <Check className="size-3" />
                                  In Stock
                                </span>
                              )}
                            </div>

                            {p.lowStockAlert && (
                              <span className="text-[10px] text-muted-foreground block">
                                Reorder threshold: {p.lowStockAlert} {p.unit ?? 'PCS'}
                              </span>
                            )}
                          </div>
                        </TD>

                        {/* Quick Stock Actions */}
                        <TD className="text-right">
                          <RowActions className="justify-end">
                            {/* ADD STOCK BUTTON */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAdjustment(p, 'in')}
                              className="h-8 gap-1 px-2.5 text-xs font-bold border-emerald-600/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white transition-colors"
                              title={`Add stock to ${p.name}`}
                            >
                              <PackagePlus className="size-3.5 text-emerald-600 dark:text-emerald-400 group-hover:text-white" />
                              <span>+ Add Stock</span>
                            </Button>

                            {/* DECREASE STOCK BUTTON */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAdjustment(p, 'out')}
                              className="h-8 gap-1 px-2.5 text-xs font-bold border-rose-600/30 bg-rose-500/10 text-rose-700 hover:bg-rose-600 hover:text-white dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white transition-colors"
                              title={`Deduct / decrease stock from ${p.name}`}
                            >
                              <PackageMinus className="size-3.5 text-rose-600 dark:text-rose-400 group-hover:text-white" />
                              <span>- Deduct Stock</span>
                            </Button>
                          </RowActions>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>

            {/* Pagination */}
            {filteredProducts.length > pageSize && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={filteredProducts.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[10, 20, 50]}
              />
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          SLENDER & COMPACT QUICK STOCK ADJUSTMENT MODAL (Wider Width, Zero Scroll)
          ========================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs animate-in fade-in-0 duration-150">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="stock-modal-title"
            className="relative w-full max-w-md sm:max-w-lg rounded-2xl border border-border/80 bg-card shadow-2xl animate-in zoom-in-95 duration-100"
          >
            {/* Modal Header - Clean & Compact */}
            <div className="flex items-center justify-between border-b border-border/70 bg-muted/20 px-4 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`grid size-6 shrink-0 place-items-center rounded-md text-white text-[11px] font-bold ${
                    direction === 'in' ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                >
                  {direction === 'in' ? '+' : '−'}
                </div>
                <h3 id="stock-modal-title" className="text-xs font-bold text-foreground truncate">
                  {direction === 'in' ? 'Record Stock In (Add Stock)' : 'Record Stock Out (Deduct Stock)'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                aria-label="Close dialog"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Modal Form - Wider Layout with Minimal Padding */}
            <form onSubmit={handleAdjust} className="px-4 py-3 space-y-2.5">
              <FormError>{modalState.formError}</FormError>
              <FormSuccess>{modalState.done}</FormSuccess>

              {/* Movement Type Switcher - Sleek */}
              <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-border/70 bg-muted/40 p-0.5">
                <button
                  type="button"
                  onClick={() => setDirection('in')}
                  className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-bold transition-all ${
                    direction === 'in'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ArrowUp className="size-3" />
                  <span>+ Stock In (Add)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('out')}
                  className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-bold transition-all ${
                    direction === 'out'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ArrowDown className="size-3" />
                  <span>- Stock Out (Deduct)</span>
                </button>
              </div>

              {/* Searchable Product Dropdown */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                  <span>Product <span className="text-destructive">*</span></span>
                  {activeProduct && (
                    <span className="text-foreground font-semibold">
                      Current: {activeProduct.currentStock} {activeProduct.unit ?? 'PCS'}
                    </span>
                  )}
                </div>
                <SearchableProductDropdown
                  products={products}
                  selectedId={selectedProductId}
                  onSelect={setSelectedProductId}
                  disabled={pending}
                />
              </div>

              {/* Quantity Input + Quick Chips (Enhanced Height & Attractive Themed Background) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                  <span>Quantity to Move <span className="text-destructive">*</span></span>
                  {activeProduct && (
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Unit: <strong className="text-foreground font-bold">{activeProduct.unit ?? 'PCS'}</strong>
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="relative w-full sm:w-36 shrink-0">
                    <Input
                      ref={qtyInputRef}
                      id="stock-qty-input"
                      type="number"
                      step="any"
                      min="0.001"
                      placeholder="0.00"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className={`h-10 w-full rounded-xl pr-10 text-base font-black tracking-tight transition-all shadow-xs ${
                        direction === 'in'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-950 placeholder:text-emerald-700/40 focus:border-emerald-600 focus:bg-background focus:ring-2 focus:ring-emerald-500/25 dark:text-emerald-100'
                          : 'border-rose-500/40 bg-rose-500/10 text-rose-950 placeholder:text-rose-700/40 focus:border-rose-600 focus:bg-background focus:ring-2 focus:ring-rose-500/25 dark:text-rose-100'
                      }`}
                      disabled={pending}
                    />
                    {activeProduct && (
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-extrabold text-muted-foreground/80 uppercase">
                        {activeProduct.unit ?? 'PCS'}
                      </span>
                    )}
                  </div>

                  {/* Inline Quick Chips with Matching Attractive Accent */}
                  <div className="flex flex-wrap items-center gap-1.5 flex-1">
                    {[1, 5, 10, 25, 50, 100].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          const currentVal = Number(qty) || 0;
                          setQty(String(currentVal + num));
                          qtyInputRef.current?.focus();
                        }}
                        className={`h-8.5 rounded-lg border px-2.5 text-xs font-bold transition-all shadow-2xs ${
                          direction === 'in'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:text-emerald-300 dark:hover:bg-emerald-600 dark:hover:text-white'
                            : 'border-rose-500/30 bg-rose-500/10 text-rose-700 hover:bg-rose-600 hover:text-white dark:text-rose-300 dark:hover:bg-rose-600 dark:hover:text-white'
                        }`}
                      >
                        +{num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ultra-Compact Projected Stock Strip (Very Less Padding, Minimal Height) */}
              {activeProduct && projectedStock !== null && (
                <div
                  className={`flex items-center justify-between rounded-lg border px-3 py-1 text-xs transition-colors ${
                    Number(projectedStock) < 0
                      ? 'border-warning/50 bg-warning/10 text-warning-foreground'
                      : 'border-primary/20 bg-primary/5 text-foreground'
                  }`}
                >
                  <span className="text-[11px] font-medium text-muted-foreground">Projected New Stock:</span>
                  <span className="font-mono text-xs font-extrabold">
                    {activeProduct.currentStock} → <span className="text-primary font-bold">{projectedStock}</span> {activeProduct.unit ?? 'PCS'}
                  </span>
                </div>
              )}

              {/* Movement Reason / Note with Compact Presets */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground">
                  Reason / Note <span className="font-normal text-muted-foreground text-[10px]">(Optional)</span>
                </label>
                <Input
                  id="stock-note-input"
                  placeholder={direction === 'in' ? 'e.g. Supplier delivery, restock' : 'e.g. Damaged, expired, count fix'}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-8 text-xs"
                  disabled={pending}
                />

                {/* Reason Presets */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {(direction === 'in' ? REASON_PRESETS_IN : REASON_PRESETS_OUT).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNote(preset)}
                      className="rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions - Clean & Sleek Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  disabled={pending}
                  className="h-8 px-3.5 text-xs font-semibold"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={pending || !selectedProductId || !qty.trim()}
                  className={`h-8 gap-1.5 px-4 text-xs font-bold text-white shadow-xs ${
                    direction === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {pending ? (
                    'Recording…'
                  ) : direction === 'in' ? (
                    <>
                      <ArrowUp className="size-3.5" />
                      Record Stock In
                    </>
                  ) : (
                    <>
                      <ArrowDown className="size-3.5" />
                      Record Stock Out
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
