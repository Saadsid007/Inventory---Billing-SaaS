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
  Select,
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
  CornerDownRight,
  Edit2,
  ExternalLink,
  Folder,
  FolderPlus,
  FolderTree,
  ImageIcon,
  ImagePlus,
  Layers,
  Package,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import {
  addCategoryAction,
  removeCategoryAction,
  updateCategoryAction,
  uploadCategoryImageAction,
} from './actions';

export type CategoryRow = {
  id: string;
  name: string;
  imageUrl?: string | null;
  parentId?: string | null;
  productCount: number;
};

const MAIN_CATEGORY_SUGGESTIONS = [
  'Beverages',
  'Snacks & Confectionery',
  'Dairy & Bakery',
  'Spices & Seasonings',
  'Grains & Pulses',
  'Personal Care',
  'Household Supplies',
  'Packaged Foods',
];

const SUBCATEGORY_SUGGESTIONS = [
  'Cold Drinks & Soda',
  'Fruit Juices',
  'Tea & Coffee',
  'Biscuits & Cookies',
  'Chips & Namkeen',
  'Milk & Curd',
  'Atta & Flours',
  'Cooking Oils',
  'Soaps & Detergents',
  'Chocolates & Candies',
];

export function CategoryManager({
  categories,
  totalCategorizedProducts,
}: {
  categories: readonly CategoryRow[];
  totalCategorizedProducts: number;
}) {
  const router = useRouter();

  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<'create' | 'edit'>('create');
  const [targetId, setTargetId] = React.useState<string | null>(null);

  // Form fields
  const [categoryType, setCategoryType] = React.useState<'main' | 'sub'>('main');
  const [parentId, setParentId] = React.useState<string>('');
  const [name, setName] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');
  const [showUrlInput, setShowUrlInput] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  // Search & filter
  const [filter, setFilter] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  // Delete state / confirmation
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  // Pagination state
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Main Categories & Subcategories mappings
  const mainCategories = React.useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories],
  );

  const subcategoriesMap = React.useMemo(() => {
    const map = new Map<string, CategoryRow[]>();
    for (const c of categories) {
      if (c.parentId) {
        const list = map.get(c.parentId) ?? [];
        list.push(c);
        map.set(c.parentId, list);
      }
    }
    return map;
  }, [categories]);

  const totalSubcategories = React.useMemo(
    () => categories.filter((c) => Boolean(c.parentId)).length,
    [categories],
  );

  React.useEffect(() => {
    setPage(1);
  }, [filter]);

  React.useEffect(() => {
    if (modalOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [modalOpen]);

  // Open modal in Create Main Category mode
  function openCreateMain() {
    setModalMode('create');
    setTargetId(null);
    setCategoryType('main');
    setParentId('');
    setName('');
    setImageUrl('');
    setShowUrlInput(false);
    setError(undefined);
    setModalOpen(true);
  }

  // Open modal in Create Subcategory mode
  function openCreateSub(initialParentId?: string) {
    setModalMode('create');
    setTargetId(null);
    setCategoryType('sub');
    setParentId(initialParentId ?? (mainCategories[0]?.id || ''));
    setName('');
    setImageUrl('');
    setShowUrlInput(false);
    setError(undefined);
    setModalOpen(true);
  }

  // Open modal in Edit mode
  function openEdit(category: CategoryRow) {
    setModalMode('edit');
    setTargetId(category.id);
    if (category.parentId) {
      setCategoryType('sub');
      setParentId(category.parentId);
    } else {
      setCategoryType('main');
      setParentId('');
    }
    setName(category.name);
    setImageUrl(category.imageUrl ?? '');
    setShowUrlInput(Boolean(category.imageUrl && !category.imageUrl.startsWith('data:')));
    setError(undefined);
    setModalOpen(true);
  }

  // Image file upload handler
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(undefined);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadCategoryImageAction(formData);
      if (res.ok) {
        setImageUrl(res.url);
      } else {
        setError(res.error);
      }
    } catch (_err) {
      setError('Failed to upload image. Please check the file format.');
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // Submit Modal Form (Add or Update)
  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim()) return;

    if (categoryType === 'sub' && !parentId) {
      setError('Please select a parent category for this subcategory.');
      return;
    }

    setError(undefined);
    startTransition(async () => {
      const payload = {
        name: name.trim(),
        imageUrl: imageUrl.trim() || null,
        parentId: categoryType === 'sub' ? parentId : null,
      };

      let result;
      if (modalMode === 'edit' && targetId) {
        result = await updateCategoryAction(targetId, payload);
      } else {
        result = await addCategoryAction(payload);
      }

      if (result.ok) {
        setModalOpen(false);
        router.refresh();
      } else {
        setError(result.fieldErrors?.['name'] ?? result.formError ?? 'Operation failed');
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

  // Filter main categories or categories with matching names or matching subcategories
  const filteredMainCategories = React.useMemo(() => {
    if (!filter.trim()) return mainCategories;
    const term = filter.toLowerCase().trim();

    return mainCategories.filter((cat) => {
      const matchesMain = cat.name.toLowerCase().includes(term);
      const subs = subcategoriesMap.get(cat.id) ?? [];
      const matchesSub = subs.some((s) => s.name.toLowerCase().includes(term));
      return matchesMain || matchesSub;
    });
  }, [mainCategories, subcategoriesMap, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredMainCategories.length / pageSize));
  const paginatedMainCategories = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMainCategories.slice(start, start + pageSize);
  }, [filteredMainCategories, page, pageSize]);

  return (
    <div className="space-y-6">
      {/* Top Header with Add Category & Add Subcategory Actions */}
      <PageHeader
        title="Categories & Subcategories"
        description="Organize your catalogue with categories, nested subcategories, and visual icons for fast billing."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {mainCategories.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openCreateSub()}
                className="h-8.5 gap-1.5 px-3 text-xs font-semibold shadow-2xs"
              >
                <Layers className="size-3.5 text-primary" />
                <span>+ Subcategory</span>
              </Button>
            )}

            <Button
              onClick={openCreateMain}
              className="h-8.5 gap-1.5 px-3.5 text-xs font-bold shadow-xs bg-primary text-primary-foreground"
            >
              <Plus className="size-3.5" />
              <span>+ Category</span>
            </Button>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Main Categories"
          value={String(mainCategories.length)}
          icon={FolderTree}
          hint="Catalog departments & groups"
        />
        <StatCard
          label="Subcategories"
          value={String(totalSubcategories)}
          icon={Layers}
          tone="info"
          hint="Nested product specializations"
        />
        <StatCard
          label="Categorized Products"
          value={String(totalCategorizedProducts)}
          icon={Package}
          tone="success"
          hint="Items mapped to categories"
        />
      </div>

      {/* Search & Actions Bar */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72 md:w-80">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search categories or subcategories…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-8.5 rounded-lg border-border/80 bg-background pl-8 text-xs shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2">
            {mainCategories.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openCreateSub()}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <Layers className="size-3 text-primary" />
                <span>New Subcategory</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={openCreateMain}
              className="h-8 text-xs font-bold gap-1.5"
            >
              <FolderPlus className="size-3.5 text-primary" />
              <span>New Category</span>
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {categories.length === 0 ? (
          <EmptyState
            icon={FolderTree}
            title="No categories yet"
            description="Create your first product category with an image to begin organizing your inventory."
            action={
              <Button onClick={openCreateMain} className="gap-1.5">
                <Plus className="size-4" /> Add Category
              </Button>
            }
          />
        ) : filteredMainCategories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
            No categories or subcategories match &ldquo;{filter}&rdquo;.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
              <Table>
                <THead>
                  <TR>
                    <TH icon={FolderTree}>Category / Subcategory</TH>
                    <TH icon={Layers}>Type</TH>
                    <TH icon={Package}>Mapped Products</TH>
                    <TH className="text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {paginatedMainCategories.map((main) => {
                    const subs = subcategoriesMap.get(main.id) ?? [];
                    const isConfirmingDeleteMain = confirmDeleteId === main.id;

                    return (
                      <React.Fragment key={main.id}>
                        {/* MAIN CATEGORY ROW */}
                        <TR className="vendor-table-row bg-card/60 hover:bg-muted/40 transition-colors">
                          <TD className="font-semibold text-foreground py-3">
                            <div className="flex items-center gap-3">
                              {/* Category Image Avatar */}
                              <div className="relative size-9 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-primary/10 shadow-2xs">
                                {main.imageUrl ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={main.imageUrl}
                                    alt={main.name}
                                    className="size-full object-cover"
                                  />
                                ) : (
                                  <div className="flex size-full items-center justify-center text-primary">
                                    <Folder className="size-4.5" />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-foreground truncate">
                                    {main.name}
                                  </span>
                                  {subs.length > 0 && (
                                    <span className="inline-flex items-center rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px] font-bold text-secondary-foreground">
                                      {subs.length} {subs.length === 1 ? 'sub' : 'subs'}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground">
                                  Main Category
                                </span>
                              </div>
                            </div>
                          </TD>

                          <TD>
                            <span className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                              <FolderTree className="size-3" />
                              Main Category
                            </span>
                          </TD>

                          <TD>
                            {main.productCount > 0 ? (
                              <Link
                                href={`/app/products?category=${main.id}`}
                                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                              >
                                <Badge variant="secondary" className="font-bold">
                                  {main.productCount}{' '}
                                  {main.productCount === 1 ? 'product' : 'products'}
                                </Badge>
                                <ExternalLink className="size-3 opacity-60" />
                              </Link>
                            ) : (
                              <span className="text-xs text-muted-foreground">0 products</span>
                            )}
                          </TD>

                          <TD className="text-right">
                            {isConfirmingDeleteMain ? (
                              <RowActions>
                                <span className="text-[11px] font-bold text-destructive">
                                  {main.productCount > 0 || subs.length > 0
                                    ? 'Contains items! Delete?'
                                    : 'Delete?'}
                                </span>
                                <Button
                                  variant="destructive"
                                  size="table"
                                  onClick={() => handleDelete(main.id)}
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
                                  onClick={() => openCreateSub(main.id)}
                                  disabled={pending}
                                  title="Add subcategory under this category"
                                  className="text-[11px] font-semibold gap-1 text-primary hover:bg-primary/10"
                                >
                                  <Plus className="size-3" />
                                  Subcategory
                                </Button>

                                <Button
                                  variant="outline"
                                  size="table"
                                  onClick={() => openEdit(main)}
                                  disabled={pending}
                                  aria-label={`Edit ${main.name}`}
                                  title="Edit category"
                                >
                                  <Edit2 className="size-3" />
                                  Edit
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="table"
                                  onClick={() => {
                                    setConfirmDeleteId(main.id);
                                  }}
                                  disabled={pending}
                                  aria-label={`Delete ${main.name}`}
                                  title="Delete category"
                                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </RowActions>
                            )}
                          </TD>
                        </TR>

                        {/* NESTED SUBCATEGORIES ROWS */}
                        {subs.map((sub) => {
                          const isConfirmingDeleteSub = confirmDeleteId === sub.id;

                          return (
                            <TR
                              key={sub.id}
                              className="vendor-table-row bg-muted/20 dark:bg-muted/10 hover:bg-muted/40 transition-colors border-l-2 border-l-primary/40"
                            >
                              <TD className="py-2.5 pl-9">
                                <div className="flex items-center gap-2.5">
                                  <CornerDownRight className="size-3.5 text-muted-foreground/60 shrink-0" />

                                  {/* Subcategory Image Avatar */}
                                  <div className="relative size-7.5 shrink-0 overflow-hidden rounded-lg border border-border/80 bg-accent shadow-2xs">
                                    {sub.imageUrl ? (
                                      /* eslint-disable-next-line @next/next/no-img-element */
                                      <img
                                        src={sub.imageUrl}
                                        alt={sub.name}
                                        className="size-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex size-full items-center justify-center text-muted-foreground">
                                        <Tag className="size-3.5" />
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <span className="font-semibold text-xs text-foreground truncate">
                                      {sub.name}
                                    </span>
                                    <span className="block text-[10px] text-muted-foreground truncate">
                                      under {main.name}
                                    </span>
                                  </div>
                                </div>
                              </TD>

                              <TD>
                                <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                  <Layers className="size-2.5" />
                                  Subcategory
                                </span>
                              </TD>

                              <TD>
                                {sub.productCount > 0 ? (
                                  <Badge variant="outline" className="text-[11px] font-bold">
                                    {sub.productCount}{' '}
                                    {sub.productCount === 1 ? 'product' : 'products'}
                                  </Badge>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">
                                    0 products
                                  </span>
                                )}
                              </TD>

                              <TD className="text-right">
                                {isConfirmingDeleteSub ? (
                                  <RowActions>
                                    <span className="text-[11px] font-bold text-destructive">
                                      Delete subcategory?
                                    </span>
                                    <Button
                                      variant="destructive"
                                      size="table"
                                      onClick={() => handleDelete(sub.id)}
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
                                      onClick={() => openEdit(sub)}
                                      disabled={pending}
                                      aria-label={`Edit ${sub.name}`}
                                      title="Edit subcategory"
                                    >
                                      <Edit2 className="size-3" />
                                      Edit
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="table"
                                      onClick={() => {
                                        setConfirmDeleteId(sub.id);
                                      }}
                                      disabled={pending}
                                      aria-label={`Delete ${sub.name}`}
                                      title="Delete subcategory"
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
                      </React.Fragment>
                    );
                  })}
                </TBody>
              </Table>
            </div>

            {filteredMainCategories.length > pageSize && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={filteredMainCategories.length}
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
          ADD / EDIT CATEGORY & SUBCATEGORY MODAL (Clean, Focused, Responsive)
          ========================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in-0 duration-150">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
            className="relative w-full max-w-xl sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border/80 bg-card shadow-2xl animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header - Wide & Fully Responsive */}
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border/70 bg-card/95 p-4 sm:p-5 sm:px-6 backdrop-blur-md">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  {categoryType === 'sub' ? (
                    <Layers className="size-5" />
                  ) : (
                    <FolderPlus className="size-5" />
                  )}
                </div>
                <div>
                  <h3 id="category-modal-title" className="text-base sm:text-lg font-bold text-foreground">
                    {modalMode === 'edit'
                      ? categoryType === 'sub'
                        ? 'Edit Subcategory'
                        : 'Edit Category'
                      : categoryType === 'sub'
                        ? 'Add New Subcategory'
                        : 'Add New Category'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {categoryType === 'sub'
                      ? 'Create a specialized subcategory nested under a parent department.'
                      : 'Create a main department category with its own image and presets.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                aria-label="Close dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <FormError>{error}</FormError>

              {/* Type Switcher (Main Category vs Subcategory) - only when creating or when parents exist */}
              {modalMode === 'create' && mainCategories.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    What are you creating?
                  </span>
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/80 bg-muted/40 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryType('main');
                        setParentId('');
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                        categoryType === 'main'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Folder className="size-3.5" />
                      <span>Main Category</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryType('sub');
                        if (!parentId && mainCategories[0]) {
                          setParentId(mainCategories[0].id);
                        }
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                        categoryType === 'sub'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Layers className="size-3.5" />
                      <span>Subcategory</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Name & Parent Category Grid (Side-by-Side on Desktop when Subcategory) */}
              {categoryType === 'sub' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <Field
                    label="Parent Category"
                    htmlFor="parent-cat-select"
                    hint="Main department this belongs to."
                    required
                  >
                    <Select
                      id="parent-cat-select"
                      value={parentId}
                      onChange={(e) => setParentId(e.target.value)}
                      className="h-9.5 text-xs font-semibold"
                      disabled={pending}
                    >
                      <option value="" disabled>
                        Select parent category…
                      </option>
                      {mainCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Subcategory Name" htmlFor="cat-name-input" required>
                    <Input
                      ref={inputRef}
                      id="cat-name-input"
                      placeholder="e.g. Cold Drinks, Juices, Biscuits"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-9.5 text-xs font-semibold"
                      disabled={pending}
                    />
                  </Field>
                </div>
              ) : (
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
              )}

              {/* Category / Subcategory Image */}
              <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="size-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground">
                      {categoryType === 'sub' ? 'Subcategory Image' : 'Category Image'}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">Optional</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3.5">
                  {/* Thumbnail Preview */}
                  <div className="relative size-16 sm:size-20 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-muted/40 shadow-xs">
                    {imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={imageUrl} alt="Preview" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full flex-col items-center justify-center text-muted-foreground/60">
                        <ImagePlus className="size-5 sm:size-6" />
                        <span className="text-[9px] mt-0.5 font-medium">No Image</span>
                      </div>
                    )}
                  </div>

                  {/* Upload & Actions */}
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploading || pending}
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8.5 text-xs font-semibold gap-1.5 px-3"
                      >
                        <Upload className="size-3.5 text-primary" />
                        <span>{uploading ? 'Uploading…' : 'Upload Image'}</span>
                      </Button>

                      {imageUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setImageUrl('')}
                          className="h-8.5 text-xs text-destructive hover:bg-destructive/10"
                        >
                          Remove
                        </Button>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowUrlInput((v) => !v)}
                        className="text-[11px] text-primary hover:underline font-semibold"
                      >
                        {showUrlInput ? 'Hide URL' : 'Or paste direct URL'}
                      </button>
                    </div>

                    <p className="text-[10px] text-muted-foreground">
                      PNG, JPG, or WebP up to 5MB. Displayed in online catalog and billing masters.
                    </p>
                  </div>
                </div>

                {/* Optional direct URL input */}
                {showUrlInput && (
                  <div className="pt-2">
                    <Input
                      placeholder="https://example.com/image.webp"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="h-8.5 text-xs font-mono"
                      disabled={pending}
                    />
                  </div>
                )}
              </div>

              {/* Quick Preset Suggestions (Clean Spread on Wider Modal) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                  <Sparkles className="size-3.5 text-primary" />
                  <span>Popular Presets (1-Tap Suggestion):</span>
                </div>

                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {(categoryType === 'sub'
                    ? SUBCATEGORY_SUGGESTIONS
                    : MAIN_CATEGORY_SUGGESTIONS
                  ).map((preset) => (
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

              {/* Modal Actions - Fully Responsive */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-2.5 border-t border-border/60 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  disabled={pending}
                  className="h-8.5 w-full sm:w-auto px-4 text-xs font-semibold"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={pending || !name.trim()}
                  className="h-8.5 w-full sm:w-auto gap-1.5 px-5 text-xs font-bold bg-primary text-primary-foreground shadow-xs"
                >
                  {modalMode === 'edit' ? (
                    <>
                      <Check className="size-3.5" />
                      {pending ? 'Saving…' : 'Save Changes'}
                    </>
                  ) : (
                    <>
                      <Plus className="size-3.5" />
                      {pending
                        ? 'Creating…'
                        : categoryType === 'sub'
                          ? 'Create Subcategory'
                          : 'Create Category'}
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
