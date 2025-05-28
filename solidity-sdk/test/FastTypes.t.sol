// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import "forge-std/Test.sol";
import "../src/pod/FastTypes.sol";

contract TestContract {
    using FastTypes for FastTypes.SharedCounter;
    using FastTypes for FastTypes.OwnedCounter;
    using FastTypes for FastTypes.Balance;
    using FastTypes for FastTypes.Set;
    using FastTypes for FastTypes.Uint256Set;
    using FastTypes for FastTypes.AddressSet;

    FastTypes.SharedCounter internal _sharedCounter;
    FastTypes.OwnedCounter internal _ownedCounter;
    FastTypes.Balance internal _balance;
    FastTypes.Set internal _set;
    FastTypes.Uint256Set internal _uint256Set;
    FastTypes.AddressSet internal _addressSet;

    // Getter/setter functions remain the same as before...
    // SharedCounter functions
    function incrementSharedCounter(bytes32 key, uint256 value) external {
        _sharedCounter.increment(key, value);
    }

    function requireSharedCounterGte(bytes32 key, uint256 value, string memory errorMessage) external view {
        _sharedCounter.requireGte(key, value, errorMessage);
    }

    // OwnedCounter functions
    function incrementOwnedCounter(bytes32 key, address owner, uint256 value) external {
        console.log("owner:", owner);
        console.log("tx origin:", tx.origin);
        _ownedCounter.increment(key, owner, value);
    }

    function decrementOwnedCounter(bytes32 key, address owner, uint256 value) external {
        console.log("owner:", owner);
        console.log("tx origin:", tx.origin);
        _ownedCounter.decrement(key, owner, value);
    }

    function setOwnedCounter(bytes32 key, address owner, uint256 value) external {
        console.log("owner:", owner);
        console.log("tx origin:", tx.origin);
        _ownedCounter.set(key, owner, value);
    }

    function getOwnedCounter(bytes32 key, address owner) external returns (uint256) {
        console.log("owner:", owner);
        console.log("tx origin:", tx.origin);
        return _ownedCounter.get(key, owner);
    }

    // Balance functions
    function incrementBalance(bytes32 key, address owner, uint256 value) external {
        _balance.increment(key, owner, value);
    }

    function decrementBalance(bytes32 key, address owner, uint256 value) external {
        _balance.decrement(key, owner, value);
    }

    function requireBalanceGte(bytes32 key, address owner, uint256 value, string memory errorMessage) external view {
        _balance.requireGte(key, owner, value, errorMessage);
    }

    // Set functions
    function addToSet(bytes32 value) external {
        _set.add(value);
    }

    function requireSetExists(bytes32 value, string memory errorMessage) external view {
        _set.requireExists(value, errorMessage);
    }

    function requireSetLengthGte(uint256 value, string memory errorMessage) external view {
        _set.requireLengthGte(value, errorMessage);
    }

    // Uint256Set functions
    function addToUint256Set(uint256 value) external {
        _uint256Set.add(value);
    }

    function requireUint256SetExists(uint256 value, string memory errorMessage) external view {
        _uint256Set.requireExists(value, errorMessage);
    }

    function requireUint256SetLengthGte(uint256 value, string memory errorMessage) external view {
        _uint256Set.requireLengthGte(value, errorMessage);
    }

    function requireUint256SetMaxValueGte(uint256 value, string memory errorMessage) external view {
        _uint256Set.requireMaxValueGte(value, errorMessage);
    }

    // AddressSet functions
    function addToAddressSet(address value) external {
        _addressSet.add(value);
    }

    function requireAddressSetExists(address value, string memory errorMessage) external view {
        _addressSet.requireExists(value, errorMessage);
    }

    function requireAddressSetLengthGte(uint256 value, string memory errorMessage) external view {
        _addressSet.requireLengthGte(value, errorMessage);
    }
}

contract MockRequireQuorum {
    fallback(bytes calldata input) external returns (bytes memory) {
        (bool condition) = abi.decode(input, (bool));
        console.log("condition:", condition);
        require(condition, "Quorum requirement not met");
    }
}

contract FastTypesTest is Test {
    TestContract public testContract;
    address public constant TEST_USER = address(0x1234);
    bytes32 public constant TEST_KEY = bytes32(uint256(1));
    address public constant REQUIRE_QUORUM = address(uint160(uint256(keccak256("POD_REQUIRE_QUORUM"))));

    function setUp() public {
        // First verify the address is empty
        require(REQUIRE_QUORUM.code.length == 0, "REQUIRE_QUORUM should be empty before etch");

        // Deploy and etch mock implementation
        MockRequireQuorum mockQuorum = new MockRequireQuorum();
        vm.etch(REQUIRE_QUORUM, address(mockQuorum).code);

        // Verify the code was properly etched
        require(REQUIRE_QUORUM.code.length > 0, "REQUIRE_QUORUM should have code after etch");

        testContract = new TestContract();
        vm.startBroadcast(TEST_USER);
    }

    function testMockRequireQuorum() public {
        (bool success,) = REQUIRE_QUORUM.staticcall(abi.encode(true));
        assertTrue(success, "True condition should succeed");

        vm.expectRevert("Quorum requirement not met");
        (bool success2,) = REQUIRE_QUORUM.staticcall(abi.encode(false));
    }

    function testSharedCounter() public {
        testContract.incrementSharedCounter(TEST_KEY, 5);
        testContract.requireSharedCounterGte(TEST_KEY, 5, "Should be >= 5");

        vm.expectRevert();
        testContract.requireSharedCounterGte(TEST_KEY, 10, "Should be >= 10");
    }

    function testOwnedCounter() public {
        console.log("TEST_USER:", TEST_USER);
        testContract.incrementOwnedCounter(TEST_KEY, TEST_USER, 5);
        assertEq(testContract.getOwnedCounter(TEST_KEY, TEST_USER), 5);

        testContract.decrementOwnedCounter(TEST_KEY, TEST_USER, 3);
        assertEq(testContract.getOwnedCounter(TEST_KEY, TEST_USER), 2);

        testContract.setOwnedCounter(TEST_KEY, TEST_USER, 10);
        assertEq(testContract.getOwnedCounter(TEST_KEY, TEST_USER), 10);

        address otherUser = address(0x5678);
        vm.stopBroadcast();
        vm.startBroadcast(otherUser);
        vm.expectRevert("Cannot access OwnedCounter owned by another address");
        testContract.getOwnedCounter(TEST_KEY, TEST_USER);
    }

    function testBalance() public {
        testContract.incrementBalance(TEST_KEY, TEST_USER, 100);
        testContract.requireBalanceGte(TEST_KEY, TEST_USER, 100, "Should be >= 100");

        testContract.decrementBalance(TEST_KEY, TEST_USER, 60);
        testContract.requireBalanceGte(TEST_KEY, TEST_USER, 40, "Should be >= 40");

        vm.expectRevert("Cannot decrement balance below 0");
        testContract.decrementBalance(TEST_KEY, TEST_USER, 50);
    }

    function testSet() public {
        bytes32 value1 = bytes32(uint256(1));
        bytes32 value2 = bytes32(uint256(2));

        testContract.addToSet(value1);
        testContract.requireSetExists(value1, "Should exist");

        testContract.addToSet(value2);
        testContract.requireSetLengthGte(2, "Length should be >= 2");

        vm.expectRevert("Should exist");
        testContract.requireSetExists(bytes32(uint256(3)), "Should exist");
    }

    function testUint256Set() public {
        testContract.addToUint256Set(100);
        testContract.addToUint256Set(200);
        testContract.requireUint256SetMaxValueGte(200, "Max value should be >= 200");

        testContract.requireUint256SetExists(100, "Should exist");
        testContract.requireUint256SetExists(200, "Should exist");

        testContract.requireUint256SetLengthGte(2, "Length should be >= 2");

        vm.expectRevert("Should exist");
        testContract.requireUint256SetExists(300, "Should exist");
    }

    function testAddressSet() public {
        address addr1 = vm.addr(1);
        address addr2 = vm.addr(2);

        testContract.addToAddressSet(addr1);
        testContract.requireAddressSetExists(addr1, "Should exist");

        testContract.addToAddressSet(addr2);
        testContract.requireAddressSetLengthGte(2, "Length should be >= 2");

        vm.expectRevert("Should exist");
        testContract.requireAddressSetExists(vm.addr(3), "Should exist");
    }
}
