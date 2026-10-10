-- Fix: PostgreSQL / PostgREST cannot easily expose a table named "order" (reserved word).
-- Rename it to "orders" so the dashboard can load data.

-- If your table is currently named "order" or "Order":
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'order'
  ) THEN
    ALTER TABLE "order" RENAME TO orders;
  END IF;
END $$;

-- Ensure expected columns exist (safe if already present)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS combinedorderid INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customerid INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS restaurantid INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deliverypartnerid INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS addressid INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS orderdatetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Placed';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deliveryfee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paymentstatus VARCHAR(20) DEFAULT 'Pending';

-- Reload schema cache hint: in Supabase Dashboard go to Settings → API → reload,
-- or just wait a few seconds after rename.
