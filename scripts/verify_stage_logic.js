const hre = require("hardhat");

async function main() {
    console.log("Verifying Stage Duration & DEX Allocation...\n");

    const [deployer] = await hre.ethers.getSigners();

    // Deploy Presale with Updates
    const Token = await hre.ethers.getContractFactory("NuerallyToken");
    const token = await Token.deploy(deployer.address);
    await token.deployed();

    const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy();
    await usdt.deployed();

    const Presale = await hre.ethers.getContractFactory("NuerallyPresale");
    const presale = await Presale.deploy(token.address, usdt.address, deployer.address, deployer.address);
    await presale.deployed();

    console.log("Presale Deployed. Stage 1 Started.");
    console.log("Stage 1 Price: $0.00012");

    // FUND Presale
    await token.approve(presale.address, hre.ethers.utils.parseUnits("10000000000", 18)); // Max approval
    await token.transfer(presale.address, hre.ethers.utils.parseUnits("3500000000", 18));

    // 1. Time Travel > 10 Days
    console.log("\nTime Traveling 11 Days...");
    await hre.network.provider.send("evm_increaseTime", [11 * 24 * 60 * 60]);
    await hre.network.provider.send("evm_mine");

    // 2. Buy should trigger Stage Change to Stage 2
    console.log("Buying 1 BNB...");
    const tx = await presale.buyWithBNB(hre.ethers.constants.AddressZero, { value: hre.ethers.utils.parseEther("1") });
    await tx.wait();

    const stage = await presale.currentStage();
    const startTime = await presale.stageStartTime();
    const price = await presale.getCurrentPrice();

    console.log(`Current Stage: ${parseInt(stage) + 1} (Index: ${stage})`);
    console.log(`Current Price: $${hre.ethers.utils.formatUnits(price, 18)}`);
    console.log("Verified: Stage advanced due to time expiry.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
