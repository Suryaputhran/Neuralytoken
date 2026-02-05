const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy Token
    const Token = await hre.ethers.getContractFactory("NeuralyToken");
    const token = await Token.deploy(deployer.address);
    await token.deployed();
    console.log("NeuralyToken deployed to:", token.address);

    // 2. Deploy Presale
    let usdtAddress;

    // Check Network
    const network = hre.network.name;
    if (network === "localhost" || network === "hardhat") {
        console.log("Local Network detected. Deploying MockUSDT...");
        const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
        const mockUsdt = await MockUSDT.deploy();
        await mockUsdt.deployed();
        usdtAddress = mockUsdt.address;
        console.log("MockUSDT deployed to:", usdtAddress);
    } else {
        usdtAddress = "0x337610d27c682E347C9cD60BD4b3b107C9d343DD"; // BSC Testnet USDT
    }

    const Presale = await hre.ethers.getContractFactory("NeuralyPresale");
    const presale = await Presale.deploy(token.address, usdtAddress, deployer.address);
    await presale.deployed();
    console.log("NeuralyPresale deployed to:", presale.address);

    // 3. Deploy Staking
    const Staking = await hre.ethers.getContractFactory("NeuralyStaking");
    const staking = await Staking.deploy(token.address, deployer.address);
    await staking.deployed();
    console.log("NeuralyStaking deployed to:", staking.address);

    // 4. Deploy Vesting (Team)
    // Config: Start = Now, Cliff = 180 days, Duration = 365 days
    const now = Math.floor(Date.now() / 1000);
    const cliff = 180 * 24 * 60 * 60;
    const duration = 365 * 24 * 60 * 60;

    const Vesting = await hre.ethers.getContractFactory("NeuralyVesting");
    const vesting = await Vesting.deploy(deployer.address, now, cliff, duration, deployer.address);
    await vesting.deployed();
    console.log("NeuralyVesting (Team) deployed to:", vesting.address);

    console.log("\n--- NEXT STEPS ---");
    console.log("1. Send 3.5B Tokens to Presale:", presale.address);
    console.log("2. Send 2.0B Tokens to Staking:", staking.address);
    console.log("3. Send 1.5B Tokens to Vesting:", vesting.address);
    console.log("4. Update 'presale.js' with the new Presale Address.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
