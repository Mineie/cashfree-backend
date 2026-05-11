import express from "express";
import cors from "cors";
import crypto from "crypto";


async function sendTelegramMessage(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });
  } catch (error) {
  console.log("FULL BACKEND ERROR:", error);

  res.status(500).json({
    success: false,
    error: error.message,
  });
}

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
}));

app.use(express.json());
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Payment route
app.post("/api/payment", async (req, res) => {
  const { amount, phone } = req.body;

  // Validate input
  if (!amount || !phone) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: amount and phone are required",
    });
  }

  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: "amount must be a positive number",
    });
  }

  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;

  if (!appId || !secretKey) {
    console.error("Cashfree credentials not configured");

    return res.status(500).json({
      success: false,
      error: "Payment gateway not configured",
    });
  }

  const orderId =
    "order_" +
    crypto.randomUUID().replace(/-/g, "").slice(0, 20);

  const orderPayload = {
    order_id: orderId,
    order_amount: Number(amount),
    order_currency: "INR",

customer_details: {
  customer_id: `cust_${phone.replace(/\D/g, "")}`,
  customer_name: name,
  customer_email: "test@example.com",
  customer_phone: phone,
},

    order_meta: {
      return_url: `${
        process.env.RETURN_URL ||
        "chatterjee-hotel.netlify.app"
      }?order_id={order_id}`,
    },
  };

  const cashfreeUrl =
    "https://api.cashfree.com/pg/orders";

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

    const data = await response.json();
   console.log("STATUS:", response.status);
   console.log("CASHFREE RESPONSE:", data);

    if (!response.ok) {
      console.error("Cashfree API error", data);

      return res.status(response.status).json({
        success: false,
        error: "Failed to create payment order",
        details: data,
      });
    }

    await sendTelegramMessage(`
✅ NEW PAYMENT

👤 Name: ${req.body.name}
📍 Address: ${req.body.address}
📞 Phone: ${phone}
💰 Amount: ₹${amount}

🆔 Order ID: ${data.order_id}
`);
    return res.status(200).json({
      success: true,
      order_id: data.order_id,
      payment_session_id: data.payment_session_id,
      order_status: data.order_status,
    });
  } catch (err) {
    console.error("Unexpected error creating Cashfree order", err);

    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error", err);

  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

