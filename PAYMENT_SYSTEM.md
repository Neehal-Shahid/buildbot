# BuildBot Payment System Analysis

This document outlines how the current manual payment system functions, the files involved, and the overall flow.

## 1. Overview
Currently, the payment system in BuildBot is manually handled. Users are directed to make payments outside the system (via JazzCash or EasyPaisa in Pakistan) and then submit their transaction ID on their dashboard. An administrator then manually verifies the payment through the admin dashboard and approves it to activate the store's plan.

## 2. Files Related to Payment

### Frontend (Dashboard & Admin UI)
- **`dashboard/dashboard.html`**
  - Contains the UI for the Billing tab.
  - Shows instructions to make manual payments (JazzCash / EasyPaisa).
  - Contains a form for the user to submit their chosen Plan, Payment Method, and Transaction Reference / ID.
  - Features JS functions `submitPayment()` and `loadPaymentHistory()` to communicate with the backend.

- **`dashboard/index.html`**
  - The landing page that displays the pricing plans.
  - Explains that the platform accepts JazzCash and EasyPaisa and instructs users to submit transaction IDs in the dashboard after sending payment.

- **`dashboard/admin.html`**
  - The admin panel UI containing the "Payments" tab.
  - Shows pending payments and payment history.
  - Provides options for the admin to **Approve** or **Reject** a submitted payment by comparing the user-submitted transaction ID against their own mobile banking statement.

### Backend (Routes & Logic)
- **`server/routes/payment.js` & `server/routes/auth.js`**
  - Contains the user-facing backend routes for payments:
    - `POST /payment/submit` (or `/payment`): Records the payment submission with its `transactionRef` into the database as `pending`, sends an email notification to the admin, and returns a success message.
    - `GET /payment/history`: Fetches the store's specific payment history from the database to display in the user's dashboard.

- **`server/routes/admin.js`**
  - Contains the admin-facing backend routes for payments:
    - `GET /admin/payments`: Retrieves all payments (both pending and processed) across all stores.
    - `POST /admin/approve-payment`: Updates the payment status to `approved` and upgrades the store's plan in the database.
    - `POST /admin/reject-payment`: Updates the payment status to `rejected`.
  - Has a stale payment alert job that flags payments pending for over 6 hours.

- **`server/database.js`**
  - Contains the `paymentDB` object which handles all database interactions regarding payments.
  - Methods include: `create()`, `approve()`, `reject()`, `getByStore()`, `getPending()`, `getAll()`, `getRevenue()`, and `getStalePending()`.
  - Modifies both the `payments` table (updates status) and the `stores` table (updates plan, plan status, and plan expiration date).

- **`server/email.js`**
  - Stores HTML email templates related to the payment lifecycle:
    - `adminNewPaymentEmail`: Sent to admin upon a new payment submission.
    - `paymentApprovedEmail`: Sent to the user when their payment is approved.
    - `paymentRejectedEmail`: Sent to the user when their payment is rejected.
    - `adminPaymentStaleEmail`: Sent to admin if a payment is unverified for 6+ hours.

- **`server/lib/plans.js`**
  - Configuration logic for getting the pricing, features, and limits of the different plans (Starter, Growth, Pro).

## 3. How the Payment System Works (Flow)

1. **Plan Selection & Payment:**
   The user navigates to the Billing tab in the dashboard (`dashboard.html`), selects a plan (Starter, Growth, Pro), and views the admin's provided phone number/account details for JazzCash or EasyPaisa. The user makes the transfer using their mobile app.

2. **Transaction Submission:**
   The user enters their chosen payment method and the Transaction ID (or Reference Number) into the dashboard form and submits it. This calls `POST /payment/submit`, which logs the payment as `pending` in the database and automatically emails the admin (`adminNewPaymentEmail`).

3. **Admin Verification:**
   The admin receives the email or notices the pending payment in the Admin Dashboard (`admin.html`). The admin manually checks their JazzCash or EasyPaisa app to verify if the money was received for that specific Transaction ID.

4. **Approval/Rejection:**
   - **If verified:** The admin clicks **Approve** in `admin.html`. This triggers `POST /admin/approve-payment`, which marks the payment as `approved`, sets the store's plan to `active` for 30 days (`plan_ends = date('now', '+30 days')`), and emails the user that their plan is now active (`paymentApprovedEmail`).
   - **If fake/not found:** The admin clicks **Reject**. This triggers `POST /admin/reject-payment`, marking it as `rejected`, and emails the user notifying them of the failure (`paymentRejectedEmail`).

5. **Stale Payments Check:**
   The system periodically checks (or the admin triggers) for payments that have been stuck in the `pending` state for more than 6 hours. If found, an alert email (`adminPaymentStaleEmail`) is dispatched to the admin to remind them to process the pending verification.

## 4. Considerations for Automation
If you plan to automate this in the future (e.g., using Stripe, PayPal, or local APIs like Safepay/JazzCash API):
- The `transactionRef` field could be replaced or supplemented by a secure payment gateway session ID or checkout token.
- Webhooks would replace the manual Admin Approval step (i.e. listening for `checkout.session.completed` on Stripe instead of an admin clicking "Approve").
- `plan_ends` calculations and recurring subscriptions could be outsourced directly to the payment provider.
