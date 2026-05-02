# PujaBazar Test Credentials

## Admin (full access)
- URL: /admin
- Email: admin@pujabazar.in
- Password: Admin@12345
- Role: admin

## Test Customer
- Email: test@pujabazar.in
- Password: Test@12345
- Role: customer

## Auth Endpoints
- POST /api/auth/register (rate-limited 10/min per IP)
- POST /api/auth/login (rate-limited 20/min per IP)
- POST /api/auth/logout
- GET  /api/auth/me
- POST /api/auth/emergent-session  (Google via Emergent Auth)

## Admin Endpoints
- GET  /api/admin/stats
- GET  /api/admin/orders
- GET  /api/admin/orders/{order_id}
- PUT  /api/admin/orders/{order_id}/status   (auto-restores stock if status=cancelled)
- GET  /api/admin/customers
- GET  /api/admin/export/orders.csv

## Health & Config
- GET  /api/health  (DB ping)
- GET  /api/config  (public: razorpay_key_id)

## Notes
- JWT is set as httpOnly cookie `access_token` AND returned in response.token (used as Bearer fallback).
- Google OAuth: frontend redirects to `https://auth.emergentagent.com/?redirect=...`, lands on `/#session_id=...`, handled by `pages/AuthCallback.jsx` → POST `/api/auth/emergent-session`. Backend stores session in `user_sessions` + sets `session_token` httpOnly cookie.
- Razorpay keys are NOT configured (RAZORPAY_KEY_ID/SECRET empty) → backend is in mock prepaid mode: checkout with `razorpay` returns `mock: true` and order is in `test_mode`. COD flow is fully functional.
- Webhook: /api/payments/webhook (HMAC-SHA256 verified). Returns `{ok:false, reason:"webhook_secret_not_configured"}` until `RAZORPAY_WEBHOOK_SECRET` is set.
- Email is log-only stub; replace `send_email_stub` in server.py with SendGrid/Resend.
- Stock is atomically decremented on checkout and restored on admin cancel.
