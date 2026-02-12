// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NuerallyVesting
 * @dev Linear Vesting Contract for Team & Marketing Allocations.
 * - Tokens are released linearly over a duration.
 * - Optional "Cliff" (no tokens released before this time).
 * - Secure way to lock team tokens to build community trust.
 */
contract NuerallyVesting is Ownable {
    using SafeERC20 for IERC20;

    event TokensReleased(address indexed token, uint256 amount);
    event TokensBurned(uint256 amount);

    // Beneficiary of tokens after vesting
    address public immutable beneficiary;

    // Durations
    uint256 public immutable start;
    uint256 public immutable duration;
    uint256 public immutable cliff;

    mapping(address => uint256) public released;

    /**
     * @dev Set up the vesting schedule.
     * @param _beneficiaryAddress Wallet that will receive the tokens.
     * @param _startTimestamp Unix timestamp when vesting starts (e.g., Launch Time).
     * @param _cliffSeconds Seconds before first release is allowed (e.g., 30 days).
     * @param _durationSeconds Total duration of vesting (e.g., 365 days).
     */
    constructor(
        address _beneficiaryAddress,
        uint256 _startTimestamp,
        uint256 _cliffSeconds,
        uint256 _durationSeconds,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_beneficiaryAddress != address(0), "Beneficiary is zero address");
        require(_durationSeconds > 0, "Duration is 0");
        require(_startTimestamp + _durationSeconds > block.timestamp, "End time in past");

        beneficiary = _beneficiaryAddress;
        start = _startTimestamp;
        cliff = _startTimestamp + _cliffSeconds;
        duration = _durationSeconds;
    }

    /**
     * @dev Releases currently vested tokens to the beneficiary.
     * @param token Address of the token (NUERALLY).
     */
    function release(IERC20 token) external {
        uint256 unreleased = releasableAmount(token);
        require(unreleased > 0, "No tokens due");

        released[address(token)] += unreleased;
        token.safeTransfer(beneficiary, unreleased);

        emit TokensReleased(address(token), unreleased);
    }

    /**
     * @dev Calculates the amount of tokens that has already vested but hasn't been released yet.
     */
    function releasableAmount(IERC20 token) public view returns (uint256) {
        return vestedAmount(token, uint256(block.timestamp)) - released[address(token)];
    }

    /**
     * @dev Calculates the amount of tokens that has vested up to a specific timestamp.
     */
    function vestedAmount(IERC20 token, uint256 timestamp) public view returns (uint256) {
        uint256 totalAllocation = token.balanceOf(address(this)) + released[address(token)];

        if (timestamp < cliff) {
            return 0;
        } else if (timestamp >= start + duration) {
            return totalAllocation;
        } else {
            // Linear Vesting: (Total * (TimePassed)) / Duration
            return (totalAllocation * (timestamp - start)) / duration;
        }
    }
    // --- Burn Logic (Community Trust) ---
    function burnRemainingTokens(IERC20 token) external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens to burn");
        
        // Burn by sending to dead address (assuming token is not burnable via burn() function context)
        // Or if token has burn(), we can use that. 
        // NuerallyToken IS burnable (ERC20Burnable). Let's try to verify interface.
        // For safety/generality, sending to dEaD is standard if interface unknown, 
        // but since we know it is Nuerally, we can cast and burn or just transfer to dEaD.
        // Transfer to dEaD is universally understood.
        
        token.safeTransfer(0x000000000000000000000000000000000000dEaD, balance);
        
        emit TokensBurned(balance);
    }
}
