-- Remove every auto-generated default address
DELETE FROM address
WHERE LOWER(TRIM(COALESCE(street,''))) IN ('default address', 'default')
   OR LOWER(COALESCE(street,'')) LIKE '%default address%'
   OR (LOWER(COALESCE(city,'')) = 'kochi' AND LOWER(COALESCE(street,'')) LIKE '%default%');

-- Clear isdefault flags so nothing is treated as default
UPDATE address SET isdefault = false WHERE isdefault = true;
