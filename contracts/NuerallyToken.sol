// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NuerallyToken
 * @dev BEP-20 Standard Token for NUERALLY Protocol.
 * - Supply: 10,000,000,000 (10 Billion)
 * - Decimals: 18
 * - Burnable: Yes
 * - Mintable: No (Fixed Supply)
 */
contract NuerallyToken is ERC20, ERC20Burnable, Ownable {
    
    // --- Anti-Bot / Anti-Snipe ---
    bool public tradingEnabled = false;
    uint256 public maxWalletAmount;
    uint256 public maxTxAmount;
    
    mapping(address => bool) public isExcludedFromLimits;
    
    event TradingEnabled(bool status);
    event LimitsUpdated(uint256 maxWallet, uint256 maxTx);
    event ExcludeFromLimits(address indexed account, bool isExcluded);
    
    constructor(address initialOwner) ERC20("Nuerally", "NUERALLY") Ownable(initialOwner) {
        // Mint 10 Billion Tokens to the owner
        _mint(msg.sender, 10_000_000_000 * 10 ** decimals());
        
        // Initial Limits (e.g. 1% of supply)
        // Can be updated by owner before enabling trading
        maxWalletAmount = 100_000_000 * 10 ** decimals(); // 1%
        maxTxAmount = 50_000_000 * 10 ** decimals();     // 0.5%
        
        // Exclude Owner and Contract from limits
        isExcludedFromLimits[initialOwner] = true;
        isExcludedFromLimits[address(this)] = true;
    }

    // --- Limit Enforcement (OZ v5 uses _update) ---
    function _update(address from, address to, uint256 amount) internal override(ERC20) {
        super._update(from, to, amount);

        // Bypass limits for minting/burning
        if (from == address(0) || to == address(0)) return;

        if (!tradingEnabled) {
            require(isExcludedFromLimits[from] || isExcludedFromLimits[to], "Trading not enabled");
        }

        if (tradingEnabled && !isExcludedFromLimits[from] && !isExcludedFromLimits[to]) {
            require(amount <= maxTxAmount, "Exceeds Max Tx");
            require(balanceOf(to) <= maxWalletAmount, "Exceeds Max Wallet");
        }
    }

    // --- Admin Functions ---
    function enableTrading() external onlyOwner {
        tradingEnabled = true;
        emit TradingEnabled(true);
    }
    
    function updateLimits(uint256 _maxWallet, uint256 _maxTx) external onlyOwner {
        maxWalletAmount = _maxWallet;
        maxTxAmount = _maxTx;
        emit LimitsUpdated(_maxWallet, _maxTx);
    }
    
    function excludeFromLimits(address account, bool excluded) external onlyOwner {
        isExcludedFromLimits[account] = excluded;
        emit ExcludeFromLimits(account, excluded);
    }
}
