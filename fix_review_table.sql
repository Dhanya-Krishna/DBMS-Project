CREATE TABLE IF NOT EXISTS review (
  reviewid SERIAL PRIMARY KEY,
  orderid INT,
  customerid INT,
  restaurantid INT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT
);
ALTER TABLE review ADD COLUMN IF NOT EXISTS orderid INT;
ALTER TABLE review ADD COLUMN IF NOT EXISTS customerid INT;
ALTER TABLE review ADD COLUMN IF NOT EXISTS restaurantid INT;
ALTER TABLE review ADD COLUMN IF NOT EXISTS rating INT;
ALTER TABLE review ADD COLUMN IF NOT EXISTS comment TEXT;
