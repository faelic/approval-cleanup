// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MultiTokenFaucet is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct TokenConfig {
        bool supported;
        bool enabled;
        uint256 claimAmount;
    }

    mapping(address => TokenConfig) public tokenConfigs;
    mapping(address => mapping(address => bool)) public hasClaimed;
    address[] public supportedTokens;

    error InvalidTokenAddress();
    error InvalidClaimAmount();
    error UnsupportedToken();
    error TokenAlreadyDisabled();
    error AlreadyClaimed();
    error InsufficientFaucetBalance();
    error TokenNotEnabled();
    error InvalidRecipientAddress();
    error InvalidWithdrawAmount();
    error NativeTransferFailed();


    event TokenConfigured(address indexed token, uint256 claimAmount, bool enabled);
    event TokenDisabled(address indexed token);
    event Claimed(address indexed user, address indexed token, uint256 amount);
    event TokenWithdrawn(address indexed token, address indexed to, uint256 amount);
    event NativeWithdrawn(address indexed to, uint256 amount);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function configureToken(
        address token,
        uint256 claimAmount,
        bool enabled
    ) external onlyOwner {
        if (token == address(0)) revert InvalidTokenAddress();
        if (claimAmount == 0) revert InvalidClaimAmount();

        if (!tokenConfigs[token].supported) {
            supportedTokens.push(token);
        }

        tokenConfigs[token] = TokenConfig({
            supported: true,
            enabled: enabled,
            claimAmount: claimAmount
        });

        emit TokenConfigured(token, claimAmount, enabled);
    }

    function disableToken(address token) external onlyOwner {
        if (!tokenConfigs[token].supported) revert UnsupportedToken();
        if (!tokenConfigs[token].enabled) revert TokenAlreadyDisabled();

        tokenConfigs[token].enabled = false;

        emit TokenDisabled(token);
    }

    function claim(address token) external nonReentrant {
        TokenConfig memory config = tokenConfigs[token];


        if (!config.supported) revert UnsupportedToken();
        if (!config.enabled) revert TokenNotEnabled();
        if (hasClaimed[msg.sender][token]) revert AlreadyClaimed();

        uint256 faucetBalance = IERC20(token).balanceOf(address(this));
        if (faucetBalance < config.claimAmount) revert InsufficientFaucetBalance();

        hasClaimed[msg.sender][token] = true;

        IERC20(token).safeTransfer(msg.sender, config.claimAmount);

        emit Claimed(msg.sender, token, config.claimAmount);
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }

    function canClaim(address user, address token) external view returns (bool) {
        TokenConfig memory config = tokenConfigs[token];

        if (!config.supported) return false;
        if (!config.enabled) return false;
        if (hasClaimed[user][token]) return false;

        uint256 faucetBalance = IERC20(token).balanceOf(address(this));
        return faucetBalance >= config.claimAmount;
    }

    function withdrawToken(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        if (token == address(0)) revert InvalidTokenAddress();
        if (to == address(0)) revert InvalidRecipientAddress();
        if (amount == 0) revert InvalidWithdrawAmount();

        IERC20(token).safeTransfer(to, amount);

        emit TokenWithdrawn(token, to, amount);
    }

    function withdrawNative(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidRecipientAddress();
        if (amount == 0) revert InvalidWithdrawAmount();

        (bool success,) = to.call{value: amount}("");
        if (!success) revert NativeTransferFailed();

         emit NativeWithdrawn(to, amount);
    }

    receive() external payable {}
}





