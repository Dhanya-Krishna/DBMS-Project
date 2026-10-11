CREATE TABLE IF NOT EXISTS coupon (
  couponid SERIAL PRIMARY KEY,
  code VARCHAR(40) UNIQUE NOT NULL,
  discounttype VARCHAR(20) DEFAULT 'flat',
  discountvalue NUMERIC(10,2) NOT NULL,
  minorder NUMERIC(10,2) DEFAULT 0,
  validuntil TIMESTAMP,
  isactive BOOLEAN DEFAULT TRUE
);
INSERT INTO coupon (code, discounttype, discountvalue, minorder, validuntil, isactive) VALUES
('SAVE50', 'flat', 50, 199, NOW() + INTERVAL '1 year', TRUE),
('WELCOME20', 'percent', 20, 299, NOW() + INTERVAL '1 year', TRUE),
('FLAT100', 'flat', 100, 499, NOW() + INTERVAL '1 year', TRUE)
ON CONFLICT (code) DO NOTHING;
