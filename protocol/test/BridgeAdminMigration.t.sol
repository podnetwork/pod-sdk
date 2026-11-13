// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Bridge} from "../src/Bridge.sol";
import {BridgeDeployer} from "../script/DeployBridge.s.sol";
import {TimelockDeploy} from "../deploy/04_TimelockDeploy.s.sol";
import {FastAdminUpgrade} from "../deploy/05_FastAdminUpgrade.s.sol";
import {AdminHandover} from "../deploy/06_AdminHandover.s.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/// @dev Runs the admin migration scripts on a locally deployed bridge. Needs no RPC. The live
///      Arbitrum bridge is covered by BridgeAdminMigration.fork.sol.
contract BridgeAdminMigrationTest is Test {
    Bridge bridge;
    ProxyAdmin proxyAdmin;
    TimelockController timelock;
    Bridge newImplementation;

    address oldAdmin = makeAddr("oldAdmin");
    address adminSafe = makeAddr("adminSafe");
    address executor1 = makeAddr("executor1");
    address executor2 = makeAddr("executor2");
    address pauser1 = makeAddr("pauser1");

    bytes32 defaultAdminRole;
    bytes32 fastAdminRole;
    bytes32 pauserRole;

    function setUp() public {
        address[] memory validators = new address[](1);
        validators[0] = makeAddr("validator");
        vm.prank(oldAdmin);
        (bridge,) = BridgeDeployer.deploy(makeAddr("podBridge"), 0x50d, oldAdmin, validators, 0, 1, bytes32(0));

        proxyAdmin = ProxyAdmin(address(uint160(uint256(vm.load(address(bridge), ERC1967Utils.ADMIN_SLOT)))));
        defaultAdminRole = bridge.DEFAULT_ADMIN_ROLE();
        fastAdminRole = bridge.FAST_ADMIN_ROLE();
        pauserRole = bridge.PAUSER_ROLE();
    }

    function _executors() internal view returns (address[] memory executors) {
        executors = new address[](2);
        executors[0] = executor1;
        executors[1] = executor2;
    }

    function _pausers() internal view returns (address[] memory pausers) {
        pausers = new address[](1);
        pausers[0] = pauser1;
    }

    function _migrate(address safe) internal {
        (timelock, newImplementation) = new TimelockDeploy().run(bridge, safe, _executors());
        new FastAdminUpgrade().run(bridge, address(timelock), address(newImplementation), safe, _pausers());
        new AdminHandover().run(bridge, address(timelock));
    }

    function test_Migration_OldAdminIsSeparateFromAdminSafe() public {
        _migrate(adminSafe);

        assertEq(proxyAdmin.owner(), address(timelock));
        assertEq(
            address(uint160(uint256(vm.load(address(bridge), ERC1967Utils.IMPLEMENTATION_SLOT)))),
            address(newImplementation)
        );
        assertTrue(bridge.hasRole(defaultAdminRole, address(timelock)));
        assertTrue(bridge.hasRole(fastAdminRole, adminSafe));
        assertTrue(bridge.hasRole(pauserRole, pauser1));

        // The old admin is left with nothing.
        assertFalse(bridge.hasRole(defaultAdminRole, oldAdmin));
        assertFalse(bridge.hasRole(fastAdminRole, oldAdmin));
        assertFalse(bridge.hasRole(pauserRole, oldAdmin));

        vm.startPrank(oldAdmin);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, oldAdmin, defaultAdminRole)
        );
        bridge.setState(Bridge.ContractState.Paused);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, oldAdmin, fastAdminRole)
        );
        bridge.updateValidatorConfig(0, 2, bytes32(0), new address[](0), new address[](0));
        vm.stopPrank();
    }

    function test_Migration_OldAdminIsTheAdminSafe() public {
        _migrate(oldAdmin);

        assertEq(proxyAdmin.owner(), address(timelock));
        assertTrue(bridge.hasRole(fastAdminRole, oldAdmin));
        assertFalse(bridge.hasRole(defaultAdminRole, oldAdmin));
        assertFalse(bridge.hasRole(pauserRole, oldAdmin));

        vm.prank(oldAdmin);
        bridge.setState(Bridge.ContractState.Public);
        assertEq(uint8(bridge.contractState()), uint8(Bridge.ContractState.Public));
    }

    function test_Migration_TimelockedOperationWorksAfterwards() public {
        _migrate(adminSafe);

        bytes memory data = abi.encodeCall(bridge.grantRole, (pauserRole, makeAddr("pauser2")));
        vm.prank(adminSafe);
        timelock.schedule(address(bridge), 0, data, bytes32(0), bytes32(0), 72 hours);
        skip(72 hours);
        vm.prank(executor1);
        timelock.execute(address(bridge), 0, data, bytes32(0), bytes32(0));

        assertTrue(bridge.hasRole(pauserRole, makeAddr("pauser2")));
    }
}
