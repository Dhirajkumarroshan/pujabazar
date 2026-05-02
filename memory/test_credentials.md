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
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET  /api/auth/me
- POST /api/auth/emergent-session  (Google via Emergent Auth)

## Notes
- JWT is set as httpOnly cookie `access_token` AND returned in response.token (used as Bearer fallback).
- Google OAuth flow: Frontend calls `https://auth.emergentagent.com/?redirect=...`, lands on `/#session_id=...`, which is handled by `pages/AuthCallback.jsx` posting to `/api/auth/emergent-session`. Backend stores session in `user_sessions` and sets `session_token` httpOnly cookie.
- Razorpay keys are NOT configured (RAZORPAY_KEY_ID/SECRET empty in .env). Backend operates in mock prepaid mode — checkout with `razorpay` returns `mock: true` and order is created in `test_mode`. COD flow works fully.
