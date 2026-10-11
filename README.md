# FoodExpress — Online Food Delivery Platform

A full-stack style food delivery UI with a shared **Supabase (PostgreSQL)** backend. Customers, restaurants, and delivery partners all work from the same live data.

## Design theme

Editorial hospitality style (inspired by refined restaurant sites):

| Token | Value |
|--------|--------|
| Display font | **Cormorant Garamond** (serif headlines) |
| Body font | **Outfit** (UI text) |
| Ink / text | `#1C1917` |
| Paper / background | `#FAF9F7` / `#F5F2EC` |
| Accent | Terracotta `#9A3412` |
| Style | Photo-forward heroes, minimal chrome, uppercase micro-labels, soft motion |

Not the old bright-orange “student app” look — calmer, more professional.

## Pages

| Page | Role |
|------|------|
| `index.html` | Public landing — fullscreen hero photo, categories, featured restaurants, CTA |
| `login.html` / `register.html` | Customer auth (also writes to `customer` table) |
| `home.html` | Logged-in customer home with search banner |
| `restaurants.html` | Restaurant list loaded from Supabase |
| `menu.html` | Menu items + images from Supabase; add to cart |
| `cart.html` | Cart (localStorage until checkout) |
| `checkout.html` | Places real orders into `orders` / `orderitem` / `payment` |
| `order_tracking.html` | Track order |
| `profile.html` | Profile save + past orders from DB |
| `restaurant_login.html` | Restaurant partner login |
| `restaurant_dashboard.html` | Orders · My Menu · Analytics (live DB) |
| `delivery_login.html` | Delivery partner login |
| `delivery_dashboard.html` | Dashboard · Deliveries · History · Earnings (live DB) |

## Core features

- **Shared cloud database** (Supabase) so all roles see the same orders  
- Restaurants & menus load dynamically (including images)  
- Checkout creates `combinedorder` + `orders` + `orderitem` + `payment`  
- Restaurant can **Accept → Mark Ready**  
- Delivery partner can **Accept → Pick Up → Mark Delivered**  
- Profile and partner analytics reflect real rows  
- Editorial UI: Ken Burns heroes, scroll reveal, glass/transparent navbar on landing  
- Responsive layout (desktop + mobile)

## Demo accounts

### Restaurant
| Email | Password | Restaurant |
|-------|----------|------------|
| `spice@foodexpress.com` | `spice123` | Spice Garden |
| `pizza@foodexpress.com` | `pizza123` | Pizza Palace |
| `burger@foodexpress.com` | `burger123` | Burger Hub |

### Delivery
| Email | Password |
|-------|----------|
| `rahul@foodexpress.com` | `delivery123` |
| `amit@foodexpress.com` | `delivery123` |
| `priya@foodexpress.com` | `delivery123` |

## End-to-end flow

1. Customer registers / logs in → browses restaurants → adds items → checkout  
2. Order is stored in Supabase  
3. Restaurant dashboard shows the order → Accept → Mark Ready  
4. Delivery dashboard shows the job → Accept → Pick Up → Mark Delivered  
5. History / earnings / profile update from the same data  

## Supabase setup

1. Put your project URL and **publishable** key in `js/supabaseClient.js`  
2. Tables use **lowercase** names (`restaurant`, `menuitem`, `customer`, `orders`, …)  
3. Important: the order table must be named **`orders`** (not `order` — reserved word).  
   Run `fix_order_table.sql` in the SQL Editor if needed.  
4. Seed full catalogue (9 restaurants, 108 items + images): run `seed_full_data.sql`  
5. For demos, turn **RLS off** on the tables (or add open policies)

### Main JS modules

| File | Purpose |
|------|---------|
| `js/supabaseClient.js` | Creates the Supabase client |
| `js/db.js` | All database reads/writes |
| `js/cart.js` | Cart helpers (localStorage) |
| `js/script.js` | Shared UI (navbar scroll, reveals, toasts) |
| `css/style.css` | Site theme |
| `css/dashboard.css` | Partner dashboard layout |
| `css/responsive.css` | Breakpoints |

## How to run

**Local:** open `index.html` in a browser (or use any static server).

**Hosted:** deploy the whole `FoodExpress` folder to **Netlify** (drag-and-drop) or similar static host.  
API calls go to Supabase — no custom backend server required for this project.

## Tech stack

- HTML5 · CSS3 · Bootstrap 5.3 · Bootstrap Icons  
- Vanilla JavaScript  
- Google Fonts (Cormorant Garamond + Outfit)  
- Supabase JS client v2 · PostgreSQL  

## Project note

Built as a DBMS project demonstrating a normalized relational schema with a working multi-role UI: customers, restaurants, and delivery partners interconnected through one shared database.
