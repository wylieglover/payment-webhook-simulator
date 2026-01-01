const pool = require('../../shared/db');
const crypto = require('crypto');

const WEBHOOK_SECRET = 'wylie-secret-key';

const webhook = async (req, res) => {
    try {
        // Verify signature (existing code)
        const receivedSignature = req.headers['x-webhook-signature'];
        
        const payload = JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac('sha256', WEBHOOK_SECRET)
            .update(payload)
            .digest('hex');
        
        if (receivedSignature !== expectedSignature) {
            console.log('❌ Invalid webhook signature!');
            return res.status(401).json({ message: 'Unauthorized - Invalid signature' });
        }
        
        console.log('✅ Webhook signature verified!');
        
        const { event, payment_id, status, transaction_id, recipient, amount, currency } = req.body;

        const contractorResult = await pool.query(
            `SELECT id FROM wylies_platform.contractors WHERE name = $1`,
            [recipient]
        );

        if (contractorResult.rowCount === 0) {
            console.log("❌ Unknown contractor:", recipient);
            return res.status(400).json({ message: "Unknown contractor" });
        }

        const contractorId = contractorResult.rows[0].id;

        await pool.query(
            'INSERT INTO wylies_platform.payments (contractor_id, amount, status) VALUES ($1, $2, $3)',
            [contractorId, amount, status]
        );
        
        console.log(`💾 Recorded payment for ${recipient}: $${amount}`);

        return res.json({ message: "Webhook processed" });
        
    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(500).json({ message: 'Webhook processing failed' });
    }
};

module.exports = { webhook };