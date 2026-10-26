-- Rows in every table of the app's schema (Step 59.2): run against the live
-- database and a restored copy, and compare the two outputs with diff.
-- Generic on purpose, so a new table is counted without changing this file.
SELECT table_name,
       (xpath('/row/n/text()',
              query_to_xml(format('SELECT count(*) AS n FROM %I.%I', table_schema, table_name), false, true, '')
       ))[1]::text::bigint AS row_count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
