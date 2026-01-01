const fetch = require('node-fetch');
const crypto = require('crypto');

const sendWebhook = async (customer, paymentData) => {
    try {
        const payload = JSON.stringify(paymentData);

        const signature = crypto
            .createHmac('sha256', customer.webhook_secret)
            .update(payload)
            .digest('hex');
            
        console.log(`📤 Sending webhook to ${customer.name}...`);
        
        const response = await fetch(customer.webhook_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature
            },
            body: payload
        });

        if (!response.ok) {
            throw new Error(`Webhook failed: ${response.status}`);
        }

        console.log(`✅ Webhook delivered to ${customer.name}`);
        return await response.json();
    } catch (error) {
        console.error(`❌ Webhook delivery failed to ${customer.name}:`, error.message);
        throw error;
    }
};

module.exports = { sendWebhook };