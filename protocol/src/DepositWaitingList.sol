// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Bridge} from "./Bridge.sol";

contract DepositWaitingList is AccessControl {
    using SafeERC20 for IERC20;

    error InvalidToAddress();
    error InvalidAmount();
    error DepositAlreadyApplied();
    error DepositDoesNotExist();
    error TokenMismatch();

    event WaitingDepositCreated(
        uint256 indexed depositId, address indexed from, address to, address token, uint256 amount
    );
    event WaitingDepositApplied(uint256 indexed depositId);

    struct WaitingDeposit {
        address token;
        uint256 amount;
        address from;
        address to;
        bool applied;
    }

    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

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

    function deposit(address token, uint256 amount, address to) external returns (uint256 depositId) {
        if (to == address(0)) revert InvalidToAddress();
        if (amount == 0) revert InvalidAmount();

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

    function rescueTokens(address token, address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).safeTransfer(to, amount);
    }

    function _ensureApproval(address token) internal {
        if (!_approvedTokens[token]) {
            IERC20(token).forceApprove(address(bridge), type(uint256).max);
            _approvedTokens[token] = true;
        }
    }
}
