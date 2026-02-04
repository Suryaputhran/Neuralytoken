// Presale Logic
const PRESALE_CONFIG = {
    hardcap: 500, // BNB
    raised: 154.5, // Mock initial value
    rate: 2000000, // 1 BNB = 2,000,000 NEURALY
    minBuy: 0.1,
    maxBuy: 10
};

let userAddress = null;

// DOM Elements
const presaleOverlay = document.getElementById('presaleOverlay');
const connectBtn = document.getElementById('connectWalletBtn'); // In Modal
const mainConnectBtn = document.getElementById('presaleLink'); // Global CTA
const closeModalBtn = document.getElementById('closeModal');
const buyBtn = document.getElementById('buyBtn');
const bnbInput = document.getElementById('bnbAmount');
const tokenOutput = document.getElementById('tokenAmount');
const progressBar = document.getElementById('progressBar');
const raisedDisplay = document.getElementById('raisedAmount');

// Initialize
function initPresale() {
    updateProgress();

    // Event Listeners
    mainConnectBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
    });

    closeModalBtn.addEventListener('click', closeModal);

    // Close on click outside
    presaleOverlay.addEventListener('click', (e) => {
        if (e.target === presaleOverlay) closeModal();
    });

    // Input calculation
    bnbInput.addEventListener('input', calculateTokens);

    // Wallet Connection
    connectBtn.addEventListener('click', connectWallet);
    buyBtn.addEventListener('click', handleBuy);
}

function openModal() {
    presaleOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    presaleOverlay.classList.remove('active');
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

async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            userAddress = accounts[0];
            onWalletConnected();
        } catch (error) {
            console.error(error);
            alert('Connection Failed');
        }
    } else {
        if (confirm("MetaMask is not installed. Would you like to download it now?")) {
            window.open("https://metamask.io/download/", "_blank");
        }
    }
}

function onWalletConnected() {
    const shortAddr = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
    connectBtn.textContent = shortAddr;
    connectBtn.style.background = 'rgba(255,255,255,0.1)';
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
