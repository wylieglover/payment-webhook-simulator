const crypto = require('crypto');
const fetch = require('node-fetch');
const { connectRabbitMQ, consumeQueue, publishToQueue } = require("../lib/rabbitmq");

const processWebhook = async (data, message, channel) => {
  const retryCount = data.retryCount || 0;
  const MAX_RETRIES = 5;
  const baseDelay = 60000; // 1 minute
  const maxDelay = 3600000; // 1 hour cap per retry
  const jitter = Math.random() * 0.3 + 0.85; // 85-115% randomness

  const delayMs = Math.min(
    baseDelay * Math.pow(2, retryCount) * jitter,
    maxDelay
  );

  if (data.nextRetryTime && Date.now() < data.nextRetryTime) {
    const waitTime = data.nextRetryTime - Date.now();
    console.log(`Waiting ${Math.round(waitTime/1000)}s before retry...`);
    
    // Wait for the full time
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Republish
    publishToQueue('webhook-queue', data);
    channel.ack(message);
    return;
  }

  try {
    console.log('Processing webhook:', data);
    
    const { customer, paymentData } = data;

    const payload = JSON.stringify(paymentData);
    const signature = crypto
      .createHmac('sha256', customer.webhook_secret)
      .update(payload)
      .digest('hex');

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

    console.log(`Webhook delivered to ${customer.name}`);

    channel.ack(message);
  } catch (err) {
    if (retryCount >= MAX_RETRIES) {
      console.log(`Max retries exceeded for ${customer.name}`);
      channel.ack(message);
    } else {
      const nextRetryTime = Date.now() + delayMs; 
      console.log(`Retry ${retryCount + 1}/${MAX_RETRIES}`);
      
      publishToQueue('webhook-queue', {
        ...data,
        retryCount: retryCount + 1,
        nextRetryTime
      });

      channel.ack(message);
    }
  }
};

const startWorker = async () => {
  await connectRabbitMQ();

  consumeQueue("webhook-queue", processWebhook);

  console.log("Worker started, waiting for messages...");
};

startWorker();