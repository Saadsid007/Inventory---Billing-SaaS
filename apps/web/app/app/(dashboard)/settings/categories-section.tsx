'use client';

import { Button, FormError, Input } from '@bahikhata/ui';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { addCategoryAction, removeCategoryAction } from './actions';

export function CategoriesSection({
  categories,
}: {
  categories: readonly { id: string; name: string }[];
}) {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  function add() {
    setError(undefined);
    startTransition(async () => {
      const result = await addCategoryAction({ name });
      if (result.ok) {
        setName('');
        router.refresh();
      } else {
        setError(result.fieldErrors?.['name'] ?? result.formError);
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await removeCategoryAction(id);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 border-t pt-8">
      <div>
        <h2 className="text-base font-medium">Categories</h2>
        <p className="text-sm text-muted-foreground">
          Nothing is seeded here on purpose — a kirana store and a hardware shop have nothing in
          common, and a wrong default is worse than an empty list.
        </p>
      </div>

      <FormError>{error}</FormError>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 rounded-md border py-1 pr-1 pl-2.5 text-sm"
            >
              {c.name}
              <button
                type="button"
                onClick={() => remove(c.id)}
                disabled={pending}
                aria-label={`Remove ${c.name}`}
                className="rounded p-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-56">
          <Input
            placeholder="Category name"
            aria-label="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={add} disabled={pending || !name}>
          Add category
        </Button>
      </div>
    </section>
  );
}
