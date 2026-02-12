const hre = require("hardhat");

async function main() {
    console.log("Simulating $10 Referral Purchase...\n");

    const [deployer, referrer, buyer] = await hre.ethers.getSigners();

    // Configuration
    const usdtAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const presaleAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

    // Attach Contracts
    const Presale = await hre.ethers.getContractFactory("NuerallyPresale");
    const presale = Presale.attach(presaleAddress);

    const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
    const usdt = MockUSDT.attach(usdtAddress);

    // Initial State
    console.log("=== Initial State ===");
    const initialBuyerUSDT = await usdt.balanceOf(buyer.address);
    const initialBuyerTokens = await presale.purchasedTokens(buyer.address);
    const initialReferrerEarnings = await presale.referralEarnings(referrer.address);

    console.log(`Buyer USDT:           ${hre.ethers.utils.formatUnits(initialBuyerUSDT, 18)}`);
    console.log(`Buyer Purchased:      ${hre.ethers.utils.formatUnits(initialBuyerTokens, 18)} NUERALLY`);
    console.log(`Referrer Earnings:    ${hre.ethers.utils.formatUnits(initialReferrerEarnings, 18)} NUERALLY`);
    console.log("-".repeat(50));

    // Execute Purchase
    // $10 USDT
    const amountUSDT = hre.ethers.utils.parseUnits("10", 18);

    console.log("\nExecuting Purchase...");
    console.log(`Buyer (${buyer.address}) approving 10 USDT...`);
    let tx = await usdt.connect(buyer).approve(presaleAddress, amountUSDT);
    await tx.wait();

    console.log(`Buyer buying with 10 USDT (Referrer: ${referrer.address})...`);
    tx = await presale.connect(buyer).buyWithUSDT(amountUSDT, referrer.address);
    const receipt = await tx.wait();
    console.log(`Transaction Hash:     ${tx.hash}`);

    // Find "TokensPurchased" event
    const event = receipt.events.find(e => e.event === "TokensPurchased");
    if (event) {
        console.log(`Tokens Bought:        ${hre.ethers.utils.formatUnits(event.args.amount, 18)} NUERALLY`);
    }

    // Final State
    console.log("\n=== Final State ===");
    const finalBuyerUSDT = await usdt.balanceOf(buyer.address);
    const finalBuyerTokens = await presale.purchasedTokens(buyer.address);
    const finalReferrerEarnings = await presale.referralEarnings(referrer.address);

    console.log(`Buyer USDT:           ${hre.ethers.utils.formatUnits(finalBuyerUSDT, 18)} (-10.0)`);
    console.log(`Buyer Purchased:      ${hre.ethers.utils.formatUnits(finalBuyerTokens, 18)} NUERALLY (+${hre.ethers.utils.formatUnits(finalBuyerTokens.sub(initialBuyerTokens), 18)})`);
    console.log(`Referrer Earnings:    ${hre.ethers.utils.formatUnits(finalReferrerEarnings, 18)} NUERALLY (+${hre.ethers.utils.formatUnits(finalReferrerEarnings.sub(initialReferrerEarnings), 18)})`);

    console.log("\nNote: Referral Rewards are stored in 'referralEarnings' mapping within the contract until claimed.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
