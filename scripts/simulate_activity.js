const hre = require("hardhat");

async function main() {
    console.log("Simulating Activity on Localhost...\n");

    const [deployer, account1] = await hre.ethers.getSigners();

    // Addresses
    const usdtAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const presaleAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

    // Attach
    const Presale = await hre.ethers.getContractFactory("NuerallyPresale");
    const presale = Presale.attach(presaleAddress);

    const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
    const usdt = MockUSDT.attach(usdtAddress);

    // 1. Buy with BNB (Account 1)
    console.log("1. Account #1 buying with 1 BNB...");
    let tx = await presale.connect(account1).buyWithBNB(hre.ethers.constants.AddressZero, { value: hre.ethers.utils.parseEther("1.0") });
    await tx.wait();
    console.log("   -> Tx Hash:", tx.hash);

    // 2. Buy with USDT (Account 1)
    console.log("2. Account #1 buying with 100 USDT...");
    const amount = hre.ethers.utils.parseUnits("100", 18);

    // Approve
    tx = await usdt.connect(account1).approve(presaleAddress, amount);
    await tx.wait();

    // Buy
    tx = await presale.connect(account1).buyWithUSDT(amount, hre.ethers.constants.AddressZero);
    await tx.wait();
    console.log("   -> Tx Hash:", tx.hash);

    console.log("\nSimulation Complete.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
