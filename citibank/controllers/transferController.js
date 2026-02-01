const crypto = require('crypto');
const pool = require('../../shared/db');

const TROLLEY_CITIBANK_SECRET = "trolley_secret_123";

const processTransfer = async (req, res) => {  
  try {
    // Verify signature
    const receivedSignature = req.headers['x-signature'];
    const payload = JSON.stringify(req.body);
    
    const expectedSignature = crypto
      .createHmac('sha256', TROLLEY_CITIBANK_SECRET)
      .update(payload)
      .digest('hex');
        
    if (receivedSignature !== expectedSignature) {
      return res.status(401).json({ message: 'Invalid signature' });
    }
    
    const { recipient, amount, currency, idempotency_key } = req.body;

    // Validate idempotency key
    if (!idempotency_key) {
      return res.status(400).json({ message: "Idempotency key required" });
    }

    // Look up recipient account
    const accountResult = await pool.query(
      'SELECT id, name, balance FROM citibank.accounts WHERE name = $1',
      [recipient]  
    );
    
    if (accountResult.rows.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const account = accountResult.rows[0];

    // Check for existing transaction
    const existingTransaction = await pool.query(
      "SELECT * FROM citibank.transactions WHERE idempotency_key = $1",
      [idempotency_key]
    );

    if (existingTransaction.rows.length > 0) {
      const existing = existingTransaction.rows[0];
      
      if (existing.account_id !== account.id) {
        return res.status(409).json({ 
          message: "Idempotency key conflict" 
        });
      }
      
      console.log(`Returning existing transaction for idempotency key`);
      return res.status(200).json({
        status: existing.status,
        transaction_id: `citi_${existing.id}`,
        recipient: account.name,
        amount: existing.amount,
        currency: currency
      });
    }

    // Process transfer
    console.log(`Processing transfer: ${currency}${amount} to ${recipient}`);

    await pool.query(
      'UPDATE citibank.accounts SET balance = balance + $1 WHERE id = $2',
      [amount, account.id]
    );

    const transactionResult = await pool.query(
      `INSERT INTO citibank.transactions 
        (account_id, amount, status, completed_at, idempotency_key) 
        VALUES ($1, $2, $3, NOW(), $4) 
        RETURNING id`,
      [account.id, amount, 'completed', idempotency_key]
    );

    const transactionId = `citi_${transactionResult.rows[0].id}`;

    console.log(`Transfer completed - Transaction ${transactionId}`);

    return res.status(200).json({
      status: 'completed',
      transaction_id: transactionId,
      recipient: recipient,
      amount: amount,
      currency: currency
    });
  } catch (err) {
    console.error('Transfer error:', err);
    return res.status(500).json({
      message: 'Transfer failed',
      error: err.message
    });
  }
};

module.exports = { processTransfer };