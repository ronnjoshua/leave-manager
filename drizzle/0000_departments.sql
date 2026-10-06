DO $$
BEGIN
	IF to_regclass('public.allowed_user') IS NULL THEN
		RAISE EXCEPTION '0000_departments requires the existing allowed_user table';
	END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "department" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"parent_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "allowed_user" ADD COLUMN IF NOT EXISTS "department_id" text;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'department_parent_id_department_id_fk'
			AND conrelid = 'public.department'::regclass
	) THEN
		ALTER TABLE "department"
			ADD CONSTRAINT "department_parent_id_department_id_fk"
			FOREIGN KEY ("parent_id") REFERENCES "public"."department"("id")
			ON DELETE SET NULL ON UPDATE NO ACTION;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'allowed_user_department_id_department_id_fk'
			AND conrelid = 'public.allowed_user'::regclass
	) THEN
		ALTER TABLE "allowed_user"
			ADD CONSTRAINT "allowed_user_department_id_department_id_fk"
			FOREIGN KEY ("department_id") REFERENCES "public"."department"("id")
			ON DELETE SET NULL ON UPDATE NO ACTION;
	END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "department_parent_id_idx" ON "department" USING btree ("parent_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "allowed_user_department_id_idx" ON "allowed_user" USING btree ("department_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "department_parent_name_unique" ON "department" USING btree (coalesce("parent_id", ''), lower("name"));
