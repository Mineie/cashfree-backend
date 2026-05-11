# Cashfree Payment API

A production-ready Express.js backend that integrates with the Cashfree payment gateway. Accepts a payment amount and customer phone number, creates a Cashfree order, and returns a `payment_session_id` for use with the Cashfree JS SDK.

## Endpoints

### `GET /api/healthz`
Health check.
```json
{ "status": "ok" }
```

### `POST /api/payment`
Creates a Cashfree payment order.

**Request body:**
```json
{
  "amount": 100,
  "phone": "9999999999"
}
```

**Success response:**
```json
{
  "success": true,
  "order_id": "order_abc123",
  "payment_session_id": "session_xyz...",
  "order_status": "ACTIVE"
}
```

---

## Deploy to Render

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/cashfree-payment-api.git
git push -u origin main
```

### 2. Create a new Web Service on Render
- Go to [render.com](https://render.com) → New → Web Service
- Connect your GitHub repository
- Render will auto-detect `render.yaml` and configure everything

### 3. Set environment variables in Render dashboard
| Key | Value |
|-----|-------|
| `CASHFREE_APP_ID` | Your Cashfree App ID |
| `CASHFREE_SECRET_KEY` | Your Cashfree Secret Key |
| `RETURN_URL` | `https://your-app.onrender.com/payment/status` |

> **Sandbox vs Production:** The code points to `sandbox.cashfree.com`. When going live, change line in `src/index.ts`:
> ```
> https://sandbox.cashfree.com/pg/orders  →  https://api.cashfree.com/pg/orders
> ```
> and update your credentials to production keys.

---

## Local Development

```bash
# Install dependencies
npm install

# Copy env file and fill in your Cashfree credentials
cp .env.example .env

# Run in dev mode
npm run dev
```

## Frontend Integration (Cashfree JS SDK)

```html
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
<script>
  const cashfree = Cashfree({ mode: "sandbox" }); // change to "production" when live

  async function pay() {
    const res = await fetch("https://your-api.onrender.com/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 100, phone: "9999999999" })
    });
    const { payment_session_id } = await res.json();
    cashfree.checkout({ paymentSessionId: payment_session_id });
  }
</script>
```
