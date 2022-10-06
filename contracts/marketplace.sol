// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "contracts/helper/BasicMetaTransaction.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";

//SECTION Interfaces
//IMUSD
interface IMUSD {
    function isErc20() external view returns (bool);

    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}

//!SECTION Interfaces end

contract marketplace is
    Initializable,
    OwnableUpgradeable,
    BasicMetaTransaction
{
    // Contrctor/Initializer function for upgardeable contracts
    function initialize() public initializer {
        __Ownable_init();
    }

    //SECTION Variables

    IMUSD public IMUSD_contract;
    IERC1155Upgradeable public EstateToken_contract;

    //!SECTION Variables end

    //SECTION Mappings

    //mapping to store rates
    mapping(uint256 => uint256) rates;

    //!SECTION Mappings end

    //SECTION funcitons and logic
    // get price/rate ( only owner)
    function setRate(uint256 _tokenId, uint256 _rate) internal {
        rates[_tokenId] = _rate;
    }

    //function to make exchange happen
    function exchange(
        address _nftFrom,
        address _nftTO,
        uint256 nftAmount,
        uint256 _tokenId,
        uint256 _rate
    ) public onlyOwner {
        require(_nftFrom != address(0), "address cannot be 0");
        require(_nftTO != address(0), "address cannot be 0");
        require(nftAmount > 0, "amount cannot be 0");
        require(
            nftAmount <= EstateToken_contract.balanceOf(_nftFrom, _tokenId),
            "Not enough NFT amount"
        );
        require(_rate > 0, "rate cannot be 0");

        setRate(_tokenId, _rate);
        //transfer of Erc20 token
        IMUSD_contract.transferFrom(
            _nftTO,
            _nftFrom,
            nftAmount * rates[_tokenId]
        );
        //transfer of Estate token
        EstateToken_contract.safeTransferFrom(
            _nftFrom,
            _nftTO,
            _tokenId,
            nftAmount,
            bytes("")
        );
    }

    //func to set Estatetoken contarct address ( ERC1155)
    function setEstateTokenAddress(address EstateToken_contract_add)
        public
        onlyOwner
    {
        EstateToken_contract = IERC1155Upgradeable(EstateToken_contract_add);
    }

    // Function to set ERC20/IMUSD contract address
    function setIMUSDContractAddress(IMUSD imusdContractAddress)
        public
        onlyOwner
    {
        IMUSD_contract = imusdContractAddress;
    }

    //override for BasicMetaTxn
    // function
    function _msgSender() internal view virtual override returns (address) {
        return msgSender();
    }

    //!SECTION fns's and logic end
}
