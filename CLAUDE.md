# LandlordLedger — Claude Code Briefing

## Project Overview
LandlordLedger is a property accounting and portfolio management SaaS for landlords. Built by Douglas Brown, an indie developer in Tulsa, Oklahoma.

## Live App
- Production: https://www.landlord-ledger.app
- Repo: Digdug1020/landlord-ledger

## Tech Stack
- Frontend: React (Create React App)
- Backend: Vercel Serverless Functions (api/ folder)
- Database: Supabase (PostgreSQL + Auth)
- Payments: Stripe (subscriptions)
- Hosting: Vercel
- Domain: Cloudflare (landlord-ledger.app)

## Supabase
- Project URL: https://tnzzddthfmqkrvboctwj.supabase.co
- Tables: businesses, properties, transactions, recurring_transactions, notes, subscriptions
- Auth: Google OAuth + email/password
- RLS enabled on all tables — every query must be scoped to business_id or owner_id

## Key Files
- src/App.jsx — entire frontend (single file React app)
- src/Landing.js — public landing page shown to logged-out users
- src/supabaseClient.js — Supabase client initialization
- api/create-checkout.js — Stripe checkout session creation
- api/webhook.js — Stripe webhook handler
- api/post-recurring.js — auto-backfill recurring transactions
- public/service-worker.js — PWA service worker
- vercel.json — routing config

## Environment Variables (Vercel)
- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_ANON_KEY
- STRIPE_SECRET_KEY (live: sk_live_...)
- REACT_APP_STRIPE_PUBLISHABLE_KEY (live: pk_live_...)
- STRIPE_PRICE_MONTHLY (live price ID for $12/mo)
- STRIPE_PRICE_ANNUAL (live price ID for $99/yr)
- STRIPE_WEBHOOK_SECRET (to be added after webhook setup)

## Business Logic
- Multi-tenant: each user has a business record, all data scoped to business_id
- Trial: 30 days free, trial_ends_at stored in businesses table
- Paywall: shown when trial expired and subscription status != "pro"
- Subscription status stored in subscriptions table (status: "free" or "pro")
- Recurring transactions auto-backfilled via api/post-recurring.js on each login

## Coding Conventions
- Keep it simple — no over-engineering
- All frontend in src/App.jsx (single file by design)
- Serverless functions in api/ folder
- Always use async/await, always handle errors
- Never break existing functionality when adding features
- Test on www.landlord-ledger.app after every deploy

## Known Issues / Notes
- Service worker caches aggressively — use network-first strategy
- vercel.json uses routes with handle:filesystem to avoid catching static files
- Back button during Google OAuth causes a known edge case error (low priority)
- App.jsx backup saved as App.jsx.backup — do not delete
