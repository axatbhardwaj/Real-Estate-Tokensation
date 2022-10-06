// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155ReceiverUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./helper/BasicMetaTransaction.sol";


library ECDSA {
    function recover(bytes32 hash, bytes memory sig)
        internal
        pure
        returns (address)
    {
        bytes32 r;
        bytes32 s;
        uint8 v;

        // Check the signature length
        if (sig.length != 65) {
            return (address(0));
        }

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        if (v < 27) {
            v += 27;
        }

        if (v != 27 && v != 28) {
            return (address(0));
        } else {
            // solium-disable-next-line arg-overflow
            return ecrecover(hash, v, r, s);
        }
    }

    function toEthSignedMessageHash(bytes32 hash)
        internal
        pure
        returns (bytes32)
    {
        // 32 is the length in bytes of hash,
        // enforced by the type signature above
        return
            keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
            );
    }
}

contract whitelist is OwnableUpgradeable {
    using ECDSA for bytes32;
    event admin_update(address indexed _admin_add);

    modifier onlyWhitelisted(
        address _user,
        uint256 _nonce,
        bytes calldata _sig
    ) {
        require(
            checkWhitelisted(_user, _nonce, _sig),
            "Non whitelisted: address must be whitelisted"
        );
        _;
    }

    address public __whitelistAdminAdd;

    function __whitelist__Intialize(address _admin_add) internal {
        __whitelistAdminAdd = _admin_add;
    }

    function checkWhitelisted(
        address _user,
        uint256 _nonce,
        bytes calldata _sig
    ) public view returns (bool) {
        bytes32 _hash = keccak256(abi.encodePacked(_user, _nonce));
        bytes32 hash = _hash.toEthSignedMessageHash();
        return (address(hash.recover(_sig)) == address(__whitelistAdminAdd));
    }

    function updateAdmin_Whitelist_add(address _admin_add) external onlyOwner {
        require(
            _admin_add != address(0),
            "Invalid : non-zero address required"
        );
        __whitelistAdminAdd = _admin_add;
        emit admin_update(_admin_add);
    }
}

contract ICO is whitelist, ReentrancyGuardUpgradeable, BasicMetaTransaction {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using ECDSA for bytes32;
    //------------Events----------------------------//
    event MogulICO(uint256 indexed _estateID, bool state, uint256 _softCap);
    event MUSDInvested(
        address indexed _user,
        uint256 musd,
        uint256 indexed _estateID
    );
    event AirDroped(uint256 indexed estatedId, bool indexed airDropStatus);
    event ExtendedTime(uint256 timestamp, uint256 indexed _estateID);
    event Refund(
        address indexed _user,
        uint256 musd,
        uint256 indexed _estateID
    );
    event Withdrawn(
        address indexed withdrawnAddress,
        uint256 musd,
        uint256 indexed _estateID
    );
    event HardCap(uint256 hardcap, uint256 indexed _estateID);
    event SoftCap(uint256 softcap, uint256 indexed _estateID);
    //------------State variables----------------------------//
    uint256 public totalRaisedMUSD;
    address[] adminRoles;
    uint256 public ICOsCount;
    //------------Interface---------------------------//
    IERC20Upgradeable public musdToken;
    IERC1155Upgradeable public estateToken;
    //------------Structs--------------------------//
    struct ICO_SetupStruct {
        uint256 _startTimestamp_;
        uint256 _finishTimestamp_;
        uint256 _maxMUSD_limit_;
        uint256 _minMUSD_limit_;
        uint256 _estateID_;
        uint256 _hardCap_;
        uint256 _softCap_;
        uint256 _raisedMUSD_;
        uint256 _mogulTokenPrice_;
        uint256 _refundedMUSD_;
        bool state;
        bool _isGreenFlag_;
    }
    //------------Mappings-------------------------//
    mapping(uint256 => ICO_SetupStruct) public getICOinfo;
    mapping(address => mapping(uint256 => uint256)) public perUserInvestment;
    mapping(uint256 => uint256) public withdrawnMUSDByID;
    //------------Modifiers-------------------------//
    modifier onlyWhenNotActive(uint256 _estateID) {
        require(
            getICOinfo[_estateID]._startTimestamp_ == 0,
            "ICO: estatedId is already exist"
        );
        _;
    }
    modifier onlyWhenStarted(uint256 _estateID) {
        require(
            block.timestamp >= getICOinfo[_estateID]._startTimestamp_,
            "ICO: estatedId is not started"
        );
        _;
    }
    modifier onlyWhenInActiveState(uint256 _estateID) {
        require(
            getICOinfo[_estateID].state == true,
            "ICO: estatedId is not active"
        );
        _;
    }
    modifier onlyOnUnscuccesful(uint256 _estateID) {
        ICO_SetupStruct memory data = getICOinfo[_estateID];
        if (
            data._raisedMUSD_ < data._softCap_ &&
            block.timestamp > data._finishTimestamp_
        ) {} else if (
            (data._raisedMUSD_ >= data._softCap_ &&
                block.timestamp > data._finishTimestamp_) && data.state == false
        ) {} else {
            revert("Refund: Not allowed");
        }
        _;
    }
    modifier onlyOnScuccesful(uint256 _estateID) {
        ICO_SetupStruct memory data = getICOinfo[_estateID];
        require(
            data._raisedMUSD_ >= data._softCap_ &&
                block.timestamp > data._finishTimestamp_,
            "Whithdraw: Not allowed"
        );
        _;
    }
    modifier isClaimable(uint256 _estateID) {
        ICO_SetupStruct memory data = getICOinfo[_estateID];
        if (block.timestamp > data._finishTimestamp_) {
            require(
                data._raisedMUSD_ >= data._softCap_,
                "ICO: goal not reached"
            );
            require(data.state == true, "ICO: not cliamable yet");
            require(data._isGreenFlag_ == true, "ICO: need admin approval");
        } else {
            {
                revert("ICO: estateID is not ended");
            }
        }
        _;
    }

    //------------Initializer-------------------------------//
    function Initialize(
        address Whitelist_admin_address, //admin wallet
        IERC20Upgradeable _musdToken,
        IERC1155Upgradeable _estateToken
    ) external initializer {
        require(
            Whitelist_admin_address != address(0) &&
                address(_musdToken) != address(0) &&
                address(_estateToken) != address(0),
            "Invalid : non-zero address required"
        );
        __Ownable_init();
        __whitelist__Intialize(Whitelist_admin_address);
        musdToken = _musdToken;
        estateToken = _estateToken;
    }

    //----------- Write Functions------------------------//
    function setupICO(
        uint256 _startTimestamp,
        uint256 _finishTimestamp,
        uint256 _minMUSD_limit,
        uint256 _maxMUSD_limit,
        uint256 _estateID,
        uint256 _hardCap,
        uint256 _softCap,
        uint256 _tokenPrice
    ) external onlyOwner onlyWhenNotActive(_estateID) {
        if (
            _startTimestamp > block.timestamp &&
            _finishTimestamp > _startTimestamp &&
            _maxMUSD_limit != 0 &&
            _minMUSD_limit != 0 &&
            _maxMUSD_limit > _minMUSD_limit &&
            _hardCap != 0 &&
            _softCap != 0 &&
            _hardCap > _softCap &&
            _tokenPrice != 0
        ) {
            ICO_SetupStruct storage data = getICOinfo[_estateID];
            data._startTimestamp_ = _startTimestamp;
            data._finishTimestamp_ = _finishTimestamp;
            data._minMUSD_limit_ = _minMUSD_limit;
            data._maxMUSD_limit_ = _maxMUSD_limit;
            data._estateID_ = _estateID;
            data._hardCap_ = _hardCap;
            data._softCap_ = _softCap;
            data._mogulTokenPrice_ = _tokenPrice;
            data.state = true;
            data._isGreenFlag_ = false;
            ICOsCount++;
            emit MogulICO(_estateID, true, _softCap);
        } else {
            {
                revert("ICO : conditions not statisfied");
            }
        }
    }

    function getAllLiveICOs() external view returns (uint256[] memory) {
        uint256 liveIcoCount = 0;
        for (uint256 i = 0; i < ICOsCount; i++) {
            if (
                getICOinfo[i].state == true &&
                block.timestamp >= getICOinfo[i]._startTimestamp_ &&
                block.timestamp <= getICOinfo[i]._finishTimestamp_
            ) {
                liveIcoCount++;
            }
        }
        uint256[] memory arr = new uint256[](liveIcoCount);
        uint256 j = 0;
        for (uint256 i = 0; i < ICOsCount; i++) {
            if (
                getICOinfo[i].state == true &&
                block.timestamp >= getICOinfo[i]._startTimestamp_ &&
                block.timestamp <= getICOinfo[i]._finishTimestamp_
            ) {
                arr[j] = getICOinfo[i]._estateID_;
                j++;
            }
        }
        return arr;
    }

    function invest(
        uint256 _nonce,
        bytes calldata _sign,
        uint256 musd,
        uint256 _estateID
    )
        external
        onlyWhenStarted(_estateID)
        onlyWhitelisted(msgSender(), _nonce, _sign)
        onlyWhenInActiveState(_estateID)
        nonReentrant
    {
        address _user = msgSender();
        ICO_SetupStruct memory data = getICOinfo[_estateID];
        {
            require(
                musd <= data._maxMUSD_limit_ && musd >= data._minMUSD_limit_,
                "ICO: musd amount is not in range"
            );
            require(
                data._raisedMUSD_ + musd <= data._hardCap_,
                "ICO: maximum investment reached"
            );
            require(
                block.timestamp < data._finishTimestamp_,
                "ICO: estateID is ended"
            );
            require(_user != address(0), "Invalid : non-zero address required");
            require(
                musd % data._mogulTokenPrice_ == 0,
                "ICO: musd should be in mogulTokenPrice multiple"
            );
        }

        _invest(_user, musd, _estateID);
    }

    function _invest(
        address _user,
        uint256 musd,
        uint256 _estateID
    ) internal {
        perUserInvestment[_user][_estateID] += musd;
        getICOinfo[_estateID]._raisedMUSD_ += musd;
        totalRaisedMUSD += musd;
        emit MUSDInvested(_user, musd, _estateID);
        musdToken.safeTransferFrom(_user, address(this), musd);
    }

    function airDropToken(address[] calldata _users, uint256 _estateID)
        external
        onlyOwner
        onlyWhenInActiveState(_estateID)
        isClaimable(_estateID)
    {
        for (uint256 i = 0; i < _users.length; i++) {
            {
                require(
                    _users[i] != address(0),
                    "Invalid : non-zero address required"
                );
            }
            {
                if (perUserInvestment[_users[i]][_estateID] > 0) {
                    _claim(_users[i], _estateID);
                } else {
                    continue;
                }
            }
        }

        emit AirDroped(_estateID, true);
    }

    function _claim(address _user, uint256 _estateID) internal nonReentrant {
        uint256 claimAbleTokenAmount = perUserInvestment[_user][_estateID] /
            getICOinfo[_estateID]._mogulTokenPrice_;
        delete perUserInvestment[_user][_estateID];
        estateToken.safeTransferFrom(
            address(this),
            _user,
            _estateID,
            claimAbleTokenAmount,
            bytes("")
        );
    }

    function setAdminRoles(address[] memory admin) external onlyOwner {
        delete adminRoles;
        for (uint256 i = 0; i < admin.length; i++) {
            adminRoles.push(admin[i]);
        }
    }

    function adminApproval(bytes[] calldata sign, uint256 _estateID)
        external
        onlyWhenInActiveState(_estateID)
        onlyOwner
    {
        uint256 threshold = adminRoles.length;
        uint256 signCount = 0;
        for (uint256 i = 0; i < sign.length; i++) {
            bytes32 hash_ = keccak256(
                abi.encodePacked(address(this), threshold)
            );
            bytes32 hash = hash_.toEthSignedMessageHash();
            if (address(hash.recover(sign[i])) == address(adminRoles[i])) {
                signCount++;
            }
        }
        signCount == threshold
            ? getICOinfo[_estateID]._isGreenFlag_ = true
            : getICOinfo[_estateID]._isGreenFlag_ = false;
    }

    function getICOstatus(uint256 _estateID) public view returns (bool) {
        if (
            getICOinfo[_estateID]._raisedMUSD_ >=
            getICOinfo[_estateID]._softCap_ &&
            block.timestamp > getICOinfo[_estateID]._finishTimestamp_ &&
            getICOinfo[_estateID].state == true
        ) {
            return true;
        } else {
            return false;
        }
    }

    function updateHardCap(uint256 _estateID, uint256 maxGoal)
        external
        onlyWhenInActiveState(_estateID)
        onlyOwner
    {
        ICO_SetupStruct storage data = getICOinfo[_estateID];
        require(maxGoal > 0, "ICO: non-zero value required");
        require(
            maxGoal > data._softCap_,
            "ICO: set max-goal higher than min-goal"
        );
        data._hardCap_ = maxGoal;
        emit HardCap(maxGoal, _estateID);
    }

    function updateSoftCap(uint256 _estateID, uint256 minGoal)
        external
        onlyWhenInActiveState(_estateID)
        onlyOwner
    {
        ICO_SetupStruct storage data = getICOinfo[_estateID];
        require(minGoal > 0, "ICO: non-zero value required");
        require(
            minGoal < data._hardCap_,
            "ICO: set min-goal lower than max-goal"
        );
        data._softCap_ = minGoal;
        emit SoftCap(minGoal, _estateID);
    }

    function updateMaxMUSDLimit(uint256 _estateID, uint256 _maxMUSDlimit)
        external
        onlyOwner
        onlyWhenInActiveState(_estateID)
    {
        ICO_SetupStruct storage data = getICOinfo[_estateID];
        require(_maxMUSDlimit != 0, "ICO: non-zero value required");
        require(
            _maxMUSDlimit > data._minMUSD_limit_,
            "ICO: set musd max limt higher than min-goal"
        );
        data._maxMUSD_limit_ = _maxMUSDlimit;
    }

    function updateMinMUSDLimit(uint256 _estateID, uint256 _minMUSDlimit)
        external
        onlyOwner
        onlyWhenInActiveState(_estateID)
    {
        ICO_SetupStruct storage data = getICOinfo[_estateID];
        require(_minMUSDlimit != 0, "ICO: non-zero value required");
        require(
            _minMUSDlimit < data._maxMUSD_limit_,
            "ICO: set musd min limt lower than max-goal"
        );
        data._minMUSD_limit_ = _minMUSDlimit;
    }

    function extendIcoTime(uint256 _estateID, uint256 resetICOendTime)
        external
        onlyOwner
        onlyWhenInActiveState(_estateID)
    {
        require(
            getICOinfo[_estateID]._startTimestamp_ > 0,
            "ICO: estateID is not exist"
        );
        require(
            block.timestamp < resetICOendTime,
            "ICO: set revised time higher than current time"
        );
        getICOinfo[_estateID]._finishTimestamp_ = resetICOendTime;
        emit ExtendedTime(resetICOendTime, _estateID);
    }

    function changeState(uint256 _estateID) external onlyOwner {
        require(
            getICOinfo[_estateID]._estateID_ == _estateID,
            "ICO: estateID is not exist"
        );
        ICO_SetupStruct storage data = getICOinfo[_estateID];
        data.state ? data.state = false : data.state = true;
    }

    function getAdminRoles() external view returns (address[] memory) {
        return adminRoles;
    }

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return 0xf23a6e61;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        return 0xbc197c81;
    }

    function _msgSender() internal view virtual override returns (address) {
        return msgSender();
    }

    //-------------------- refund and withdraw-----------------------

    function refund(uint256 _estateID)
        external
        nonReentrant
        onlyOnUnscuccesful(_estateID)
    {
        address _user = msgSender();
        uint256 tempRefundAmount = perUserInvestment[_user][_estateID];
        require(tempRefundAmount > 0, "Refund: not enough musd");
        emit Refund(_user, tempRefundAmount, _estateID);
        getICOinfo[_estateID]._refundedMUSD_ += tempRefundAmount;
        delete perUserInvestment[_user][_estateID];
        musdToken.safeTransfer(_user, tempRefundAmount);
    }

    function withdraw(address propertyOwnerAddress, uint256 _estateID)
        external
        onlyOwner
        onlyOnScuccesful(_estateID)
        onlyWhenInActiveState(_estateID)
    {
        if (withdrawnMUSDByID[_estateID] > 0) {
            revert("Withdraw: not enough musd");
        } else {
            uint256 transferAbleMusd = getICOinfo[_estateID]._raisedMUSD_;
            withdrawnMUSDByID[_estateID] += transferAbleMusd;
            emit Withdrawn(propertyOwnerAddress, transferAbleMusd, _estateID);
            musdToken.safeTransfer(propertyOwnerAddress, transferAbleMusd);
        }
    }
}
