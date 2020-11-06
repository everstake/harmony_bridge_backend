const { body, validationResult } = require('express-validator');

function isValidValidator(chainId, validator) {
    const validators = global.gConfig[chainId.toLowerCase()].validators;
    return validators.includes(validator);
}

exports.validate = (method) => {
    switch (method) {
        case 'submit': {
            return [
                body('data').exists(),
                body('data.chain_id').exists().not().isEmpty(),
                body('data.chain_id', 'invalid chain id (only harmony and polka are supported)').custom(value => {
                    return !!global.gConfig[value.toLowerCase()];
                }),
                body('data.chain_type').exists().not().isEmpty(),
                body('data.address_to').exists().not().isEmpty(),
                body('data.address_from').exists().not().isEmpty(),
                body('data.tx_time').exists(),
                body('data.amount').exists().not().isEmpty(),
                body('data.asset').exists().not().isEmpty(),
                body('data.nonce').exists().not().isEmpty(),
                body('signature').exists(),
                body('signature.data').exists().not().isEmpty(),
                body('signature.validator').exists().not().isEmpty()
            ];
        }
    }
};


exports.submit = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(422).json({ code: 422, error: errors.array({ onlyFirstError: true })[0] });
        return;
    }

    const data = req.body.data;
    const signature = req.body.signature;
    if (!isValidValidator(data.chain_id, signature.validator)) {
        res.status(422).json({ code: 422, error: 'no such validator' });
        return;
    }
    const worker = req.app.get('worker');
    try {
        const success = await worker.processSwapRequest(data, signature);
        res.status(200).json({ success: success });
    }
    catch (err) {
        res.status(500).json({ code: 500, error: err.message });
    }
};
