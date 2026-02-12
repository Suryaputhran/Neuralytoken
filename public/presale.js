// Presale Logic
const PRESALE_CONFIG = {
    hardcap: 500, // BNB
    raised: 154.5, // Mock initial value
    rates: {
        BNB: 20000000,   // 1 BNB = 20,000,000 NUERALLY
        USDT: 50000      // 1 USDT = 50,000 NUERALLY (Example Rate)
    },
    limits: {
        BNB: { min: 0.1, max: 10 },
        USDT: { min: 50, max: 5000 }
    }
};

// Web3 Config
// Web3 Config
const ENV = "TESTNET"; // Change to "MAINNET" for production

const VALID_CHAINS = {
    MAINNET: 56,   // BNB Smart Chain
    TESTNET: 97,   // BSC Testnet
    LOCAL: 1337    // Hardhat
};

const CONFIG = {
    MAINNET: {
        contractAddress: "0xREPLACE_WITH_MAINNET_ADDRESS",
        usdtAddress: "0x55d398326f99059fF775485246999027B3197955", // Binance-Peg BSC-USD
        chainId: 56,
        chainHex: "0x38",
        rpcUrl: "https://bsc-dataseed.binance.org/",
        blockExplorer: "https://bscscan.com"
    },
    TESTNET: {
        contractAddress: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318", // Keep local for now or update
        usdtAddress: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
        chainId: 1337, // Defaulting to Local for now to keep it working
        chainHex: "0x539",
        rpcUrl: "http://127.0.0.1:8545/",
        blockExplorer: "http://localhost"
    }
};

const WEB3_CONFIG = CONFIG[ENV];

// Shared ABIs
WEB3_CONFIG.abi = [
    "function buyWithBNB(address referrer) public payable",
    "function buyWithUSDT(uint256 amount, address referrer) public",
    "function getCurrentPrice() public view returns (uint256)",
    "function tokensSoldInCurrentStage() public view returns (uint256)",
    "function currentStage() public view returns (uint256)",
    "function totalRaisedBNB() public view returns (uint256)",
    "function getReferralPercent() public view returns (uint256)",
    "function STAGE_ALLOCATION() public view returns (uint256)"
];

WEB3_CONFIG.erc20Abi = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function balanceOf(address account) public view returns (uint256)"
];

let userAddress = null;
let currentCurrency = 'BNB'; // 'BNB' or 'USDT'
let currentReferrer = null;

// Parse URL for Referral (?ref=0x...)
const urlParams = new URLSearchParams(window.location.search);
const refParam = urlParams.get('ref');
if (refParam && refParam.startsWith('0x')) {
    currentReferrer = refParam;
    console.log("Referrer set to:", currentReferrer);
}

// DOM Elements
const presaleOverlay = document.getElementById('presaleOverlay');
const walletSelectionOverlay = document.getElementById('walletSelectionOverlay');
const connectBtn = document.getElementById('connectWalletBtn');
const mainConnectBtn = document.getElementById('presaleLink');
const closeModalBtn = document.getElementById('closeModal');
const closeWalletModalBtn = document.getElementById('closeWalletModal');
const buyBtn = document.getElementById('buyBtn');
const paymentInput = document.getElementById('paymentInput');
const payLabel = document.getElementById('payLabel');
const tokenOutput = document.getElementById('tokenOutput');
const progressBar = document.getElementById('progressBar');
const raisedDisplay = document.getElementById('raisedAmount');
// Note: exchangeRateDisplay logic might need updating if we fetch price dynamic, but staying simple for now

// Initialize
function initPresale() {
    // Note: We don't call updateProgress here immediately because we need data first
    fetchRawData();

    // Main Presale Modal Triggers
    if (mainConnectBtn) {
        mainConnectBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(presaleOverlay);
        });
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', () => closeModal(presaleOverlay));

    // Close on click outside
    if (presaleOverlay) {
        presaleOverlay.addEventListener('click', (e) => {
            if (e.target === presaleOverlay) closeModal(presaleOverlay);
        });
    }

    // Wallet Selection Triggers
    if (connectBtn) connectBtn.addEventListener('click', () => openModal(walletSelectionOverlay));
    if (closeWalletModalBtn) closeWalletModalBtn.addEventListener('click', () => closeModal(walletSelectionOverlay));
    if (walletSelectionOverlay) {
        walletSelectionOverlay.addEventListener('click', (e) => {
            if (e.target === walletSelectionOverlay) closeModal(walletSelectionOverlay);
        });
    }

    // Input calculation
    if (paymentInput) paymentInput.addEventListener('input', calculateTokens);

    // Initial button state
    if (buyBtn) buyBtn.addEventListener('click', handleBuy);

    // Add To Wallet Button
    const addToWalletBtn = document.getElementById('addToWalletBtn');
    if (addToWalletBtn) {
        addToWalletBtn.addEventListener('click', addTokenToWallet);
    }

    // Set initial Label
    updateCurrencyUI();

    // Auto-refresh data every 10s
    setInterval(fetchRawData, 10000);
}

async function fetchRawData() {
    try {
        const provider = new ethers.providers.JsonRpcProvider(WEB3_CONFIG.rpcUrl);
        const contract = new ethers.Contract(WEB3_CONFIG.contractAddress, WEB3_CONFIG.abi, provider);

        // Fetch Data in bulk
        const [stageIndex, tokensSold, allocation, priceWei] = await Promise.all([
            contract.currentStage(),
            contract.tokensSoldInCurrentStage(),
            contract.STAGE_ALLOCATION(),
            contract.getCurrentPrice()
        ]);

        // Helper to formatting
        const soldTokens = parseFloat(ethers.utils.formatEther(tokensSold));
        const allocationTokens = parseFloat(ethers.utils.formatEther(allocation));
        const price = parseFloat(ethers.utils.formatEther(priceWei));

        PRESALE_CONFIG.raised = soldTokens;
        PRESALE_CONFIG.hardcap = allocationTokens;
        PRESALE_CONFIG.price = price; // Store price

        // Update UI
        const currentStageNum = parseInt(stageIndex) + 1;
        const headerTitle = document.querySelector('.modal-header h2'); // Target the h2 inside modal-header

        // If modal header exists (it's inside .presale-modal)
        if (headerTitle) {
            headerTitle.textContent = `Stage ${currentStageNum} Presale`;
        } else {
            // Fallback if structure is different
            console.log("Header not found");
        }

        // Also find the "Presale Access" text if it's different in HTML
        // Looking at HTML: <div class="modal-header"> ... <button ...>Connect Wallet</button> ... </div>
        // Wait, the HTML shown in view_file for index.html (lines 1362-1371) DOES NOT HAVE AN H2 in modal-header!
        // It has buttons.
        // I need to ADD the Stage info to the UI.

        updateProgress();

    } catch (e) {
        console.error("Error fetching data:", e);
    }
}



// Web3 Config
// Global scope for HTML onclick
window.selectWallet = async function (type) {
    closeModal(walletSelectionOverlay);

    let provider;

    try {
        if (type === 'metamask') {
            if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
                provider = window.ethereum;
            } else {
                if (confirm("MetaMask is not installed. Download now?")) {
                    window.open("https://metamask.io/download/", "_blank");
                }
                return;
            }
        } else if (type === 'trust') {
            if (window.trustwallet) {
                provider = window.trustwallet;
            } else if (typeof window.ethereum !== 'undefined' && window.ethereum.isTrust) {
                provider = window.ethereum;
            } else {
                if (confirm("Trust Wallet is not installed. Download now?")) {
                    window.open("https://trustwallet.com/browser-extension/", "_blank");
                }
                return;
            }
        }

        if (provider) {
            // Request Accounts
            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            userAddress = accounts[0];

            // Check Network
            await checkAndSwitchNetwork(provider);

            onWalletConnected(type);
        }
    } catch (error) {
        console.error("Wallet connection error:", error);
        alert('Connection Failed: ' + error.message);
    }
};

async function checkAndSwitchNetwork(provider) {
    try {
        const chainId = await provider.request({ method: 'eth_chainId' });
        if (parseInt(chainId, 16) !== WEB3_CONFIG.chainId) {
            try {
                await provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: WEB3_CONFIG.chainHex }],
                });
            } catch (switchError) {
                // This error code indicates that the chain has not been added to MetaMask.
                if (switchError.code === 4902) {
                    await provider.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId: WEB3_CONFIG.chainHex,
                                chainName: 'BNB Smart Chain',
                                nativeCurrency: {
                                    name: 'BNB',
                                    symbol: 'BNB',
                                    decimals: 18,
                                },
                                rpcUrls: [WEB3_CONFIG.rpcUrl],
                                blockExplorerUrls: [WEB3_CONFIG.blockExplorer],
                            },
                        ],
                    });
                } else {
                    throw switchError;
                }
            }
        }
    } catch (error) {
        console.error("Network switch error:", error);
        alert("Please switch your wallet to BNB Smart Chain to participate.");
    }
}

function onWalletConnected(type) {
    const shortAddr = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
    connectBtn.textContent = `${shortAddr} (${type === 'trust' ? 'Trust' : 'Web3'})`;
    connectBtn.classList.add('connected');

    // Style update for connection
    connectBtn.style.background = 'rgba(67, 255, 168, 0.1)';
    connectBtn.style.borderColor = 'var(--ok)';
    connectBtn.style.color = 'var(--ok)';

    buyBtn.disabled = false;
    updateCurrencyUI(); // Check allowance state if USDT

    // Show Referral Link
    const refLink = `${window.location.origin}${window.location.pathname}?ref=${userAddress}`;
    const refContainer = document.getElementById('referralContainer');
    if (refContainer) {
        refContainer.style.display = 'block';
        document.getElementById('myRefLink').value = refLink;
    }
}

function copyReferral() {
    const copyText = document.getElementById("myRefLink");
    copyText.select();
    navigator.clipboard.writeText(copyText.value);
    alert("Referral Link Copied: " + copyText.value);
}

// USDT Helper: Check Allowance
async function checkUSDTAllowance() {
    if (!userAddress || currentCurrency !== 'USDT') return;

    // Logic placeholder for UI update
    // In real app, we query allowance
    buyBtn.textContent = "Approve USDT";
    // If allowance > 0, set to "Buy NUERALLY"
}

async function handleBuy() {
    if (!userAddress) {
        alert('Please connect wallet first');
        return;
    }

    const amount = paymentInput.value;
    const amountFloat = parseFloat(amount);
    const limits = PRESALE_CONFIG.limits[currentCurrency];

    if (!amount || amountFloat < limits.min || amountFloat > limits.max) {
        alert(`Please enter amount between ${limits.min} and ${limits.max} ${currentCurrency}`);
        return;
    }

    // WEB3 TRANSACTION LOGIC
    try {
        buyBtn.disabled = true;
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();

        // If USDT and button says Approve
        if (currentCurrency === 'USDT' && buyBtn.textContent.includes("Approve")) {
            buyBtn.textContent = 'Approving...';

            // Real Approval Logic
            const usdtContract = new ethers.Contract(WEB3_CONFIG.usdtAddress, WEB3_CONFIG.erc20Abi, signer);
            const tx = await usdtContract.approve(WEB3_CONFIG.contractAddress, ethers.constants.MaxUint256);
            await tx.wait();

            buyBtn.textContent = "Buy NUERALLY";
            buyBtn.disabled = false;
            return;
        }

        // BUY LOGIC
        buyBtn.textContent = 'Processing...';

        const contract = new ethers.Contract(WEB3_CONFIG.contractAddress, WEB3_CONFIG.abi, signer);
        let tx;

        // Use the referrer from global state, or zero address
        const referrer = currentReferrer || "0x0000000000000000000000000000000000000000";

        if (currentCurrency === 'BNB') {
            const value = ethers.utils.parseEther(amount.toString());
            // Call buyWithBNB(referrer) with manual gas limit
            tx = await contract.buyWithBNB(referrer, {
                value: value,
                gasLimit: 500000
            });
        } else {
            const value = ethers.utils.parseUnits(amount.toString(), 18);
            // Call buyWithUSDT(amount, referrer) with manual gas limit
            tx = await contract.buyWithUSDT(value, referrer, {
                gasLimit: 500000
            });
        }

        const receipt = await tx.wait();

        if (receipt.status === 1) {
            alert('Transaction Successful!');
            // Update local UI (In real app, listen to events)
            // For demo, only BNB contributes to raised amount
            if (currentCurrency === 'BNB') {
                PRESALE_CONFIG.raised += amountFloat;
            }
            updateProgress();
        } else {
            alert('Transaction Failed!');
        }

    } catch (error) {
        console.error("Transaction error:", error);

        if (error.code === 4001) {
            alert('Transaction Rejected by User');
        } else {
            // Show more detail for debugging
            const reason = error.reason || error.data?.message || error.message;
            alert('Transaction Failed: ' + reason);
        }

    } finally {
        if (!buyBtn.textContent.includes("Approve")) {
            buyBtn.textContent = 'Buy NUERALLY';
            buyBtn.disabled = false;
        }
    }
}


// -------------------------------------------------------------
// HELPER FUNCTIONS (Previously Missing)
// -------------------------------------------------------------

function openModal(modal) {
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent bg scrolling
    }
}

function closeModal(modal) {
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

window.toggleCurrency = function (currency) {
    currentCurrency = currency;

    // Update active class on selectors
    document.querySelectorAll('.token-selector').forEach(el => {
        if (el.dataset.currency === currency) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });

    // Update Input Label
    if (payLabel) {
        payLabel.textContent = `You Pay (${currency})`;
    }

    // Reset Inputs
    if (paymentInput) paymentInput.value = '';
    if (tokenOutput) tokenOutput.value = '';

    // Trigger UI Update for Button State
    updateCurrencyUI();
    updateProgress(); // Refresh progress text (USDT vs BNB)
};

function updateCurrencyUI() {
    if (currentCurrency === 'USDT') {
        // Change button to "Approve USDT" initially, then check allowance
        if (buyBtn) buyBtn.textContent = 'Approve USDT';
        checkUSDTAllowance();
    } else {
        // BNB Logic
        if (buyBtn) {
            buyBtn.textContent = 'Buy NUERALLY';
            buyBtn.disabled = false;
        }
    }
}

function updateProgress() {
    console.log("Updating progress...");
    const sold = PRESALE_CONFIG.raised;
    const target = PRESALE_CONFIG.hardcap;
    const price = PRESALE_CONFIG.price || 0.00012;

    console.log("Values:", { sold, target, price, currentCurrency });

    console.log("Values:", { sold, target, price, currentCurrency });

    const percentage = target > 0 ? (sold / target) * 100 : 0;

    if (progressBar) progressBar.style.width = `${percentage}%`;

    // Calculate BNB (Assuming 1 BNB = $600 as per contract demo logic)
    const BNB_PRICE = 600;

    // In our config, 'raised' and 'hardcap' are in Tokens.
    const raisedUSD = sold * price;
    const targetUSD = target * price;

    let displayStr = "";

    if (currentCurrency === 'USDT') {
        const raisedStr = raisedUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        const targetStr = targetUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        displayStr = `${raisedStr} / ${targetStr}`;
    } else {
        const raisedBNB = raisedUSD / BNB_PRICE;
        const targetBNB = targetUSD / BNB_PRICE;

        const raisedStr = raisedBNB.toLocaleString('en-US', { maximumFractionDigits: 2 });
        const targetStr = targetBNB.toLocaleString('en-US', { maximumFractionDigits: 2 });
        displayStr = `${raisedStr} BNB / ${targetStr} BNB`;
    }

    if (raisedDisplay) raisedDisplay.textContent = displayStr;

    // Update the bottom status text with USDT values always (as per request)
    // "display in that container target of stage 1 in USDT and how much target has been achieved till now"
    const stageStatusText = document.getElementById('stageStatusText');
    if (stageStatusText) {
        const rStr = raisedUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        const tStr = targetUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        stageStatusText.textContent = `Raised: ${rStr} / Target: ${tStr}`;
    }
}

// -------------------------------------------------------------

// -------------------------------------------------------------
// AI DEMO LOGIC
// -------------------------------------------------------------
async function generateAIImage() {
    const promptInput = document.getElementById('aiPrompt');
    const generateBtn = document.getElementById('generateBtn');
    const aiImage = document.getElementById('aiImage');
    const aiPlaceholder = document.getElementById('aiPlaceholder');
    const aiLoader = document.getElementById('aiLoader');

    const prompt = promptInput.value.trim();
    if (!prompt) {
        alert("Please enter a description first!");
        return;
    }

    // UI Loading State
    generateBtn.disabled = true;
    generateBtn.innerHTML = "<span>⏳ Processing...</span>";
    aiImage.style.display = 'none';
    aiPlaceholder.style.display = 'none';
    aiLoader.style.display = 'flex';

    try {
        // Use Pollinations.ai (Free public API, no key needed)
        // We add a random seed to ensure new images
        const randomSeed = Math.floor(Math.random() * 100000);
        const encodedPrompt = encodeURIComponent(prompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=500&seed=${randomSeed}&nologo=true`;

        // Preload image to avoid flicker
        const img = new Image();
        img.onload = () => {
            aiImage.src = imageUrl;
            aiImage.style.display = 'block';
            aiLoader.style.display = 'none';
            generateBtn.disabled = false;
            generateBtn.innerHTML = "<span>✨ Generate Again</span>";
        };
        img.onerror = () => {
            throw new Error("Failed to load image");
        };
        img.src = imageUrl;

    } catch (error) {
        console.error("AI Generation Error:", error);
        aiLoader.style.display = 'none';
        aiPlaceholder.style.display = 'block';
        aiPlaceholder.textContent = "Error: GPU Node busy. Please try again.";
        generateBtn.disabled = false;
        generateBtn.innerHTML = "<span>✨ Generate</span>";
    }
}

// Auto-init if script loaded
document.addEventListener('DOMContentLoaded', initPresale);
