const bankingRouter = require('./routes/banking');

const express = require('express');
const app = express();
const port = 3002;

app.use(express.json());
app.use('/transfers', bankingRouter);

app.listen(port, () => {
    console.log(`Citibank server listening on port ${port}`);
});