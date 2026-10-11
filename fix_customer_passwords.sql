-- Set known passwords for any seed customers that used placeholder hashes
-- After this, login only works with the exact password below (or whatever each user registered with).
UPDATE customer
SET passwordhash = 'password123'
WHERE passwordhash IS NULL
   OR passwordhash = ''
   OR passwordhash LIKE 'hash%'
   OR passwordhash = 'demo';

-- Optional: verify
-- SELECT customerid, name, email, passwordhash FROM customer;
