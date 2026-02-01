const crypto = require("crypto");
const fetch = require("node-fetch");
const pool = require('../../shared/db');

const TROLLEY_API_URL = 'http://localhost:3001/payments';
const TROLLEY_API_KEY = 'Bearer trolley_api_wylie123';

const sendPayment = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount required" });
    }

    // Look up contractor
    const contractorResult = await pool.query(
      "SELECT id, name FROM wylies_platform.contractors WHERE id = $1",
      [userId]
    );

    if (contractorResult.rows.length === 0) {
      return res.status(404).json({ message: "Contractor not found" });
    }
    
    const { id: contractorId, name: contractorName } = contractorResult.rows[0];

    // Generate idempotency key
    const idempotency_key = `${contractorId}-${Date.now()}-${crypto.randomUUID()}`;

    console.log(`Sending payment of $${amount} to ${contractorName}...`);
    
    // Call Trolley API
    const response = await fetch(TROLLEY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TROLLEY_API_KEY
      },
      body: JSON.stringify({
        recipient: contractorName,
        amount,
        currency: "USD",
        idempotency_key
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json(error);
    }

    const trolleyResponse = await response.json();

    return res.status(200).json(trolleyResponse);
  } catch (err) {
    console.error('Payment error:', err);
    next(err);
  }
};

module.exports = { sendPayment };