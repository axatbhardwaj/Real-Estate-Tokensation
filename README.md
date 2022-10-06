# MULTI - ICO

## Initialize the contract (step 1)
   
    ```
    - use Initialize() for initializing the contract 
    - arguments : 
        a) admin address(type address) - address who will be responsible for whitelisting the users
        b) ERC20 contract address(type address) - musdToken address
        c) ERC1155 contract address(type address) - estateToken address
    ```

## Setup the ICO for ID (step 2)

    ```
    - use setupICO() to run ICO for a particular estateID
    - arguments :
       a)  startTimestamp(type uint) -  ICO start time
       b)  finishTimestamp(type uint) - ICO end time
       c)  maxMUSDlimit(type uint) -   Max limit of MUSD for all users
       d)  minMUSDlimit(type uint) -   Min limit of MUSD for all users
       e)  estateID(type uint) -       mogul token id
       f)  hardCap(type uint) -       max goal amount for a ICO
       g)  softCap(type uint) -       min goal amount for a ICO
       h)  tokenPrice(type uint) -     mogul token Price
    - condition : only Owner can transact
    ```
##  Invest (step 3)

    ```
    - use invest() for investment for a particular estateID.user can invest in more than one live ICO
    - arguments :
        a) _nonce(type uint) - number used only once i.e each user will be assigned by a unique number, eg:0 
        b) _sign(type bytes) - bytes string which will be generated by admin private key  [refer whitelisting section]
        c) musd(type uint256) - ERC20 token amount 
        d) _estateID(type uint256) - ERC1155 estateID
    ```

## Set Admin Roles for airdrop (step 4)

    ```
    - use setAdminRoles() for updating admins
    - argumnets : a) admin addresses(type address) - array of admins address
    - condition : only Owner can transact
    ```

## Admin's Approval for airdrop (step 5)

    ```
    - use adminApproval() for getting admins approval to airdrop
    - arguments : a) sign(type bytes) - array of sign [refer whitelisting section]
                  b) _estateID - ERC1155 estateID
    - condition : a) only Owner can transact
                  b) provide sign in searlize 
                  i.e if 0x1 address is set on index 0 in above setAdminRoles(),then provide it's sign on at index 0 
                
    ```

## airDropToken (step 6)

    '''
    - use airDropToken() to transfer mogulToken to investor's address
    - arguments : a) _users(type address) - array of address which will hold address of investors 
                  b) _estateID - ERC1155 estateID
    - condition : a) only Owner can transact
                  b) admin approval required before any airdrop
    '''

## refund 

    ```
    - use refund() ,refund invested musd to investors
    - arguments : a) _estateID - ERC1155 estateID
    - condition : a) claimable only after ico is fail to reach thier goal
                  b) no airdrop of refund amount,user has to claim
    ```

## withdraw 

    ```
    - use withdraw() , to withdraw raised musd for a particular ico 
    - arguments : a) withdrawnAddress - provide admin address in which owner wants to trasnfer musd token(ERC20)
                  b) musd(type uint) - ERC20 token withdrawl amount
                  c) _estateID(type uint) - ERC1155 estateID
    - condition : a) onlyOwner can transact
                  b) call-able only after ico ended
                  c) call-able only after goal reached

    ```

## updateHardCap - updation of max ICO goal Amount

    ```
    - use updateHardCap() for updating maxgoal amount for ico
    - arguments :
        a) _estateID(type uint) - ERC1155 estateID
        b) maxGoal(type uint) - MUSD amount(ERC20 token amount)
    - condition : a) onlyOwner can transact
                  b) ico must be in active state
    ```

## updateSoftCap - updation of min ICO goal Amount

    ```
    - use updateSoftCap() for updating mingoal amount for ico
    - arguments :
        a) _estateID(type uint) - ERC1155 estateID
        b) minGoal(type uint) - MUSD amount(ERC20 token amount)
    - condition : a) onlyOwner can transact
                  b) ico must be in active state
    ```

## updateMaxMUSDLimit - updation of maximum MUSD limit

    ```
    - use updateMaxMUSDLimit() for updating maximum musd amount for ico
    - arguments :
        a) _estateID(type uint) - ERC1155 estateID
        b) _maxMUSDlimit(type uint) - MUSD amount(ERC20 token amount)
    - condition : a) onlyOwner can transact
                  b) ico must be in active state
    ```

## updateMinMUSDLimit - updation of minimum MUSD limit

    ```
    - use updateMinMUSDLimit() for updating minimum musd amount for ico
    - arguments :
        a) _estateID(type uint) - ERC1155 estateID
        b) _maxMUSDlimit(type uint) - MUSD amount(ERC20 token amount)
    - condition : a) onlyOwner can transact
                  b) ico must be in active state
    ```

## extendIcoTimes - updation in current end time for ico

    ```
    - use extendIcoTimes() for updating end timestamp for ico
    - arguments :
        a) _estateID(type uint) - ERC1155 estateID
        b) resetICOendTime(type uint) - timestamp in unix
    - condition : a) onlyOwner can transact
                  b) provide timestamp higher than current time
    ```

## changeState - change ico current state

    ```
    - use changeState() to pause and un-pause ico
    - arguments :
        a) _estateID(type uint) - ERC1155 estateID
    - condition : a) onlyOwner can transact
                  b) ico estateID must be exist
    ```


### ------------------------------------------------------------------------------------------------------------

# Read functions 

## getICOinfo

    ```
    - use getICOinfo(), to get setuped ico struct values
    ```

## getAllLiveICOs

    ```
    - use getAllLiveICOs(), to get all live icos estateID
    ```

## perUserInvestment 

    ```
    - use perUserInvestment(), to get musd token(ERC20) investment for individual
    ```

## __whitelistAdminAdd

    ```
    - use __whitelistAdminAdd() , to get admin address who is responsible for whitelist users
    ```

## checkWhitelisted

    ```
    - use checkWhitelisted() , to check if user is whitelisted or not 
    - arguments : a) _user(type uint) - investor address
                  b) _nounce(type uint) - unique number assigned to investor
                  c) _sig(type bytes) - bytes string 
    - output : gives true if whitelisted else return false 
    ```

## estateToken

    ```
    - estateToken() , to get ERC1155 contract address  
    ```

## musdToken

    ```
    - use musdToken(), to get ERC20 token contract address
    ```

## totalRaisedMUSD

    ```
    - use totalRaisedMUSD(), to get musd token(ERC20) by all setuped icos 
    ```

## ICOsCount 

    ```
    - use ICOsCount(), to get all setuped icos count
    ```

## getAdminRoles

    ```
    - use getAdminRoles(), to get airdrop admins approval address array
    ```

## withdrawnMUSDByID

    ```
    - use withdrawnMUSDByID(), to get withdrawn musd from each ico
    ```


# WhiteListing section
## whitelist users 
    - Every users must be signed by whitelist owner privatekey
    - use web3 soliditySha3() to get signature from owner
    - In present scenario soliditySha3 takes two params - nounce and users address
    - Below are the reference script for whitelisting
  ```js 


        const createSignature = params => {
        params = {recipient: ProvideInvestorAddress, nonce: UniqueNumber, ...params};
        const message = web3.utils.soliditySha3(
        {t: 'address', v: params.recipient},
        {t: 'uint256', v: params.nonce}   
        ).toString('hex');
        const privKey = ProvideWhitelistOwnerPrivatekey;
        const { signature } = web3.eth.accounts.sign(
        message,  
        privKey
        );
        return { signature, recipient: params.recipient, nonce: params.nonce };
  
    };
   ```
# Vesting

##  Initialize (step 1)

    ```
    - use Initialize(), initiate the contract 
    - arguments: a) _DEED - deed contract address
                 b) _musdToken - musd(ERC20) contract address
                 c) _estateToken - ERC1155 contract address
                 d) _ICO - crowdsale contract address
    ```


## updateAdminRoles (step 2)

    ```
    - use updateAdminRoles(), to update property and mogul owner address
    - arguments : a) _estateID - ERC1155 1155 token id
                  b) _propertyOwner - property owner address
                  c) _mogulPlatform - mogul owner address
    - condition : a) only owner can transact
    ```
## startVestingForEstateID (step 3)

    ```
    - use startVestingForEstateID(), to start vesting for estateID
    - arguments : a) _estateID - ERC1155 estateID
    - condition : a) only owner can transact
    ```

## releaseTokenForMogulPlatform (step 4)

    ```
    - use releaseTokenForMogulPlatform(), to release token for mogul platform owner 
    - arguments : a) _estateID - ERC1155 estateID
                  b) musd - ERC20 token amount 
    - condition : a) only mogul owner can transact
                  b) owner can claim only after ico success 
    ```

## releaseTokenForPropertyOwner (step 5)

    ```
    - use releaseTokenForMogulPlatform(), to release token for property owner 
    - arguments : a) _estateID - ERC1155 estateID
    - condition : a) only property owner can transact
                  b) owner can claim only after ico success
    ```

## withdraw 

    ```
    - use withdraw() , to withdraw musd (ERC20 token)
    - arguments : a) withdrawnAddress - provide admin address in which owner wants to trasnfer musd token(ERC20)
                  b) musd(type uint) - ERC20 token withdrawl amount
                  c) _estateID(type uint) - ERC1155 estateID
    - condition : a) onlyOwner can transact
                  b) call-able only after ico ended
                  c) call-able only after goal reached

    ```

## updateVestingForEstateID

    ```
    - use updateVestingForEstateID(), to update vesting values for estateID
    - arguments : a) _estateID - ERC1155 estateID
    - condition : a) only owner can transact
    ```

### ------------------------------------------------------------------------------------------------------------

# Read functions 

## getICOinfo

    ```
    - use getICOinfo(), to get ico contract struct values
    ```

## getAgreement

    ```
    - use getAgreement() , to get deed contract struct values
    ```

## getVestedTokenAmount

    ```
    - use getVestedTokenAmount(), to get token amount in vesting state
    ```
