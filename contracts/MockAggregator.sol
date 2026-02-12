// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/AggregatorV3Interface.sol";

contract MockAggregator is AggregatorV3Interface {
    uint8 public override decimals;
    int256 public latestAnswer;

    constructor(uint8 _decimals, int256 _initialAnswer) {
        decimals = _decimals;
        latestAnswer = _initialAnswer;
    }

    function updateAnswer(int256 _answer) public {
        latestAnswer = _answer;
    }
    
    // Interface implementation
    function description() external pure override returns (string memory) { return "Mock Aggregator"; }
    function version() external pure override returns (uint256) { return 1; }
    function getRoundData(uint80) external view override returns (uint80, int256, uint256, uint256, uint80) {
        return (0, latestAnswer, 0, 0, 0);
    }
    function latestRoundData() external view override returns (uint80, int256, uint256, uint256, uint80) {
        return (0, latestAnswer, 0, 0, 0);
    }
}
