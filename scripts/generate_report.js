const hre = require("hardhat");

async function main() {
    console.log("Generating Post-Test Report...\n");

    // --- Configuration ---
    // Addresses from previous deployment (Step 474)
    const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const usdtAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const presaleAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

    const [deployer, account1, account2] = await hre.ethers.getSigners();
    const accounts = [
        { name: "Deployer", address: deployer.address },
        { name: "Account #1", address: account1.address },
        { name: "Account #2", address: account2.address }
    ];

    // --- Attach Contracts ---
    const Token = await hre.ethers.getContractFactory("NuerallyToken");
    const token = Token.attach(tokenAddress);

    const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
    const usdt = MockUSDT.attach(usdtAddress);

    const Presale = await hre.ethers.getContractFactory("NuerallyPresale");
    const presale = Presale.attach(presaleAddress);

    // --- 1. Contract Addresses (Token Hashes) ---
    console.log("=== Contract Addresses ===");
    console.log(`Nuerally Token: ${tokenAddress}`);
    console.log(`Mock USDT:      ${usdtAddress}`);
    console.log(`Presale:        ${presaleAddress}`);
    console.log("");

    // --- 2. Account Balances ---
    console.log("=== Account Balances ===");
    console.log(pad("Account", 15) + pad("ETH", 15) + pad("USDT", 15) + pad("NUERALLY", 15));
    console.log("-".repeat(60));

    for (const acc of accounts) {
        const ethBal = await hre.ethers.provider.getBalance(acc.address);
        const usdtBal = await usdt.balanceOf(acc.address);
        const tokenBal = await token.balanceOf(acc.address);

        // Also check "Purchased" balance in Presale (Allocated but not claimed)
        const purchased = await presale.purchasedTokens(acc.address);

        console.log(
            pad(acc.name, 15) +
            pad(Number(hre.ethers.utils.formatEther(ethBal)).toFixed(4), 15) +
            pad(Number(hre.ethers.utils.formatEther(usdtBal)).toFixed(1), 15) +
            pad(Number(hre.ethers.utils.formatEther(tokenBal)).toFixed(1), 15)
        );
        if (purchased.gt(0)) {
            console.log(pad("", 15) + `(Purchased/Unclaimed: ${hre.ethers.utils.formatEther(purchased)} NUERALLY)`);
        }
    }
    console.log("");

    // --- 3. Transaction History (Purchases) ---
    console.log("=== Purchase History (TokensPurchased Events) ===");
    // Filter: TokensPurchased(address indexed buyer, uint256 amount, uint256 cost, string currency)
    const filter = presale.filters.TokensPurchased();
    const events = await presale.queryFilter(filter);

    if (events.length === 0) {
        console.log("No purchases found yet.");
    } else {
        console.log(pad("Buyer", 15) + pad("Amount", 20) + pad("Currency", 10) + "Tx Hash");
        console.log("-".repeat(80));

        for (const event of events) {
            const { buyer, amount, currency } = event.args;
            const buyerName = accounts.find(a => a.address === buyer)?.name || "Unknown";

            console.log(
                pad(buyerName !== "Unknown" ? buyerName : buyer.substring(0, 8) + "...", 15) +
                pad(Number(hre.ethers.utils.formatEther(amount)).toFixed(2), 20) +
                pad(currency, 10) +
                event.transactionHash
            );
        }
    }
    console.log("");
}

function pad(str, len) {
    return str.toString().padEnd(len);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
