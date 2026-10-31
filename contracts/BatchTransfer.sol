// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PayBook BatchTransfer
/// @notice Distributes native currency or ERC-20 tokens to up to 200 recipients.
/// @dev Atomic functions revert fully on any failed transfer. The ERC-20 best-effort function
///      skips failing recipients and reports them through TransferFailed events.
/// @dev No ownership, fees, upgradeability, receive function, or fallback function.
///      Native amounts use 18 decimals on Arc. ERC-20 amounts use token base units:
///      Arc USDC at 0x3600000000000000000000000000000000000000 uses 6 decimals.
///      The contract forwards all supplied native value and never intermediates ERC-20 transfers.
///      Unsolicited token transfers and forcibly sent native currency cannot be prevented
///      and cannot be recovered. Fee-on-transfer tokens may deliver less than the logged amount.
contract BatchTransfer is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Maximum number of recipient entries in a batch.
    uint256 public constant MAX_BATCH = 200;

    /// @notice Recipient and amount arrays have different lengths.
    error LengthMismatch();
    /// @notice A batch must contain at least one entry.
    error EmptyBatch();
    /// @notice The batch exceeds MAX_BATCH.
    error BatchTooLarge();
    /// @notice A token or recipient is the zero address.
    error ZeroAddress();
    /// @notice Every transfer amount must be greater than zero.
    error ZeroAmount();
    /// @notice The sum of native amounts must exactly equal msg.value.
    error ValueMismatch();
    /// @notice A recipient rejected its native transfer.
    error NativeTransferFailed(address recipient, uint256 amount);
    /// @notice This contract cannot be a recipient, to avoid retaining batch funds.
    error SelfRecipient();

    /// @notice Emitted for each successful native transfer.
    event NativeSent(address indexed sender, address indexed recipient, uint256 amount);
    /// @notice Emitted for each successful ERC-20 transfer; amount is the requested amount.
    event TokenSent(address indexed sender, address indexed token, address indexed recipient, uint256 amount);
    /// @notice Emitted after a complete batch; token is address(0) for native currency.
    event BatchSent(address indexed sender, address indexed token, uint256 total, uint256 count);
    /// @notice Emitted for each skipped ERC-20 best-effort transfer.
    event TransferFailed(address indexed sender, address indexed token, address indexed recipient, uint256 amount);

    /// @notice Send native currency to every recipient in one atomic transaction.
    /// @dev Reverts the entire batch if validation or any recipient call fails.
    ///      All entries are validated before any recipient is called.
    /// @param recipients Nonzero recipient addresses other than this contract.
    /// @param amounts Positive amounts in native base units (18 decimals on Arc).
    function batchTransferNative(address[] calldata recipients, uint256[] calldata amounts)
        external
        payable
        nonReentrant
    {
        uint256 total = _validateBatch(recipients, amounts);
        if (total != msg.value) revert ValueMismatch();

        uint256 count = recipients.length;
        for (uint256 i = 0; i < count; ++i) {
            (bool success,) = recipients[i].call{value: amounts[i]}("");
            if (!success) revert NativeTransferFailed(recipients[i], amounts[i]);
            emit NativeSent(msg.sender, recipients[i], amounts[i]);
        }

        emit BatchSent(msg.sender, address(0), total, count);
    }

    /// @notice Transfer tokens directly from the caller to each recipient atomically.
    /// @dev Caller must first approve this contract for at least the total amount.
    ///      No tokens are pulled into this contract. SafeERC20 handles failed transfers.
    ///      All entries are validated before any token transfer is attempted.
    /// @param token ERC-20 token contract (Arc USDC uses 6 decimals).
    /// @param recipients Nonzero recipient addresses other than this contract.
    /// @param amounts Positive amounts in the token's smallest units, without conversion.
    function batchTransferERC20(IERC20 token, address[] calldata recipients, uint256[] calldata amounts)
        external
        nonReentrant
    {
        if (address(token) == address(0)) revert ZeroAddress();
        uint256 total = _validateBatch(recipients, amounts);

        uint256 count = recipients.length;
        for (uint256 i = 0; i < count; ++i) {
            token.safeTransferFrom(msg.sender, recipients[i], amounts[i]);
            emit TokenSent(msg.sender, address(token), recipients[i], amounts[i]);
        }

        emit BatchSent(msg.sender, address(token), total, count);
    }

    /// @notice Transfer tokens non-atomically, skipping failing recipients.
    /// @dev Caller must approve this contract. All entries are validated before transfers.
    ///      Reverts, false returns, and non-contract tokens emit TransferFailed; empty
    ///      return data from a token contract is accepted, as with SafeERC20.
    ///      Funds transfer directly from the caller, never through this contract.
    ///      BatchSent reports only successful requested amounts and recipient entries.
    /// @param token Nonzero ERC-20 token address (Arc USDC uses 6 decimals).
    /// @param recipients Nonzero recipient addresses other than this contract.
    /// @param amounts Positive amounts in the token's smallest units, without conversion.
    function batchTransferERC20BestEffort(IERC20 token, address[] calldata recipients, uint256[] calldata amounts)
        external
        nonReentrant
    {
        if (address(token) == address(0)) revert ZeroAddress();
        _validateBatch(recipients, amounts);

        uint256 successfulTotal;
        uint256 successfulCount;
        uint256 count = recipients.length;
        for (uint256 i = 0; i < count; ++i) {
            bool success;
            if (address(token).code.length != 0) {
                bytes memory returnData;
                (success, returnData) = address(token).call(
                    abi.encodeCall(IERC20.transferFrom, (msg.sender, recipients[i], amounts[i]))
                );
                if (success && returnData.length != 0) {
                    uint256 returnValue;
                    if (returnData.length >= 32) {
                        assembly ("memory-safe") {
                            returnValue := mload(add(returnData, 32))
                        }
                    }
                    success = returnValue == 1;
                }
            }

            if (success) {
                successfulTotal += amounts[i];
                ++successfulCount;
                emit TokenSent(msg.sender, address(token), recipients[i], amounts[i]);
            } else {
                emit TransferFailed(msg.sender, address(token), recipients[i], amounts[i]);
            }
        }

        emit BatchSent(msg.sender, address(token), successfulTotal, successfulCount);
    }

    /// @dev Validate every entry and sum amounts using Solidity's checked arithmetic.
    function _validateBatch(address[] calldata recipients, uint256[] calldata amounts)
        private
        view
        returns (uint256 total)
    {
        uint256 count = recipients.length;
        if (count != amounts.length) revert LengthMismatch();
        if (count == 0) revert EmptyBatch();
        if (count > MAX_BATCH) revert BatchTooLarge();

        for (uint256 i = 0; i < count; ++i) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            if (recipients[i] == address(this)) revert SelfRecipient();
            if (amounts[i] == 0) revert ZeroAmount();
            total += amounts[i];
        }
    }
}
