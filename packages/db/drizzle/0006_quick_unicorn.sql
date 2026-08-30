ALTER TABLE "sales_return_lines" ADD COLUMN "invoice_line_id" uuid;--> statement-breakpoint
ALTER TABLE "sales_return_lines" ADD COLUMN "hsn_code" text;--> statement-breakpoint
ALTER TABLE "sales_return_lines" ADD COLUMN "tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_return_lines" ADD COLUMN "taxable_value" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_return_lines" ADD COLUMN "cgst_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_return_lines" ADD COLUMN "sgst_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_return_lines" ADD COLUMN "igst_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_return_lines" ADD COLUMN "cess_amount" numeric(12, 2) DEFAULT '0' NOT NULL;