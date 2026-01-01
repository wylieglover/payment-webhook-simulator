const express = require('express');
const paymentRouter = require('./routes/payments');

const app = express();
const port = 3001;

app.use(express.json());
app.use('/payments', paymentRouter);

app.listen(port, () => {
    console.log(`Trolley server listening on ${port}`);
})