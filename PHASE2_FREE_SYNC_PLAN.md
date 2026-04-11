# Phase 2: Free Multi-Device Sync Plan

This project can be upgraded to a real shared app for:

- 1 desktop or laptop
- 2 to 3 phones
- live shared data
- free tier only

## Free Stack

- Frontend hosting: Cloudflare Pages free
- Database and realtime sync: Supabase free
- App type: PWA

## What Stays The Same

- invoice dashboard
- invoice create/edit page
- product master page
- production log page
- printable invoice layout

## What Changes

- LocalStorage becomes cloud database storage
- all devices use the same Supabase project
- updates show across phone and PC
- data remains available even if the PC is off

## Data Tables

- `messers`
- `products`
- `invoices`
- `invoice_items`
- `production_records`

## Build Steps

1. Create a free Supabase project.
2. Run the SQL in `supabase/schema.sql`.
3. Copy project URL and anon key into `js/supabase-config.js`.
4. Add the Supabase browser client script to all pages.
5. Replace LocalStorage reads and writes with Supabase calls.
6. Add realtime subscriptions for invoices, products, and records.
7. Deploy the static app to Cloudflare Pages free.
8. Open the deployed URL on phone and PC and install it as a PWA.

## Phase 2 Coding Order

1. `products`
   Store shared product master list first.
2. `messers`
   Store reusable customer names next.
3. `production_records`
   Move the log page to shared storage.
4. `invoices`
   Migrate invoice header and line items last.
5. `realtime`
   Add live refresh and cross-device updates.

## Free Usage Expectation

For 4 people and mostly text data, the free tier should usually be enough to start.

## Important Note

This repo is now prepared for the free synced version, but live sync still needs:

- a Supabase project
- the project URL
- the anon public key

Without those, the app will continue using LocalStorage only.
