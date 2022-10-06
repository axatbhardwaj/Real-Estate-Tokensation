// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "contracts/helper/BasicMetaTransaction.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

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

contract Deed is BasicMetaTransaction, Initializable, OwnableUpgradeable {
    modifier onlyPropertyOwner(uint256 __estateId) {
        require(
            msgSender() == agreements[__estateId].propertyOwnerAddress,
            "Message sender / agreement signer should be property owner"
        );
        _;
    }

    modifier deedRunning(uint256 __estateId) {
        require(
            agreements[__estateId].dealComplete == false,
            "Deed is already completed"
        );

        require(
            agreements[__estateId].initialized == true,
            "Deed is not initialized"
        );
        _;
    }

    function initialize() public initializer {
        __Ownable_init();
    }

    //string to store the legal document

    IMUSD public _erc20Address;
    uint256 public estateId;
    uint256 public platformFees;
    address private _mogulPayoutAddress;

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

    // struct for document
    struct AgreementDocument {
        string saleDeed;
        string tncLegalDoc;
        string propertyDocument;
    }

    // mapping for containg deeds
    mapping(uint256 => Agreement) public agreements;
    mapping(uint256 => AgreementDocument) public agreementDocuments;

    // events
    event agreementInitiated(
        uint256 indexed _estateId,
        address _propertyOwner,
        string _legalDoc,
        uint256 _maxSupply
    );
    event updatedPropertyDetails(
        uint256 indexed _estateId,
        string _propertyDocument,
        uint256 _propertyPrice,
        uint256 _propertyOwnerRetains
    );
    event assignedPropertyPercentage(
        uint256 indexed _estateId,
        uint256 _mogulPercentage,
        uint256 _crowdsalePercentage
    );
    event signedByPropertyOwner(
        uint256 indexed _estateId,
        address _propertyOwner
    );
    event signedByMogul(uint256 indexed _estateId, address _mogul);
    event updatedPropertyPrice(uint256 indexed _estateId, uint256 _price);
    event updatedPropertyDocument(
        uint256 indexed _estateId,
        string _propertyDocument
    );
    event updatedPropertyOwner(
        uint256 indexed _estateId,
        address indexed _propertyOwnerAddress
    );
    event deedCompleted(uint256 indexed _estateId);

    // function to initiaite agreement

    function initiateAgreement(
        address _propertyOwner,
        uint256 _maxSupply,
        string calldata _legaldoc
    ) external onlyOwner returns (uint256) {
        require(
            _propertyOwner != address(0),
            "Property owner address cannot be 0"
        );
        require(_maxSupply > 0, "Max supply should be greater than 0");
        require(bytes(_legaldoc).length > 0, "legaldoc not found");
        agreements[estateId].propertyOwnerAddress = _propertyOwner;
        agreements[estateId].initialized = true;
        agreementDocuments[estateId].tncLegalDoc = _legaldoc;
        agreements[estateId].maxSupply = _maxSupply;
        estateId++;

        emit agreementInitiated(
            estateId - 1,
            _propertyOwner,
            _legaldoc,
            _maxSupply
        );

        return estateId - 1;
    }

    //function to enter details of property by owner
    //NOTE: estate Id is required
    function enterPropertyDetails(
        string calldata _propertyDocument,
        uint256 _estateId,
        uint256 _propertyPrice,
        uint256 _propertyOwnerRetains
    ) external deedRunning(_estateId) onlyPropertyOwner(_estateId) {
        require(
            _propertyOwnerRetains < 10000,
            "Property owner retains should be less than 100 %"
        );
        require(_propertyPrice > 0, "Property price should be greater than 0");
        require(
            bytes(_propertyDocument).length > 0,
            "Property document not found"
        );

        agreementDocuments[_estateId].propertyDocument = _propertyDocument;
        agreements[_estateId].propertyPrice = _propertyPrice;
        agreements[_estateId].propertyOwnerRetains = _propertyOwnerRetains;

        emit updatedPropertyDetails(
            _estateId,
            _propertyDocument,
            _propertyPrice,
            _propertyOwnerRetains
        );
    }

    //function to set percentqage of mogul and crowdsale
    //NOTE: estate Id is required
    function setPercentage(
        uint256 _estateId,
        uint256 _mogulPercentage,
        uint256 _crowdsalePercentage
    ) external deedRunning(_estateId) onlyOwner {
        Agreement storage agr = agreements[_estateId];
        require(
            _mogulPercentage <= 10000,
            "Mogul percentage should be less than 100"
        );
        require(
            _crowdsalePercentage <= 10000,
            "Crowdsale percentage should be less than 100"
        );
        require(
            _crowdsalePercentage > 0,
            "Crowdsale percentage should be greater than 0"
        );
        agr.mogulPercentage = _mogulPercentage;
        agr.crowdsalePercentage = _crowdsalePercentage;
        require(
            agr.mogulPercentage +
                agr.crowdsalePercentage +
                agr.propertyOwnerRetains ==
                10000,
            "Percentage should be equal to 100"
        );
        //calculate token amount
        percentageToTokens(_estateId);
        agreements[_estateId].signedByPropertyOwner = false;

        emit assignedPropertyPercentage(
            _estateId,
            _mogulPercentage,
            _crowdsalePercentage
        );
    }

    //function to change percentage into tokens
    //NOTE: estate Id is required
    function percentageToTokens(uint256 __estateID) internal {
        Agreement storage _agreement = agreements[__estateID];

        _agreement.propertyOwnerTokenAmount =
            (_agreement.propertyOwnerRetains * _agreement.maxSupply) /
            10000; // divide by 10000 to convert percentage to tokens

        _agreement.mogulTokenAmount =
            (_agreement.mogulPercentage * _agreement.maxSupply) /
            10000;

        _agreement.crowdsaleTokenAmount =
            (_agreement.crowdsalePercentage * _agreement.maxSupply) /
            10000;

        require(
            _agreement.propertyOwnerTokenAmount +
                _agreement.mogulTokenAmount +
                _agreement.crowdsaleTokenAmount ==
                _agreement.maxSupply,
            "Tokens should be equal to max supply"
        );
    }

    // function to sign the agreement by the property owner
    // it will accept all the info present in struct of the specific tokenID
    function signByPropertyOwner(uint256 _estateId)
        external
        deedRunning(_estateId)
        onlyPropertyOwner(_estateId)
    {
        agreements[_estateId].signedByPropertyOwner = true;

        emit signedByPropertyOwner(_estateId, msg.sender);
    }

    function signByMogul(uint256 _estateId)
        external
        deedRunning(_estateId)
        onlyOwner
    {
        //address caller = msgSender();
        agreements[_estateId].signedByMogul = true;

        emit signedByMogul(_estateId, msg.sender);
    }

    // function to set mogul payout address
    function setMogulPayoutAddress(address __mogulPayoutAddress)
        external
        onlyOwner
    {
        require(
            __mogulPayoutAddress != address(0),
            "Mogul payout address cannot be 0"
        );
        _mogulPayoutAddress = __mogulPayoutAddress;
    }

    //function to set platform fees
    function setPlatformFees(uint256 __platformFees) external onlyOwner {
        require(__platformFees > 0, "Platform fees should be greater than 0");
        platformFees = __platformFees;
    }

    //function to set erc20 address
    function setERC20Address(IMUSD __erc20Address) external onlyOwner {
        require(
            address(__erc20Address) != address(0),
            "ERC20 address cannot be 0"
        );
        require(IMUSD(__erc20Address).isErc20(), "ERC20 address is not valid");
        _erc20Address = __erc20Address;
    }

    //function to update property price by owner
    function updatePriceByPropertyOwner(uint256 _estateId, uint256 _price)
        external
        deedRunning(_estateId)
        onlyPropertyOwner(_estateId)
    {
        require(_price > 0, "Price should be greater than 0");
        agreements[_estateId].propertyPrice = _price;
        agreements[_estateId].signedByMogul = false;

        emit updatedPropertyPrice(_estateId, _price);
    }

    //update property doc by owner
    function updatePropertyDocByPropertyOwner(
        uint256 _estateId,
        string calldata _propertyDocument
    ) external deedRunning(_estateId) onlyPropertyOwner(_estateId) {
        require(bytes(_propertyDocument).length > 0, "URI not found");
        agreementDocuments[_estateId].propertyDocument = _propertyDocument;
        agreements[_estateId].signedByMogul = false;

        emit updatedPropertyDocument(_estateId, _propertyDocument);
    }

    //function to update property owner retains by owner
    function updatePropertyOwnerRetainsByPropertyOwner(
        uint256 _estateId,
        uint256 _propertyOwnerRetains
    ) external deedRunning(_estateId) onlyPropertyOwner(_estateId) {
        require(
            _propertyOwnerRetains < 10000,
            "Property owner retains should be less than 100 %"
        );
        agreements[_estateId].propertyOwnerRetains = _propertyOwnerRetains;
        agreements[_estateId].signedByMogul = false;
    }

    //function to update property owner by mogul
    function updatePropertyOwnerByMogul(
        uint256 _estateId,
        address _propertyOwnerAddress
    ) external deedRunning(_estateId) onlyOwner {
        require(
            _propertyOwnerAddress != address(0),
            "Property owner address cannot be 0"
        );
        agreements[_estateId].propertyOwnerAddress = _propertyOwnerAddress;

        emit updatedPropertyOwner(_estateId, _propertyOwnerAddress);
    }

    // function to change the maxSupply of the token
    function updateMaxSupplyByMogul(uint256 _estateId, uint256 _maxSupply)
        external
        deedRunning(_estateId)
        onlyOwner
    {
        require(_maxSupply > 0, "Max supply should be greater than 0");
        agreements[_estateId].maxSupply = _maxSupply;
    }

    function uploadSaleDeedByOwner(uint256 _estateId, string calldata _saleDeed)
        external
        onlyOwner
    {
        require(
            agreements[_estateId].dealComplete == true,
            "deal is not complete yet !!"
        );
        require(bytes(_saleDeed).length > 0, "URI not found");
        agreementDocuments[_estateId].saleDeed = _saleDeed;
    }

    // transfer confirmation function
    //NOTE need to get approval from the erc20  contract first
    function transferPlatformFee(uint256 __estateId) external {
        require(
            agreements[__estateId].signedByPropertyOwner,
            "Property owner should sign the agreement"
        );
        require(
            agreements[__estateId].signedByMogul,
            "Mogul should sign the agreement"
        );
        IMUSD(_erc20Address).transferFrom(
            msgSender(),
            _mogulPayoutAddress,
            platformFees
        );
        agreements[__estateId].platfromFeePaid = true;
    }

    // funtion to confirm the deal completion after crowdsale
    function confirmDeedCompletion(uint256 __estateId)
        external
        deedRunning(__estateId)
        onlyOwner
    {
        require(
            agreements[__estateId].signedByPropertyOwner,
            "Property owner should sign the agreement"
        );
        require(
            agreements[__estateId].signedByMogul,
            "Mogul should sign the agreement"
        );
        require(
            agreements[__estateId].platfromFeePaid,
            "Platform fee not paid"
        );
        agreements[__estateId].dealComplete = true;

        emit deedCompleted(__estateId);
    }

    // function
    function _msgSender() internal view virtual override returns (address) {
        return msgSender();
    }
}
