// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/AggregatorV3Interface.sol";

/**
 * @title NuerallyPresale
 * @dev 10-Stage Dynamic Presale with Referral System and Vesting.
 */
contract NuerallyPresale is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // --- Configuration ---
    IERC20 public token;
    IERC20 public usdt;
    AggregatorV3Interface public priceFeed; // Chainlink Oracle
    
    uint256 public constant STAGE_ALLOCATION = 350_000_000 * 1e18; // 350M Tokens per stage
    uint256 public constant MIN_BUY_USD = 10 * 1e18; // $10 Minimum
    uint256 public constant STAGE_DURATION = 10 days; 

    // --- State ---
    uint256 public stageStartTime;
    
    // --- State ---
    uint256 public currentStage;
    uint256 public totalTokensSold;
    uint256 public totalRaisedBNB;
    uint256 public totalRaisedUSDT;
    
    // Note: Prices in Wei (approximate to USD decimals)
    // 1 Token Price in USDT (18 decimals)
    uint256[] public stagePrices = [
        120000000000000, // Stage 1: $0.00012 
        130000000000000, // Stage 2: $0.00013
        140000000000000, // Stage 3: $0.00014
        150000000000000, // Stage 4: $0.00015
        160000000000000, // Stage 5: $0.00016
        170000000000000, // Stage 6: $0.00017
        180000000000000, // Stage 7: $0.00018
        190000000000000, // Stage 8: $0.00019
        200000000000000, // Stage 9: $0.00020
        210000000000000  // Stage 10: $0.00021
    ];

    uint256 public tokensSoldInCurrentStage;
    bool public presaleActive = true;
    
    // --- User Data ---
    mapping(address => uint256) public purchasedTokens;
    mapping(address => uint256) public referralEarnings;
    mapping(address => address) public referrer;

    // --- Events ---
    event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost, string currency);
    event ReferralPaid(address indexed referrer, address indexed buyer, uint256 amount, uint256 stage);
    event StageChanged(uint256 newStage);

    constructor(address _token, address _usdt, address initialOwner, address _marketingWallet, address _priceFeed) Ownable(initialOwner) {
        token = IERC20(_token);
        usdt = IERC20(_usdt);
        marketingWallet = _marketingWallet;
        stageStartTime = block.timestamp;
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    // --- Prices ---
    function getCurrentPrice() public view returns (uint256) {
        if (currentStage >= 10) return stagePrices[9];
        return stagePrices[currentStage];
    }
    
    function getReferralPercent() public view returns (uint256) {
        if (currentStage < 3) return 10; // 10%
        if (currentStage < 6) return 7;  // 7%
        if (currentStage < 9) return 5;  // 5%
        return 3;                        // 3%
    }

    // --- Buying Logic ---
    function buyWithUSDT(uint256 usdtAmount, address _referrer) external nonReentrant {
        require(presaleActive, "Presale ended");
        require(usdtAmount >= MIN_BUY_USD, "Below Minimum Buy");
        
        uint256 price = getCurrentPrice();
        uint256 tokenAmount = (usdtAmount * 1e18) / price;
        
        // 1. Transfer USDT from User to Contract (or Owner)
        // Note: For safety, funds usually go to Owner wallet or stay in contract
        // SafeERC20 handles non-standard returns automatically
        usdt.safeTransferFrom(msg.sender, address(this), usdtAmount);
        
        _processPurchase(msg.sender, tokenAmount, _referrer);
        
        totalRaisedUSDT += usdtAmount;
        emit TokensPurchased(msg.sender, tokenAmount, usdtAmount, "USDT");
    }

    function getLatestPrice() public view returns (uint256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        // Chainlink returns 8 decimals for USD pairs (e.g. 30000000000 = $300)
        // We want 18 decimals.
        return uint256(price) * 1e10; 
    }

    function buyWithBNB(address _referrer) external payable nonReentrant {
        require(presaleActive, "Presale ended");
        
        uint256 bnbPriceInUsd = getLatestPrice(); 
        uint256 usdValue = (msg.value * bnbPriceInUsd) / 1e18;
        
        require(usdValue >= MIN_BUY_USD, "Below Minimum Buy");
        
        uint256 price = getCurrentPrice();
        uint256 tokenAmount = (usdValue * 1e18) / price;
        
        _processPurchase(msg.sender, tokenAmount, _referrer);
        
        totalRaisedBNB += msg.value;
        emit TokensPurchased(msg.sender, tokenAmount, msg.value, "BNB");
    }

    // --- Buying Logic ---
    // ... (unchanged buy functions) ...

    function _processPurchase(address buyer, uint256 amount, address _referrer) internal {
        // Stage Management (Time & Volume)
        bool timeExpired = block.timestamp > stageStartTime + STAGE_DURATION;
        bool volumeSoldOut = tokensSoldInCurrentStage + amount > STAGE_ALLOCATION;

        if (volumeSoldOut || timeExpired) {
             // If volume sold out, take remainder for next stage calculate? 
             // Simplification: If time expired, jump to next stage immediately with 0 sold
             // If volume sold, jump.
             
             if (volumeSoldOut) {
                 uint256 remainder = (tokensSoldInCurrentStage + amount) - STAGE_ALLOCATION;
                 tokensSoldInCurrentStage = remainder;
             } else {
                 tokensSoldInCurrentStage = 0; // Reset for new stage if time expired
             }
             
             if(currentStage < 9) {
                 currentStage++;
                 stageStartTime = block.timestamp; // Reset Timer
                 emit StageChanged(currentStage);
             } else {
                 presaleActive = false; // Sold Out or End of Stage 10
             }
        } else {
            tokensSoldInCurrentStage += amount;
        }
        
        totalTokensSold += amount;
        
        // Record Purchase (Claim Model)
        purchasedTokens[buyer] += amount;
        
        // Referral Logic
        if (_referrer != address(0) && _referrer != buyer) {
            uint256 percent = getReferralPercent();
            uint256 bonus = (amount * percent) / 100;
            referralEarnings[_referrer] += bonus;
            emit ReferralPaid(_referrer, buyer, bonus, currentStage);
        }
    }

    // --- Launchpad Allocation ---
    function withdrawUnsoldToLaunchpad(address launchpadWallet) external onlyOwner {
        require(!presaleActive, "Presale still active");
        uint256 balance = token.balanceOf(address(this));
        token.safeTransfer(launchpadWallet, balance);
    }
    
    // --- Claiming (Locked) ---
    // Enable this after launch
    bool public claimingEnabled = false;
    
    function enableClaiming() external onlyOwner {
        claimingEnabled = true;
    }
    
    function claim() external nonReentrant {
        require(claimingEnabled, "Claiming not active");
        uint256 amount = purchasedTokens[msg.sender];
        require(amount > 0, "Nothing to claim");
        
        purchasedTokens[msg.sender] = 0;
        token.safeTransfer(msg.sender, amount);
    }
    
    // Referral Claims (30 Day Lock)
    uint256 public launchTime;
    
    function claimReferralRewards() external nonReentrant {
        require(claimingEnabled, "Claiming not active");
        require(block.timestamp >= launchTime + 30 days, "Referral rewards locked for 30 days");
        
        uint256 amount = referralEarnings[msg.sender];
        require(amount > 0, "No rewards");
        
        referralEarnings[msg.sender] = 0;
        
        // Pay from Marketing Wallet (Must be approved)
        require(marketingWallet != address(0), "Marketing Wallet not set");
        token.safeTransferFrom(marketingWallet, msg.sender, amount);
    }
    
    // --- Admin ---
    function withdrawFunds() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
        usdt.safeTransfer(owner(), usdt.balanceOf(address(this)));
    }
    
    function setLaunchTime(uint256 _time) external onlyOwner {
        launchTime = _time;
    }
    
    // --- Marketing Wallet for Referrals ---
    address public marketingWallet;
    
    function setMarketingWallet(address _wallet) external onlyOwner {
        marketingWallet = _wallet;
    }
}
