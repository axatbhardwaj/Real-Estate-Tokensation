//SPDX-License-Identifier:MIT
pragma solidity ^0.8.2;
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155ReceiverUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./helper/BasicMetaTransaction.sol";
import "./helper/IDEED.sol";

interface IICO {
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

    function getICOinfo(uint256 _estateID)
        external
        view
        returns (ICO_SetupStruct memory);
}

contract Vesting is
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    BasicMetaTransaction
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    //---------------------Events-----------------------//
    event ReleasedMogulToken(
        address indexed claimAddress,
        uint256 mogulToken,
        uint256 indexed estateID,
        uint256 musd
    );
    //---------------------InterfaceType--------------//
    IERC1155Upgradeable public estateToken;
    IERC20Upgradeable public musdToken;
    IICO public ICO;
    IDEED public DEED;
    //---------------------StateVariable------------//
    uint256 public totalRaisedMUSD;
    //------------Structs------------------------//
    struct icoAndVestingStruct {
        uint256 start;
        uint256 end;
        uint256 mogulTokenPrice;
        uint256 totalVestableAmount;
        bool isActive;
        bool icoState;
    }
    struct balanceStruct {
        uint256 currentEstateTokenBal;
        uint256 musdTokenBal;
        uint256 remainingEstateTokenBal;
    }
    //------------Mappings-------------------------//
    mapping(uint256 => icoAndVestingStruct) public getVestingDetailsForEstateID;
    mapping(uint256 => mapping(bytes32 => bool)) public roles;
    mapping(uint256 => mapping(address => balanceStruct))
        public getAdminBalance;
    mapping(uint256 => address) public propertyOwnerAddress;
    //------------Modifiers-------------------------//
    modifier onlyOnScuccesful(uint256 _estateID) {
        IDEED.Agreement memory deedData = DEED.agreements(_estateID);
        IICO.ICO_SetupStruct memory icoData = ICO.getICOinfo(_estateID);
        uint256 _totalVestableAmount = deedData.propertyOwnerTokenAmount +
            deedData.mogulTokenAmount;
        require(
            getVestedTokenAmount(_estateID) >= _totalVestableAmount,
            "Vesting: not vested yet"
        );
        require(
            icoData._raisedMUSD_ >= icoData._softCap_,
            "ICO: ico is unsuccesful"
        );
        _;
    }
    modifier onlyPropertyOwner(uint256 _estateID, address claimAddress) {
        bytes32 checkRole = (
            keccak256(abi.encodePacked("propertyOwner", claimAddress))
        );
        require(roles[_estateID][checkRole] == true, "Invalid: not authorized");
        _;
    }
    modifier onlyMogulOwner(uint256 _estateID, address claimAddress) {
        bytes32 checkRole = (
            keccak256(abi.encodePacked("mogulPlatform", claimAddress))
        );
        require(roles[_estateID][checkRole] == true, "Invalid: not authorized");
        _;
    }
    modifier onlyWhenInActiveState(uint256 _estateID) {
        require(
            ICO.getICOinfo(_estateID).state == true,
            "Vesting: estateID is not active"
        );
        _;
    }

    function Initialize(
        IDEED _DEED,
        IERC20Upgradeable _musdToken,
        IERC1155Upgradeable _estateToken,
        IICO _ICO
    ) external initializer {
        require(
            address(_DEED) != address(0) &&
                address(_musdToken) != address(0) &&
                address(_estateToken) != address(0) &&
                address(_ICO) != address(0),
            "Invalid : non-zero address required"
        );
        __Ownable_init();
        estateToken = _estateToken;
        musdToken = _musdToken;
        ICO = _ICO;
        DEED = _DEED;
    }

    function startVestingForEstateID(uint256 _estateID)
        external
        onlyOwner
        onlyWhenInActiveState(_estateID)
    {
        require(
            getVestingDetailsForEstateID[_estateID].isActive != true,
            "Vesting: estateID already in vesting state"
        );
        require(
            ICO.getICOinfo(_estateID)._startTimestamp_ > 0,
            "Vesting: estateID not exist"
        );
        IICO.ICO_SetupStruct memory icoData = ICO.getICOinfo(_estateID);
        IDEED.Agreement memory deedData = DEED.agreements(_estateID);
        icoAndVestingStruct storage icoTimes = getVestingDetailsForEstateID[
            _estateID
        ];
        icoTimes.isActive = true;
        icoTimes.start = icoData._startTimestamp_;
        icoTimes.end = icoData._finishTimestamp_;
        icoTimes.mogulTokenPrice = icoData._mogulTokenPrice_;
        icoTimes.icoState = icoData.state;
        icoTimes.totalVestableAmount =
            deedData.propertyOwnerTokenAmount +
            deedData.mogulTokenAmount;
    }

    function updateVestingForEstateID(uint256 _estateID)
        external
        onlyOwner
        onlyWhenInActiveState(_estateID)
    {
        require(
            getVestingDetailsForEstateID[_estateID].isActive,
            "Vesting: estateID not exist"
        );
        IICO.ICO_SetupStruct memory icoData = ICO.getICOinfo(_estateID);
        IDEED.Agreement memory deedData = DEED.agreements(_estateID);
        icoAndVestingStruct storage icoTimes = getVestingDetailsForEstateID[
            _estateID
        ];
        icoTimes.end = icoData._finishTimestamp_;
        icoTimes.mogulTokenPrice = icoData._mogulTokenPrice_;
        icoTimes.icoState = icoData.state;
        icoTimes.totalVestableAmount =
            deedData.propertyOwnerTokenAmount +
            deedData.mogulTokenAmount;
    }

    function getVestedTokenAmount(uint256 _estateID)
        public
        view
        onlyWhenInActiveState(_estateID)
        returns (uint256)
    {
        IICO.ICO_SetupStruct memory icoData = ICO.getICOinfo(_estateID);
        IDEED.Agreement memory deedData = DEED.agreements(_estateID);
        if (
            block.timestamp < icoData._startTimestamp_ &&
            getVestingDetailsForEstateID[_estateID].isActive
        ) {
            return 0;
        } else if (
            block.timestamp >= icoData._finishTimestamp_ &&
            getVestingDetailsForEstateID[_estateID].isActive
        ) {
            return
                deedData.propertyOwnerTokenAmount + deedData.mogulTokenAmount;
        } else if (
            icoData._startTimestamp_ <= block.timestamp &&
            block.timestamp <= icoData._finishTimestamp_ &&
            getVestingDetailsForEstateID[_estateID].isActive
        ) {
            uint256 passedSeconds = block.timestamp - icoData._startTimestamp_;
            uint256 durationSeconds = icoData._finishTimestamp_ -
                icoData._startTimestamp_;
            uint256 vestedAmount_ = ((deedData.propertyOwnerTokenAmount +
                deedData.mogulTokenAmount) * passedSeconds) / durationSeconds;
            return vestedAmount_;
        } else {
            return 0;
        }
    }

    function releaseTokenForMogulPlatform(uint256 _estateID, uint256 musd)
        external
        onlyOnScuccesful(_estateID)
        onlyMogulOwner(_estateID, _msgSender())
        onlyWhenInActiveState(_estateID)
    {
        address claimAddress = _msgSender();
        uint256 unitPrice = ICO.getICOinfo(_estateID)._mogulTokenPrice_;
        {
            require(
                claimAddress != address(0),
                "Invalid : non-zero address required"
            );
            require(
                getVestingDetailsForEstateID[_estateID].isActive,
                "Vesting : claim to non-exist estateID"
            );
            require(
                getAdminBalance[_estateID][claimAddress]
                    .remainingEstateTokenBal > 0,
                "Vesting: no token to released"
            );
            require(
                musd % unitPrice == 0,
                "Vesting: musd should be in mogulTokenPrice multiple"
            );
        }

        _claim(_estateID, musd, unitPrice, claimAddress);
    }

    function _claim(
        uint256 _estateID,
        uint256 musd,
        uint256 unitPrice,
        address claimAddress
    ) internal {
        balanceStruct storage tempAdminStruct = getAdminBalance[_estateID][
            claimAddress
        ];
        uint256 cliamablePrice = 0;
        cliamablePrice = (unitPrice * tempAdminStruct.remainingEstateTokenBal);
        if (musd <= cliamablePrice) {
            uint256 transferAbleToken = (musd / unitPrice);
            tempAdminStruct.musdTokenBal += musd;
            totalRaisedMUSD += musd;
            tempAdminStruct.currentEstateTokenBal += transferAbleToken;
            tempAdminStruct.remainingEstateTokenBal -= transferAbleToken;
            emit ReleasedMogulToken(
                claimAddress,
                transferAbleToken,
                _estateID,
                musd
            );
            musdToken.safeTransferFrom(
                claimAddress,
                propertyOwnerAddress[_estateID],
                musd
            );
            estateToken.safeTransferFrom(
                address(this),
                claimAddress,
                _estateID,
                transferAbleToken,
                bytes("")
            );
        } else {
            revert("Vesting: insufficient musd");
        }
    }

    function releaseTokenForPropertyOwner(uint256 _estateID)
        external
        onlyOnScuccesful(_estateID)
        onlyPropertyOwner(_estateID, _msgSender())
        onlyWhenInActiveState(_estateID)
    {
        address claimAddress = _msgSender();
        require(
            claimAddress != address(0),
            "Invalid : non-zero address required"
        );
        require(
            getVestingDetailsForEstateID[_estateID].isActive,
            "Vesting : claim to non-exist estateID"
        );

        balanceStruct storage tempAdminStruct = getAdminBalance[_estateID][
            claimAddress
        ];
        uint256 transferAbleToken = uint256(
            tempAdminStruct.remainingEstateTokenBal
        );
        if (tempAdminStruct.currentEstateTokenBal > 0) {
            revert("Vesting : no token to release");
        } else {
            tempAdminStruct.currentEstateTokenBal += transferAbleToken;
            emit ReleasedMogulToken(
                claimAddress,
                transferAbleToken,
                _estateID,
                0
            );
            delete tempAdminStruct.remainingEstateTokenBal;
            estateToken.safeTransferFrom(
                address(this),
                claimAddress,
                _estateID,
                transferAbleToken,
                bytes("")
            );
        }
    }

    function getICOinfo(uint256 _estateID)
        external
        view
        returns (IICO.ICO_SetupStruct memory)
    {
        IICO.ICO_SetupStruct memory icoInfo = ICO.getICOinfo(_estateID);
        return icoInfo;
    }

    function getAgreement(uint256 _estateID)
        external
        view
        returns (IDEED.Agreement memory)
    {
        IDEED.Agreement memory deedAgreemet = DEED.agreements(_estateID);
        return deedAgreemet;
    }

    function updateAdminRoles(
        uint256 _estateID,
        address _propertyOwner,
        address _mogulPlatform
    ) external onlyOwner onlyWhenInActiveState(_estateID) {
        IDEED.Agreement memory deedData = DEED.agreements(_estateID);
        require(
            _propertyOwner != address(0) && _mogulPlatform != address(0),
            "Invalid : non-zero address required"
        );
        bytes32 propertyOwner = keccak256(
            abi.encodePacked("propertyOwner", _propertyOwner)
        );
        bytes32 mogulPlatform = keccak256(
            abi.encodePacked("mogulPlatform", _mogulPlatform)
        );
        roles[_estateID][propertyOwner] = true;
        roles[_estateID][mogulPlatform] = true;
        propertyOwnerAddress[_estateID] = _propertyOwner;
        getAdminBalance[_estateID][_propertyOwner]
            .remainingEstateTokenBal = deedData.propertyOwnerTokenAmount;
        getAdminBalance[_estateID][_mogulPlatform]
            .remainingEstateTokenBal = deedData.mogulTokenAmount;
    }

    function _msgSender() internal view virtual override returns (address) {
        return msgSender();
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

}
