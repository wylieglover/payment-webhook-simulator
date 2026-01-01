const express = require('express');
const webhookRouter = require('./routes/webhook');

const app = express();
const port = 3000;

app.use(express.json());
app.use('/webhook', webhookRouter);

app.listen(port, () => {
    console.log(`Wylie's Platform listening on port ${port}`);
})