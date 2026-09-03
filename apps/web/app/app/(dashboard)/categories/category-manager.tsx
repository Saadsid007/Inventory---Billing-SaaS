'use client';

import {
  Badge,
  Button,
  EmptyState,
  Field,
  FormError,
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
  Check,
  Edit2,
  ExternalLink,
  FolderPlus,
  FolderTree,
  Package,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import {
  addCategoryAction,
  renameCategoryAction,
  removeCategoryAction,
} from './actions';

export type CategoryRow = {
  id: string;
  name: string;
  productCount: number;
};

const CATEGORY_SUGGESTIONS = [
  'Beverages',
  'Snacks & Confectionery',
  'Dairy & Bakery',
  'Spices & Seasonings',
  'Grains & Pulses',
  'Personal Care',
  'Household Supplies',
  'Packaged Foods',
];

export function CategoryManager({
  categories,
  totalCategorizedProducts,
}: {
  categories: readonly CategoryRow[];
  totalCategorizedProducts: number;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [filter, setFilter] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  // Inline edit state
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');
  const [editError, setEditError] = React.useState<string | undefined>();

  // Delete state / confirmation
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  // Pagination state
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setPage(1);
  }, [filter]);

  React.useEffect(() => {
    if (modalOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [modalOpen]);

  function handleAdd(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim()) return;

    setError(undefined);
    startTransition(async () => {
      const result = await addCategoryAction({ name: name.trim() });
      if (result.ok) {
        setName('');
        setModalOpen(false);
        router.refresh();
      } else {
        setError(result.fieldErrors?.['name'] ?? result.formError);
      }
    });
  }

  function startEditing(category: CategoryRow) {
    setEditingId(category.id);
    setEditingName(category.name);
    setEditError(undefined);
    setConfirmDeleteId(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingName('');
    setEditError(undefined);
  }

  function handleRename(categoryId: string) {
    if (!editingName.trim()) return;
    setEditError(undefined);
    startTransition(async () => {
      const result = await renameCategoryAction(categoryId, { name: editingName.trim() });
      if (result.ok) {
        setEditingId(null);
        setEditingName('');
        router.refresh();
      } else {
        setEditError(result.fieldErrors?.['name'] ?? result.formError);
      }
    });
  }

  function handleDelete(categoryId: string) {
    setError(undefined);
    startTransition(async () => {
      const result = await removeCategoryAction(categoryId);
      if (result.ok) {
        setConfirmDeleteId(null);
        router.refresh();
      } else {
        setError(result.formError ?? 'Could not remove category.');
      }
    });
  }

  const filteredCategories = React.useMemo(() => {
    if (!filter.trim()) return categories;
    const term = filter.toLowerCase().trim();
    return categories.filter((c) => c.name.toLowerCase().includes(term));
  }, [categories, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / pageSize));
  const paginatedCategories = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCategories.slice(start, start + pageSize);
  }, [filteredCategories, page, pageSize]);

  return (
    <div className="space-y-6">
      {/* Top Header with Add Category Button */}
      <PageHeader
        title="Categories"
        description="Organize your products into categories for faster billing and catalog browsing."
        actions={
          <Button
            onClick={() => {
              setName('');
              setError(undefined);
              setModalOpen(true);
            }}
            className="h-8.5 gap-1.5 px-3.5 text-xs font-bold shadow-xs bg-primary text-primary-foreground"
          >
            <Plus className="size-3.5" />
            <span>Add Category</span>
          </Button>
        }
      />

      {/* Compact Stat Cards */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Categories"
          value={String(categories.length)}
          icon={FolderTree}
          hint="Catalog departments & groups"
        />
        <StatCard
          label="Categorized Products"
          value={String(totalCategorizedProducts)}
          icon={Package}
          tone="info"
          hint="Items mapped to a category"
        />
      </div>

      {/* Search & Actions Bar */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72 md:w-80">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search categories…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-8.5 rounded-lg border-border/80 bg-background pl-8 text-xs shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setName('');
                setError(undefined);
                setModalOpen(true);
              }}
              className="h-8 text-xs font-bold gap-1.5"
            >
              <FolderPlus className="size-3.5 text-primary" />
              <span>New Category</span>
            </Button>
          </div>
        </div>

        {editError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {editError}
          </div>
        )}

        {categories.length === 0 ? (
          <EmptyState
            icon={FolderTree}
            title="No categories yet"
            description="Create your first product category to begin organizing your inventory."
            action={
              <Button
                onClick={() => {
                  setName('');
                  setError(undefined);
                  setModalOpen(true);
                }}
                className="gap-1.5"
              >
                <Plus className="size-4" /> Add Category
              </Button>
            }
          />
        ) : filteredCategories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
            No categories match &ldquo;{filter}&rdquo;.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
              <Table>
                <THead>
                  <TR>
                    <TH icon={FolderTree}>Category Name</TH>
                    <TH icon={Package}>Mapped Products</TH>
                    <TH className="text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {paginatedCategories.map((c) => {
                    const isEditing = editingId === c.id;
                    const isConfirmingDelete = confirmDeleteId === c.id;

                    return (
                      <TR key={c.id} className="vendor-table-row">
                        <TD className="font-semibold text-foreground">
                          {isEditing ? (
                            <div className="flex items-center gap-2 max-w-sm">
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRename(c.id);
                                  if (e.key === 'Escape') cancelEditing();
                                }}
                                autoFocus
                                className="h-7.5 text-xs font-semibold"
                              />
                              <button
                                type="button"
                                onClick={() => handleRename(c.id)}
                                disabled={pending || !editingName.trim()}
                                title="Save name"
                                className="rounded-md p-1 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400 disabled:opacity-50"
                              >
                                <Check className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditing}
                                title="Cancel"
                                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span>{c.name}</span>
                          )}
                        </TD>

                        <TD>
                          {c.productCount > 0 ? (
                            <Link
                              href={`/app/products?category=${c.id}`}
                              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                            >
                              <Badge variant="secondary" className="font-bold">
                                {c.productCount} {c.productCount === 1 ? 'product' : 'products'}
                              </Badge>
                              <ExternalLink className="size-3 opacity-60" />
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">0 products</span>
                          )}
                        </TD>

                        <TD className="text-right">
                          {isConfirmingDelete ? (
                            <RowActions>
                              <span className="text-[11px] font-bold text-destructive">
                                {c.productCount > 0 ? 'Has products! Delete?' : 'Delete?'}
                              </span>
                              <Button
                                variant="destructive"
                                size="table"
                                onClick={() => handleDelete(c.id)}
                                disabled={pending}
                              >
                                Confirm
                              </Button>
                              <Button
                                variant="outline"
                                size="table"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                Cancel
                              </Button>
                            </RowActions>
                          ) : (
                            <RowActions>
                              <Button
                                variant="outline"
                                size="table"
                                onClick={() => startEditing(c)}
                                disabled={pending || isEditing}
                                aria-label={`Edit ${c.name}`}
                                title="Rename category"
                              >
                                <Edit2 className="size-3" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="table"
                                onClick={() => {
                                  setEditingId(null);
                                  setConfirmDeleteId(c.id);
                                }}
                                disabled={pending}
                                aria-label={`Delete ${c.name}`}
                                title="Delete category"
                                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </RowActions>
                          )}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>

            {filteredCategories.length > pageSize && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={filteredCategories.length}
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
          ADD CATEGORY MODAL (Clean, Focused, Responsive & Non-Overflowing)
          ========================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in-0 duration-150">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border/70 bg-gradient-to-br from-card via-card to-primary/5 p-5">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <FolderPlus className="size-5" />
                </div>
                <div>
                  <h3 id="category-modal-title" className="text-base font-bold text-foreground">
                    Add New Category
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Organize your products for fast billing and catalog discovery.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Close dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <FormError>{error}</FormError>

              <Field label="Category Name" htmlFor="cat-name-input" required>
                <Input
                  ref={inputRef}
                  id="cat-name-input"
                  placeholder="e.g. Dairy Products, Beverages, Snacks"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9.5 text-xs font-semibold"
                  disabled={pending}
                />
              </Field>

              {/* Quick Preset Suggestions */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                  <Sparkles className="size-3 text-primary" />
                  <span>Popular Presets (Click to use):</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_SUGGESTIONS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setName(preset);
                        inputRef.current?.focus();
                      }}
                      className="rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 border-t border-border/60 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  disabled={pending}
                  className="h-8.5 px-3.5 text-xs font-semibold"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={pending || !name.trim()}
                  className="h-8.5 gap-1.5 px-4 text-xs font-bold bg-primary text-primary-foreground shadow-xs"
                >
                  <Plus className="size-3.5" />
                  {pending ? 'Creating…' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
