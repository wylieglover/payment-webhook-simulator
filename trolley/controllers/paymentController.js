const fetch = require("node-fetch");
const crypto = require("crypto");
const pool = require("../../shared/db");
const sendWebhook = require("../services/webhookService");

const TROLLEY_CITIBANK_SECRET = "trolley_secret_123";
const CITIBANK_API_URL = "http://localhost:3002/transfers";

const processPayment = async (req, res) => { 
  try {
    // Authenticate customer
    const apiKey = req.headers["authorization"];
    const customerResult = await pool.query(
      "SELECT * FROM trolley.customers WHERE api_key = $1",
      [apiKey]
    );
      
    if (customerResult.rows.length === 0) {
      return res.status(401).json({ message: "Invalid API Key" });
    }
      
    const customer = customerResult.rows[0];
    const { recipient, amount, idempotency_key } = req.body;

    // Validate idempotency key
    if (!idempotency_key) {
      return res.status(400).json({ message: "Idempotency key required" });
    }

    // Check for existing payment
    const existingPayment = await pool.query(
      "SELECT * FROM trolley.payments WHERE idempotency_key = $1",
      [idempotency_key]
    );

    if (existingPayment.rows.length > 0) {
      const existing = existingPayment.rows[0];
      
      if (existing.customer_id !== customer.id) {
        return res.status(409).json({ 
          message: "Idempotency key conflict" 
        });
      }
      
      console.log(`Returning existing payment ${existing.id} for idempotency key`);
      return res.status(200).json(existing);
    }

    // Create new payment
    console.log(`Processing payment: ${recipient} - $${amount}`); 
    
    const paymentResult = await pool.query(
      `INSERT INTO trolley.payments 
        (customer_id, recipient, amount, currency, status, idempotency_key) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING id`,
      [customer.id, recipient, amount, "USD", "pending", idempotency_key]
    );
    
    const paymentId = paymentResult.rows[0].id;
    console.log(`Payment ${paymentId} created`);
    
    // Call Citibank API
    const citibankIdempotencyKey = `citibank_${idempotency_key}`;
    const citibankPayload = {
      recipient,
      amount,
      currency: "USD",
      idempotency_key: citibankIdempotencyKey
    };
    
    const signature = crypto
      .createHmac("sha256", TROLLEY_CITIBANK_SECRET)
      .update(JSON.stringify(citibankPayload))
      .digest("hex");

    const citibankResponse = await fetch(CITIBANK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": signature
      },
      body: JSON.stringify(citibankPayload)
    });

    if (!citibankResponse.ok) {
      // Mark payment as failed
      await pool.query(
        "UPDATE trolley.payments SET status = $1 WHERE id = $2",
        ["failed", paymentId]
      );
      throw new Error(`Citibank API error: ${citibankResponse.status}`);
    }

    const citibankData = await citibankResponse.json();

    // Update payment status
    await pool.query(
      `UPDATE trolley.payments 
        SET status = $1, transaction_id = $2, completed_at = NOW() 
        WHERE id = $3`,
      ["completed", citibankData.transaction_id, paymentId]
    );

    console.log(`Payment ${paymentId} completed - Transaction ${citibankData.transaction_id}`);

    // Send webhook notification
    const webhookPayload = {
      event: "payment.completed",
      payment_id: paymentId,
      ...citibankData
    };

    await sendWebhook(customer, webhookPayload);

    return res.status(200).json(citibankData);
  } catch (err) {
    console.error("Payment processing error:", err);
    return res.status(500).json({
      message: "Transfer failed",
      error: err.message
    });
  }
};

module.exports = { processPayment };