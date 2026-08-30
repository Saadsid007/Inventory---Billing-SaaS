CREATE TABLE "sales_return_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"product_id" uuid,
	"name" text NOT NULL,
	"qty" numeric(12, 3) NOT NULL,
	"rate" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"restock" text DEFAULT 'yes' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"invoice_id" uuid,
	"party_id" uuid,
	"return_date" text NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"reason" text,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales_return_lines" ADD CONSTRAINT "sales_return_lines_return_id_sales_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."sales_returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_return_lines" ADD CONSTRAINT "sales_return_lines_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_return_lines" ADD CONSTRAINT "sales_return_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sales_return_lines_return_idx" ON "sales_return_lines" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "sales_returns_business_idx" ON "sales_returns" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "sales_returns_invoice_idx" ON "sales_returns" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "sales_returns_party_idx" ON "sales_returns" USING btree ("party_id");