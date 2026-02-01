const express = require('express');
const  { sendPayment } = require('../controllers/contractors');

const contractorsRouter = express.Router();

contractorsRouter.post("/:userId/pay", sendPayment);

module.exports = contractorsRouter;