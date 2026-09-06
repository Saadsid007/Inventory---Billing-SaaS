-- Storefront config, category tree and product subcategory.
--
-- Written idempotently, which is NOT how drizzle-kit generates a migration.
-- These changes reached the shared database through `db:push`, so the columns
-- already exist there while no migration file described them. A plain
-- `ADD COLUMN` would fail on that database and a fresh one would be left
-- without the columns entirely — the schema and its history had diverged.
--
-- Guarding every statement lets the same file apply cleanly to both: a no-op
-- where the change is already present, and the real change on a new database
-- (a Neon dev branch, another developer's machine, a restore). Nothing here
-- destroys data.

ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_business_name_unq";--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "storefront_config" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "image_url" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "subcategory_id" uuid;--> statement-breakpoint

-- Postgres has no ADD CONSTRAINT IF NOT EXISTS, so these check first.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_parent_id_categories_id_fk') THEN
    ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk"
      FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_subcategory_id_categories_id_fk') THEN
    ALTER TABLE "products" ADD CONSTRAINT "products_subcategory_id_categories_id_fk"
      FOREIGN KEY ("subcategory_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "categories_business_idx" ON "categories" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_parent_idx" ON "categories" USING btree ("parent_id");
