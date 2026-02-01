const { publishToQueue } = require('../lib/rabbitmq');

const sendWebhook = async (customer, paymentData) => {
  console.log(`Queueing webhook for ${customer.name}...`);
  
  publishToQueue('webhook-queue', {
    customer,
    paymentData
  });
  
  console.log(`Webhook queued for ${customer.name}`);
};

module.exports = sendWebhook;