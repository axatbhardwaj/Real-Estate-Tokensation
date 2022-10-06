// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "contracts/helper/BasicMetaTransaction.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Musd is BasicMetaTransaction, ERC20, Ownable {
    constructor(string memory _tokenName, string memory _tokenSymbol)
        ERC20(_tokenName, _tokenSymbol)
    {
        isErc20 = true;
    }

    bool public isErc20;

    function mint(address _recipient, uint256 _tokenAmount) public onlyOwner {
        _mint(_recipient, _tokenAmount);
    }

    function burn(address _tokenHolder, uint256 _tokenAmount) public onlyOwner {
        _burn(_tokenHolder, _tokenAmount);
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    function _msgSender() internal view virtual override returns (address) {
        return msgSender();
    }
}
