// SPDX-License-Identifier: MIT
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "./EdgewareToken.sol";

contract Bridge is Ownable {
    using SafeMath for uint256;

    mapping(address => bool) public tokens;
    mapping(address => bool) public validators;
    mapping(address => bool) public workers;
    mapping(address => uint256) public dailyLimit;
    mapping(address => uint256) public dailySpend;
    uint256 public fee;

    mapping(address => uint256) dailyLimitSetTime;
    uint256 signatureThreshold;
    uint256 public maxValidatorsCount;
    uint256 public currentValidatorsCount;
    uint256 durationBeforeExpirationTime;
    uint256 transferNonce;
    bytes32 public hashSwapMessage;

    event TokensTransfered(
        string indexed receiver,
        address indexed sender,
        uint256 amount,
        address asset,
        uint256 transferNonce,
        uint256 timestamp
    );

    event ValidatorsCountChanged(
        address validator,
        bool isActive,
        uint256 totalActiveValidators
    );

    struct SwapMessage {
        uint256 chainId;
        address payable receiver;
        string sender;
        uint256 timestamp;
        uint256 amount;
        address asset;
        uint256 transferNonce;
    }

    modifier onlyWorker() {
        require(workers[msg.sender], "Only worker can call this function.");
        _;
    }

    constructor(
        uint256 threshold,
        uint256 maxPermissibleValidatorCount,
        uint256 transferFee,
        uint256 coinDailyLimit
    ) public Ownable() {
        signatureThreshold = threshold;
        maxValidatorsCount = maxPermissibleValidatorCount;
        currentValidatorsCount = 0;
        fee = transferFee;
        durationBeforeExpirationTime = 1 days;
        dailyLimit[address(0)] = coinDailyLimit;
        dailyLimitSetTime[address(0)] = block.timestamp;
        transferNonce = 0;
        tokens[address(0)] = true;
    }

    receive() external payable {}

    function transferCoin(string memory receiver) public payable {
        require(
            msg.value > 0,
            "You have to attach some amount of assets to make transfer"
        );
        transferNonce++;
        emit TokensTransfered(
            receiver,
            msg.sender,
            msg.value,
            address(0),
            transferNonce,
            block.timestamp
        );
    }

    /**
     * @dev Request for swap coins and tokens
     * Can only be called by the worker. Works for only for expiration time interval,
     * for added token address, and validated signatures and for assetDailyLimit no more than
     * initialized
     * SwapMessage transferInfo to see type SwapMessage
     * bytes[] signatures - array of hashes
     * Can only be called by the worker.
     */
    function requestSwap(
        SwapMessage memory transferInfo,
        bytes[] memory signatures
    ) public payable onlyWorker() returns (bool) {
        require(
            isTimeNotExpired(transferInfo.timestamp),
            "Transaction can't be sent because of expiration time"
        );

        require(
            tokens[transferInfo.asset],
            "Unknown asset is trying to transfer"
        );

        require(
            transferInfo.receiver == address(transferInfo.receiver),
            "Invalid receiver address"
        );

        require(
            signatures.length >= signatureThreshold &&
                signatures.length <= maxValidatorsCount,
            "Wrong count of signatures to make transfer"
        );

        hashSwapMessage = this.hashMessage(transferInfo);
        require(
            verifySignatures(hashSwapMessage, signatures),
            "Signatures verification is failed"
        );

        bool res = makeSwap(transferInfo);
        return res;
    }

    function transferToken(
        string memory receiver,
        uint256 amount,
        address asset
    ) public {
        require(tokens[asset], "Unknown asset is trying to transfer");
        EdgewareToken assetContract = EdgewareToken(asset);
        require(
            assetContract.balanceOf(msg.sender) >= amount,
            "Sender doesn't have enough tokens to make transfer"
        );
        require(
            assetContract.burn(msg.sender, amount),
            "Error while burn sender's tokens"
        );
        transferNonce++;

        emit TokensTransfered(
            receiver,
            msg.sender,
            amount,
            asset,
            transferNonce,
            block.timestamp
        );
    }

    function setFee(uint256 percentFee) public onlyOwner() {
        require(percentFee != 0 && percentFee < 100);
        fee = percentFee;
    }

    // Is count of validators need to check?
    function addValidator(address newValidator) public onlyOwner() {
        require(
            currentValidatorsCount != maxValidatorsCount,
            "The maximum number of validators is now!"
        );
        validators[newValidator] = true;
        currentValidatorsCount++;
        emit ValidatorsCountChanged(
            newValidator,
            validators[newValidator],
            currentValidatorsCount
        );
    }

    function removeValidator(address removedValidator) public onlyOwner() {
        require(
            currentValidatorsCount - 1 >= signatureThreshold,
            "There are no validators now!"
        );
        validators[removedValidator] = false;
        currentValidatorsCount--;
        emit ValidatorsCountChanged(
            removedValidator,
            validators[removedValidator],
            currentValidatorsCount
        );
    }

    function addWorker(address newWorker) public onlyOwner() {
        workers[newWorker] = true;
    }

    function removeWorker(address removedWorker) public onlyOwner() {
        workers[removedWorker] = false;
    }

    function setThreshold(uint256 newSignaturesThreshold) public onlyOwner() {
        require(
            newSignaturesThreshold != 0 &&
                newSignaturesThreshold <= maxValidatorsCount,
            "Ivalid number of Validators"
        );
        signatureThreshold = newSignaturesThreshold;
    }

    function addToken(address newToken, uint256 tokenDailyLimit)
        public
        onlyOwner()
    {
        require(tokenDailyLimit != 0, "Invalid value tokenDailyLimit");
        tokens[newToken] = true;
        dailyLimit[newToken] = tokenDailyLimit;
        dailyLimitSetTime[newToken] = block.timestamp;
    }

    function removeToken(address removedToken) public onlyOwner() {
        tokens[removedToken] = false;
        dailyLimit[removedToken] = 0;
        dailyLimitSetTime[removedToken] = 0;
    }

    function setDailyLimit(uint256 newLimit, address assetLimited)
        public
        onlyOwner()
    {
        require(newLimit != 0, "Invalid limit");
        require(
            tokens[assetLimited],
            "There is no such an asset in the Bridge contract"
        );
        dailyLimit[assetLimited] = newLimit;
    }

    function setNewDurationBeforeExpirationTime(uint256 newDuration)
        public
        onlyOwner()
    {
        require(newDuration != 0, "Invalid duration value");
        durationBeforeExpirationTime = newDuration;
    }

    function hashMessage(SwapMessage memory transferInfo)
        public
        pure
        returns (bytes32)
    {
        return
            keccak256(
                abi.encode(
                    transferInfo.chainId,
                    transferInfo.receiver,
                    transferInfo.sender,
                    transferInfo.timestamp,
                    transferInfo.amount,
                    transferInfo.asset,
                    transferInfo.transferNonce
                )
            );
    }

    function isTimeNotExpired(uint256 txTime) private view returns (bool) {
        if (block.timestamp.sub(txTime) < durationBeforeExpirationTime) {
            return true;
        } else {
            return false;
        }
    }

    function verifySignatures(bytes32 signedMessage, bytes[] memory signatures)
        private
        view
        returns (bool)
    {
        address[] memory signers = new address[](signatures.length);
        for (uint256 i = 0; i < signatures.length; i++) {
            address signerAddress = ECDSA.recover(signedMessage, signatures[i]);
            if (!validators[signerAddress]) return false;
            if (i > 0) {
                if (!checkUnique(signerAddress, signers)) return false;
            }
            signers[i] = signerAddress;
        }
        return true;
    }

    function checkUnique(address signer, address[] memory allSigners)
        private
        pure
        returns (bool)
    {
        for (uint256 i = 0; i < allSigners.length; i++) {
            if (signer == allSigners[i]) {
                return false;
            }
        }
        return true;
    }

    function updateDailyLimit(address asset) private {
        uint256 currentTime = block.timestamp;
        if (currentTime.sub(dailyLimitSetTime[asset]) > 1 days) {
            // we don't check dailyLimitSetTime on zero because if execution came here token already in tokens mapp and dailyLimitSetTime also filled
            dailyLimitSetTime[asset] = currentTime;
            dailySpend[asset] = 0;
        }
    }

    function makeSwap(SwapMessage memory transferInfo) private returns (bool) {
        uint256 assetDailyLimit = dailyLimit[transferInfo.asset];

        require(
            assetDailyLimit > 0,
            "Can't transfer asset without daily limit"
        );
        updateDailyLimit(transferInfo.asset);
        require(
            transferInfo.amount.add(dailySpend[transferInfo.asset]) <=
                assetDailyLimit,
            "Daily limit has already reached for this asset"
        );

        dailySpend[transferInfo.asset] = dailySpend[transferInfo.asset].add(
            transferInfo.amount
        );
        if (transferInfo.asset == address(0)) {
            uint256 amountToSend = transferInfo.amount.sub(
                transferInfo.amount.mul(fee).div(100)
            );
            require(
                transferInfo.receiver.send(amountToSend),
                "Fail sending Ethers"
            );
        } else {
            uint256 amountToSend = transferInfo.amount.sub(
                transferInfo.amount.mul(fee).div(100)
            );
            EdgewareToken assetContract = EdgewareToken(transferInfo.asset);
            require(
                assetContract.mintFor(transferInfo.receiver, amountToSend),
                "Error while mint tokens for the receiver"
            );
        }
        return true;
    }
}
