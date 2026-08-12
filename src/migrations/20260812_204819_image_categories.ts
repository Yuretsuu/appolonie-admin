import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "image_categories" (
      "id" serial PRIMARY KEY NOT NULL,
      "image_id" integer NOT NULL,
      "category_id" integer NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "image_categories"
      ADD CONSTRAINT "image_categories_image_id_media_id_fk"
      FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "image_categories"
      ADD CONSTRAINT "image_categories_category_id_categories_id_fk"
      FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "image_categories_image_idx" ON "image_categories" USING btree ("image_id");
    CREATE INDEX "image_categories_category_idx" ON "image_categories" USING btree ("category_id");
    CREATE UNIQUE INDEX "image_categories_image_category_idx" ON "image_categories" USING btree ("image_id", "category_id");
    CREATE INDEX "image_categories_updated_at_idx" ON "image_categories" USING btree ("updated_at");
    CREATE INDEX "image_categories_created_at_idx" ON "image_categories" USING btree ("created_at");

    INSERT INTO "image_categories" ("image_id", "category_id")
      SELECT "media"."id", "categories"."id"
      FROM "media"
      JOIN "categories" ON trim("media"."category") = "categories"."name"
      WHERE "media"."category" IS NOT NULL AND trim("media"."category") <> ''
      ON CONFLICT ("image_id", "category_id") DO NOTHING;

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "image_categories_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_image_categories_fk"
      FOREIGN KEY ("image_categories_id") REFERENCES "public"."image_categories"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "payload_locked_documents_rels_image_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("image_categories_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "image_categories" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "image_categories" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_image_categories_fk";
  
  DROP INDEX "payload_locked_documents_rels_image_categories_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "image_categories_id";`)
}
