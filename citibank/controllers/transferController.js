const crypto = require('crypto');
const pool = require('../../shared/db');

const TROLLEY_CITIBANK_SECRET = "trolley_secret_123";

const processTransfer = async (req, res) => {  
    try {
        const requestsSignature = req.headers['x-signature'];
        
        const data = req.body;
        const payload = JSON.stringify(data);

        const expectedSignature = crypto
            .createHmac('sha256', TROLLEY_CITIBANK_SECRET)
            .update(payload)
            .digest('hex');
            
        if (requestsSignature !== expectedSignature) {
            return res.status(401).json({ message: 'Invalid signature' });
        }

        const { recipient, amount, currency } = data;

        const accountResult = await pool.query(
            'SELECT * FROM citibank.accounts WHERE name =  $1',
            [recipient]  
        );
        
        if (accountResult.rows.length === 0) {
            return res.status(404).json({ message: 'Account does not exist' });
        }

        console.log(`Adding ${currency}${amount} to ${recipient}`);

        const accountId = accountResult.rows[0].id;
        await pool.query(
            'UPDATE citibank.accounts SET balance = balance + $1 WHERE id = $2',
            [amount, accountId]
        );

        const transactionId = `citi_${Date.now()}`;
        await pool.query(
            'INSERT INTO citibank.transactions (account_id, amount, status, completed_at) VALUES ($1, $2, $3, NOW())',
            [accountId, amount, 'completed']
        );

        console.log(`Transfer completed for ${recipient}`);

        return res.status(200).json({
            status: 'completed',
            transaction_id: transactionId,
            recipient: recipient,
            amount: amount,
            currency: currency
        });

    } catch (err) {
        console.error('Database error: ', err);
        return res.status(500).json({
            message: 'Transfer failed',
            error: err.message
        });
    }
};

module.exports = { processTransfer }; 