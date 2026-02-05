// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NeuralyToken
 * @dev BEP-20 Standard Token for NEURALY Protocol.
 * - Supply: 10,000,000,000 (10 Billion)
 * - Decimals: 18
 * - Burnable: Yes
 * - Mintable: No (Fixed Supply)
 */
contract NeuralyToken is ERC20, ERC20Burnable, Ownable {
    constructor(address initialOwner) ERC20("Neuraly", "NEURALY") Ownable(initialOwner) {
        // Mint 10 Billion Tokens to the owner
        _mint(msg.sender, 10_000_000_000 * 10 ** decimals());
    }
}
