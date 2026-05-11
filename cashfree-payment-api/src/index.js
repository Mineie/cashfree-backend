import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { randomUUID } from "crypto";

const app = express();
const PORT = process.env.PORT || 8080;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/healthz", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// ─── POST /api/payment ────────────────────────────────────────────────────────
interface PaymentRequestBody {
  amount: number;
  phone: string;
}

interface CashfreeOrderResponse {
  order_id: string;
  order_status: string;
  payment_session_id: string;
  message?: string;
  code?: string;
  type?: string;
}

app.post("/api/payment", async (req: Request, res: Response) => {
  const { amount, phone } = req.body as PaymentRequestBody;

  // Validate input
  if (!amount || !phone) {
    res.status(400).json({
      success: false,
      error: "Missing required fields: amount and phone are required",
    });
    return;
  }

  if (typeof amount !== "number" || amount <= 0) {
    res.status(400).json({
      success: false,
      error: "amount must be a positive number",
    });
    return;
  }

  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;

  if (!appId || !secretKey) {
    console.error("Cashfree credentials not configured");
    res.status(500).json({
      success: false,
      error: "Payment gateway not configured. Please contact support.",
    });
    return;
  }

  const orderId = `order_${randomUUID().replace(/-/g, "").slice(0, 20)}`;

  const orderPayload = {
    order_id: orderId,
    order_amount: amount,
    order_currency: "INR",
    customer_details: {
      customer_id: `cust_${phone.replace(/\D/g, "")}`,
      customer_phone: phone,
    },
    order_meta: {
      return_url: `${process.env.RETURN_URL ?? "https://yourapp.com/payment/status"}?order_id={order_id}`,
    },
  };

  // Cashfree sandbox URL — swap to https://api.cashfree.com/pg/orders for production
  const cashfreeUrl = "https://sandbox.cashfree.com/pg/orders";

  try {
    const response = await fetch(cashfreeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secretKey,
      },
      body: JSON.stringify(orderPayload),
    });

    const data = (await response.json()) as CashfreeOrderResponse;

    if (!response.ok) {
      console.error("Cashfree API error", { status: response.status, data });
      res.status(response.status).json({
        success: false,
        error: "Failed to create payment order",
        details: data,
      });
      return;
    }

    res.status(200).json({
      success: true,
      order_id: data.order_id,
      payment_session_id: data.payment_session_id,
      order_status: data.order_status,
    });
  } catch (err) {
    console.error("Unexpected error creating Cashfree order", err);
    res.status(500).json({
      success: false,
      error: "Internal server error. Please try again.",
    });
  }
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error", err);
  res.status(500).json({ success: false, error: "Internal server error" });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

export default app;
