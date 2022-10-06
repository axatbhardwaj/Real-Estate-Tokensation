// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "contracts/helper/BasicMetaTransaction.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "contracts/helper/IDEED.sol";

contract EstateToken is
    Initializable,
    ERC1155Upgradeable,
    OwnableUpgradeable,
    ERC1155BurnableUpgradeable,
    ERC1155PausableUpgradeable,
    ERC1155SupplyUpgradeable,
    ERC1155HolderUpgradeable,
    BasicMetaTransaction,
    ReentrancyGuardUpgradeable
{
    address public vestingContractAddress;
    address public crowdsaleContractAddress;

    // interfaces
    IDEED public DEED;

    // events
    event mintedNewPropertyToken(
        uint256 indexed estateId,
        uint256 vestingTokenAmount,
        uint256 crowdsaleTokenAmount,
        string uri
    );
    event tokenDelist(
        uint256 indexed estateid,
        uint256 burnAllowedTill,
        uint256 penaltyPercentageDaily
    );
    event extendedBurnDeadline(
        uint256 indexed estateid,
        uint256 burnAllowedTill
    );

    function initialize() external initializer {
        __ERC1155_init("");
        __Ownable_init();
        __ERC1155Burnable_init();
        __ERC1155Pausable_init();
        __ERC1155Supply_init();
    }

    //function to pause contract
    function pause() external onlyOwner {
        _pause();
    }

    // function to unpause contract
    function unPause() external onlyOwner {
        _unpause();
    }

    // struct for token info

    struct Tokeninfo {
        bool minted; // true if minted already
        bool burnState; // true if burn is on
        bool activelyListed; // true if token is listed and active
        uint256 burnAllowedTill; // time left till burn is allowed
        uint256 burnAllowedTillBeforeExtension; //for pentalty calculation
        uint256 penaltyPercentageWeekly; // penalty percentage ffor delay in burning
        string uri; // uri of the token
    }

    // mapping for token info
    mapping(uint256 => Tokeninfo) public tokenInfo;

    // function to set the crowdsale contract address
    function updateCrowdsaleAddress(address _crowdsale) external onlyOwner {
        require(
            _crowdsale != address(0),
            "Crowdsale contract address can not be null"
        );
        crowdsaleContractAddress = _crowdsale;
    }

    //function to view uri of a token overridden
    function uri(uint256 _estateid)
        public
        view
        override
        returns (string memory)
    {
        return tokenInfo[_estateid].uri;
    }

    // function to set the uri of a token
    function updateTokenURI(uint256 _estateid, string memory _uri)
        external
        onlyOwner
    {
        require(bytes(_uri).length > 0, "URI not found");
        tokenInfo[_estateid].uri = _uri;
    }

    // function to ser DEED contract address
    function updateDEEDAddress(address _deed) external onlyOwner {
        require(_deed != address(0), "Deed contract address can not be null");
        DEED = IDEED(_deed);
    }

    //function to change vesting Contract address
    function updateVestingContractAddress(address _vestingContractAddress)
        external
        onlyOwner
    {
        require(
            _vestingContractAddress != address(0),
            "Vesting contract address can not be null"
        );
        vestingContractAddress = _vestingContractAddress;
    }

    // Header function for minting token directly to mogul and crowdsale contract
    //vesting token amount is the sum of mogul's token + property owner's token from deed contract
    function mintNewPropertyToken(string calldata __uri, uint256 _estateId)
        external
        nonReentrant
        onlyOwner
    {
        uint256 vestingTokenAmount = getTokenAmountFromDeed(_estateId)
            .propertyOwnerTokenAmount +
            getTokenAmountFromDeed(_estateId).mogulTokenAmount;
        uint256 crowdsaleTokenAmount = getTokenAmountFromDeed(_estateId)
            .crowdsaleTokenAmount;
        require(bytes(__uri).length > 0, "URI not found");
        require(tokenInfo[_estateId].minted == false, "Token already minted");
        tokenInfo[_estateId].uri = __uri;
        tokenInfo[_estateId].activelyListed = true;
        tokenInfo[_estateId].minted = true;
        emit mintedNewPropertyToken(
            _estateId,
            vestingTokenAmount,
            crowdsaleTokenAmount,
            __uri
        );
        _mint(crowdsaleContractAddress, _estateId, crowdsaleTokenAmount, "");
        _mint(vestingContractAddress, _estateId, vestingTokenAmount, "");
    }

    // function to set burn allowance for tokens
    // penalty percentage of delay in burning is set via this function
    function updateBurningState(
        bool _state,
        uint256 _estateid,
        uint256 _timetill,
        uint256 _penaltyPercentageWeekly
    ) internal onlyOwner {
        tokenInfo[_estateid].burnState = _state;
        tokenInfo[_estateid].burnAllowedTill = _timetill;
        tokenInfo[_estateid].penaltyPercentageWeekly = _penaltyPercentageWeekly;
        tokenInfo[_estateid].burnAllowedTillBeforeExtension = _timetill;
    }

    // function to start delisting process of a token
    function delistToken(
        uint256 _estateid,
        uint256 _timetill,
        uint256 _penaltyPercentageWeekly
    ) external onlyOwner {
        require(tokenInfo[_estateid].activelyListed, "Token is not listed");
        tokenInfo[_estateid].activelyListed = false;

        //calling updateBurningState() to update the burning state of the token
        updateBurningState(
            true,
            _estateid,
            _timetill,
            _penaltyPercentageWeekly
        );
        emit tokenDelist(_estateid, _timetill, _penaltyPercentageWeekly);
    }

    // function to burn token overridden from ERC1155BurnableUpgradeable
    function burn(
        address _account,
        uint256 _estateid,
        uint256 _amount
    ) public override {
        require(
            tokenInfo[_estateid].burnState == true,
            "Burning is not allowed at the moment"
        );
        require(
            tokenInfo[_estateid].burnAllowedTill > block.timestamp,
            "Burn time is over"
        );
        require(
            totalSupply(_estateid) > 0,
            "Cannot burn token with no available supply"
        );
        require(
            balanceOf(_account, _estateid) >= _amount,
            "Amount exceeds the available balance to burn with this token-id in this account"
        );

        require(
            _account == _msgSender() ||
                isApprovedForAll(_account, _msgSender()),
            "ERC1155: caller is not owner nor approved"
        );
        _burn(_account, _estateid, _amount);
    }

    // function to burn in batch overridden from ERC1155Burnableupgradeable
    function burnBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory values
    ) public override {
        require(
            ids.length == values.length,
            "Length of ids and values should be same"
        );
        for (uint256 i = 0; i < ids.length; i++) {
            require(
                tokenInfo[ids[i]].burnState == true,
                "Burning is not allowed at the moment for token-id "
            );
            require(
                tokenInfo[ids[i]].burnAllowedTill > block.timestamp,
                "Burn time is over"
            );
            require(
                totalSupply(ids[i]) > 0,
                "Cannot burn token with no available supply"
            );
            require(
                balanceOf(account, ids[i]) >= values[i],
                "Amount exceeds the available balance to burn with this token-id in this account"
            );

            require(
                account == _msgSender() ||
                    isApprovedForAll(account, _msgSender()),
                "ERC1155: caller is not owner nor approved"
            );
        }

        _burnBatch(account, ids, values);
    }

    // funtion to extend the burn deadline
    function extendBurnDeadline(uint256 _estateid, uint256 _timetill)
        external
        onlyOwner
    {
        require(
            tokenInfo[_estateid].burnState == true,
            "Burning is not allowed at the moment"
        );
        require(
            _timetill > tokenInfo[_estateid].burnAllowedTill,
            "Extension time is less than the current time"
        );
        emit extendedBurnDeadline(_estateid, _timetill);
        tokenInfo[_estateid].burnAllowedTill = _timetill;
    }

    // function to get token amount from deed contract
    function getTokenAmountFromDeed(uint256 _estateID)
        public
        view
        returns (IDEED.Agreement memory)
    {
        IDEED.Agreement memory deedAgreemet = DEED.agreements(_estateID);
        return deedAgreemet;
    }

    // function to calculate the penalty amount
    function penaltyPercentageCalculator(
        uint256 _penaltyDaily, // In MUSD
        uint256 tokenId
    ) external view returns (uint256) {
        if (block.timestamp > tokenInfo[tokenId].burnAllowedTill) {
            return
                // penalty if late
                (_penaltyDaily *
                    block.timestamp -
                    (tokenInfo[tokenId].burnAllowedTillBeforeExtension)) /
                (1 days);
        } else {
            // no penalty as it is in burn window
            return 0;
        }
    }

    // override function to save from errors in ERC1155
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    )
        internal
        override(
            ERC1155PausableUpgradeable,
            ERC1155Upgradeable,
            ERC1155SupplyUpgradeable
        )
        whenNotPaused
    {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    // override function to stop transfer is not actively listed
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public virtual override {
        require(tokenInfo[id].activelyListed, "Token is not actively listed");
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()),
            "ERC1155: caller is not owner nor approved"
        );
        _safeTransferFrom(from, to, id, amount, data);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155Upgradeable, ERC1155ReceiverUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // function to override for BMT
    function _msgSender() internal view virtual override returns (address) {
        return msgSender();
    }
}
