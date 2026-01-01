const fetch = require('node-fetch');
const crypto = require('crypto');
const pool = require('../../shared/db');

const { sendWebhook } = require('../services/webhookService');

const TROLLEY_CITIBANK_SECRET = "trolley_secret_123";

const processPayment = async (req, res) => { 
    try {
        const apiKey = req.headers['authorization'];
        const customerResult = await pool.query(
            'SELECT * FROM trolley.customers WHERE api_key = $1',
            [apiKey]
        )
        
        if (customerResult.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid API Key' });
        }
        
        const { recipient, amount } = req.body;

        console.log(`Processing payment for ${recipient}: ${amount}`); 
        
        const customer = customerResult.rows[0]; 
        const paymentResult = await pool.query(
            'INSERT INTO trolley.payments (customer_id, recipient, amount, currency, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [customer.id, recipient, amount, 'USD', 'pending']
        );
        
        const paymentId = paymentResult.rows[0].id;
        console.log(`Payment ${paymentId} created for ${recipient}: ${amount}`);
        
        const payload = JSON.stringify({
            recipient,
            amount,
            currency: 'USD'
        });
        
        const signature = crypto
            .createHmac('sha256', TROLLEY_CITIBANK_SECRET)
            .update(payload)
            .digest('hex');
        const response = await fetch('http://localhost:3002/transfers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-signature': signature
            },
            body: payload
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();

        await pool.query(
            'UPDATE trolley.payments SET status = $1, transaction_id = $2, completed_at = NOW() WHERE id = $3',
            ['completed', responseData.transaction_id, paymentId]
        );

        console.log(`Payment ${paymentId} completed with transaction ${responseData.transaction_id}`);

        const webhookPayload = {
            event: 'payment.completed',
            payment_id: paymentId,
            ...responseData
        }

        await sendWebhook(customer, webhookPayload);

        return res.status(200).json(responseData);
    } catch (err) {
        console.error('Database error: ', err);
        return res.status(500).json({
            message: 'Transfer failed',
            error: err.message
        });
    }
};

module.exports =  { processPayment };