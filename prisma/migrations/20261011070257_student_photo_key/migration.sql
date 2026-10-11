-- Step 46.5: a student's photo is stored as a key into PhotoStorage
-- ("school-balanga/student-0001/k3x9q2ab.webp"), never a provider URL.
-- Prisma generated a drop and an add; a rename says what this really is,
-- and keeps any value (there are none yet).
ALTER TABLE "Student" RENAME COLUMN "photoUrl" TO "photoKey";
