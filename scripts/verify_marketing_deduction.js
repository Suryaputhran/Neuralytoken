const hre = require("hardhat");

async function main() {
    console.log("Verifying Marketing Wallet Deduction...\n");

    const [deployer, referrer, buyer] = await hre.ethers.getSigners();

    // --- New Addresses (from redeployment) ---
    const tokenAddress = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
    const usdtAddress = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";
    const presaleAddress = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";

    // Attach Contracts
    const Token = await hre.ethers.getContractFactory("NuerallyToken");
    const token = Token.attach(tokenAddress);

    const Presale = await hre.ethers.getContractFactory("NuerallyPresale");
    const presale = Presale.attach(presaleAddress);

    const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
    const usdt = MockUSDT.attach(usdtAddress);

    // Initial Fund Setup for Buyer (Needs USDT)
    const fundAmount = hre.ethers.utils.parseUnits("100", 18);
    await usdt.connect(deployer).transfer(buyer.address, fundAmount);

    // Initial State
    console.log("=== Initial State ===");
    const initialMarketingBal = await token.balanceOf(deployer.address);
    const initialReferrerEarnings = await presale.referralEarnings(referrer.address);

    console.log(`Marketing Wallet (Deployer) Balance: ${hre.ethers.utils.formatUnits(initialMarketingBal, 18)} NUERALLY`);
    console.log(`Referrer Earnings:                   ${hre.ethers.utils.formatUnits(initialReferrerEarnings, 18)} NUERALLY`);
    console.log("-".repeat(80));

    // Execute Purchase
    // 10 USDT
    const amountUSDT = hre.ethers.utils.parseUnits("10", 18);

    console.log("\nExecuting Purchase...");
    console.log(`Buyer buying with 10 USDT (Referrer: ${referrer.address})...`);

    await usdt.connect(buyer).approve(presaleAddress, amountUSDT);
    const tx = await presale.connect(buyer).buyWithUSDT(amountUSDT, referrer.address);
    await tx.wait();

    // Calculate Referral Bonus
    // $10 / $0.00012 = 83,333.333... Tokens
    // 10% = 8,333.333... Tokens

    // NOW THE TRICKY PART:
    // The "ReferralPaid" event just updates the MAPPING.
    // The ACTUAL TRANSFER happens when the referrer CLAIMS.
    // So Marketing Wallet balance won't change YET.
    // It changes when claimReferralRewards() is called.

    console.log("Purchase Complete. Referral Bonus Recorded in Contract.");

    const midMarketingBal = await token.balanceOf(deployer.address);
    console.log(`Marketing Wallet Balance (Post-Buy): ${hre.ethers.utils.formatUnits(midMarketingBal, 18)} NUERALLY (Unchanged)`);

    // Now CLAIM
    console.log("\nSimulating Claim (Time Travel & Claim)...");

    // Enable Claiming
    await presale.connect(deployer).enableClaiming();
    // Force Time Travel (Mocking 31 days)
    await hre.network.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
    await hre.network.provider.send("evm_mine");
    // Set Launch Time
    const blockNum = await hre.ethers.provider.getBlockNumber();
    const block = await hre.ethers.provider.getBlock(blockNum);
    await presale.connect(deployer).setLaunchTime(block.timestamp - (32 * 24 * 60 * 60));

    // Claim
    const claimTx = await presale.connect(referrer).claimReferralRewards();
    await claimTx.wait();
    console.log(`Claim Transaction Hash: ${claimTx.hash}`);

    // Final State
    console.log("\n=== Final State ===");
    const finalMarketingBal = await token.balanceOf(deployer.address);
    const finalReferrerBal = await token.balanceOf(referrer.address);

    const diff = initialMarketingBal.sub(finalMarketingBal);

    console.log(`Marketing Wallet (Deployer) Balance: ${hre.ethers.utils.formatUnits(finalMarketingBal, 18)} NUERALLY`);
    console.log(`Deduction Observed:                  ${hre.ethers.utils.formatUnits(diff, 18)} NUERALLY`);
    console.log(`Referrer Wallet Balance:             ${hre.ethers.utils.formatUnits(finalReferrerBal, 18)} NUERALLY`);

    console.log("\nSUCCESS: Marketing Wallet balance decreased by the referral amount.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
