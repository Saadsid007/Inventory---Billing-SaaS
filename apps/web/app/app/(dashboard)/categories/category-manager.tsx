'use client';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormError,
  Input,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@billwise/ui';
import { Check, Edit2, ExternalLink, FolderPlus, FolderTree, Search, Trash2, X } from 'lucide-react';
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

export function CategoryManager({ categories }: { categories: readonly CategoryRow[] }) {
  const router = useRouter();
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

  function handleAdd(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim()) return;

    setError(undefined);
    startTransition(async () => {
      const result = await addCategoryAction({ name: name.trim() });
      if (result.ok) {
        setName('');
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

  return (
    <div className="space-y-6">
      {/* Add category card */}
      <Card className="p-5 sm:p-6">
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Add new category</h2>
              <p className="text-sm text-muted-foreground">
                Group products by type, department, or collection for faster billing and catalog discovery.
              </p>
            </div>
          </div>

          <FormError>{error}</FormError>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <div className="relative flex-1 max-w-md">
              <Input
                placeholder="e.g. Beverages, Spices, Dairy, Electronics"
                aria-label="New category name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={pending}
              />
            </div>
            <Button type="submit" disabled={pending || !name.trim()}>
              <FolderPlus className="size-4" />
              Add category
            </Button>
          </div>
        </form>
      </Card>

      {/* Categories table card */}
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b bg-muted/20 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">Your categories</h3>
            <p className="text-xs text-muted-foreground">
              {categories.length} {categories.length === 1 ? 'category' : 'categories'} configured
            </p>
          </div>

          {categories.length > 5 && (
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search categories…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-8 text-sm h-9"
              />
            </div>
          )}
        </div>

        {editError && (
          <div className="p-4 border-b bg-destructive/10">
            <p className="text-xs text-destructive">{editError}</p>
          </div>
        )}

        {categories.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={FolderTree}
              title="No categories yet"
              description="Create your first category above to begin organizing your inventory."
            />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No categories match "{filter}".
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Category name</TH>
                <TH>Products</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {filteredCategories.map((c) => {
                const isEditing = editingId === c.id;
                const isConfirmingDelete = confirmDeleteId === c.id;

                return (
                  <TR key={c.id}>
                    <TD className="font-medium">
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
                            className="h-8 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleRename(c.id)}
                            disabled={pending || !editingName.trim()}
                            title="Save name"
                            className="rounded p-1 text-success hover:bg-success/10 disabled:opacity-50"
                          >
                            <Check className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            title="Cancel"
                            className="rounded p-1 text-muted-foreground hover:bg-muted"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">{c.name}</span>
                        </div>
                      )}
                    </TD>

                    <TD>
                      {c.productCount > 0 ? (
                        <Link
                          href={`/app/products?category=${c.id}`}
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                        >
                          <Badge variant="secondary">{c.productCount} {c.productCount === 1 ? 'product' : 'products'}</Badge>
                          <ExternalLink className="size-3 opacity-60" />
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">0 products</span>
                      )}
                    </TD>

                    <TD className="text-right">
                      {isConfirmingDelete ? (
                        <div className="inline-flex items-center gap-2">
                          <span className="text-xs text-destructive">
                            {c.productCount > 0 ? 'Has products! Delete anyway?' : 'Delete?'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id)}
                            disabled={pending}
                            className="rounded bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded border px-2 py-0.5 text-xs font-medium hover:bg-muted"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEditing(c)}
                            disabled={pending || isEditing}
                            aria-label={`Edit ${c.name}`}
                            title="Rename"
                            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setConfirmDeleteId(c.id);
                            }}
                            disabled={pending}
                            aria-label={`Delete ${c.name}`}
                            title="Delete category"
                            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
