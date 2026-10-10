# FoodExpress — Online Food Delivery & Restaurant Management

## Multi-restaurant orders
- One **combined order id** groups all restaurant sub-orders
- Each restaurant gets its own **order id** for kitchen tracking
- **One payment** is recorded against the combined order
- A delivery job appears only when **all** restaurants mark **Ready**
- Accepting the job assigns **one** delivery partner to every sub-order

## Customers
Register/login · browse · search dishes · cart · checkout (coupons) · track · review · history

## Restaurants
Live orders · Accept → Ready · My Menu (add / toggle availability) · Analytics

## Delivery
Dashboard · Deliveries · History · Earnings

## SQL
`seed_full_data.sql` · `seed_cuisine.sql` · `seed_coupon.sql` · `fix_order_table.sql` · `fix_review_table.sql` · `insights.sql`

## Demo
- Restaurant: spice@foodexpress.com / spice123
- Delivery: rahul@foodexpress.com / delivery123
- Coupons: SAVE50, WELCOME20, FLAT100
