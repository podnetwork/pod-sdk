// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Bridge} from "./Bridge.sol";

contract DepositWaitingList is AccessControl {
    using SafeERC20 for IERC20;

    error InvalidToAddress();
    error InvalidAmount();
    error DepositAlreadyApplied();
    error DepositDoesNotExist();
    error TokenMismatch();
    error NotAuthorized();
    error InvalidPermitLength();

    event WaitingDepositCreated(
        uint256 indexed depositId, address indexed from, address to, address token, uint256 amount
    );
    event WaitingDepositApplied(uint256 indexed depositId);
    event WaitingDepositWithdrawn(uint256 indexed depositId);

    struct WaitingDeposit {
        address token;
        uint256 amount;
        address from;
        address to;
        bool applied;
    }

    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    uint256 internal constant PERMIT_LENGTH = 97; // deadline(32) + v(1) + r(32) + s(32)

    Bridge public immutable bridge;

    mapping(uint256 => WaitingDeposit) public deposits;
    uint256 public nextDepositId;
    address public callContract;
    mapping(address => bool) internal _approvedTokens;

    constructor(address _bridge, address _callContract, address _admin) {
        bridge = Bridge(_bridge);
        callContract = _callContract;
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(RELAYER_ROLE, _admin);
    }

    /// @param permit Tightly packed permit data (97 bytes) or empty for no permit.
    function deposit(address token, uint256 amount, address to, bytes calldata permit)
        external
        returns (uint256 depositId)
    {
        if (to == address(0)) revert InvalidToAddress();
        if (amount == 0) revert InvalidAmount();

        _applyPermit(token, msg.sender, amount, permit);
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        depositId = nextDepositId++;
        deposits[depositId] = WaitingDeposit({token: token, amount: amount, from: msg.sender, to: to, applied: false});

        emit WaitingDepositCreated(depositId, msg.sender, to, token, amount);
    }

    function applyDeposits(address token, uint256[] calldata depositIds) external onlyRole(RELAYER_ROLE) {
        uint256 length = depositIds.length;

        Bridge.DepositParams[] memory params = new Bridge.DepositParams[](length);

        for (uint256 i = 0; i < length; ++i) {
            uint256 id = depositIds[i];
            WaitingDeposit storage d = deposits[id];

            if (d.amount == 0) revert DepositDoesNotExist();
            if (d.applied) revert DepositAlreadyApplied();
            if (d.token != token) revert TokenMismatch();

            d.applied = true;

            params[i] = Bridge.DepositParams({from: address(this), to: d.to, amount: d.amount});

            emit WaitingDepositApplied(id);
        }

        _ensureApproval(token);

        Bridge.PermitParams[] memory emptyPermits = new Bridge.PermitParams[](0);
        bridge.batchDepositAndCall(token, params, emptyPermits, callContract, 0);
    }

    function setCallContract(address _callContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        callContract = _callContract;
    }

    function withdraw(uint256 depositId) external {
        WaitingDeposit storage d = deposits[depositId];

        if (d.amount == 0) revert DepositDoesNotExist();
        if (d.applied) revert DepositAlreadyApplied();
        if (msg.sender != d.from && !hasRole(RELAYER_ROLE, msg.sender)) revert NotAuthorized();

        d.applied = true;

        IERC20(d.token).safeTransfer(d.from, d.amount);

        emit WaitingDepositWithdrawn(depositId);
    }

    function _applyPermit(address token, address owner, uint256 amount, bytes calldata permit) internal {
        if (permit.length == 0) return;
        if (permit.length != PERMIT_LENGTH) revert InvalidPermitLength();

        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;

        assembly {
            deadline := calldataload(permit.offset)
            v := byte(0, calldataload(add(permit.offset, 32)))
            r := calldataload(add(permit.offset, 33))
            s := calldataload(add(permit.offset, 65))
        }

        try IERC20Permit(token).permit(owner, address(this), amount, deadline, v, r, s) {} catch {}
    }

    function _ensureApproval(address token) internal {
        if (!_approvedTokens[token]) {
            IERC20(token).approve(address(bridge), type(uint256).max);
            _approvedTokens[token] = true;
        }
    }
}
