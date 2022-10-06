// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDEED {
    struct Agreement {
        uint256 propertyPrice;
        uint256 mogulPercentage;
        uint256 mogulTokenAmount;
        uint256 crowdsalePercentage;
        uint256 crowdsaleTokenAmount;
        uint256 propertyOwnerRetains;
        uint256 propertyOwnerTokenAmount;
        uint256 maxSupply;
        address propertyOwnerAddress;
        bool signedByPropertyOwner;
        bool signedByMogul;
        bool initialized;
        bool platfromFeePaid;
        bool dealComplete;
    }

    function agreements(uint256) external view returns (Agreement memory);
}
