# Repositories

Every read and write of the app's data goes through these interfaces (CLAUDE.md, "Code structure"). Each one has an in-memory mock (`*-repository.ts`, used by unit tests) and a Prisma version (`prisma-*-repository.ts`, used by the app).

**The one rule (Step 51):** a method that finds, changes or removes one row by id takes `schoolId` first and puts both in the `where`, so another school's id answers like a made-up one. If a method really must be unscoped, its comment says why. The full list, and the reasons, are in `docs/SCHOOL-ISOLATION.md`; `prisma-isolation.test.ts` proves the real queries.
