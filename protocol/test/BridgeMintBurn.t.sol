// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BridgeBehaviorTest} from "./abstract/Bridge.t.sol";
import {BridgeMintBurn} from "pod-protocol/BridgeMintBurn.sol";
import {IBridgeMintBurn} from "pod-protocol/interfaces/IBridgeMintBurn.sol";
import {IBridge} from "pod-protocol/interfaces/IBridge.sol";
import {Bridge} from "pod-protocol/abstract/Bridge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {WrappedToken} from "pod-protocol/WrappedToken.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {EthGetLogsTypes} from "pod-sdk/types/EthGetLogsTypes.sol";
import {EthGetBlockByNumberTypes} from "pod-sdk/types/EthGetBlockByNumberTypes.sol";
import {HexUtils} from "pod-protocol/libraries/HexUtils.sol";
import {TxInfo} from "pod-sdk/Context.sol";
import {VmSafe} from "forge-std/Vm.sol";

contract BridgeMintBurnTest is BridgeBehaviorTest {
    BridgeMintBurn private _bridge;
    WrappedToken private _token;
    address immutable MIRROR_TOKEN_ADDRESS = makeAddr("mirrorToken");
    address immutable OTHER_BRIDGE_CONTRACT = makeAddr("otherBridgeContract");

    function bridge() internal view override returns (Bridge) {
        return _bridge;
    }

    function token() internal view override returns (IERC20) {
        return _token;
    }

    function setUpSuite() public override {
        vm.startPrank(admin);
        _bridge = new BridgeMintBurn(OTHER_BRIDGE_CONTRACT, nativeTokenLimits, 1);

        _token = WrappedToken(
            _bridge.createAndWhitelistMirrorToken(
                "Token", "TKN", address(0), address(MIRROR_TOKEN_ADDRESS), 18, tokenLimits
            )
        );
        vm.stopPrank();

        vm.prank(address(_bridge));
        _token.mint(user, INITIAL_BALANCE);

        vm.prank(user);
        _token.approve(address(_bridge), type(uint256).max);

        _mockTxInfo(TxInfo({txHash: bytes32(0), nonce: 0}));
    }

    function test_DepositNative_EmitsEvent() public {
        vm.deal(user, DEPOSIT_AMOUNT);
        vm.expectEmit(true, true, true, true);
        assertEq(address(bridge()).balance, 0);
        emit IBridgeMintBurn.BurnNative(user, DEPOSIT_AMOUNT);
        vm.expectEmit(true, false, false, true);
        emit IBridge.DepositNative(0, DEPOSIT_AMOUNT, user);
        vm.prank(user);
        bridge().depositNative{value: DEPOSIT_AMOUNT}();
        assertEq(address(0).balance, DEPOSIT_AMOUNT);
        assertEq(address(bridge()).balance, 0);
    }

    function test_Deposit_BurnsFromUser() public {
        uint256 ub = _token.balanceOf(user);
        uint256 ts = _token.totalSupply();
        vm.prank(user);
        _mockTxInfo(TxInfo({txHash: bytes32(0), nonce: 0}));
        bridge().deposit(address(_token), DEPOSIT_AMOUNT);
        assertEq(_token.balanceOf(user), ub - DEPOSIT_AMOUNT);
        assertEq(_token.totalSupply(), ts - DEPOSIT_AMOUNT);
    }

    function test_Claim_SingleLog_MintsToRecipient() public {
        EthGetLogsTypes.RpcLog[] memory logs = new EthGetLogsTypes.RpcLog[](1);
        logs[0] = _makeLog(0, MIRROR_TOKEN_ADDRESS, DEPOSIT_AMOUNT, user);
        _mockEthGetLogs(0, 1, 1, MIRROR_TOKEN_ADDRESS, logs);
        _mockEthGetBlockByNumber(2);
        _mockTxInfo(TxInfo({txHash: bytes32(0), nonce: 0}));
        uint256 initial_balance = _token.balanceOf(user);

        vm.expectEmit(true, false, false, true);
        emit IBridge.Claim(0, address(_token), MIRROR_TOKEN_ADDRESS, DEPOSIT_AMOUNT, user);
        _bridge.claim(0, MIRROR_TOKEN_ADDRESS, 1);

        assertEq(_token.balanceOf(user), initial_balance + DEPOSIT_AMOUNT);

        (, IBridge.TokenUsage memory depositUsage, IBridge.TokenUsage memory claimUsage) =
            bridge().tokenData(address(_token));

        assertEq(depositUsage.consumed, 0);
        assertEq(claimUsage.consumed, DEPOSIT_AMOUNT);
    }

    function test_Claim_RevertIfDailyLimitExhausted() public {
        EthGetLogsTypes.RpcLog[] memory logs = new EthGetLogsTypes.RpcLog[](1);
        logs[0] = _makeLog(0, MIRROR_TOKEN_ADDRESS, tokenLimits.claim + 1, user);
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(0, 1, 1, MIRROR_TOKEN_ADDRESS, logs);
        vm.expectRevert(abi.encodeWithSelector(IBridge.DailyLimitExhausted.selector));
        _bridge.claim(bytes32(0), MIRROR_TOKEN_ADDRESS, 1);
    }

    // TODO: redundant test, remove if the check is removed again.
    // function test_Claim_RevertIfInvalidBridgeContract() public {
    //     EthGetLogsTypes.RpcLog[] memory logs = new EthGetLogsTypes.RpcLog[](1);
    //     logs[0] = _makeLog(0, MIRROR_TOKEN_ADDRESS, DEPOSIT_AMOUNT, recipient);
    //     logs[0].addr = address(0xBEEF);
    //     _mockEthGetBlockByNumber(1);
    //     _mockEthGetLogs(0, 1, 1, MIRROR_TOKEN_ADDRESS, logs);
    //     vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidBridgeContract.selector));
    //     _bridge.claim(0, MIRROR_TOKEN_ADDRESS, 1);
    // }

    function test_Claim_RevertIfDailyLimitExhausted_ButSucceedAfterOneDay() public {
        EthGetLogsTypes.RpcLog[] memory logs = new EthGetLogsTypes.RpcLog[](1);
        logs[0] = _makeLog(0, MIRROR_TOKEN_ADDRESS, DEPOSIT_AMOUNT, user);
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(0, 1, 1, MIRROR_TOKEN_ADDRESS, logs);
        _bridge.claim(bytes32(0), MIRROR_TOKEN_ADDRESS, 1);
        logs[0] = _makeLog(1, MIRROR_TOKEN_ADDRESS, tokenLimits.claim, user);
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(1, 1, 1, MIRROR_TOKEN_ADDRESS, logs);
        vm.expectRevert(abi.encodeWithSelector(IBridge.DailyLimitExhausted.selector));
        _bridge.claim(bytes32(uint256(1)), MIRROR_TOKEN_ADDRESS, 1);
        vm.warp(block.timestamp + 1 days + 1);
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(1, 1, 1, MIRROR_TOKEN_ADDRESS, logs);
        _bridge.claim(bytes32(uint256(1)), MIRROR_TOKEN_ADDRESS, 1);
    }

    function test_Claim_RevertIfNoDepositsFound() public {
        EthGetLogsTypes.RpcLog[] memory logs = new EthGetLogsTypes.RpcLog[](0);
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(0, 1, 1, MIRROR_TOKEN_ADDRESS, logs);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidDepositLog.selector));
        _bridge.claim(bytes32(0), MIRROR_TOKEN_ADDRESS, 1);
    }

    function test_Claim_RevertIfMultipleDepositsFound() public {
        EthGetLogsTypes.RpcLog[] memory logs = new EthGetLogsTypes.RpcLog[](2);
        logs[0] = _makeLog(0, MIRROR_TOKEN_ADDRESS, DEPOSIT_AMOUNT, user);
        logs[1] = _makeLog(0, MIRROR_TOKEN_ADDRESS, DEPOSIT_AMOUNT, user);
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(0, 1, 1, MIRROR_TOKEN_ADDRESS, logs);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidDepositLog.selector));
        _bridge.claim(0, MIRROR_TOKEN_ADDRESS, 1);
    }

    function test_Claim_RevertIfMirrorTokenNotFound() public {
        // Use a token not mapped in mirrorTokens
        address unknownMirror = address(0xBEEF);
        EthGetLogsTypes.RpcLog[] memory logs = new EthGetLogsTypes.RpcLog[](1);
        logs[0] = _makeLog(0, unknownMirror, DEPOSIT_AMOUNT, user);
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(0, 1, 1, unknownMirror, logs);

        vm.expectRevert(abi.encodeWithSelector(IBridge.MirrorTokenNotFound.selector));
        _bridge.claim(0, unknownMirror, 1);
    }

    function test_Claim_RevertIfBlockNotFinalized() public {
        EthGetLogsTypes.RpcLog[] memory logs = new EthGetLogsTypes.RpcLog[](1);
        logs[0] = _makeLog(0, MIRROR_TOKEN_ADDRESS, DEPOSIT_AMOUNT, user);
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(0, 1, 1, MIRROR_TOKEN_ADDRESS, logs);
        vm.expectRevert(abi.encodeWithSelector(IBridgeMintBurn.BlockNotFinalized.selector));
        _bridge.claim(0, MIRROR_TOKEN_ADDRESS, 10);
    }

    function test_Claim_RevertIfAlreadyProcessed() public {
        EthGetLogsTypes.RpcLog[] memory logs = new EthGetLogsTypes.RpcLog[](1);
        logs[0] = _makeLog(0, MIRROR_TOKEN_ADDRESS, DEPOSIT_AMOUNT, user);
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(0, 1, 1, MIRROR_TOKEN_ADDRESS, logs);
        _bridge.claim(0, MIRROR_TOKEN_ADDRESS, 1);

        // Mock again with same log so requestId is identical
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(0, 1, 1, MIRROR_TOKEN_ADDRESS, logs);
        // record that no logs are emitted
        vm.recordLogs();
        vm.prank(user);
        _bridge.claim(0, MIRROR_TOKEN_ADDRESS, 1);
        // confirm that nothing happens when the request is already processed
        VmSafe.Log[] memory recordedLogs = vm.getRecordedLogs();
        assertEq(recordedLogs.length, 0);
    }

    function test_Claim_RevertIfPaused() public {
        vm.prank(admin);
        _bridge.pause();
        vm.expectRevert(abi.encodeWithSelector(Pausable.EnforcedPause.selector));
        _bridge.claim(0, MIRROR_TOKEN_ADDRESS, 1);
    }

    function test_Claim_RevertIfInvalidLog() public {
        EthGetLogsTypes.RpcLog[] memory logs = new EthGetLogsTypes.RpcLog[](2);
        logs[0] = _makeLog(0, MIRROR_TOKEN_ADDRESS, DEPOSIT_AMOUNT, user);
        logs[1] = _makeLog(1, MIRROR_TOKEN_ADDRESS, DEPOSIT_AMOUNT, user);
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(0, 1, 1, MIRROR_TOKEN_ADDRESS, logs);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidDepositLog.selector));
        _bridge.claim(0, MIRROR_TOKEN_ADDRESS, 1);

        logs = new EthGetLogsTypes.RpcLog[](0);
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(0, 1, 1, MIRROR_TOKEN_ADDRESS, logs);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidDepositLog.selector));
        _bridge.claim(0, MIRROR_TOKEN_ADDRESS, 1);
    }

    function test_Claim_RevertIfPrecompileCallFails() public {
        _mockEthGetBlockByNumber(1);
        EthGetLogsTypes.PrecompileArgs memory args = _buildArgs(0, 1, 1, MIRROR_TOKEN_ADDRESS);
        podMockEthGetLogsRevert(abi.encode(args.chainId, args.ethGetLogsArgs));

        vm.expectRevert(abi.encodeWithSelector(IBridgeMintBurn.PrecompileCallFailed.selector));
        _bridge.claim(0, MIRROR_TOKEN_ADDRESS, 1);
    }

    function test_ClaimNative() public {
        EthGetLogsTypes.RpcLog[] memory logs = new EthGetLogsTypes.RpcLog[](1);
        logs[0] = _makeLog(0, address(0), DEPOSIT_AMOUNT, user);
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(0, 1, 1, address(0), logs);
        _mockMintBalance(user, DEPOSIT_AMOUNT);

        vm.expectEmit(true, false, false, true);
        emit IBridge.ClaimNative(0, DEPOSIT_AMOUNT, user);
        vm.prank(user);
        _bridge.claimNative(0, 1);
        // should be done by precompile
        assertEq(user.balance, DEPOSIT_AMOUNT);
    }

    function test_ClaimNative_RevertIfPaused() public {
        vm.prank(admin);
        _bridge.pause();
        vm.expectRevert(abi.encodeWithSelector(Pausable.EnforcedPause.selector));
        _bridge.claimNative(0, 1);
    }

    function test_ClaimNative_RevertIfInvalidLog() public {
        EthGetLogsTypes.RpcLog[] memory logs = new EthGetLogsTypes.RpcLog[](2);
        logs[0] = _makeLog(0, address(0), DEPOSIT_AMOUNT, user);
        logs[1] = _makeLog(1, address(0), DEPOSIT_AMOUNT, user);
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(0, 1, 1, address(0), logs);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidDepositLog.selector));
        vm.prank(user);
        _bridge.claimNative(0, 1);

        logs = new EthGetLogsTypes.RpcLog[](0);
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(0, 1, 1, address(0), logs);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidDepositLog.selector));
        vm.prank(user);
        _bridge.claimNative(0, 1);
    }

    function test_ClaimNative_RevertIfInvalidAmount() public {
        EthGetLogsTypes.RpcLog[] memory logs = new EthGetLogsTypes.RpcLog[](1);
        logs[0] = _makeLog(0, address(0), nativeTokenLimits.minAmount - 1, user);
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(0, 1, 1, address(0), logs);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenAmount.selector));
        _bridge.claimNative(0, 1);
    }

    function test_ClaimNative_TracksConsumed() public {
        EthGetLogsTypes.RpcLog[] memory logs = new EthGetLogsTypes.RpcLog[](1);
        logs[0] = _makeLog(0, address(0), DEPOSIT_AMOUNT, user);
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(0, 1, 1, address(0), logs);
        _bridge.claimNative(0, 1);
        (, IBridge.TokenUsage memory dep, IBridge.TokenUsage memory claimUsage) =
            bridge().tokenData(MOCK_ADDRESS_FOR_NATIVE_DEPOSIT);
        assertEq(claimUsage.consumed, DEPOSIT_AMOUNT);
        logs[0] = _makeLog(1, address(0), DEPOSIT_AMOUNT, user);
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(1, 1, 1, address(0), logs);
        _bridge.claimNative(bytes32(uint256(1)), 1);
        (, dep, claimUsage) = bridge().tokenData(MOCK_ADDRESS_FOR_NATIVE_DEPOSIT);
        assertEq(claimUsage.consumed, DEPOSIT_AMOUNT * 2);
    }

    function test_ClaimNative_RevertIfMoreThanClaimLimitButSucceedAfterOneDay() public {
        EthGetLogsTypes.RpcLog[] memory logs = new EthGetLogsTypes.RpcLog[](1);
        logs[0] = _makeLog(0, address(0), DEPOSIT_AMOUNT, user);
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(0, 1, 1, address(0), logs);
        _bridge.claimNative(bytes32(0), 1);
        logs[0] = _makeLog(1, address(0), nativeTokenLimits.claim, user);
        _mockEthGetBlockByNumber(2);
        _mockEthGetLogs(1, 2, 2, address(0), logs);
        vm.expectRevert(abi.encodeWithSelector(IBridge.DailyLimitExhausted.selector));
        _bridge.claimNative(bytes32(uint256(1)), 2);
        vm.warp(block.timestamp + 1 days + 1);
        _mockEthGetBlockByNumber(2);
        _mockEthGetLogs(1, 2, 2, address(0), logs);
        _bridge.claimNative(bytes32(uint256(1)), 2);
    }

    function test_ClaimNative_RevertIfBlockNotFinalized() public {
        EthGetLogsTypes.RpcLog[] memory logs = new EthGetLogsTypes.RpcLog[](1);
        logs[0] = _makeLog(0, address(0), DEPOSIT_AMOUNT, user);
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(0, 1, 1, address(0), logs);
        vm.expectRevert(abi.encodeWithSelector(IBridgeMintBurn.BlockNotFinalized.selector));
        _bridge.claimNative(0, 10);
    }

    // TODO: redundant test, add if the check is removed again.
    // function test_ClaimNative_RevertIfInvalidBridgeContract() public {
    //     EthGetLogsTypes.RpcLog[] memory logs = new EthGetLogsTypes.RpcLog[](1);
    //     logs[0] = _makeLog(0, address(0), DEPOSIT_AMOUNT, recipient);
    //     logs[0].addr = address(0xBEEF);
    //     _mockEthGetBlockByNumber(1);
    //     _mockEthGetLogs(0, 1, 1, address(0), logs);
    //     vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidBridgeContract.selector));
    //     _bridge.claimNative(0, 1);
    // }

    function test_ClaimNative_DoNothingIfRequestAlreadyProcessed() public {
        EthGetLogsTypes.RpcLog[] memory logs = new EthGetLogsTypes.RpcLog[](1);
        logs[0] = _makeLog(0, address(0), DEPOSIT_AMOUNT, user);
        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(0, 1, 1, address(0), logs);
        vm.expectEmit(true, false, false, true);
        emit IBridge.ClaimNative(0, DEPOSIT_AMOUNT, user);
        vm.prank(user);
        _bridge.claimNative(0, 1);

        _mockEthGetBlockByNumber(1);
        _mockEthGetLogs(0, 1, 1, address(0), logs);

        // record that no logs are emitted
        vm.recordLogs();
        vm.prank(user);
        _bridge.claimNative(0, 1);

        // confirm that nothing happens when the request is already processed
        VmSafe.Log[] memory recordedLogs = vm.getRecordedLogs();
        assertEq(recordedLogs.length, 0);
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

        // TODO: uncomment this if we decide to allow for contracts larger than 24576 gas limit. This is required!
        // assertFalse(_token.hasRole(_token.DEFAULT_ADMIN_ROLE(), address(_bridge)));
        // assertFalse(_token.hasRole(_token.MINTER_ROLE(), address(_bridge)));
        // assertFalse(_token.hasRole(_token.PAUSER_ROLE(), address(_bridge)));
    }

    function test_CreateAndWhitelistMirrorToken_NewOrExisting() public {
        address nonExisting = address(0x1234);
        vm.prank(admin);
        address created =
            _bridge.createAndWhitelistMirrorToken("Token", "TKN", address(0), address(nonExisting), 18, tokenLimits);
        assertTrue(created != address(0));
    }

    // ---------- Helpers for building logs ----------
    function _buildArgs(uint256 id, uint256 fromBlock, uint256 toBlock, address tokenAddr)
        internal
        view
        returns (EthGetLogsTypes.PrecompileArgs memory)
    {
        bytes memory fromBlockBytes = HexUtils.toBytesMinimal(fromBlock);
        bytes memory toBlockBytes = HexUtils.toBytesMinimal(toBlock);
        EthGetLogsTypes.RpcArgs memory inner = EthGetLogsTypes.RpcArgs({
            fromBlock: fromBlockBytes,
            toBlock: toBlockBytes,
            addr: address(OTHER_BRIDGE_CONTRACT),
            blockHash: bytes32(0),
            topics: _buildTopics(id, tokenAddr)
        });
        return EthGetLogsTypes.PrecompileArgs({chainId: 1, ethGetLogsArgs: inner});
    }

    function _mockEthGetLogs(
        uint256 id,
        uint256 fromBlock,
        uint256 toBlock,
        address tokenAddr,
        EthGetLogsTypes.RpcLog[] memory logs
    ) internal {
        EthGetLogsTypes.PrecompileArgs memory args = _buildArgs(id, fromBlock, toBlock, tokenAddr);
        podMockEthGetLogs(abi.encode(args.chainId, args.ethGetLogsArgs), abi.encode(logs));
    }

    function _buildTopics(uint256 id, address tokenAddr) internal pure returns (bytes32[] memory topics) {
        if (tokenAddr == address(0)) {
            topics = new bytes32[](2);
            topics[0] = keccak256("DepositNative(uint256,uint256,address)");
            topics[1] = bytes32(id);
        } else {
            topics = new bytes32[](3);
            topics[0] = keccak256("Deposit(uint256,address,uint256,address)");
            topics[1] = bytes32(id);
            topics[2] = bytes32(uint256(uint160(tokenAddr)));
        }
    }

    function _makeLog(uint256 id, address tokenAddr, uint256 amount, address to)
        internal
        view
        returns (EthGetLogsTypes.RpcLog memory)
    {
        return EthGetLogsTypes.RpcLog({
            addr: address(OTHER_BRIDGE_CONTRACT),
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

    function _buildEthGetBlockByNumberArgs() internal pure returns (bytes memory) {
        EthGetBlockByNumberTypes.PrecompileArgs memory args = EthGetBlockByNumberTypes.PrecompileArgs(
            1, EthGetBlockByNumberTypes.RpcArgs(hex"66696e616c697a6564", false)
        );

        return abi.encode(args.chainId, args.ethGetBlockByNumberArgs);
    }

    function _buildEthGetBlockByNumberRpcBlock(uint256 blockNumber) internal pure returns (bytes memory) {
        return abi.encode(
            EthGetBlockByNumberTypes.RpcBlock({
                number: HexUtils.toBytesMinimal(blockNumber),
                difficulty: bytes(""),
                extraData: bytes(""),
                gasLimit: bytes(""),
                gasUsed: bytes(""),
                hash: bytes32(0),
                logsBloom: bytes(""),
                miner: address(0),
                mixHash: bytes32(0),
                nonce: bytes(""),
                parentHash: bytes32(0),
                receiptsRoot: bytes32(0),
                sha3Uncles: bytes32(0),
                size: bytes(""),
                stateRoot: bytes32(0),
                timestamp: bytes(""),
                transactions: new bytes32[](0),
                transactionsRoot: bytes32(0),
                uncles: new bytes32[](0)
            })
        );
    }

    function _mockEthGetBlockByNumber(uint256 blockNumber) internal {
        bytes memory args = _buildEthGetBlockByNumberArgs();
        bytes memory rpcBlock = _buildEthGetBlockByNumberRpcBlock(blockNumber);
        podMockEthGetBlockByNumber(args, rpcBlock);
    }

    function _mockTxInfo(TxInfo memory txInfo) internal {
        podMockTxInfo(abi.encode(txInfo));
    }

    function _mockMintBalance(address recipient, uint256 amount) internal {
        podMockMintBalance(recipient, abi.encode(amount));
    }
}
