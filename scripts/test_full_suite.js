const hre = require("hardhat");

async function main() {
    console.log("=== STARTING FULL CONTRACT TEST SUITE ===\n");

    const [deployer, user, marketing] = await hre.ethers.getSigners();
    console.log(`Test User: ${user.address}`);
    console.log(`Deployer:  ${deployer.address}\n`);

    // 1. DEPLOYMENT
    console.log("--- 1. DEPLOYMENT ---");
    const Token = await hre.ethers.getContractFactory("NuerallyToken");
    const token = await Token.deploy(deployer.address);
    await token.deployed();
    console.log(`Token Deployed:   ${token.address} (Tx: ${token.deployTransaction.hash})`);

    const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy();
    await usdt.deployed();
    console.log(`USDT Deployed:    ${usdt.address} (Tx: ${usdt.deployTransaction.hash})`);

    // ORACLE
    const MockAggregator = await hre.ethers.getContractFactory("MockAggregator");
    const mockOracle = await MockAggregator.deploy(8, 60000000000); // $600
    await mockOracle.deployed();

    const Presale = await hre.ethers.getContractFactory("NuerallyPresale");
    // Deployer is owner, Marketing wallet is 'marketing' signer
    const presale = await Presale.deploy(token.address, usdt.address, deployer.address, marketing.address, mockOracle.address);
    await presale.deployed();
    console.log(`Presale Deployed: ${presale.address} (Tx: ${presale.deployTransaction.hash})`);

    // REAL YIELD STAKING
    const Staking = await hre.ethers.getContractFactory("RevenueSharingStaking");
    const staking = await Staking.deploy(token.address, usdt.address, deployer.address);
    await staking.deployed();
    console.log(`Staking Deployed: ${staking.address} (Tx: ${staking.deployTransaction.hash})`);

    // EXCLUDE FROM LIMITS
    await token.excludeFromLimits(presale.address, true);
    await token.excludeFromLimits(staking.address, true);

    // Enable Trading for test to avoid issues (optional)
    await token.enableTrading();

    const Vesting = await hre.ethers.getContractFactory("NuerallyVesting");
    const blockNum = await hre.ethers.provider.getBlockNumber();
    const block = await hre.ethers.provider.getBlock(blockNum);
    const launchTime = block.timestamp + 60; // Launch in 1 minute
    // Vesting: Beneficiary=User, Start=Launch, Cliff=30d, Duration=1y
    const vesting = await Vesting.deploy(user.address, launchTime, 30 * 24 * 60 * 60, 365 * 24 * 60 * 60, deployer.address);
    await vesting.deployed();
    console.log(`Vesting Deployed: ${vesting.address} (Tx: ${vesting.deployTransaction.hash})`);

    // Fund Presale & Staking logic would go here, skipping for brevity of just testing user buys
    // BUT we need to fund Presale for it to give verify? Actually Presale tracks `purchasedTokens` mapping, 
    // it doesn't strictly need balance to *record* the buy, only to *claim*.
    // We will assume "Buy" success is recording the state.

    // 2. FUND USER WITH USDT
    console.log("\n--- 2. FUNDING USER ---");
    await usdt.transfer(user.address, hre.ethers.utils.parseUnits("100", 18));
    console.log("User funded with 100 USDT");

    // 3. PURCHASE 10 USDT
    console.log("\n--- 3. TESTING 10 USDT PURCHASE ---");
    const usdtAmount = hre.ethers.utils.parseUnits("10", 18);

    // Approve
    const approveTx = await usdt.connect(user).approve(presale.address, usdtAmount);
    await approveTx.wait();
    console.log(`Approval Tx: ${approveTx.hash}`);

    // Buy
    const buyUsdtTx = await presale.connect(user).buyWithUSDT(usdtAmount, hre.ethers.constants.AddressZero);
    const rxUsdt = await buyUsdtTx.wait();
    console.log(`Purchase Tx: ${buyUsdtTx.hash}`);

    // Verify
    const boughtUsdt = await presale.purchasedTokens(user.address);
    console.log(`Tokens Purchased (USDT): ${hre.ethers.utils.formatUnits(boughtUsdt, 18)} NUERALLY`);

    // 4. PURCHASE BNB EQUIVALENT TO 10 USDT
    console.log("\n--- 4. TESTING BNB PURCHASE (~$10) ---");
    // Contract hardcoded rate: 1 BNB = $600
    // $10 / $600 = 0.01666...
    // We send 0.017 BNB (~$10.20) to ensure we pass the strict $10 MIN_BUY check (avoiding precision errors)
    const bnbAmount = hre.ethers.utils.parseEther("0.017");

    console.log(`Sending ${hre.ethers.utils.formatEther(bnbAmount)} BNB ($10.20 value)...`);

    const buyBnbTx = await presale.connect(user).buyWithBNB(hre.ethers.constants.AddressZero, { value: bnbAmount });
    await buyBnbTx.wait();
    console.log(`Purchase Tx: ${buyBnbTx.hash}`);

    // Verify Total
    const totalBought = await presale.purchasedTokens(user.address);
    console.log(`Total Tokens Purchased:  ${hre.ethers.utils.formatUnits(totalBought, 18)} NUERALLY`);

    // 5. STAKING TEST (Basic)
    console.log("\n--- 5. TESTING STAKING ---");
    // User needs tokens to stake. Since claim is locked, we'll mint/transfer some to user purely for testing staking contract
    await token.transfer(user.address, hre.ethers.utils.parseUnits("1000", 18));

    // Approve Staking
    await token.connect(user).approve(staking.address, hre.ethers.utils.parseUnits("1000", 18));

    // Stake
    const stakeTx = await staking.connect(user).stake(hre.ethers.utils.parseUnits("1000", 18));
    await stakeTx.wait();
    console.log(`Stake Tx:    ${stakeTx.hash}`);

    const staked = await staking.stakes(user.address);
    console.log(`Staked Amount: ${hre.ethers.utils.formatUnits(staked.amount, 18)} NUERALLY`);

    // 6. VESTING TEST (Basic)
    console.log("\n--- 6. TESTING VESTING ---");
    const vestable = await vesting.vestedAmount(token.address, block.timestamp);
    console.log(`Vested Amount (Now): ${vestable.toString()} (Should be 0 due to 30d cliff)`);

    console.log("\n=== TEST SUITE COMPLETE ===");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
