const hre = require("hardhat");

async function main() {
    console.log("Funding test accounts...");

    const [deployer, account1, account2] = await hre.ethers.getSigners();
    const amount = hre.ethers.utils.parseUnits("10000", 18); // 10,000 USDT

    // Get MockUSDT Contract
    const usdtAddress = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512"; // Deployed Address
    const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
    const usdt = MockUSDT.attach(usdtAddress);

    // Fund Account #1
    let tx = await usdt.connect(deployer).transfer(account1.address, amount);
    await tx.wait();
    console.log(`Funded Account #1 (${account1.address}) with 10,000 USDT`);

    // Fund Account #2
    tx = await usdt.connect(deployer).transfer(account2.address, amount);
    await tx.wait();
    console.log(`Funded Account #2 (${account2.address}) with 10,000 USDT`);

    // Check Balances
    const bal1 = await usdt.balanceOf(account1.address);
    const bal2 = await usdt.balanceOf(account2.address);

    console.log("\nFinal Balances:");
    console.log("Account #1:", hre.ethers.utils.formatUnits(bal1, 18), "USDT");
    console.log("Account #2:", hre.ethers.utils.formatUnits(bal2, 18), "USDT");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
