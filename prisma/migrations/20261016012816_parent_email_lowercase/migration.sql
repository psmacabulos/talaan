-- Parent emails are stored trimmed and in lower case from Step 53.1, so
-- sign-in can find one with an exact match on the unique email index.
--
-- Two accounts whose emails differ only by case or spaces would collide on
-- that index once lowercased. Stop with a clear message instead, before
-- anything changes. The whole file runs as one transaction, so a stop here
-- leaves every row as it was. Recovery: docs/PROBLEMS-LOG.md, P-014.
DO $$
DECLARE
  clashes integer;
BEGIN
  SELECT count(*) INTO clashes
  FROM (
    SELECT lower(trim(email))
    FROM "Parent"
    GROUP BY 1
    HAVING count(*) > 1
  ) AS same_email;

  IF clashes > 0 THEN
    RAISE EXCEPTION '% email address(es) belong to more than one parent account once lowercased. Merge those accounts first (docs/PROBLEMS-LOG.md, P-014).', clashes;
  END IF;
END $$;

UPDATE "Parent" SET "email" = lower(trim("email")) WHERE "email" <> lower(trim("email"));
