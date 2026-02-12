const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy Token
    const Token = await hre.ethers.getContractFactory("NuerallyToken");
    const token = await Token.deploy(deployer.address);
    await token.deployed();
    console.log("NuerallyToken deployed to:", token.address);

    // 2. Deploy Presale
    let usdtAddress;
    // Check Network
    const network = hre.network.name;
    if (network === "localhost" || network === "hardhat") {
        console.log("Local Network detected. Deploying MockUSDT...");
        const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
        const usdt = await MockUSDT.deploy();
        await usdt.deployed();
        console.log("MockUSDT deployed to:", usdt.address);

        // 2a. Deploy Mock Oracle
        const MockAggregator = await hre.ethers.getContractFactory("MockAggregator");
        // 8 decimals, Initial Price $600 (600 * 10^8)
        const mockOracle = await MockAggregator.deploy(8, 60000000000);
        await mockOracle.deployed();
        console.log("MockOracle deployed to:", mockOracle.address);

        // 2b. Deploy Presale (Now calls Oracle)
        const Presale = await hre.ethers.getContractFactory("NuerallyPresale");
        // Params: Token, USDT, Owner, MarketingWallet, Oracle
        const presale = await Presale.deploy(token.address, usdt.address, deployer.address, deployer.address, mockOracle.address);
        await presale.deployed();
        console.log("NuerallyPresale deployed to:", presale.address);

        // Appprove Presale for marketing wallet
        const approveTx = await token.approve(presale.address, hre.ethers.utils.parseUnits("1000000000", 18));
        await approveTx.wait();
        console.log("Approval Complete.");

        // 3. Deploy OLD Staking (Optional, maybe keep for backwards compat or ignore)
        // const Staking = await hre.ethers.getContractFactory("NuerallyStaking");
        // const staking = await Staking.deploy(token.address, deployer.address);
        // await staking.deployed();
        // console.log("NuerallyStaking deployed to:", staking.address);

        // 4. Deploy REAL YIELD Staking
        const RealYield = await hre.ethers.getContractFactory("RevenueSharingStaking");
        const realYield = await RealYield.deploy(token.address, usdt.address, deployer.address);
        await realYield.deployed();
        console.log("RevenueSharingStaking deployed to:", realYield.address);

        // 5. Deploy Vesting
        const Vesting = await hre.ethers.getContractFactory("NuerallyVesting");
        const blockNum = await hre.ethers.provider.getBlockNumber();
        const block = await hre.ethers.provider.getBlock(blockNum);
        const launchTime = block.timestamp + 60; // 1 min from now
        const vesting = await Vesting.deploy(deployer.address, launchTime, 0, 31536000, deployer.address); // Self vesting logic demo
        await vesting.deployed();
        console.log("NuerallyVesting (Team) deployed to:", vesting.address);

        // 6. Whitelist Presale & Staking in Token (Exclude from limits)
        console.log("Excluding contracts from Anti-Snipe limits...");
        await token.excludeFromLimits(presale.address, true);
        await token.excludeFromLimits(realYield.address, true);
        await token.excludeFromLimits(vesting.address, true);
        // Owner is already excluded in constructor

        // 7. Enable Trading (Optional, usually manual step, but for dev we might want it on?)
        // Let's leave it OFF by default to simulating "Launch Phase". 
        // console.log("Enabling Trading...");
        // await token.enableTrading();

        console.log("\n--- NEXT STEPS ---");
        console.log("1. Send 3.5B Tokens to Presale:", presale.address);
        console.log("2. Send 2.0B Tokens to Staking:", realYield.address); // Updated to realYield
        console.log("3. Send 1.5B Tokens to Vesting:", vesting.address);
        console.log("4. Update 'presale.js' with the new Presale Address.");

    } else {
        // This block remains largely the same, but needs to be updated to reflect the new Presale parameters
        // and the absence of a mock oracle for mainnet.
        // For mainnet, usdtAddress is fixed, and an oracle address would be passed.
        // This part of the script would need a real oracle address for mainnet deployment.
        // For now, we'll keep the original structure for the else block, assuming the user will update it for mainnet.
        let usdtAddress = "0x337610d27c682E347C9cD60BD4b3b107C9d343DD"; // BSC Testnet USDT
        let oracleAddress = "0x... (Mainnet Oracle Address)"; // Placeholder for a real oracle

        const Presale = await hre.ethers.getContractFactory("NuerallyPresale");
        // Pass deployer as Marketing Wallet for now
        // For mainnet, you'd pass a real oracle address here
        const presale = await Presale.deploy(token.address, usdtAddress, deployer.address, deployer.address, oracleAddress);
        await presale.deployed();
        console.log("NuerallyPresale deployed to:", presale.address);

        // APPROVE Presale to spend Marketing Wallet tokens for referrals
        console.log("Approving Presale to spend Marketing Wallet tokens (1 Billion Allowance)...");
        const approveTx = await token.approve(presale.address, hre.ethers.utils.parseUnits("1000000000", 18));
        await approveTx.wait();
        console.log("Approval Complete.");

        // 3. Deploy Staking (Original Staking for mainnet, or update to RealYield)
        const Staking = await hre.ethers.getContractFactory("NuerallyStaking");
        const staking = await Staking.deploy(token.address, deployer.address);
        await staking.deployed();
        console.log("NuerallyStaking deployed to:", staking.address);

        // 4. Deploy Vesting (Team)
        // Config: Start = Now, Cliff = 180 days, Duration = 365 days
        const now = Math.floor(Date.now() / 1000);
        const cliff = 180 * 24 * 60 * 60;
        const duration = 365 * 24 * 60 * 60;

        const Vesting = await hre.ethers.getContractFactory("NuerallyVesting");
        const vesting = await Vesting.deploy(deployer.address, now, cliff, duration, deployer.address);
        await vesting.deployed();
        console.log("NuerallyVesting (Team) deployed to:", vesting.address);

        console.log("\n--- NEXT STEPS ---");
        console.log("1. Send 3.5B Tokens to Presale:", presale.address);
        console.log("2. Send 2.0B Tokens to Staking:", staking.address);
        console.log("3. Send 1.5B Tokens to Vesting:", vesting.address);
        console.log("4. Update 'presale.js' with the new Presale Address.");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
