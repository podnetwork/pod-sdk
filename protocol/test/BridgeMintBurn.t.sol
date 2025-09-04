// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BridgeBehaviorTest} from "./abstract/Bridge.t.sol";
import {BridgeMintBurn} from "../src/BridgeMintBurn.sol";
import {IBridgeMintBurn} from "../src/interfaces/IBridgeMintBurn.sol";
import {IBridge} from "../src/interfaces/IBridge.sol";
import {Bridge} from "../src/abstract/Bridge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {WrappedToken} from "../src/WrappedToken.sol";
import {MerkleTree} from "pod-sdk/verifier/MerkleTree.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract BridgeMintBurnTest is BridgeBehaviorTest {
    BridgeMintBurn private _bridge;
    WrappedToken private _token;
    address immutable _mirror = makeAddr("mirrorToken");

    function bridge() internal view override returns (Bridge) {
        return _bridge;
    }

    function token() internal view override returns (IERC20) {
        return _token;
    }

    function setUpSuite() public override {
        vm.startPrank(admin);
        _bridge = new BridgeMintBurn();

        _token = WrappedToken(
            _bridge.createAndWhitelistMirrorToken("Token", "TKN", address(0), address(_mirror), 18, tokenLimits)
        );
        vm.stopPrank();

        vm.prank(address(_bridge));
        _token.mint(user, INITIAL_BALANCE);

        vm.prank(user);
        _token.approve(address(_bridge), type(uint256).max);
    }

    function test_Deposit_BurnsFromUser() public {
        uint256 ub = _token.balanceOf(user);
        uint256 ts = _token.totalSupply();
        vm.prank(user);
        bridge().deposit(address(_token), DEPOSIT_AMOUNT, recipient);
        assertEq(_token.balanceOf(user), ub - DEPOSIT_AMOUNT);
        assertEq(_token.totalSupply(), ts - DEPOSIT_AMOUNT);
    }

    function test_Claim_SingleLog_MintsToRecipient() public {
        BridgeMintBurn.RpcLog[] memory logs = new BridgeMintBurn.RpcLog[](1);
        logs[0] = _makeLog(0, _mirror, DEPOSIT_AMOUNT, recipient);
        _mockEthGetLogs(0, bytes("0x1"), _mirror, logs);
        assertEq(_token.balanceOf(recipient), 0);

        vm.expectEmit(true, true, true, true);
        emit IBridge.Claim(0, address(_token), _mirror, DEPOSIT_AMOUNT, recipient);
        _bridge.claim(0, _mirror, bytes("0x1"));

        assertEq(_token.balanceOf(recipient), DEPOSIT_AMOUNT);

        (, IBridge.TokenUsage memory depositUsage, IBridge.TokenUsage memory claimUsage) =
            bridge().tokenData(address(_token));

        assertEq(depositUsage.consumed, 0);
        assertEq(claimUsage.consumed, DEPOSIT_AMOUNT);
    }

    function test_Claim_RevertIfDailyLimitExhausted() public {
        BridgeMintBurn.RpcLog[] memory logs = new BridgeMintBurn.RpcLog[](1);
        logs[0] = _makeLog(0, _mirror, tokenLimits.claim + 1, recipient);
        _mockEthGetLogs(0, bytes("0x1"), _mirror, logs);
        vm.expectRevert(abi.encodeWithSelector(IBridge.DailyLimitExhausted.selector));
        _bridge.claim(0, _mirror, bytes("0x1"));
    }

    function test_Claim_RevertIfDailyLimitExhausted_ButSucceedAfterOneDay() public {
        BridgeMintBurn.RpcLog[] memory logs = new BridgeMintBurn.RpcLog[](1);
        logs[0] = _makeLog(0, _mirror, DEPOSIT_AMOUNT, recipient);
        _mockEthGetLogs(0, bytes("0x1"), _mirror, logs);
        _bridge.claim(0, _mirror, bytes("0x1"));
        logs[0] = _makeLog(1, _mirror, tokenLimits.claim, recipient);
        _mockEthGetLogs(1, bytes("0x1"), _mirror, logs);
        vm.expectRevert(abi.encodeWithSelector(IBridge.DailyLimitExhausted.selector));
        _bridge.claim(1, _mirror, bytes("0x1"));
        vm.warp(block.timestamp + 1 days + 1);
        _mockEthGetLogs(1, bytes("0x1"), _mirror, logs);
        _bridge.claim(1, _mirror, bytes("0x1"));
    }

    function test_Claim_RevertIfNoDepositsFound() public {
        BridgeMintBurn.RpcLog[] memory logs = new BridgeMintBurn.RpcLog[](0);
        _mockEthGetLogs(0, bytes("0x1"), _mirror, logs);
        vm.expectRevert(abi.encodeWithSelector(IBridgeMintBurn.NoDepositsFound.selector));
        _bridge.claim(0, _mirror, bytes("0x1"));
    }

    function test_Claim_RevertIfMultipleDepositsFound() public {
        BridgeMintBurn.RpcLog[] memory logs = new BridgeMintBurn.RpcLog[](2);
        logs[0] = _makeLog(0, _mirror, DEPOSIT_AMOUNT, recipient);
        logs[1] = _makeLog(0, _mirror, DEPOSIT_AMOUNT, recipient);
        _mockEthGetLogs(0, bytes("0x1"), _mirror, logs);
        vm.expectRevert(abi.encodeWithSelector(IBridgeMintBurn.MultipleDepositsWithSameId.selector));
        _bridge.claim(0, _mirror, bytes("0x1"));
    }

    function test_Claim_RevertIfMirrorTokenNotFound() public {
        // Use a token not mapped in mirrorTokens
        address unknownMirror = address(0xBEEF);
        BridgeMintBurn.RpcLog[] memory logs = new BridgeMintBurn.RpcLog[](1);
        logs[0] = _makeLog(0, unknownMirror, DEPOSIT_AMOUNT, recipient);
        _mockEthGetLogs(0, bytes("0x1"), unknownMirror, logs);

        vm.expectRevert(abi.encodeWithSelector(IBridge.MirrorTokenNotFound.selector));
        _bridge.claim(0, unknownMirror, bytes("0x1"));
    }

    function test_Claim_RevertIfAlreadyProcessed() public {
        BridgeMintBurn.RpcLog[] memory logs = new BridgeMintBurn.RpcLog[](1);
        logs[0] = _makeLog(0, _mirror, DEPOSIT_AMOUNT, recipient);
        _mockEthGetLogs(0, bytes("0x1"), _mirror, logs);
        _bridge.claim(0, _mirror, bytes("0x1"));

        // Mock again with same log so requestId is identical
        _mockEthGetLogs(0, bytes("0x1"), _mirror, logs);
        vm.expectRevert(abi.encodeWithSelector(IBridge.RequestAlreadyProcessed.selector));
        _bridge.claim(0, _mirror, bytes("0x1"));
    }

    function test_Claim_RevertIfPaused() public {
        vm.prank(admin);
        _bridge.pause();
        vm.expectRevert(abi.encodeWithSelector(Pausable.EnforcedPause.selector));
        _bridge.claim(0, _mirror, bytes("0x1"));
    }

    function test_Claim_RevertIfPrecompileCallFails() public {
        BridgeMintBurn.ExternalEthGetLogsArgs memory args = _buildArgs(0, bytes("0x1"), _mirror);
        podMockEthGetLogsRevert(abi.encode(args));

        vm.expectRevert(abi.encodeWithSelector(IBridgeMintBurn.PrecompileCallFailed.selector));
        _bridge.claim(0, _mirror, bytes("0x1"));
    }

    function test_Migrate_TransfersRolesToNewBridge() public {
        vm.prank(admin);
        _bridge.pause();
        vm.prank(admin);
        _bridge.migrate(newBridge);

        // New bridge gains roles
        assertTrue(_token.hasRole(_token.DEFAULT_ADMIN_ROLE(), newBridge));
        assertTrue(_token.hasRole(_token.MINTER_ROLE(), newBridge));
        assertTrue(_token.hasRole(_token.PAUSER_ROLE(), newBridge));
        // Old bridge renounces roles
        assertFalse(_token.hasRole(_token.DEFAULT_ADMIN_ROLE(), address(_bridge)));
        assertFalse(_token.hasRole(_token.MINTER_ROLE(), address(_bridge)));
        assertFalse(_token.hasRole(_token.PAUSER_ROLE(), address(_bridge)));
    }

    function test_CreateAndWhitelistMirrorToken_NewOrExisting() public {
        address nonExisting = address(0x1234);
        vm.prank(admin);
        address created =
            _bridge.createAndWhitelistMirrorToken("Token", "TKN", address(0), address(nonExisting), 18, tokenLimits);
        assertTrue(created != address(0));
    }

    // ---------- Helpers for building logs ----------
    function _buildArgs(uint256 id, bytes memory fromBlock, address tokenAddr)
        internal
        pure
        returns (BridgeMintBurn.ExternalEthGetLogsArgs memory)
    {
        BridgeMintBurn.EthGetLogsArgs memory inner = BridgeMintBurn.EthGetLogsArgs({
            fromBlock: fromBlock,
            toBlock: hex"66696e616c697a6564",
            addr: tokenAddr,
            blockHash: bytes32(0),
            topics: _buildTopics(id, tokenAddr)
        });
        return BridgeMintBurn.ExternalEthGetLogsArgs({chainId: 1, ethGetLogsArgs: inner});
    }

    function _mockEthGetLogs(uint256 id, bytes memory fromBlock, address tokenAddr, BridgeMintBurn.RpcLog[] memory logs)
        internal
    {
        BridgeMintBurn.ExternalEthGetLogsArgs memory args = _buildArgs(id, fromBlock, tokenAddr);
        podMockEthGetLogs(abi.encode(args), abi.encode(logs));
    }

    function _buildTopics(uint256 id, address tokenAddr) internal pure returns (bytes32[] memory topics) {
        topics = new bytes32[](3);
        topics[0] = keccak256("Deposit(uint256,address,uint256,address)");
        topics[1] = bytes32(id);
        topics[2] = bytes32(uint256(uint160(tokenAddr)));
    }

    function _makeLog(uint256 id, address tokenAddr, uint256 amount, address to)
        internal
        pure
        returns (BridgeMintBurn.RpcLog memory)
    {
        return BridgeMintBurn.RpcLog({
            addr: tokenAddr,
            topics: _buildTopics(id, tokenAddr),
            data: abi.encode(amount, to),
            blockNumber: bytes(""),
            transactionHash: bytes32(0),
            transactionIndex: bytes(""),
            blockHash: bytes32(0),
            logIndex: bytes(""),
            removed: false
        });
    }
}
