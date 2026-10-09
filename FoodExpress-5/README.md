# FoodExpress – Online Food Delivery (Supabase Backend)

## What this version does
- Restaurants & menu load from **Supabase PostgreSQL**
- Customer registration saves to `customer` table
- Checkout **places real orders** into `combinedorder`, `order`, `orderitem`, `payment`
- Restaurant dashboard shows live orders and can update status (Preparing → Ready)
- Delivery dashboard can accept orders and mark OutForDelivery / Delivered
- Profile loads past orders from DB and can save name/phone to DB
- Cart still uses localStorage until checkout (then saved to DB)

## Live flow (interconnection)
1. Customer registers / logs in → opens Restaurants (from DB) → adds items → Checkout
2. Order is written to database
3. Restaurant partner logs in → sees the order → Accept / Mark Ready
4. Delivery partner logs in → sees Ready orders → Accept → Mark Delivered
5. Customer Profile / Order tracking reflects status from DB

## Demo accounts
### Restaurant
- spice@foodexpress.com / spice123   (Restaurant ID 1)
- pizza@foodexpress.com / pizza123   (Restaurant ID 2)
- burger@foodexpress.com / burger123 (Restaurant ID 3)

### Delivery
- rahul@foodexpress.com / delivery123
- amit@foodexpress.com / delivery123
- priya@foodexpress.com / delivery123

## Supabase setup
1. Keys are in `js/supabaseClient.js` (already set for your project)
2. Turn **RLS OFF** on tables for testing (Table Editor → each table → RLS)
3. Tables must exist (lowercase names): customer, address, restaurant, menuitem, combinedorder, order, orderitem, payment, deliverypartner, ...

## Deploy
Upload the whole `FoodExpress` folder to Netlify (drag & drop).

## Files of interest
- `js/supabaseClient.js` – connection
- `js/db.js` – all database operations
- `restaurants.html` / `menu.html` – read from DB
- `checkout.html` – writes orders
- `restaurant_dashboard.html` / `delivery_dashboard.html` – read + update status
- `profile.html` – read orders + save profile
