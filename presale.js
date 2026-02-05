// Presale Logic
const PRESALE_CONFIG = {
    hardcap: 500, // BNB
    raised: 154.5, // Mock initial value
    rate: 20000000, // 1 BNB = 20,000,000 NEURALY
    minBuy: 0.1,
    maxBuy: 10
};

let userAddress = null;

// DOM Elements
const presaleOverlay = document.getElementById('presaleOverlay');
const walletSelectionOverlay = document.getElementById('walletSelectionOverlay');
const connectBtn = document.getElementById('connectWalletBtn'); // In Modal
const mainConnectBtn = document.getElementById('presaleLink'); // Global CTA
const closeModalBtn = document.getElementById('closeModal');
const closeWalletModalBtn = document.getElementById('closeWalletModal');
const buyBtn = document.getElementById('buyBtn');
const bnbInput = document.getElementById('bnbAmount');
const tokenOutput = document.getElementById('tokenAmount');
const progressBar = document.getElementById('progressBar');
const raisedDisplay = document.getElementById('raisedAmount');

// Initialize
function initPresale() {
    updateProgress();

    // Main Presale Modal Triggers
    mainConnectBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(presaleOverlay);
    });

    closeModalBtn.addEventListener('click', () => closeModal(presaleOverlay));

    // Close on click outside
    presaleOverlay.addEventListener('click', (e) => {
        if (e.target === presaleOverlay) closeModal(presaleOverlay);
    });

    // Wallet Selection Triggers
    connectBtn.addEventListener('click', () => openModal(walletSelectionOverlay));
    closeWalletModalBtn.addEventListener('click', () => closeModal(walletSelectionOverlay));
    walletSelectionOverlay.addEventListener('click', (e) => {
        if (e.target === walletSelectionOverlay) closeModal(walletSelectionOverlay);
    });

    // Input calculation
    bnbInput.addEventListener('input', calculateTokens);

    // Initial button state
    buyBtn.addEventListener('click', handleBuy);
}

function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function calculateTokens() {
    const amount = parseFloat(bnbInput.value) || 0;
    const tokens = amount * PRESALE_CONFIG.rate;
    tokenOutput.value = tokens.toLocaleString();
}

function updateProgress() {
    const percentage = (PRESALE_CONFIG.raised / PRESALE_CONFIG.hardcap) * 100;
    progressBar.style.width = `${percentage}%`;
    raisedDisplay.textContent = `${PRESALE_CONFIG.raised} / ${PRESALE_CONFIG.hardcap} BNB`;
}

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
            // Priority: Trust Wallet object -> Ethereum object (if Trust overrides it)
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
            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            userAddress = accounts[0];
            onWalletConnected(type);
        }
    } catch (error) {
        console.error("Wallet connection error:", error);
        alert('Connection Failed or Cancelled');
    }
};

function onWalletConnected(type) {
    const shortAddr = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
    connectBtn.textContent = `${shortAddr} (${type === 'trust' ? 'Trust' : 'MetaMask'})`;
    connectBtn.style.background = 'rgba(67, 255, 168, 0.1)';
    connectBtn.style.borderColor = 'var(--ok)';
    connectBtn.style.color = 'var(--ok)';
    buyBtn.disabled = false;
    buyBtn.textContent = "Buy NEURALY";
}

async function handleBuy() {
    if (!userAddress) {
        alert('Please connect wallet first');
        return;
    }

    const amount = parseFloat(bnbInput.value);
    if (!amount || amount < PRESALE_CONFIG.minBuy || amount > PRESALE_CONFIG.maxBuy) {
        alert(`Please enter amount between ${PRESALE_CONFIG.minBuy} and ${PRESALE_CONFIG.maxBuy} BNB`);
        return;
    }

    buyBtn.textContent = 'Processing...';
    buyBtn.disabled = true;

    // Simulate transaction delay
    setTimeout(() => {
        alert('Presale is not live on mainnet yet! This is a UI demo.');
        buyBtn.textContent = 'Buy NEURALY';
        buyBtn.disabled = false;

        // Mock update
        PRESALE_CONFIG.raised += amount;
        updateProgress();
    }, 2000);

    // TODO: Integrate actual contract call here
    /*
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(PRESALE_ADDRESS, PRESALE_ABI, signer);
    const tx = await contract.buyTokens({ value: ethers.utils.parseEther(amount.toString()) });
    await tx.wait();
    */
}

// Auto-init if script loaded
document.addEventListener('DOMContentLoaded', initPresale);
