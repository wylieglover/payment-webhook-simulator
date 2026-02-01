const express = require('express');
const paymentWebhook = require('../controllers/webhook');

const webhookRouter = express.Router();

webhookRouter.post('/', paymentWebhook);

module.exports = webhookRouter;