// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BridgeClaimProofHelper} from "./abstract/BridgeClaimProofHelper.sol";
import {Bridge} from "../src/Bridge.sol";
import {DepositWaitingList} from "../src/DepositWaitingList.sol";
import {TimelockDeploy} from "../deploy/04_TimelockDeploy.s.sol";
import {FastAdminUpgrade} from "../deploy/05_FastAdminUpgrade.s.sol";
import {AdminHandover} from "../deploy/06_AdminHandover.s.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {ITransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/// @dev Runs the admin migration scripts (deploy/04, 05, 06) against the live bridge on an
///      Arbitrum One fork. Skipped unless ARBITRUM_RPC_URL is set.
abstract contract BridgeAdminMigrationForkBase is BridgeClaimProofHelper {
    // Live Arbitrum One deployment (deploy/01 and deploy/02).
    Bridge constant BRIDGE = Bridge(0xB77E6fB078918f255FC71E8b11A798124b7f0Fa0);
    DepositWaitingList constant WAITLIST = DepositWaitingList(0x5ca8209Da38aBa8fdCed6C1275457E597EdF2E3E);
    address constant ADMIN_SAFE = 0x34B16959F6BccEe214B370dE66674A0563F36107;
    address constant USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
    address constant USDC_ON_POD = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    uint256 constant DELAY = 72 hours;
    uint256 constant NUM_TEST_VALIDATORS = 4;

    address executor1 = makeAddr("executor1");
    address executor2 = makeAddr("executor2");
    address pauser1 = makeAddr("pauser1");
    address pauser2 = makeAddr("pauser2");
    address user = makeAddr("user");
    address attacker = makeAddr("attacker");

    TimelockController timelock;
    Bridge newImplementation;
    ProxyAdmin proxyAdmin;
    address oldImplementation;

    bytes32 defaultAdminRole;
    bytes32 fastAdminRole;
    bytes32 pauserRole;
    bytes32 relayerRole;

    // TimelockController roles, cached so reading them never consumes a prank.
    bytes32 proposerRole;
    bytes32 executorRole;
    bytes32 cancellerRole;
    bytes32 timelockAdminRole;

    /// @return forked False when ARBITRUM_RPC_URL is unset and the test was skipped.
    function _fork() internal returns (bool forked) {
        string memory rpc = vm.envOr("ARBITRUM_RPC_URL", string(""));
        if (bytes(rpc).length == 0) {
            vm.skip(true);
            return false;
        }
        vm.createSelectFork(rpc);

        proxyAdmin = ProxyAdmin(address(uint160(uint256(vm.load(address(BRIDGE), ERC1967Utils.ADMIN_SLOT)))));
        oldImplementation = _implementationOf(BRIDGE);
        defaultAdminRole = BRIDGE.DEFAULT_ADMIN_ROLE();
        pauserRole = BRIDGE.PAUSER_ROLE();
        relayerRole = BRIDGE.RELAYER_ROLE();
        fastAdminRole = keccak256("FAST_ADMIN_ROLE");
        otherBridgeContract = BRIDGE.BRIDGE_CONTRACT();
        return true;
    }

    function _implementationOf(Bridge bridge) internal view returns (address) {
        return address(uint160(uint256(vm.load(address(bridge), ERC1967Utils.IMPLEMENTATION_SLOT))));
    }

    function _executors() internal view returns (address[] memory executors) {
        executors = new address[](2);
        executors[0] = executor1;
        executors[1] = executor2;
    }

    function _pausers() internal view returns (address[] memory pausers) {
        pausers = new address[](2);
        pausers[0] = pauser1;
        pausers[1] = pauser2;
    }

    function _usdcOnly() internal pure returns (address[] memory tokens) {
        tokens = new address[](1);
        tokens[0] = USDC;
    }

    function _runStep1() internal {
        (timelock, newImplementation) = new TimelockDeploy().run(BRIDGE, ADMIN_SAFE, _executors());
        proposerRole = timelock.PROPOSER_ROLE();
        executorRole = timelock.EXECUTOR_ROLE();
        cancellerRole = timelock.CANCELLER_ROLE();
        timelockAdminRole = timelock.DEFAULT_ADMIN_ROLE();
    }

    function _runStep2() internal {
        new FastAdminUpgrade().run(BRIDGE, address(timelock), address(newImplementation), ADMIN_SAFE, _pausers());
    }

    function _runStep3() internal {
        new AdminHandover().run(BRIDGE, address(timelock));
    }

    function _unauthorized(address account, bytes32 role) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, account, role);
    }

    // ---- timelock helpers ----

    function _schedule(address target, bytes memory data) internal returns (bytes32 id) {
        id = timelock.hashOperation(target, 0, data, bytes32(0), bytes32(0));
        vm.prank(ADMIN_SAFE);
        timelock.schedule(target, 0, data, bytes32(0), bytes32(0), DELAY);
    }

    function _execute(address executor, address target, bytes memory data) internal {
        vm.prank(executor);
        timelock.execute(target, 0, data, bytes32(0), bytes32(0));
    }

    /// @dev The full path of a timelocked operation: the Safe schedules, 72h pass, an executor runs it.
    function _viaTimelock(address target, bytes memory data) internal {
        _schedule(target, data);
        skip(DELAY);
        _execute(executor1, target, data);
    }

    // ---- claim helpers ----

    /// @dev The fast admin adds test validators and sets the resilience so they alone form a quorum.
    function _installTestValidators() internal {
        address[] memory add = new address[](NUM_TEST_VALIDATORS);
        validatorPrivateKeys = new uint256[](NUM_TEST_VALIDATORS);
        for (uint256 i = 0; i < NUM_TEST_VALIDATORS; i++) {
            validatorPrivateKeys[i] = uint256(keccak256(abi.encode("test validator", i)));
            add[i] = vm.addr(validatorPrivateKeys[i]);
        }
        uint64 resilience = BRIDGE.validatorCount();
        uint256 version = BRIDGE.version();
        bytes32 merkleRoot = BRIDGE.merkleRoot();
        vm.prank(ADMIN_SAFE);
        BRIDGE.updateValidatorConfig(resilience, version, merkleRoot, add, new address[](0));
    }

    function _claim(uint256 amount, address to) internal {
        (, bytes memory proof, bytes memory aux) =
            createTokenClaimProof(USDC_ON_POD, amount, to, NUM_TEST_VALIDATORS, BRIDGE.domainSeparator());
        BRIDGE.claim(USDC, amount, to, proof, aux);
    }
}

/// @dev Each migration step on its own: ordering, and that nothing is lost before the last step.
contract BridgeAdminMigrationStepsForkTest is BridgeAdminMigrationForkBase {
    function setUp() public {
        _fork();
    }

    function test_Fork_LiveState_MatchesWhatTheScriptsAssume() public view {
        assertEq(block.chainid, 42161);
        assertEq(proxyAdmin.owner(), ADMIN_SAFE);
        assertGt(ADMIN_SAFE.code.length, 0, "admin is expected to be a Safe");
        assertTrue(BRIDGE.hasRole(defaultAdminRole, ADMIN_SAFE));
        assertTrue(BRIDGE.hasRole(pauserRole, ADMIN_SAFE));
        assertTrue(BRIDGE.hasRole(relayerRole, address(WAITLIST)));
        assertEq(address(WAITLIST.bridge()), address(BRIDGE));
        assertTrue(WAITLIST.hasRole(WAITLIST.DEFAULT_ADMIN_ROLE(), ADMIN_SAFE));
        (uint256 minAmount,,,,, address mirror) = BRIDGE.tokenData(USDC);
        assertGt(minAmount, 0);
        assertEq(mirror, USDC_ON_POD);
    }

    // ---- step 1 ----

    function test_Fork_Step1_DeploysTimelockAndImplementation() public {
        _runStep1();

        assertEq(timelock.getMinDelay(), DELAY);
        assertTrue(timelock.hasRole(proposerRole, ADMIN_SAFE));
        assertTrue(timelock.hasRole(cancellerRole, ADMIN_SAFE));
        assertFalse(timelock.hasRole(executorRole, ADMIN_SAFE));
        assertTrue(timelock.hasRole(executorRole, executor1));
        assertTrue(timelock.hasRole(executorRole, executor2));
        assertFalse(timelock.hasRole(executorRole, address(0)));
        assertFalse(timelock.hasRole(proposerRole, executor1));
        assertFalse(timelock.hasRole(cancellerRole, executor1));

        // Only the timelock can change its own roles.
        assertTrue(timelock.hasRole(timelockAdminRole, address(timelock)));
        assertFalse(timelock.hasRole(timelockAdminRole, ADMIN_SAFE));
        assertFalse(timelock.hasRole(timelockAdminRole, address(this)));
        assertFalse(timelock.hasRole(timelockAdminRole, msg.sender));
        assertFalse(timelock.hasRole(timelockAdminRole, tx.origin));

        assertEq(newImplementation.BRIDGE_CONTRACT(), BRIDGE.BRIDGE_CONTRACT());
        assertEq(newImplementation.CHAIN_ID(), BRIDGE.CHAIN_ID());
        assertEq(newImplementation.FAST_ADMIN_ROLE(), fastAdminRole);

        // Nothing on the bridge changed.
        assertEq(_implementationOf(BRIDGE), oldImplementation);
        assertEq(proxyAdmin.owner(), ADMIN_SAFE);
    }

    // ---- step 2 ----

    function test_Fork_Step2_GrantsRolesAndUpgrades() public {
        _runStep1();
        _runStep2();

        assertEq(_implementationOf(BRIDGE), address(newImplementation));
        assertEq(BRIDGE.FAST_ADMIN_ROLE(), fastAdminRole);
        assertTrue(BRIDGE.hasRole(fastAdminRole, ADMIN_SAFE));
        assertTrue(BRIDGE.hasRole(defaultAdminRole, address(timelock)));
        assertTrue(BRIDGE.hasRole(pauserRole, pauser1));
        assertTrue(BRIDGE.hasRole(pauserRole, pauser2));
    }

    function test_Fork_Step2_PreservesBridgeState() public {
        uint256 version = BRIDGE.version();
        bytes32 domainSeparator = BRIDGE.domainSeparator();
        bytes32 merkleRoot = BRIDGE.merkleRoot();
        uint256 depositIndex = BRIDGE.depositIndex();
        uint64 validatorCount = BRIDGE.validatorCount();
        uint64 resilience = BRIDGE.adversarialResilience();
        uint8 state = uint8(BRIDGE.contractState());
        uint256 usdcBalance = IERC20(USDC).balanceOf(address(BRIDGE));
        bytes32 tokenDataHash = _tokenDataHash();

        _runStep1();
        _runStep2();

        assertEq(BRIDGE.version(), version);
        assertEq(BRIDGE.domainSeparator(), domainSeparator);
        assertEq(BRIDGE.merkleRoot(), merkleRoot);
        assertEq(BRIDGE.depositIndex(), depositIndex);
        assertEq(BRIDGE.validatorCount(), validatorCount);
        assertEq(BRIDGE.adversarialResilience(), resilience);
        assertEq(uint8(BRIDGE.contractState()), state);
        assertEq(IERC20(USDC).balanceOf(address(BRIDGE)), usdcBalance);
        assertEq(_tokenDataHash(), tokenDataHash);
        assertTrue(BRIDGE.hasRole(relayerRole, address(WAITLIST)));
    }

    function _tokenDataHash() internal view returns (bytes32) {
        (
            uint256 minAmount,
            uint256 depositLimit,
            uint256 claimLimit,
            Bridge.TokenUsage memory depositUsage,
            Bridge.TokenUsage memory claimUsage,
            address mirror
        ) = BRIDGE.tokenData(USDC);
        return keccak256(abi.encode(minAmount, depositLimit, claimLimit, depositUsage, claimUsage, mirror));
    }

    /// @dev Until step 3 the old admin keeps everything, so step 2 can be rolled back.
    function test_Fork_Step2_IsReversible() public {
        _runStep1();
        _runStep2();

        assertEq(proxyAdmin.owner(), ADMIN_SAFE);
        assertTrue(BRIDGE.hasRole(defaultAdminRole, ADMIN_SAFE));
        assertTrue(BRIDGE.hasRole(pauserRole, ADMIN_SAFE));

        vm.startPrank(ADMIN_SAFE);
        BRIDGE.revokeRole(defaultAdminRole, address(timelock));
        BRIDGE.revokeRole(fastAdminRole, ADMIN_SAFE);
        BRIDGE.revokeRole(pauserRole, pauser1);
        BRIDGE.revokeRole(pauserRole, pauser2);
        proxyAdmin.upgradeAndCall(ITransparentUpgradeableProxy(address(BRIDGE)), oldImplementation, "");
        vm.stopPrank();

        assertEq(_implementationOf(BRIDGE), oldImplementation);
        assertFalse(BRIDGE.hasRole(defaultAdminRole, address(timelock)));
        // Back on the old code the single admin has every power again.
        vm.prank(ADMIN_SAFE);
        BRIDGE.setCallContractWhitelist(address(0xCA11), true);
        assertTrue(BRIDGE.whitelistedCallContracts(address(0xCA11)));
    }

    // ---- step 3 ----

    function test_Fork_Step3_RevertIfStep2NotExecuted() public {
        _runStep1();
        AdminHandover step = new AdminHandover();
        vm.expectRevert("timelock lacks DEFAULT_ADMIN_ROLE: run step 2 first");
        step.run(BRIDGE, address(timelock));

        // The old admin still owns everything.
        assertEq(proxyAdmin.owner(), ADMIN_SAFE);
        assertTrue(BRIDGE.hasRole(defaultAdminRole, ADMIN_SAFE));
    }

    function test_Fork_Step3_HandsOverToTimelock() public {
        _runStep1();
        _runStep2();
        _runStep3();

        assertEq(proxyAdmin.owner(), address(timelock));
        assertTrue(BRIDGE.hasRole(defaultAdminRole, address(timelock)));
        assertFalse(BRIDGE.hasRole(defaultAdminRole, ADMIN_SAFE));
        assertFalse(BRIDGE.hasRole(pauserRole, ADMIN_SAFE));
        assertTrue(BRIDGE.hasRole(fastAdminRole, ADMIN_SAFE));
    }

    function test_Fork_Step3_RevertIfRunTwice() public {
        _runStep1();
        _runStep2();
        _runStep3();
        AdminHandover step = new AdminHandover();
        vm.expectRevert("already handed over");
        step.run(BRIDGE, address(timelock));
    }
}

/// @dev The bridge after all three steps: who can do what, and what a stolen key can reach.
contract BridgeAdminMigrationForkTest is BridgeAdminMigrationForkBase {
    function setUp() public {
        if (!_fork()) return;
        _runStep1();
        _runStep2();
        _runStep3();
    }

    // ========== Final wiring ==========

    function test_Fork_FinalRoles() public view {
        assertEq(proxyAdmin.owner(), address(timelock));
        assertEq(_implementationOf(BRIDGE), address(newImplementation));

        assertTrue(BRIDGE.hasRole(defaultAdminRole, address(timelock)));
        assertFalse(BRIDGE.hasRole(fastAdminRole, address(timelock)));
        assertFalse(BRIDGE.hasRole(pauserRole, address(timelock)));

        assertTrue(BRIDGE.hasRole(fastAdminRole, ADMIN_SAFE));
        assertFalse(BRIDGE.hasRole(defaultAdminRole, ADMIN_SAFE));
        assertFalse(BRIDGE.hasRole(pauserRole, ADMIN_SAFE));

        address[2] memory pausers = [pauser1, pauser2];
        address[2] memory executors = [executor1, executor2];
        for (uint256 i = 0; i < 2; i++) {
            assertTrue(BRIDGE.hasRole(pauserRole, pausers[i]));
            assertFalse(BRIDGE.hasRole(defaultAdminRole, pausers[i]));
            assertFalse(BRIDGE.hasRole(fastAdminRole, pausers[i]));
            assertFalse(timelock.hasRole(executorRole, pausers[i]));

            assertTrue(timelock.hasRole(executorRole, executors[i]));
            assertFalse(BRIDGE.hasRole(defaultAdminRole, executors[i]));
            assertFalse(BRIDGE.hasRole(fastAdminRole, executors[i]));
            assertFalse(BRIDGE.hasRole(pauserRole, executors[i]));
        }

        assertTrue(BRIDGE.hasRole(relayerRole, address(WAITLIST)));
    }

    // ========== Fast admin (the Safe, no delay) ==========

    function test_Fork_FastAdmin_CanUpdateValidatorConfig() public {
        uint64 countBefore = BRIDGE.validatorCount();
        _installTestValidators();
        assertEq(BRIDGE.validatorCount(), countBefore + NUM_TEST_VALIDATORS);
    }

    function test_Fork_FastAdmin_CannotWhitelistTokenOrCallContract() public {
        vm.startPrank(ADMIN_SAFE);
        vm.expectRevert(_unauthorized(ADMIN_SAFE, defaultAdminRole));
        BRIDGE.whiteListToken(makeAddr("newToken"), makeAddr("newTokenOnPod"), 1e6, 100e6, 100e6);
        vm.expectRevert(_unauthorized(ADMIN_SAFE, defaultAdminRole));
        BRIDGE.setCallContractWhitelist(address(0xCA11), true);
        vm.stopPrank();
    }

    function test_Fork_FastAdmin_CanSwitchStatesAndUnpause() public {
        vm.prank(pauser1);
        BRIDGE.setState(Bridge.ContractState.Paused);

        vm.startPrank(ADMIN_SAFE);
        BRIDGE.setState(Bridge.ContractState.Private);
        BRIDGE.setState(Bridge.ContractState.Public);
        BRIDGE.setState(Bridge.ContractState.Paused);
        BRIDGE.setState(Bridge.ContractState.Private);
        vm.expectRevert(Bridge.ContractMigrated.selector);
        BRIDGE.setState(Bridge.ContractState.Migrated);
        vm.stopPrank();

        assertEq(uint8(BRIDGE.contractState()), uint8(Bridge.ContractState.Private));
    }

    function test_Fork_FastAdmin_CannotUseTimelockedOperations() public {
        vm.startPrank(ADMIN_SAFE);

        vm.expectRevert(_unauthorized(ADMIN_SAFE, defaultAdminRole));
        BRIDGE.configureToken(USDC, 1, type(uint256).max, type(uint256).max);

        BRIDGE.setState(Bridge.ContractState.Paused);
        vm.expectRevert(_unauthorized(ADMIN_SAFE, defaultAdminRole));
        BRIDGE.migrate(attacker);

        bytes32[4] memory roles = [defaultAdminRole, fastAdminRole, pauserRole, relayerRole];
        for (uint256 i = 0; i < roles.length; i++) {
            vm.expectRevert(_unauthorized(ADMIN_SAFE, defaultAdminRole));
            BRIDGE.grantRole(roles[i], ADMIN_SAFE);
        }
        vm.expectRevert(_unauthorized(ADMIN_SAFE, defaultAdminRole));
        BRIDGE.revokeRole(pauserRole, pauser1);

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, ADMIN_SAFE));
        proxyAdmin.upgradeAndCall(ITransparentUpgradeableProxy(address(BRIDGE)), oldImplementation, "");
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, ADMIN_SAFE));
        proxyAdmin.transferOwnership(ADMIN_SAFE);

        vm.stopPrank();
    }

    // ========== Pausers (hot keys) ==========

    function test_Fork_Pauser_CanOnlyPause() public {
        vm.startPrank(pauser2);
        BRIDGE.setState(Bridge.ContractState.Paused);
        assertEq(uint8(BRIDGE.contractState()), uint8(Bridge.ContractState.Paused));

        vm.expectRevert(_unauthorized(pauser2, defaultAdminRole));
        BRIDGE.setState(Bridge.ContractState.Private);
        vm.expectRevert(_unauthorized(pauser2, defaultAdminRole));
        BRIDGE.setState(Bridge.ContractState.Public);
        vm.expectRevert(_unauthorized(pauser2, defaultAdminRole));
        BRIDGE.migrate(attacker);
        vm.expectRevert(_unauthorized(pauser2, fastAdminRole));
        BRIDGE.updateValidatorConfig(0, 2, bytes32(0), new address[](0), new address[](0));
        vm.expectRevert(_unauthorized(pauser2, defaultAdminRole));
        BRIDGE.setCallContractWhitelist(address(0xCA11), true);
        vm.expectRevert(_unauthorized(pauser2, defaultAdminRole));
        BRIDGE.configureToken(USDC, 1, 1, 1);
        vm.stopPrank();

        vm.prank(pauser2);
        vm.expectRevert(_unauthorized(pauser2, proposerRole));
        timelock.schedule(address(BRIDGE), 0, "", bytes32(0), bytes32(0), DELAY);
    }

    function test_Fork_Pause_StopsClaimsUntilFastAdminUnpauses() public {
        _installTestValidators();
        deal(USDC, address(BRIDGE), 1_000e6);
        (uint256 minAmount,,,,,) = BRIDGE.tokenData(USDC);

        vm.prank(pauser1);
        BRIDGE.setState(Bridge.ContractState.Paused);

        (, bytes memory proof, bytes memory aux) =
            createTokenClaimProof(USDC_ON_POD, minAmount, user, NUM_TEST_VALIDATORS, BRIDGE.domainSeparator());
        vm.expectRevert(Bridge.ContractPaused.selector);
        BRIDGE.claim(USDC, minAmount, user, proof, aux);

        vm.prank(ADMIN_SAFE);
        BRIDGE.setState(Bridge.ContractState.Private);
        BRIDGE.claim(USDC, minAmount, user, proof, aux);
        assertEq(IERC20(USDC).balanceOf(user), minAmount);
    }

    // ========== Timelock: scheduling ==========

    function test_Fork_Timelock_OnlyAdminSafeCanSchedule() public {
        bytes memory data = abi.encodeCall(BRIDGE.grantRole, (pauserRole, attacker));
        address[3] memory others = [executor1, pauser1, attacker];
        for (uint256 i = 0; i < others.length; i++) {
            vm.prank(others[i]);
            vm.expectRevert(_unauthorized(others[i], proposerRole));
            timelock.schedule(address(BRIDGE), 0, data, bytes32(0), bytes32(0), DELAY);
        }

        bytes32 id = _schedule(address(BRIDGE), data);
        assertTrue(timelock.isOperationPending(id));
        assertFalse(timelock.isOperationReady(id));
    }

    function test_Fork_Timelock_CannotScheduleWithShorterDelay() public {
        bytes memory data = abi.encodeCall(BRIDGE.grantRole, (pauserRole, attacker));
        vm.prank(ADMIN_SAFE);
        vm.expectRevert(abi.encodeWithSelector(TimelockController.TimelockInsufficientDelay.selector, DELAY - 1, DELAY));
        timelock.schedule(address(BRIDGE), 0, data, bytes32(0), bytes32(0), DELAY - 1);
    }

    // ========== Timelock: executing ==========

    function test_Fork_Timelock_CannotExecuteBeforeDelay() public {
        bytes memory data = abi.encodeCall(BRIDGE.configureToken, (USDC, 1e6, 1e12, 1e12));
        _schedule(address(BRIDGE), data);

        skip(DELAY - 1);
        vm.prank(executor1);
        vm.expectPartialRevert(TimelockController.TimelockUnexpectedOperationState.selector);
        timelock.execute(address(BRIDGE), 0, data, bytes32(0), bytes32(0));

        skip(1);
        _execute(executor1, address(BRIDGE), data);
        (,, uint256 claimLimit,,,) = BRIDGE.tokenData(USDC);
        assertEq(claimLimit, 1e12);
    }

    function test_Fork_Timelock_OnlyExecutorsCanExecute() public {
        bytes memory data = abi.encodeCall(BRIDGE.configureToken, (USDC, 1e6, 1e12, 1e12));
        bytes32 id = _schedule(address(BRIDGE), data);
        skip(DELAY);
        assertTrue(timelock.isOperationReady(id));

        address[3] memory others = [ADMIN_SAFE, pauser1, attacker];
        for (uint256 i = 0; i < others.length; i++) {
            vm.prank(others[i]);
            vm.expectRevert(_unauthorized(others[i], executorRole));
            timelock.execute(address(BRIDGE), 0, data, bytes32(0), bytes32(0));
        }

        // Either executor works, so one of them refusing or being lost blocks nothing.
        _execute(executor2, address(BRIDGE), data);
        assertTrue(timelock.isOperationDone(id));
    }

    function test_Fork_Timelock_ExecutorCannotRunWhatWasNotScheduled() public {
        bytes memory data = abi.encodeCall(BRIDGE.grantRole, (defaultAdminRole, executor1));
        vm.prank(executor1);
        vm.expectPartialRevert(TimelockController.TimelockUnexpectedOperationState.selector);
        timelock.execute(address(BRIDGE), 0, data, bytes32(0), bytes32(0));

        // Nor a different call from the one that was scheduled.
        _schedule(address(BRIDGE), abi.encodeCall(BRIDGE.grantRole, (pauserRole, executor1)));
        skip(DELAY);
        vm.prank(executor1);
        vm.expectPartialRevert(TimelockController.TimelockUnexpectedOperationState.selector);
        timelock.execute(address(BRIDGE), 0, data, bytes32(0), bytes32(0));
    }

    function test_Fork_Timelock_ExecutorHasNoDirectPowers() public {
        vm.startPrank(executor1);
        vm.expectRevert(_unauthorized(executor1, defaultAdminRole));
        BRIDGE.configureToken(USDC, 1, 1, 1);
        vm.expectRevert(_unauthorized(executor1, defaultAdminRole));
        BRIDGE.grantRole(defaultAdminRole, executor1);
        vm.expectRevert(_unauthorized(executor1, defaultAdminRole));
        BRIDGE.setState(Bridge.ContractState.Paused);
        vm.expectRevert(_unauthorized(executor1, fastAdminRole));
        BRIDGE.updateValidatorConfig(0, 2, bytes32(0), new address[](0), new address[](0));
        vm.expectRevert(_unauthorized(executor1, defaultAdminRole));
        BRIDGE.setCallContractWhitelist(address(0xCA11), true);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, executor1));
        proxyAdmin.upgradeAndCall(ITransparentUpgradeableProxy(address(BRIDGE)), oldImplementation, "");
        vm.stopPrank();
    }

    // ========== Timelock: cancelling ==========

    function test_Fork_Timelock_AdminSafeCanCancelItsOwnOperation() public {
        bytes memory data = abi.encodeCall(BRIDGE.grantRole, (pauserRole, attacker));
        bytes32 id = _schedule(address(BRIDGE), data);

        vm.prank(ADMIN_SAFE);
        timelock.cancel(id);
        assertFalse(timelock.isOperation(id));

        skip(DELAY);
        vm.prank(executor1);
        vm.expectPartialRevert(TimelockController.TimelockUnexpectedOperationState.selector);
        timelock.execute(address(BRIDGE), 0, data, bytes32(0), bytes32(0));
    }

    function test_Fork_Timelock_NobodyElseCanCancel() public {
        bytes32 id = _schedule(address(BRIDGE), abi.encodeCall(BRIDGE.grantRole, (pauserRole, attacker)));
        address[3] memory others = [executor1, pauser1, attacker];
        for (uint256 i = 0; i < others.length; i++) {
            vm.prank(others[i]);
            vm.expectRevert(_unauthorized(others[i], cancellerRole));
            timelock.cancel(id);
        }
    }

    // ========== Timelock: the four timelocked operations ==========

    function test_Fork_Timelocked_ConfigureToken() public {
        _viaTimelock(address(BRIDGE), abi.encodeCall(BRIDGE.configureToken, (USDC, 7e6, 8e12, 9e12)));
        (uint256 minAmount, uint256 depositLimit, uint256 claimLimit,,,) = BRIDGE.tokenData(USDC);
        assertEq(minAmount, 7e6);
        assertEq(depositLimit, 8e12);
        assertEq(claimLimit, 9e12);
    }

    function test_Fork_Timelocked_GrantAndRevokeRoles() public {
        address newPauser = makeAddr("newPauser");
        address newFastAdmin = makeAddr("newFastAdmin");

        _viaTimelock(address(BRIDGE), abi.encodeCall(BRIDGE.grantRole, (pauserRole, newPauser)));
        _viaTimelock(address(BRIDGE), abi.encodeCall(BRIDGE.revokeRole, (pauserRole, pauser1)));
        _viaTimelock(address(BRIDGE), abi.encodeCall(BRIDGE.grantRole, (fastAdminRole, newFastAdmin)));
        _viaTimelock(address(BRIDGE), abi.encodeCall(BRIDGE.revokeRole, (fastAdminRole, ADMIN_SAFE)));

        assertTrue(BRIDGE.hasRole(pauserRole, newPauser));
        assertFalse(BRIDGE.hasRole(pauserRole, pauser1));

        // A stolen hot key is removed, and a compromised fast admin can be replaced.
        vm.prank(pauser1);
        vm.expectRevert(_unauthorized(pauser1, defaultAdminRole));
        BRIDGE.setState(Bridge.ContractState.Paused);

        vm.prank(ADMIN_SAFE);
        vm.expectRevert(_unauthorized(ADMIN_SAFE, defaultAdminRole));
        BRIDGE.setState(Bridge.ContractState.Paused);
        vm.prank(newFastAdmin);
        BRIDGE.setState(Bridge.ContractState.Paused);
        assertEq(uint8(BRIDGE.contractState()), uint8(Bridge.ContractState.Paused));
    }

    function test_Fork_Timelocked_WhitelistTokenAndCallContract() public {
        address newToken = makeAddr("newToken");
        _viaTimelock(
            address(BRIDGE),
            abi.encodeCall(BRIDGE.whiteListToken, (newToken, makeAddr("newTokenOnPod"), 1e6, 100e6, 100e6))
        );
        _viaTimelock(address(BRIDGE), abi.encodeCall(BRIDGE.setCallContractWhitelist, (address(0xCA11), true)));

        (uint256 minAmount,,,,,) = BRIDGE.tokenData(newToken);
        assertEq(minAmount, 1e6);
        assertTrue(BRIDGE.whitelistedCallContracts(address(0xCA11)));
    }

    function test_Fork_Timelocked_Upgrade() public {
        Bridge nextImplementation = new Bridge(BRIDGE.BRIDGE_CONTRACT(), BRIDGE.CHAIN_ID());
        uint256 depositIndex = BRIDGE.depositIndex();

        _viaTimelock(
            address(proxyAdmin),
            abi.encodeCall(
                proxyAdmin.upgradeAndCall,
                (ITransparentUpgradeableProxy(address(BRIDGE)), address(nextImplementation), "")
            )
        );

        assertEq(_implementationOf(BRIDGE), address(nextImplementation));
        assertEq(BRIDGE.depositIndex(), depositIndex);
        assertTrue(BRIDGE.hasRole(fastAdminRole, ADMIN_SAFE));
    }

    /// @dev The planned migration still works end to end: pause, timelocked migrate, then the
    ///      fast admin moves the tokens to the address the timelock approved.
    function test_Fork_Timelocked_MigrateThenFastAdminTransfers() public {
        address nextBridge = makeAddr("nextBridge");
        uint256 balance = IERC20(USDC).balanceOf(address(BRIDGE));
        assertGt(balance, 0);

        vm.prank(pauser1);
        BRIDGE.setState(Bridge.ContractState.Paused);

        vm.prank(ADMIN_SAFE);
        vm.expectRevert(Bridge.ContractNotMigrated.selector);
        BRIDGE.transferTokensToMigrated(_usdcOnly());

        _viaTimelock(address(BRIDGE), abi.encodeCall(BRIDGE.migrate, (nextBridge)));
        assertEq(uint8(BRIDGE.contractState()), uint8(Bridge.ContractState.Migrated));
        assertEq(BRIDGE.migratedContract(), nextBridge);

        vm.prank(attacker);
        vm.expectRevert(_unauthorized(attacker, fastAdminRole));
        BRIDGE.transferTokensToMigrated(_usdcOnly());

        vm.prank(ADMIN_SAFE);
        BRIDGE.transferTokensToMigrated(_usdcOnly());
        assertEq(IERC20(USDC).balanceOf(nextBridge), balance);
        assertEq(IERC20(USDC).balanceOf(address(BRIDGE)), 0);
    }

    function test_Fork_Timelocked_ProxyAdminOwnershipCanMoveOnlyThroughTimelock() public {
        address nextOwner = makeAddr("nextOwner");
        _viaTimelock(address(proxyAdmin), abi.encodeCall(proxyAdmin.transferOwnership, (nextOwner)));
        assertEq(proxyAdmin.owner(), nextOwner);
    }

    // ========== Timelock: its own configuration ==========

    function test_Fork_Timelock_RolesChangeOnlyThroughItself() public {
        address[3] memory others = [ADMIN_SAFE, executor1, attacker];
        for (uint256 i = 0; i < others.length; i++) {
            vm.startPrank(others[i]);
            vm.expectRevert(_unauthorized(others[i], timelockAdminRole));
            timelock.grantRole(executorRole, others[i]);
            vm.expectRevert(_unauthorized(others[i], timelockAdminRole));
            timelock.revokeRole(executorRole, executor2);
            vm.stopPrank();
        }

        // Adding an executor is itself a timelocked operation that needs an existing executor.
        address executor3 = makeAddr("executor3");
        bytes memory data = abi.encodeCall(timelock.grantRole, (executorRole, executor3));
        _schedule(address(timelock), data);
        skip(DELAY);
        vm.prank(ADMIN_SAFE);
        vm.expectRevert(_unauthorized(ADMIN_SAFE, executorRole));
        timelock.execute(address(timelock), 0, data, bytes32(0), bytes32(0));

        _execute(executor1, address(timelock), data);
        assertTrue(timelock.hasRole(executorRole, executor3));
    }

    function test_Fork_Timelock_AdminSafeCannotMakeItselfExecutorAlone() public {
        bytes memory data = abi.encodeCall(timelock.grantRole, (executorRole, ADMIN_SAFE));
        bytes32 id = _schedule(address(timelock), data);

        skip(365 days);
        assertTrue(timelock.isOperationReady(id));
        vm.prank(ADMIN_SAFE);
        vm.expectRevert(_unauthorized(ADMIN_SAFE, executorRole));
        timelock.execute(address(timelock), 0, data, bytes32(0), bytes32(0));
        assertFalse(timelock.hasRole(executorRole, ADMIN_SAFE));
    }

    function test_Fork_Timelock_DelayChangesOnlyThroughItself() public {
        address[3] memory others = [ADMIN_SAFE, executor1, attacker];
        for (uint256 i = 0; i < others.length; i++) {
            vm.prank(others[i]);
            vm.expectRevert(abi.encodeWithSelector(TimelockController.TimelockUnauthorizedCaller.selector, others[i]));
            timelock.updateDelay(0);
        }

        _viaTimelock(address(timelock), abi.encodeCall(timelock.updateDelay, (7 days)));
        assertEq(timelock.getMinDelay(), 7 days);
    }

    // ========== What a stolen key can reach ==========

    /// @dev Before the migration the admin could pause, migrate and transfer in one transaction.
    function test_Fork_AdminSafeCompromised_OneBlockDrainIsBlocked() public {
        uint256 balance = IERC20(USDC).balanceOf(address(BRIDGE));

        vm.startPrank(ADMIN_SAFE);
        BRIDGE.setState(Bridge.ContractState.Paused);
        vm.expectRevert(_unauthorized(ADMIN_SAFE, defaultAdminRole));
        BRIDGE.migrate(attacker);
        vm.expectRevert(Bridge.ContractNotMigrated.selector);
        BRIDGE.transferTokensToMigrated(_usdcOnly());
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, ADMIN_SAFE));
        proxyAdmin.upgradeAndCall(ITransparentUpgradeableProxy(address(BRIDGE)), attacker, "");
        vm.stopPrank();

        assertEq(IERC20(USDC).balanceOf(address(BRIDGE)), balance);
    }

    /// @dev The Safe alone can queue a drain but never run it, however long it waits.
    function test_Fork_AdminSafeCompromised_QueuedDrainNeedsAnExecutor() public {
        bytes memory data = abi.encodeCall(BRIDGE.grantRole, (defaultAdminRole, attacker));
        bytes32 id = _schedule(address(BRIDGE), data);

        skip(365 days);
        assertTrue(timelock.isOperationReady(id));

        address[2] memory callers = [ADMIN_SAFE, attacker];
        for (uint256 i = 0; i < callers.length; i++) {
            vm.prank(callers[i]);
            vm.expectRevert(_unauthorized(callers[i], executorRole));
            timelock.execute(address(BRIDGE), 0, data, bytes32(0), bytes32(0));
        }
        assertFalse(BRIDGE.hasRole(defaultAdminRole, attacker));
    }

    /// @dev Accepted gap: a compromised Safe installs its own validators and forges claims. It is
    ///      held to the daily claim limit (at most twice the configured value in one burst).
    function test_Fork_AdminSafeCompromised_ForgedClaimsAreCappedByClaimLimit() public {
        (uint256 minAmount,, uint256 claimLimit,,,) = BRIDGE.tokenData(USDC);
        uint256 funded = claimLimit * 10;
        deal(USDC, address(BRIDGE), funded);

        _installTestValidators();

        uint256 chunk = claimLimit / 4;
        uint256 drained;
        for (uint256 i = 0; i < 40; i++) {
            address to = address(uint160(uint256(keccak256(abi.encode("drain", i)))));
            (, bytes memory proof, bytes memory aux) =
                createTokenClaimProof(USDC_ON_POD, chunk, to, NUM_TEST_VALIDATORS, BRIDGE.domainSeparator());
            try BRIDGE.claim(USDC, chunk, to, proof, aux) {
                drained += chunk;
            } catch (bytes memory err) {
                assertEq(bytes4(err), Bridge.DailyLimitExhausted.selector);
                break;
            }
        }

        assertGt(drained, 0);
        assertLe(drained, 2 * claimLimit, "burst exceeds twice the claim limit");
        assertEq(IERC20(USDC).balanceOf(address(BRIDGE)), funded - drained);

        // It cannot lift the cap.
        vm.startPrank(ADMIN_SAFE);
        vm.expectRevert(_unauthorized(ADMIN_SAFE, defaultAdminRole));
        BRIDGE.configureToken(USDC, minAmount, claimLimit, type(uint256).max);
        vm.expectRevert(_unauthorized(ADMIN_SAFE, defaultAdminRole));
        BRIDGE.whiteListToken(USDC, USDC_ON_POD, minAmount, claimLimit, type(uint256).max);
        vm.stopPrank();

        // The next day it gets at most one more claim limit.
        skip(1 days);
        uint256 nextDay;
        for (uint256 i = 0; i < 40; i++) {
            address to = address(uint160(uint256(keccak256(abi.encode("drain day 2", i)))));
            (, bytes memory proof, bytes memory aux) =
                createTokenClaimProof(USDC_ON_POD, chunk, to, NUM_TEST_VALIDATORS, BRIDGE.domainSeparator());
            try BRIDGE.claim(USDC, chunk, to, proof, aux) {
                nextDay += chunk;
            } catch (bytes memory err) {
                assertEq(bytes4(err), Bridge.DailyLimitExhausted.selector);
                break;
            }
        }
        assertLe(nextDay, claimLimit, "second day exceeds the claim limit");
    }

    function test_Fork_ExecutorCompromised_CannotMoveFunds() public {
        uint256 balance = IERC20(USDC).balanceOf(address(BRIDGE));

        vm.startPrank(executor1);
        bytes memory data = abi.encodeCall(BRIDGE.migrate, (attacker));
        vm.expectRevert(_unauthorized(executor1, proposerRole));
        timelock.schedule(address(BRIDGE), 0, data, bytes32(0), bytes32(0), DELAY);
        vm.expectPartialRevert(TimelockController.TimelockUnexpectedOperationState.selector);
        timelock.execute(address(BRIDGE), 0, data, bytes32(0), bytes32(0));
        vm.expectRevert(_unauthorized(executor1, defaultAdminRole));
        BRIDGE.migrate(attacker);
        vm.stopPrank();

        assertEq(IERC20(USDC).balanceOf(address(BRIDGE)), balance);
    }

    /// @dev Known and accepted: the Safe plus one executor is full control after 72 hours.
    function test_Fork_AdminSafeAndOneExecutorCompromised_DrainAfterDelay() public {
        uint256 balance = IERC20(USDC).balanceOf(address(BRIDGE));
        vm.prank(ADMIN_SAFE);
        BRIDGE.setState(Bridge.ContractState.Paused);

        bytes memory data = abi.encodeCall(BRIDGE.migrate, (attacker));
        _schedule(address(BRIDGE), data);

        // Nothing moves during the delay.
        skip(DELAY - 1);
        vm.prank(executor2);
        vm.expectPartialRevert(TimelockController.TimelockUnexpectedOperationState.selector);
        timelock.execute(address(BRIDGE), 0, data, bytes32(0), bytes32(0));
        assertEq(IERC20(USDC).balanceOf(address(BRIDGE)), balance);

        skip(1);
        _execute(executor2, address(BRIDGE), data);
        vm.prank(ADMIN_SAFE);
        BRIDGE.transferTokensToMigrated(_usdcOnly());
        assertEq(IERC20(USDC).balanceOf(attacker), balance);
    }

    // ========== Users are unaffected ==========

    function test_Fork_WaitingListDepositsStillReachTheBridge() public {
        (uint256 minAmount,,,,,) = BRIDGE.tokenData(USDC);
        uint256 amount = minAmount * 2;
        deal(USDC, user, amount);

        // Live relayer keys rotate, so the waiting list's admin (the Safe) appoints one for the test.
        address relayer = makeAddr("relayer");
        bytes32 waitlistRelayerRole = WAITLIST.RELAYER_ROLE();
        vm.prank(ADMIN_SAFE);
        WAITLIST.grantRole(waitlistRelayerRole, relayer);

        vm.startPrank(user);
        IERC20(USDC).approve(address(WAITLIST), amount);
        uint256 depositId = WAITLIST.deposit(USDC, amount, user, user, address(0), 0, "");
        vm.stopPrank();

        uint256 bridgeBalance = IERC20(USDC).balanceOf(address(BRIDGE));
        uint256 depositIndex = BRIDGE.depositIndex();

        DepositWaitingList.DepositData[] memory deposits = new DepositWaitingList.DepositData[](1);
        deposits[0] = DepositWaitingList.DepositData({depositId: depositId, amount: amount, from: user, to: user});
        vm.prank(relayer);
        WAITLIST.applyDeposits(USDC, deposits, address(0), 0);

        assertEq(IERC20(USDC).balanceOf(address(BRIDGE)), bridgeBalance + amount);
        assertEq(BRIDGE.depositIndex(), depositIndex + 1);
    }

    function test_Fork_PublicDepositsWorkOnceFastAdminOpensTheBridge() public {
        (uint256 minAmount,,,,,) = BRIDGE.tokenData(USDC);
        deal(USDC, user, minAmount);

        vm.prank(ADMIN_SAFE);
        BRIDGE.setState(Bridge.ContractState.Public);

        uint256 depositIndex = BRIDGE.depositIndex();
        vm.startPrank(user);
        IERC20(USDC).approve(address(BRIDGE), minAmount);
        BRIDGE.deposit(USDC, minAmount, user, address(0), 0, "");
        vm.stopPrank();
        assertEq(BRIDGE.depositIndex(), depositIndex + 1);
    }

    function test_Fork_ClaimsWorkAfterUpgrade() public {
        _installTestValidators();
        (uint256 minAmount,,,,,) = BRIDGE.tokenData(USDC);
        deal(USDC, address(BRIDGE), minAmount * 10);

        _claim(minAmount, user);
        assertEq(IERC20(USDC).balanceOf(user), minAmount);

        // Replay is still rejected.
        (, bytes memory proof, bytes memory aux) =
            createTokenClaimProof(USDC_ON_POD, minAmount, user, NUM_TEST_VALIDATORS, BRIDGE.domainSeparator());
        vm.expectRevert(Bridge.RequestAlreadyProcessed.selector);
        BRIDGE.claim(USDC, minAmount, user, proof, aux);
    }
}
