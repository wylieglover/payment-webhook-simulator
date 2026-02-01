const express = require('express');
const { connectRabbitMQ } = require ('./lib/rabbitmq');
const paymentRouter = require('./routes/payments');

const app = express();
const port = 3001;

app.use(express.json());
app.use('/payments', paymentRouter);

app.listen(port, async () => {
    console.log(`Trolley server listening on ${port}`);

    await connectRabbitMQ();
})