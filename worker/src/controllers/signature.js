const { body, validationResult } = require('express-validator');
const ethsig = require("../../nano-ethereum-signer");

const hasher = require("../services/hashing");

function isValidValidator(chainId, validator) {
    const validators = global.gConfig[chainId.toLowerCase()].validators;
    return validators.includes(validator);
}

function isValidSignature(data, signature, validator) {
    if (data.chain_id === global.gConfig.harmony.chain_id) {
        const hash = hasher.hashMessageForHarmony({
            chainId: data.chain_id,
            receiver: data.address_to,
            sender: data.address_from,
            timestamp: data.tx_time,
            amount: data.amount,
            asset: data.asset,
            transferNonce: data.nonce,
        });
        const signer = ethsig.signerAddress(hash, signature);
        return signer === validator;
    }
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
        console.log(`validator check failed: chain=${data.chain_id}, validator=${signature.validator}`);
        res.status(422).json({ code: 422, error: `no such validator '${signature.validator}'` });
        return;
    }
    if (!isValidSignature(data, signature.data, signature.validator)) {
        console.log(`signature check failed: chain=${data.chain_id}, signature=${signature.data}, validator=${signature.validator}`);
        res.status(422).json({ code: 422, error: `bad signature '${signature.data}'` });
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
