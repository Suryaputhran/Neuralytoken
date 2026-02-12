// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NuerallyStaking
 * @dev Fixed APY Staking for NUERALLY Tokens.
 * - Stakers deposit NUERALLY
 * - Earn 20% APY (Example fixed rate)
 * - Rewards paid from a dedicated Reward Pool
 */
contract NuerallyStaking is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public nuerallyToken;

    // Defines the ratio of rewards per second per token staked
    // Example: 20% APY
    // Rate = 20 / 100 / 31536000 (seconds in year) * 1e18
    uint256 public rewardRatePerSecond = 6341958396; // ~20% APY scaled by 1e18

    struct StakeInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 lastClaimTime;
    }

    mapping(address => StakeInfo) public stakes;
    
    // Total Staked in Contract
    uint256 public totalStaked;
    
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount, uint256 rewards);
    event RewardsClaimed(address indexed user, uint256 rewards);

    constructor(address _token, address initialOwner) Ownable(initialOwner) {
        nuerallyToken = IERC20(_token);
    }

    // --- Staking Logic ---
    function stake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Cannot stake 0");
        
        // Update existing rewards before adding new stake
        _updateRewards(msg.sender);
        
        nuerallyToken.safeTransferFrom(msg.sender, address(this), _amount);
        
        stakes[msg.sender].amount += _amount;
        totalStaked += _amount;
        
        emit Staked(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external nonReentrant {
        require(stakes[msg.sender].amount >= _amount, "Insufficient stake");
        
        // Claim pending first
        uint256 rewards = _calculatePendingRewards(msg.sender);
        if (rewards > 0) {
            _safeTokenTransfer(msg.sender, rewards);
            emit RewardsClaimed(msg.sender, rewards);
        }
        
        // Reset last claim time
        stakes[msg.sender].lastClaimTime = block.timestamp;
        
        stakes[msg.sender].amount -= _amount;
        totalStaked -= _amount;
        
        nuerallyToken.safeTransfer(msg.sender, _amount);
        emit Withdrawn(msg.sender, _amount, rewards);
    }
    
    function claimRewards() external nonReentrant {
        _updateRewards(msg.sender);
    }

    // --- View Functions ---
    function pendingRewards(address _user) external view returns (uint256) {
        return _calculatePendingRewards(_user);
    }
    
    // --- Internal ---
    function _updateRewards(address _user) internal {
        uint256 rewards = _calculatePendingRewards(_user);
        if (rewards > 0) {
            stakes[_user].lastClaimTime = block.timestamp;
            _safeTokenTransfer(_user, rewards);
            emit RewardsClaimed(_user, rewards);
        } else {
             // If no rewards, simply update time to now to reset accumulation window
             stakes[_user].lastClaimTime = block.timestamp;
        }
    }
    
    function _calculatePendingRewards(address _user) internal view returns (uint256) {
        StakeInfo storage userStake = stakes[_user];
        if (userStake.amount == 0) return 0;
        
        uint256 secondsStaked = block.timestamp - userStake.lastClaimTime;
        // Formula: (Amount * Seconds * Rate) / 1e18
        uint256 pending = (userStake.amount * secondsStaked * rewardRatePerSecond) / 1e18;
        return pending;
    }
    
    function _safeTokenTransfer(address _to, uint256 _amount) internal {
        uint256 bal = nuerallyToken.balanceOf(address(this));
        // Ensure we don't accidentally try to send more than exists (Reward Pool Limit)
        if (_amount > bal) {
            nuerallyToken.safeTransfer(_to, bal);
        } else {
            nuerallyToken.safeTransfer(_to, _amount);
        }
    }
    
    // --- Admin ---
    // Update APY if needed
    function setRewardRate(uint256 _ratePerSecond) external onlyOwner {
        rewardRatePerSecond = _ratePerSecond;
    }
}
