const amqp = require("amqplib");

let connection;
let channel;

const connectRabbitMQ = async () => {
  connection = await amqp.connect('amqp://localhost');
  channel = await connection.createChannel();

  await channel.assertQueue('webhook-queue');
};

const publishToQueue = (queue, message) => {
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
};

const consumeQueue = (queueName, callback) => {
  channel.consume(queueName, async (message) => { 
    if (message !== null) {
      console.log(`Received message`);

      try {
        const data = JSON.parse(message.content.toString());
        await callback(data, message, channel);  // Pass message & channel
      } catch (err) {
        console.error('Error processing message:', err);
        channel.nack(message, false, true);
      }
    }
  }, { noAck: false });
};

module.exports = { connectRabbitMQ, publishToQueue, consumeQueue };
