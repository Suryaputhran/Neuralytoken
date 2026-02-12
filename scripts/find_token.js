const hre = require("hardhat");

async function main() {
    // Presale Address from presale.js
    const presaleAddress = "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0";

    const Presale = await hre.ethers.getContractFactory("NuerallyPresale");
    const presale = Presale.attach(presaleAddress);

    const tokenAddress = await presale.token();
    console.log("Token Address found:", tokenAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
