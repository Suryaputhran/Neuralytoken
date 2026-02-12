const hre = require("hardhat");

async function main() {
    console.log("Checking Price and Stage...\n");

    const presaleAddress = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318"; // Deployed Address
    const Presale = await hre.ethers.getContractFactory("NuerallyPresale");
    const presale = Presale.attach(presaleAddress);

    // Fetch Data
    const currentStageIndex = await presale.currentStage();
    const currentPriceWei = await presale.getCurrentPrice();

    // Format
    // Stage is 0-indexed in contract, usually displayed as Stage 1 to users
    const displayStage = currentStageIndex.add(1);
    const priceUSD = hre.ethers.utils.formatUnits(currentPriceWei, 18);

    console.log(`Current Stage: ${displayStage} (Index: ${currentStageIndex})`);
    console.log(`Current Price: $${priceUSD} per NUERALLY`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
