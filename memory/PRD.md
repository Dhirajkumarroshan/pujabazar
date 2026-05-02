# PRD — PujaBazar.in (Production-Ready Ecommerce)

## Problem statement
Make the PujaBazar.in ecommerce website production ready (frontend + backend). Don't test for each step — test after major changes to save cost. Hero slider height must remain unchanged (`h-[78vh] min-h-[520px]`). Analyze the repo first and list prerequisites.

## Tech stack
- Backend: FastAPI (Python 3.11), Motor + MongoDB, bcrypt, PyJWT, slowapi, razorpay SDK
- Frontend: React 18 + React Router v6 + Tailwind + lucide-react + sonner + axios
- Auth: JWT cookie + bearer + Emergent-managed Google OAuth

## User personas
- Shopper — discovers products, filters, adds to cart, checks out COD/prepaid
- Admin — manages products/orders/customers, exports data, updates order status
- Guest — browses shop, reads legal pages

## Core requirements (static)
1. Product catalog, cart, COD + Razorpay checkout (mock when keys absent)
2. Auth: email/password + Google via Emergent
3. Admin console: products / orders / customers / stats / CSV export
4. Legal pages: Privacy, Terms, Returns, Shipping
5. Mobile-responsive nav + filters + PDP
6. Hero slider height preserved at `h-[78vh] min-h-[520px]`

## What's been implemented (2026-01 production-readiness pass)
### Backend
- `/api/health` liveness (pings MongoDB)
- slowapi rate limiting: login 20/min, register 10/min per IP
- Pydantic validators: phone (10-digit starting 6-9), pincode (6 digits), payment_method enum, order status enum
- Atomic stock decrement on checkout; restore on Razorpay failure or admin cancel
- Razorpay webhook `/api/payments/webhook` (HMAC-verified; no-op when secret absent)
- Admin: `/api/admin/customers` (with order_count + total_spend), `/api/admin/orders/{id}`, `/api/admin/export/orders.csv`, `low_stock` count in stats
- CORS regex for any `*.preview.emergentagent.com` subdomain
- Email stub (logs only) — wire to SendGrid/Resend for prod
- Unused product seed image URLs fixed (2 broken customer-assets URLs → local `/images/hero{3,5}.jpg`)

### Frontend
- Product Detail Page `/product/:productId` with add-to-cart / buy-now / quantity / related products
- Legal pages `/legal/privacy|terms|returns|shipping` with editable template content
- 404 page + ErrorBoundary component
- Mobile hamburger menu (slide-over) with search
- Shop filters: sort (newest/price asc/desc/A-Z), min/max price, clear filters
- Footer policy links wired to `/legal/*`
- Admin: Customers page + Orders detail modal + CSV export link
- SEO: meta + OG + Twitter + JSON-LD in `index.html`; `robots.txt`, `sitemap.xml`, `favicon.svg`
- GA4 snippet driven by `REACT_APP_GA_ID` (no-op when unset)
- `data-testid` on all interactive elements
- Hero slider height **preserved** (`h-[78vh] min-h-[520px]`)

### Tests (via testing_agent_v3 — iteration_1.json)
- 31/31 backend pytest cases PASSED
- Frontend critical flows 100% verified: hero preserved, PDP navigation, mobile menu, legal pages, 404, admin console, COD checkout end-to-end

## Prioritized backlog
### P0 — before live launch
- [ ] Paste real Razorpay `KEY_ID` / `KEY_SECRET` / `WEBHOOK_SECRET` in `backend/.env`
- [ ] Wire email stub to a real provider (SendGrid / Resend / SMTP)
- [ ] Set `REACT_APP_GA_ID` in `frontend/.env` if analytics desired

### P1 — next iteration
- [ ] Password reset flow (email-based token)
- [ ] Search autocomplete (typeahead)
- [ ] Order invoice PDF download
- [ ] Migrate FastAPI `@app.on_event('startup')` to `lifespan` handler (non-blocking)
- [ ] Replace textual newsletter input with a real list (Mailchimp/Resend audiences)

### P2 — nice to have
- [ ] Reviews & ratings per product
- [ ] Wishlists
- [ ] Coupon codes
- [ ] Multi-currency / international shipping

## Next tasks
Launch readiness: plug in real Razorpay keys + email provider + GA4 ID; verify webhook via a test transaction.
