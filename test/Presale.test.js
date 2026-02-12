const { ethers } = require("hardhat");
const assert = require("assert");

describe("Nuerally Presale", function () {
    let Token, token, Presale, presale, MockUSDT, usdt;
    let owner, addr1, addr2, referrer;

    beforeEach(async function () {
        [owner, addr1, addr2, referrer] = await ethers.getSigners();

        // Deploy Token
        Token = await ethers.getContractFactory("NuerallyToken");
        token = await Token.deploy(owner.address);
        await token.deployed();

        // Deploy MockUSDT
        MockUSDT = await ethers.getContractFactory("MockUSDT");
        usdt = await MockUSDT.deploy();
        await usdt.deployed();

        // Deploy Presale
        // Use owner as marketing wallet
        Presale = await ethers.getContractFactory("NuerallyPresale");
        presale = await Presale.deploy(token.address, usdt.address, owner.address, owner.address);
        await presale.deployed();

        // FUND MARKETING WALLET (Owner) - Approves Presale
        // Owner already has 10B tokens. Just approve.
        await token.approve(presale.address, ethers.utils.parseUnits("1000000000", 18));

        // Fund Presale (Only for regular token sales, not referrals now)
        await token.transfer(presale.address, ethers.utils.parseUnits("3500000000", 18)); // 3.5B

        // Fund Users with USDT
        await usdt.transfer(addr1.address, ethers.utils.parseUnits("1000", 18));
        await usdt.transfer(addr2.address, ethers.utils.parseUnits("1000", 18));
    });

    it("Should have correct initial stage", async function () {
        const stage = await presale.currentStage();
        const price = await presale.getCurrentPrice();

        assert.equal(stage.toString(), "0");
        assert.equal(price.toString(), ethers.utils.parseUnits("0.00012", 18).toString());
    });

    it("Should allow buying with BNB", async function () {
        // 1 BNB = $600 (Simulated)
        // Price = $0.00012
        // Tokens = 600 / 0.00012 = 5,000,000
        const bnbAmount = ethers.utils.parseEther("1");

        await presale.connect(addr1).buyWithBNB(ethers.constants.AddressZero, { value: bnbAmount });

        const bought = await presale.purchasedTokens(addr1.address);
        const expected = ethers.utils.parseUnits("5000000", 18);

        // Check if close enough (sometimes precision issues, but here numbers are clean)
        assert.equal(bought.toString(), expected.toString());
    });

    it("Should allow buying with USDT", async function () {
        const usdtAmount = ethers.utils.parseUnits("100", 18); // $100

        // Approve
        await usdt.connect(addr1).approve(presale.address, usdtAmount);

        // Buy
        await presale.connect(addr1).buyWithUSDT(usdtAmount, ethers.constants.AddressZero);

        const bought = await presale.purchasedTokens(addr1.address);

        // $100 / $0.00012 = 833,333.333333333333333333
        // We check purely specifically
        // 100 * 1e18 * 1e18 / 120000000000000
        // = 833333333333333333333333 

        const expected = ethers.BigNumber.from("833333333333333333333333");

        // Allow small delta for rounding if any logic changed, but std integer math should match
        // Let's use string comparison or closeTo logic if we had bignumber lib, but here direct default
        const diff = bought.sub(expected).abs();
        assert.ok(diff.lt(100), "Bought amount mismatch");
    });

    it("Should process referrals correctly", async function () {
        const bnbAmount = ethers.utils.parseEther("1"); // 5M Tokens

        await presale.connect(addr1).buyWithBNB(referrer.address, { value: bnbAmount });

        // 10% Referral Reward = 500,000 Tokens
        const referralReward = await presale.referralEarnings(referrer.address);
        const expected = ethers.utils.parseUnits("500000", 18);

        assert.equal(referralReward.toString(), expected.toString());
    });

    it("Should pay referral rewards from Marketing Wallet", async function () {
        // 1. Setup Referral
        const bnbAmount = ethers.utils.parseEther("1");
        await presale.connect(addr1).buyWithBNB(referrer.address, { value: bnbAmount });

        // 2. Enable Claiming
        await presale.enableClaiming();
        // Set Launch Time to past (to bypass 30 day lock for test, or we simulate time travel)
        // Actually, we need to mock time or update contract to allow immediate claim for test
        // START EDIT: Let's mock time travel
        await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]); // 30 days + 1 sec
        await ethers.provider.send("evm_mine");

        // 3. Mark Launch Time (needs to be set)
        const blockNum = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNum);
        await presale.setLaunchTime(block.timestamp - (31 * 24 * 60 * 60)); // Set launch 31 days ago

        // 4. Check Initial Marketing Wallet Balance
        const initialMarketingBal = await token.balanceOf(owner.address); // owner is marketing wallet

        // 5. Claim Rewards
        await presale.connect(referrer).claimReferralRewards();

        // 6. Check Final Balance
        const finalMarketingBal = await token.balanceOf(owner.address);
        const expectedDeduction = ethers.utils.parseUnits("500000", 18); // 10% of 5M

        // tolerance for gas? No, token transfer is exact.
        // Wait, owner also pays gas if they txn, but here 'referrer' txns. 
        // Owner balance only changes by token transfer.

        // Note: owner mints 10B. 
        // transferred 3.5B to presale.
        // Balance = 6.5B.
        // Deduction = 500,000.

        const diff = initialMarketingBal.sub(finalMarketingBal);
        assert.equal(diff.toString(), expectedDeduction.toString(), "Marketing wallet should decrease by reward amount");
    });

});
