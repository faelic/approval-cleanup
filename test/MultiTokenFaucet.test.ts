import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("MultiTokenFaucet", function () {
  async function deployFixture() {
    const [owner, user, other] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy(
      "Mock USD",
      "mUSD",
      6,
      ethers.parseUnits("1000000", 6)
    );

    const MultiTokenFaucet = await ethers.getContractFactory("MultiTokenFaucet");
    const faucet = await MultiTokenFaucet.deploy(owner.address);

    return { owner, user, other, mockToken, faucet };
  }

  it("allows the owner to configure a token", async function () {
    const { faucet, mockToken } = await deployFixture();

    const claimAmount = ethers.parseUnits("10", 6);

    await faucet.configureToken(mockToken.target, claimAmount, true);

    const config = await faucet.tokenConfigs(mockToken.target);

    expect(config.supported).to.equal(true);
    expect(config.enabled).to.equal(true);
    expect(config.claimAmount).to.equal(claimAmount);

    const supportedTokens = await faucet.getSupportedTokens();
    expect(supportedTokens).to.deep.equal([mockToken.target]);
  });

  it("does not allow a non-owner to configure a token", async function () {
    const { faucet, mockToken, user } = await deployFixture();

    const claimAmount = ethers.parseUnits("10", 6);

    await expect(
      faucet.connect(user).configureToken(mockToken.target, claimAmount, true)
    ).to.be.reverted;
  });

  it("does not duplicate a token in supportedTokens when reconfigured", async function () {
    const { faucet, mockToken } = await deployFixture();

    const firstAmount = ethers.parseUnits("10", 6);
    const secondAmount = ethers.parseUnits("20", 6);

    await faucet.configureToken(mockToken.target, firstAmount, true);
    await faucet.configureToken(mockToken.target, secondAmount, false);

    const supportedTokens = await faucet.getSupportedTokens();
    expect(supportedTokens.length).to.equal(1);
    expect(supportedTokens[0]).to.equal(mockToken.target);

    const config = await faucet.tokenConfigs(mockToken.target);
    expect(config.claimAmount).to.equal(secondAmount);
    expect(config.enabled).to.equal(false);
  });

  it("allows the owner to disable a configured token", async function () {
    const { faucet, mockToken } = await deployFixture();

    const claimAmount = ethers.parseUnits("10", 6);

    await faucet.configureToken(mockToken.target, claimAmount, true);
    await faucet.disableToken(mockToken.target);

    const config = await faucet.tokenConfigs(mockToken.target);
    expect(config.enabled).to.equal(false);
  });

  it("allows a user to claim a supported enabled token", async function () {
    const { faucet, mockToken, owner, user } = await deployFixture();

    const claimAmount = ethers.parseUnits("10", 6);

    await faucet.configureToken(mockToken.target, claimAmount, true);

    await mockToken.connect(owner).transfer(faucet.target, claimAmount);

    await faucet.connect(user).claim(mockToken.target);

    expect(await mockToken.balanceOf(user.address)).to.equal(claimAmount);
    expect(await faucet.hasClaimed(user.address, mockToken.target)).to.equal(true);
  });

  it("does not allow a user to claim the same token twice", async function () {
    const { faucet, mockToken, owner, user } = await deployFixture();

    const claimAmount = ethers.parseUnits("10", 6);

    await faucet.configureToken(mockToken.target, claimAmount, true);
    await mockToken.connect(owner).transfer(faucet.target, claimAmount * BigInt(2));
    await faucet.connect(user).claim(mockToken.target);

    await expect(
      faucet.connect(user).claim(mockToken.target)
    ).to.be.reverted;
  });

  it("does not allow claiming an unsupported token", async function () {
    const { faucet, mockToken, user } = await deployFixture();

    await expect(
      faucet.connect(user).claim(mockToken.target)
    ).to.be.reverted;
  });

  it("does not allow claiming a disabled token", async function () {
    const { faucet, mockToken, owner, user } = await deployFixture();

    const claimAmount = ethers.parseUnits("10", 6);

    await faucet.configureToken(mockToken.target, claimAmount, false);
    await mockToken.connect(owner).transfer(faucet.target, claimAmount);

    await expect(
      faucet.connect(user).claim(mockToken.target)
    ).to.be.reverted;
  });

  it("does not allow claiming when faucet balance is too low", async function () {
    const { faucet, mockToken, owner, user } = await deployFixture();

    const claimAmount = ethers.parseUnits("10", 6);
    const shortBalance = ethers.parseUnits("5", 6);

    await faucet.configureToken(mockToken.target, claimAmount, true);
    await mockToken.connect(owner).transfer(faucet.target, shortBalance);

    await expect(
      faucet.connect(user).claim(mockToken.target)
    ).to.be.reverted;
  });

  it("returns true from canClaim only when claim conditions are satisfied", async function () {
    const { faucet, mockToken, owner, user } = await deployFixture();

    const claimAmount = ethers.parseUnits("10", 6);

    await faucet.configureToken(mockToken.target, claimAmount, true);

    expect(await faucet.canClaim(user.address, mockToken.target)).to.equal(false);

    await mockToken.connect(owner).transfer(faucet.target, claimAmount);

    expect(await faucet.canClaim(user.address, mockToken.target)).to.equal(true);

    await faucet.connect(user).claim(mockToken.target);

    expect(await faucet.canClaim(user.address, mockToken.target)).to.equal(false);
  });

  it("allows the owner to withdraw token balances", async function () {
    const { faucet, mockToken, owner, other } = await deployFixture();

    const amount = ethers.parseUnits("25", 6);

    await mockToken.connect(owner).transfer(faucet.target, amount);
    await faucet.withdrawToken(mockToken.target, other.address, amount);

    expect(await mockToken.balanceOf(other.address)).to.equal(amount);
  });

  it("does not allow a non-owner to withdraw token balances", async function () {
    const { faucet, mockToken, owner, user, other } = await deployFixture();

    const amount = ethers.parseUnits("25", 6);

    await mockToken.connect(owner).transfer(faucet.target, amount);

    await expect(
      faucet.connect(user).withdrawToken(mockToken.target, other.address, amount)
    ).to.be.reverted;
  });
});
