# Goal-Based Financial Planner (React Native + Node + MySQL)

## Backend
1. Create DB: `mysql -u root -p < backend/schema.sql`
2. `cd backend && cp .env.example .env` (fill DB password + JWT secret)
3. `npm install && npm start`  (runs on :4000)

## Mobile (Expo)
1. `cd mobile && npm install && npx expo start`
2. Edit BASE_URL in `api.js` (10.0.2.2 for Android emulator, PC's LAN IP for a real phone)
3. Scan the QR code with Expo Go or press `a` for the emulator

## Formulas (backend/calc.js)
- EMI = P·r·(1+r)^n / ((1+r)^n − 1)
- Inflated cost = C·(1+i)^t
- SIP: M = FV·r / (((1+r)^n − 1)(1+r))
- r = 0 handled as P/n and FV/n
