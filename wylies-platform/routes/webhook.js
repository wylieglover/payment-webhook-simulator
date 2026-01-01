const express = require('express');
const { webhook } = require('../controllers/webhookController');

const webhookRouter = express.Router();

webhookRouter.post('/', webhook);

module.exports = webhookRouter;