// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RevenueSharingStaking
 * @dev "Real Yield" Staking. 
 * - Stake: NUERALLY
 * - Earn: USDT (from Protocol Revenue)
 */
contract RevenueSharingStaking is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public stakingToken;   // NUERALLY
    IERC20 public rewardToken;    // USDT

    // --- State ---
    uint256 public rewardPerTokenStored;
    uint256 public lastUpdateTime;
    uint256 public totalStaked;

    // Rewards are distributed over a duration? Or instant?
    // "Real Yield" often implies depositing rewards and they get streamed.
    // Let's use a standard "RewardPerSecond" model but funded manually.
    
    uint256 public rewardRate = 0; // Tokens per second
    uint256 public finishAt;
    uint256 public duration;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public stakedBalance;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardsAdded(uint256 amount, uint256 duration);

    constructor(address _stakingToken, address _rewardToken, address initialOwner) Ownable(initialOwner) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
    }

    modifier updateReward(address _account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();

        if (_account != address(0)) {
            rewards[_account] = earned(_account);
            userRewardPerTokenPaid[_account] = rewardPerTokenStored;
        }
        _;
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < finishAt ? block.timestamp : finishAt;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        return rewardPerTokenStored + 
            ((lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e18) / totalStaked;
    }

    function earned(address _account) public view returns (uint256) {
        return ((stakedBalance[_account] * (rewardPerToken() - userRewardPerTokenPaid[_account])) / 1e18) + rewards[_account];
    }

    // --- User Actions ---
    function stake(uint256 _amount) external nonReentrant updateReward(msg.sender) {
        require(_amount > 0, "Cannot stake 0");
        stakingToken.safeTransferFrom(msg.sender, address(this), _amount);
        stakedBalance[msg.sender] += _amount;
        totalStaked += _amount;
        emit Staked(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external nonReentrant updateReward(msg.sender) {
        require(_amount > 0, "Cannot withdraw 0");
        require(stakedBalance[msg.sender] >= _amount, "Insufficient balance");
        stakingToken.safeTransfer(msg.sender, _amount);
        stakedBalance[msg.sender] -= _amount;
        totalStaked -= _amount;
        emit Withdrawn(msg.sender, _amount);
    }

    function claimReward() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardClaimed(msg.sender, reward);
        }
    }

    // --- Admin: Add Rewards ---
    /**
     * @dev Admin deposits USDT and sets a duration for distribution (e.g. 30 days)
     */
    function notifyRewardAmount(uint256 _amount, uint256 _duration) external onlyOwner updateReward(address(0)) {
        require(_duration > 0, "Duration must be > 0");
        
        // Transfer Reward Token from Admin
        rewardToken.safeTransferFrom(msg.sender, address(this), _amount);

        if (block.timestamp >= finishAt) {
            rewardRate = _amount / _duration;
        } else {
            // Rollover remaining rewards
            uint256 remainingRewards = (finishAt - block.timestamp) * rewardRate;
            rewardRate = (remainingRewards + _amount) / _duration;
        }

        require(rewardRate > 0, "Reward rate = 0");
        
        finishAt = block.timestamp + _duration;
        duration = _duration;
        lastUpdateTime = block.timestamp;
        
        emit RewardsAdded(_amount, _duration);
    }
}
