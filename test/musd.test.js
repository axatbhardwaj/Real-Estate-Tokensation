const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);
const expect = chai.expect;
const { ethers } = require("hardhat");

describe("Testing Token Contract", () => {

  let firstAccount; 
  let secondAccount; 
  let thirdAccount;
  let tokenContractInstance;

  beforeEach(async () => {
    [ firstAccount, secondAccount, thirdAccount ] = await ethers.getSigners();
    let Token_Contract = await ethers.getContractFactory("Musd");
    tokenContractInstance = await Token_Contract.deploy("Rupee", "$");
  });

  it("Owner can mint tokens", async () => {
    await tokenContractInstance.connect(firstAccount).mint(secondAccount.address, 15000);
    expect(await tokenContractInstance.balanceOf(secondAccount.address)).to.equal(15000);
    expect(await tokenContractInstance.totalSupply()).to.equal(15000);
  });

  it("Account other than Owner can't mint tokens", async () => {
    await expect(tokenContractInstance.connect(secondAccount).mint(secondAccount.address, 15000)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Owner can burn tokens", async () => {
    await tokenContractInstance.connect(firstAccount).mint(secondAccount.address, 15000);
    expect(await tokenContractInstance.balanceOf(secondAccount.address)).to.equal(15000);
    expect(await tokenContractInstance.totalSupply()).to.equal(15000);
    await tokenContractInstance.connect(firstAccount).burn(secondAccount.address, 12000);
    expect(await tokenContractInstance.balanceOf(secondAccount.address)).to.equal(3000);
    expect(await tokenContractInstance.totalSupply()).to.equal(3000);
  });

  it("Account other than Owner can't burn tokens", async () => {
    await tokenContractInstance.connect(firstAccount).mint(secondAccount.address, 15000);
    await expect(tokenContractInstance.connect(thirdAccount).burn(secondAccount.address, 12000)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Total token supply increases with same amount with each mint transaction", async () => {
    expect(await tokenContractInstance.totalSupply()).to.equal(0);
    await tokenContractInstance.connect(firstAccount).mint(secondAccount.address, 15000);
    expect(await tokenContractInstance.totalSupply()).to.equal(15000);
  });

  it("Total token supply decreases with same amount with each burn transaction", async () => {
    expect(await tokenContractInstance.totalSupply()).to.equal(0);
    await tokenContractInstance.connect(firstAccount).mint(secondAccount.address, 15000);
    expect(await tokenContractInstance.totalSupply()).to.equal(15000);
    await tokenContractInstance.connect(firstAccount).burn(secondAccount.address, 12000);
    expect(await tokenContractInstance.totalSupply()).to.equal(3000);
  });

});
