const express = require('express');
const { processTransfer } = require('../controllers/transferController');

const bankingRouter = express.Router();

bankingRouter.post('/', processTransfer);

module.exports = bankingRouter;