-- Section: add explicit program + year level (previously implied only by free-text name)
ALTER TABLE "Section" ADD COLUMN "program" TEXT;
ALTER TABLE "Section" ADD COLUMN "yearLevel" INTEGER;

-- Backfill from existing "<PROGRAM>-<YEAR_LETTER><BLOCK_NUMBER>" naming convention,
-- e.g. "BSIT-A1" -> program "BSIT", yearLevel 1 (A=1, B=2, C=3, D=4 ...).
UPDATE "Section"
SET "program" = split_part("name", '-', 1),
    "yearLevel" = ascii(upper(substring(split_part("name", '-', 2) from 1 for 1))) - ascii('A') + 1
WHERE "program" IS NULL;

ALTER TABLE "Section" ALTER COLUMN "program" SET NOT NULL;
ALTER TABLE "Section" ALTER COLUMN "yearLevel" SET NOT NULL;

-- SubjectOffering: add the actual "class code" concept (e.g. IT101-A), previously absent.
ALTER TABLE "SubjectOffering" ADD COLUMN "classCode" TEXT;

UPDATE "SubjectOffering" so
SET "classCode" = s."code" || '-' || chr(65 + (sub."rn" - 1)::int)
FROM "Subject" s,
     (
       SELECT "id", ROW_NUMBER() OVER (PARTITION BY "subjectId" ORDER BY "id") AS "rn"
       FROM "SubjectOffering"
     ) sub
WHERE so."subjectId" = s."id"
  AND so."id" = sub."id";

ALTER TABLE "SubjectOffering" ALTER COLUMN "classCode" SET NOT NULL;
CREATE UNIQUE INDEX "SubjectOffering_classCode_key" ON "SubjectOffering"("classCode");

-- CurriculumSubject: which subjects belong to a given program + year level.
CREATE TABLE "CurriculumSubject" (
    "id" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "yearLevel" INTEGER NOT NULL,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "CurriculumSubject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CurriculumSubject_program_yearLevel_subjectId_key" ON "CurriculumSubject"("program", "yearLevel", "subjectId");

ALTER TABLE "CurriculumSubject" ADD CONSTRAINT "CurriculumSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Dev bootstrap only: attach every existing Subject to every BSIT year level so
-- current seed data keeps working until real curriculum mappings are entered.
INSERT INTO "CurriculumSubject" ("id", "program", "yearLevel", "subjectId")
SELECT gen_random_uuid()::text, 'BSIT', yl, s."id"
FROM "Subject" s, generate_series(1, 4) AS yl
ON CONFLICT DO NOTHING;
