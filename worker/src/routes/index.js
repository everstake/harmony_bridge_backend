const express = require('express');
const controller = require('../controllers/signature');

const router = express.Router();


router.post('/submit', controller.validate('submit'), controller.submit);

module.exports = router;