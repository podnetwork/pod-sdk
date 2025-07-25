// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Test.sol";
import "../src/Time.sol";
import "../src/Quorum.sol";

contract TimeWrapper {
    using Time for Time.Timestamp;

    function wrappedCurrentTime() external view returns (Time.Timestamp) {
        return Time.currentTime();
    }

    // ============ Constructor Functions ============

    function wrappedFromSeconds(uint64 seconds_) external pure returns (Time.Timestamp) {
        return Time.fromSeconds(seconds_);
    }

    function wrappedFromMillis(uint64 milliseconds) external pure returns (Time.Timestamp) {
        return Time.fromMillis(milliseconds);
    }

    function wrappedFromMicros(uint64 microseconds) external pure returns (Time.Timestamp) {
        return Time.fromMicros(microseconds);
    }

    // ============ Conversion Functions ============

    function wrappedToSeconds(Time.Timestamp timestamp) external pure returns (uint64) {
        return Time.toSeconds(timestamp);
    }

    // ============ Arithmetic Functions ============

    function wrappedAddSeconds(Time.Timestamp timestamp, uint64 seconds_) external pure returns (Time.Timestamp) {
        return Time.addSeconds(timestamp, seconds_);
    }

    function wrappedAddMillis(Time.Timestamp timestamp, uint64 milliseconds) external pure returns (Time.Timestamp) {
        return Time.addMillis(timestamp, milliseconds);
    }

    function wrappedAddMicros(Time.Timestamp timestamp, uint64 microseconds) external pure returns (Time.Timestamp) {
        return Time.addMicros(timestamp, microseconds);
    }

    function wrappedSubSeconds(Time.Timestamp timestamp, uint64 seconds_) external pure returns (Time.Timestamp) {
        return Time.subSeconds(timestamp, seconds_);
    }

    function wrappedSubMillis(Time.Timestamp timestamp, uint64 milliseconds) external pure returns (Time.Timestamp) {
        return Time.subMillis(timestamp, milliseconds);
    }

    function wrappedSubMicros(Time.Timestamp timestamp, uint64 microseconds) external pure returns (Time.Timestamp) {
        return Time.subMicros(timestamp, microseconds);
    }

    // ============ Comparison Functions ============

    function wrappedEq(Time.Timestamp a, Time.Timestamp b) external pure returns (bool) {
        return Time.eq(a, b);
    }

    function wrappedGt(Time.Timestamp a, Time.Timestamp b) external pure returns (bool) {
        return Time.gt(a, b);
    }

    function wrappedLt(Time.Timestamp a, Time.Timestamp b) external pure returns (bool) {
        return Time.lt(a, b);
    }

    function wrappedGte(Time.Timestamp a, Time.Timestamp b) external pure returns (bool) {
        return Time.gte(a, b);
    }

    function wrappedLte(Time.Timestamp a, Time.Timestamp b) external pure returns (bool) {
        return Time.lte(a, b);
    }

    // ============ Utility Functions ============

    function wrappedMin() external pure returns (Time.Timestamp) {
        return Time.min();
    }

    function wrappedMax() external pure returns (Time.Timestamp) {
        return Time.max();
    }

    function wrappedIsZero(Time.Timestamp timestamp) external pure returns (bool) {
        return Time.isZero(timestamp);
    }

    function wrappedBetween(Time.Timestamp timestamp, Time.Timestamp lower, Time.Timestamp upper)
        external
        pure
        returns (bool)
    {
        return Time.between(timestamp, lower, upper);
    }

    function wrappedMinOfTwo(Time.Timestamp a, Time.Timestamp b) external pure returns (Time.Timestamp) {
        return Time.min(a, b);
    }

    function wrappedMaxOfTwo(Time.Timestamp a, Time.Timestamp b) external pure returns (Time.Timestamp) {
        return Time.max(a, b);
    }

    // ============ Difference Functions ============

    function wrappedDiffMicros(Time.Timestamp a, Time.Timestamp b) external pure returns (uint64) {
        return Time.diffMicros(a, b);
    }

    function wrappedDiffMillis(Time.Timestamp a, Time.Timestamp b) external pure returns (uint64) {
        return Time.diffMillis(a, b);
    }

    function wrappedDiffSeconds(Time.Timestamp a, Time.Timestamp b) external pure returns (uint64) {
        return Time.diffSeconds(a, b);
    }

    // ============ Constants ============

    function getMicrosecondsPerSecond() external pure returns (uint64) {
        return Time.MICROSECONDS_PER_SECOND;
    }

    function getMicrosecondsPerMillisecond() external pure returns (uint64) {
        return Time.MICROSECONDS_PER_MILLISECOND;
    }

    function getMillisecondsPerSecond() external pure returns (uint64) {
        return Time.MILLISECONDS_PER_SECOND;
    }

    // ============ Method Chaining Examples ============

    function wrappedAddSecondsAndMillis(Time.Timestamp timestamp, uint64 seconds_, uint64 milliseconds)
        external
        pure
        returns (Time.Timestamp)
    {
        return timestamp.addSeconds(seconds_).addMillis(milliseconds);
    }

    function wrappedAddSecondsAndMicros(Time.Timestamp timestamp, uint64 seconds_, uint64 microseconds)
        external
        pure
        returns (Time.Timestamp)
    {
        return timestamp.addSeconds(seconds_).addMicros(microseconds);
    }

    function wrappedComplexChain(Time.Timestamp timestamp, uint64 seconds_, uint64 milliseconds, uint64 microseconds)
        external
        pure
        returns (Time.Timestamp)
    {
        return timestamp.addSeconds(seconds_).addMillis(milliseconds).addMicros(microseconds);
    }

    // ============ Helper Functions for Testing ============

    function createTimestampFromSeconds(uint64 seconds_) external pure returns (Time.Timestamp) {
        return Time.fromSeconds(seconds_);
    }

    function createTimestampFromMillis(uint64 milliseconds) external pure returns (Time.Timestamp) {
        return Time.fromMillis(milliseconds);
    }

    function createTimestampFromMicros(uint64 microseconds) external pure returns (Time.Timestamp) {
        return Time.fromMicros(microseconds);
    }

    function unwrapTimestamp(Time.Timestamp timestamp) external pure returns (uint64) {
        return Time.Timestamp.unwrap(timestamp);
    }

    function wrapTimestamp(uint64 value) external pure returns (Time.Timestamp) {
        return Time.Timestamp.wrap(value);
    }

    // ============ Require Time Functions ============

    function wrappedRequireTimeAfter(Time.Timestamp timestamp, string memory message) external view {
        requireTimeAfter(timestamp, message);
    }

    function wrappedRequireTimeBefore(Time.Timestamp timestamp, string memory message) external view {
        requireTimeBefore(timestamp, message);
    }
}

contract TimeTest is Test {
    using Time for Time.Timestamp;

    // Test constants - using library constants
    uint64 constant ONE_MILLISECOND = 1_000; // microseconds
    uint64 constant ONE_SECOND = 1_000_000; // microseconds
    uint64 constant ONE_MINUTE = 60; // seconds
    uint64 constant ONE_HOUR = 60 * ONE_MINUTE; // seconds
    uint64 constant ONE_DAY = 24 * ONE_HOUR; // seconds

    uint64 FIXED_TIMESTAMP_MICROS = 1735689600000;
    Time.Timestamp FIXED_TIMESTAMP = Time.fromMicros(FIXED_TIMESTAMP_MICROS);

    TimeWrapper public wrapper;

    function setUp() public {
        // Mock the precompile to return a fixed timestamp
        vm.mockCall(POD_TIMESTAMP_PRECOMPILE, bytes(""), abi.encode(uint64(FIXED_TIMESTAMP_MICROS)));

        wrapper = new TimeWrapper();
    }

    function test_constants() public pure {
        assertEq(Time.MICROSECONDS_PER_SECOND, ONE_SECOND);
        assertEq(Time.MICROSECONDS_PER_MILLISECOND, ONE_MILLISECOND);
        assertEq(Time.MILLISECONDS_PER_SECOND, ONE_SECOND / ONE_MILLISECOND);
    }

    // ============ Constructor Tests ============

    function testFromSeconds() public pure {
        Time.Timestamp ts = Time.fromSeconds(1234567890);
        assertEq(Time.Timestamp.unwrap(ts), 1234567890 * ONE_SECOND);
    }

    function testFromMillis() public pure {
        Time.Timestamp ts = Time.fromMillis(1234567890);
        assertEq(Time.Timestamp.unwrap(ts), 1234567890 * ONE_MILLISECOND);
    }

    function testFromMicros() public pure {
        Time.Timestamp ts = Time.fromMicros(1234567890);
        assertEq(Time.Timestamp.unwrap(ts), 1234567890);
    }

    // ============ Conversion Tests ============

    function testToSeconds() public view {
        assertEq(Time.toSeconds(FIXED_TIMESTAMP), FIXED_TIMESTAMP_MICROS / ONE_SECOND);
    }

    // ============ Arithmetic Tests ============

    function testAddSeconds() public view {
        uint64 v = 5;
        Time.Timestamp result = Time.addSeconds(FIXED_TIMESTAMP, v);
        assertEq(Time.Timestamp.unwrap(result), FIXED_TIMESTAMP_MICROS + (v * ONE_SECOND));
    }

    function testAddSecondsOverflow() public {
        uint64 v = uint64(type(uint64).max) / ONE_SECOND;
        vm.expectRevert();
        wrapper.wrappedAddSeconds(FIXED_TIMESTAMP, v);
    }

    function testAddMillis() public view {
        uint64 v = 500;
        Time.Timestamp result = Time.addMillis(FIXED_TIMESTAMP, v);
        assertEq(Time.Timestamp.unwrap(result), FIXED_TIMESTAMP_MICROS + (v * ONE_MILLISECOND));
    }

    function testAddMillisOverflow() public {
        uint64 v = uint64(type(uint64).max) / ONE_MILLISECOND;
        vm.expectRevert();
        wrapper.wrappedAddMillis(FIXED_TIMESTAMP, v);
    }

    function testAddMicros() public view {
        uint64 v = 500000;
        Time.Timestamp result = Time.addMicros(FIXED_TIMESTAMP, v);
        assertEq(Time.Timestamp.unwrap(result), FIXED_TIMESTAMP_MICROS + v);
    }

    function testAddMicrosOverflow() public {
        uint64 v = uint64(type(uint64).max);
        vm.expectRevert();
        wrapper.wrappedAddMicros(FIXED_TIMESTAMP, v);
    }

    function testSubSeconds() public view {
        uint64 v = 5;
        Time.Timestamp result = Time.subSeconds(FIXED_TIMESTAMP, v);
        assertEq(Time.Timestamp.unwrap(result), FIXED_TIMESTAMP_MICROS - (v * ONE_SECOND));
    }

    function testSubSecondsUnderflow() public {
        uint64 v = uint64(type(uint64).max) / ONE_SECOND;
        vm.expectRevert();
        wrapper.wrappedSubSeconds(FIXED_TIMESTAMP, v);
    }

    function testSubMillis() public view {
        uint64 v = 500;
        Time.Timestamp result = Time.subMillis(FIXED_TIMESTAMP, v);
        assertEq(Time.Timestamp.unwrap(result), FIXED_TIMESTAMP_MICROS - (v * ONE_MILLISECOND));
    }

    function testSubMillisUnderflow() public {
        uint64 v = uint64(type(uint64).max) / ONE_MILLISECOND;
        vm.expectRevert();
        wrapper.wrappedSubMillis(FIXED_TIMESTAMP, v);
    }

    function testSubMicros() public view {
        uint64 v = 500000;
        Time.Timestamp result = Time.subMicros(FIXED_TIMESTAMP, v);
        assertEq(Time.Timestamp.unwrap(result), FIXED_TIMESTAMP_MICROS - v);
    }

    function testSubMicrosUnderflow() public {
        uint64 v = uint64(type(uint64).max);
        vm.expectRevert();
        wrapper.wrappedSubMicros(FIXED_TIMESTAMP, v);
    }

    // ============ Comparison Tests ============

    function testEq() public pure {
        Time.Timestamp ts1 = Time.fromMillis(1000);
        Time.Timestamp ts2 = Time.fromMillis(1000);
        Time.Timestamp ts3 = Time.fromMillis(2000);

        assertTrue(Time.eq(ts1, ts2));
        assertFalse(Time.eq(ts1, ts3));
    }

    function testGt() public pure {
        Time.Timestamp ts1 = Time.fromMillis(2000);
        Time.Timestamp ts2 = Time.fromMillis(1000);

        assertTrue(Time.gt(ts1, ts2));
        assertFalse(Time.gt(ts2, ts1));
        assertFalse(Time.gt(ts1, ts1));
    }

    function testLt() public pure {
        Time.Timestamp ts1 = Time.fromMillis(1000);
        Time.Timestamp ts2 = Time.fromMillis(2000);

        assertTrue(Time.lt(ts1, ts2));
        assertFalse(Time.lt(ts2, ts1));
        assertFalse(Time.lt(ts1, ts1));
    }

    function testGte() public pure {
        Time.Timestamp ts1 = Time.fromMillis(2000);
        Time.Timestamp ts2 = Time.fromMillis(1000);
        Time.Timestamp ts3 = Time.fromMillis(2000);

        assertTrue(Time.gte(ts1, ts2));
        assertTrue(Time.gte(ts1, ts3));
        assertFalse(Time.gte(ts2, ts1));
    }

    function testLte() public pure {
        Time.Timestamp ts1 = Time.fromMillis(1000);
        Time.Timestamp ts2 = Time.fromMillis(2000);
        Time.Timestamp ts3 = Time.fromMillis(1000);

        assertTrue(Time.lte(ts1, ts2));
        assertTrue(Time.lte(ts1, ts3));
        assertFalse(Time.lte(ts2, ts1));
    }

    // ============ Utility Tests ============

    function testMinValue() public pure {
        Time.Timestamp minTs = Time.min();
        assertEq(Time.Timestamp.unwrap(minTs), type(uint64).min);
    }

    function testMaxValue() public pure {
        Time.Timestamp maxTs = Time.max();
        assertEq(Time.Timestamp.unwrap(maxTs), type(uint64).max);
    }

    function testIsZero() public pure {
        Time.Timestamp zeroTs = Time.fromMillis(0);
        Time.Timestamp nonZeroTs = Time.fromMillis(1000);

        assertTrue(Time.isZero(zeroTs));
        assertFalse(Time.isZero(nonZeroTs));
    }

    function testBetween() public pure {
        Time.Timestamp below = Time.fromMillis(500);
        Time.Timestamp lower = Time.fromMillis(1000);
        Time.Timestamp middle = Time.fromMillis(2000);
        Time.Timestamp upper = Time.fromMillis(3000);
        Time.Timestamp above = Time.fromMillis(4000);

        assertTrue(Time.between(middle, lower, upper));
        assertTrue(Time.between(lower, lower, upper));
        assertTrue(Time.between(upper, lower, upper));
        assertFalse(Time.between(below, lower, upper));
        assertFalse(Time.between(above, lower, upper));
    }

    function testBetweenInvalidBounds() public {
        Time.Timestamp lower = Time.fromMillis(3000);
        Time.Timestamp upper = Time.fromMillis(1000);
        Time.Timestamp middle = Time.fromMillis(2000);

        vm.expectRevert("Invalid bounds");
        wrapper.wrappedBetween(middle, lower, upper);
    }

    function testDiffMicros() public pure {
        Time.Timestamp ts1 = Time.fromMicros(1000);
        Time.Timestamp ts2 = Time.fromMicros(3000);

        assertEq(Time.diffMicros(ts1, ts2), 2000);
        assertEq(Time.diffMicros(ts2, ts1), 2000);
    }

    function testDiffMillis() public pure {
        Time.Timestamp ts1 = Time.fromMicros(1_000_000);
        Time.Timestamp ts2 = Time.fromMicros(3_000_000);
        Time.Timestamp ts3 = Time.fromMicros(3_000_500); // 3000500 microseconds = 3000 milliseconds + 500 microseconds

        assertEq(Time.diffMillis(ts1, ts2), 2000);
        assertEq(Time.diffMillis(ts2, ts1), 2000);
        assertEq(Time.diffMillis(ts1, ts3), 2000);
    }

    function testDiffSeconds() public pure {
        Time.Timestamp ts1 = Time.fromMillis(1000);
        Time.Timestamp ts2 = Time.fromMillis(3000);
        Time.Timestamp ts3 = Time.fromMillis(3500); // 3500 milliseconds = 3 seconds + 500 milliseconds

        assertEq(Time.diffSeconds(ts1, ts2), 2);
        assertEq(Time.diffSeconds(ts2, ts1), 2);
        assertEq(Time.diffSeconds(ts1, ts3), 2);
    }

    function testMin() public pure {
        Time.Timestamp ts1 = Time.fromMicros(1000);
        Time.Timestamp ts2 = Time.fromMicros(2000);

        assertEq(Time.Timestamp.unwrap(Time.min(ts1, ts2)), 1000);
        assertEq(Time.Timestamp.unwrap(Time.min(ts2, ts1)), 1000);
    }

    function testMax() public pure {
        Time.Timestamp ts1 = Time.fromMicros(1000);
        Time.Timestamp ts2 = Time.fromMicros(2000);

        assertEq(Time.Timestamp.unwrap(Time.max(ts1, ts2)), 2000);
        assertEq(Time.Timestamp.unwrap(Time.max(ts2, ts1)), 2000);
    }

    // ============ Method Chaining Tests ============

    function testMethodChaining() public view {
        Time.Timestamp result = FIXED_TIMESTAMP.addSeconds(5).addMillis(500).subMicros(250000);
        assertEq(
            Time.Timestamp.unwrap(result), FIXED_TIMESTAMP_MICROS + (5 * ONE_SECOND) + (500 * ONE_MILLISECOND) - 250000
        );
    }

    // // ============ Edge Cases ============

    function testZeroTimestamp() public pure {
        Time.Timestamp zero = Time.fromMillis(0);
        assertTrue(Time.isZero(zero));
        assertEq(Time.toSeconds(zero), 0);
    }

    function testLargeTimestamp() public pure {
        uint64 largeValue = type(uint64).max;
        Time.Timestamp ts = Time.fromMicros(largeValue);
        assertEq(Time.Timestamp.unwrap(ts), largeValue);
    }

    function testFromMillisOverflow() public {
        uint64 largeValue = type(uint64).max;

        vm.expectRevert();
        wrapper.wrappedFromMillis(largeValue);
    }

    function testFromSecondsOverflow() public {
        uint64 largeValue = type(uint64).max;

        vm.expectRevert();
        wrapper.wrappedFromSeconds(largeValue);
    }

    function testBetweenEqualBounds() public pure {
        Time.Timestamp lower = Time.fromMillis(1000);
        Time.Timestamp upper = Time.fromMillis(1000);
        Time.Timestamp middle = Time.fromMillis(1000);

        assertTrue(Time.between(middle, lower, upper));
        assertTrue(Time.between(lower, lower, upper));
        assertTrue(Time.between(upper, lower, upper));
        assertTrue(Time.between(lower, upper, lower));
        assertTrue(Time.between(upper, lower, lower));
        assertTrue(Time.between(lower, upper, upper));
    }

    function testBetweenAtBounds() public pure {
        Time.Timestamp lower = Time.fromMillis(1000);
        Time.Timestamp upper = Time.fromMillis(2000);
        Time.Timestamp atLower = Time.fromMillis(1000);
        Time.Timestamp atUpper = Time.fromMillis(2000);

        assertTrue(Time.between(atLower, lower, upper));
        assertTrue(Time.between(atUpper, lower, upper));
    }

    // // ============ Precompile Tests ============

    function testCurrentTime() public view {
        Time.Timestamp current = wrapper.wrappedCurrentTime();
        assertEq(Time.Timestamp.unwrap(current), FIXED_TIMESTAMP_MICROS);
    }

    function testNowPrecompileFailure() public {
        // Mock precompile to fail
        vm.mockCallRevert(POD_TIMESTAMP_PRECOMPILE, bytes(""), "");

        vm.expectRevert("Precompile call failed");
        wrapper.wrappedCurrentTime();
        vm.clearMockedCalls();
    }

    function testNowInvalidOutputLength() public {
        // Mock precompile to return invalid output length
        vm.mockCall(
            POD_TIMESTAMP_PRECOMPILE,
            bytes(""),
            abi.encode(uint64(123), uint64(456)) // Multiple values = longer than 32 bytes
        );

        vm.expectRevert("Invalid output length");
        wrapper.wrappedCurrentTime();
        vm.clearMockedCalls();
    }

    // // ============ Integration Tests ============

    function testTimeCalculations() public pure {
        // Test realistic time calculations
        Time.Timestamp start = Time.fromSeconds(1640995200); // 2022-01-01 00:00:00 UTC

        // Add 1 day
        Time.Timestamp oneDayLater = Time.addSeconds(start, ONE_DAY);
        assertEq(Time.diffSeconds(start, oneDayLater), ONE_DAY);

        // Add 1 hour
        Time.Timestamp oneHourLater = Time.addSeconds(start, ONE_HOUR);
        assertEq(Time.diffSeconds(start, oneHourLater), ONE_HOUR);

        // Add 1 minute
        Time.Timestamp oneMinuteLater = Time.addSeconds(start, ONE_MINUTE);
        assertEq(Time.diffSeconds(start, oneMinuteLater), ONE_MINUTE);
    }

    function testTimestampRangeValidation() public pure {
        // Test that timestamps work across the full uint64 range
        Time.Timestamp minTs = Time.min();
        Time.Timestamp maxTs = Time.max();

        assertTrue(Time.isZero(minTs));
        assertEq(Time.Timestamp.unwrap(maxTs), type(uint64).max);

        // Test that we can create timestamps near the max value
        uint64 nearMax = type(uint64).max - 1;
        Time.Timestamp nearMaxTs = Time.fromMicros(nearMax);
        assertEq(Time.Timestamp.unwrap(nearMaxTs), nearMax);
    }

    // // ============ Fuzz Tests ============

    function testFuzzFromSeconds(uint64 secondsValue) public {
        Time.Timestamp ts;
        if (secondsValue > type(uint64).max / ONE_SECOND) {
            vm.expectRevert();
            ts = wrapper.wrappedFromSeconds(secondsValue);
        } else {
            ts = wrapper.wrappedFromSeconds(secondsValue);
            assertEq(Time.Timestamp.unwrap(ts), secondsValue * ONE_SECOND);
        }
    }

    function testFuzzFromMillis(uint64 milliseconds) public {
        Time.Timestamp ts;
        if (milliseconds > type(uint64).max / ONE_MILLISECOND) {
            vm.expectRevert();
            ts = wrapper.wrappedFromMillis(milliseconds);
        } else {
            ts = wrapper.wrappedFromMillis(milliseconds);
            assertEq(Time.Timestamp.unwrap(ts), milliseconds * ONE_MILLISECOND);
        }
    }

    function testFuzzComparison(uint64 a, uint64 b) public pure {
        Time.Timestamp tsA = Time.fromMicros(a);
        Time.Timestamp tsB = Time.fromMicros(b);

        assertEq(Time.eq(tsA, tsB), a == b);
        assertEq(Time.gt(tsA, tsB), a > b);
        assertEq(Time.lt(tsA, tsB), a < b);
        assertEq(Time.gte(tsA, tsB), a >= b);
        assertEq(Time.lte(tsA, tsB), a <= b);
    }

    function testFuzzMinMax(uint64 a, uint64 b) public pure {
        Time.Timestamp tsA = Time.fromMicros(a);
        Time.Timestamp tsB = Time.fromMicros(b);

        assertEq(Time.Timestamp.unwrap(Time.min(tsA, tsB)), a < b ? a : b);
        assertEq(Time.Timestamp.unwrap(Time.max(tsA, tsB)), a > b ? a : b);
    }

    function testFuzzDiffMicros(uint64 a, uint64 b) public pure {
        Time.Timestamp tsA = Time.fromMicros(a);
        Time.Timestamp tsB = Time.fromMicros(b);

        uint64 expectedDiff = a > b ? a - b : b - a;
        assertEq(Time.diffMicros(tsA, tsB), expectedDiff);
    }

    function testFuzzDiffMillis(uint64 a, uint64 b) public pure {
        vm.assume(a < type(uint64).max / ONE_MILLISECOND);
        vm.assume(b < type(uint64).max / ONE_MILLISECOND);

        Time.Timestamp tsA = Time.fromMillis(a);
        Time.Timestamp tsB = Time.fromMillis(b);

        uint64 expectedDiff = a > b ? a - b : b - a;
        assertEq(Time.diffMillis(tsA, tsB), expectedDiff);
    }

    function testFuzzDiffSeconds(uint64 a, uint64 b) public pure {
        vm.assume(a < type(uint64).max / ONE_SECOND);
        vm.assume(b < type(uint64).max / ONE_SECOND);

        Time.Timestamp tsA = Time.fromSeconds(a);
        Time.Timestamp tsB = Time.fromSeconds(b);

        uint64 expectedDiff = a > b ? a - b : b - a;
        assertEq(Time.diffSeconds(tsA, tsB), expectedDiff);
    }

    // ============ Require Time Tests ============

    function prepareQuorumCall(bool success) public {
        if (success) {
            vm.mockCall(REQUIRE_QUORUM, abi.encode(success), abi.encode());
        } else {
            vm.mockCallRevert(REQUIRE_QUORUM, abi.encode(success), abi.encode());
        }
    }

    function testRequireTimeAfterSuccess() public {
        // Ensure the current time is set to the fixed timestamp
        assertEq(Time.Timestamp.unwrap(Time.currentTime()), FIXED_TIMESTAMP_MICROS);

        // prepare the target timestamp so that the current time is after it
        Time.Timestamp target = Time.subSeconds(FIXED_TIMESTAMP, 1);
        prepareQuorumCall(Time.currentTime().gt(target));

        vm.expectCall(REQUIRE_QUORUM, abi.encode(true));
        wrapper.wrappedRequireTimeAfter(target, "Past timestamp should pass");
        vm.clearMockedCalls();
    }

    function testRequireTimeAfterFailure() public {
        // Ensure the current time is set to the fixed timestamp
        assertEq(Time.Timestamp.unwrap(Time.currentTime()), FIXED_TIMESTAMP_MICROS);

        // prepare the target timestamp so that the current time is before it
        Time.Timestamp target = Time.addSeconds(FIXED_TIMESTAMP, 1);
        prepareQuorumCall(Time.currentTime().gt(target));

        vm.expectCall(REQUIRE_QUORUM, abi.encode(false));
        vm.expectRevert();
        wrapper.wrappedRequireTimeAfter(target, "Past timestamp should pass");
        vm.clearMockedCalls();
    }

    function testRequireTimeBeforeSuccess() public {
        // Ensure the current time is set to the fixed timestamp
        assertEq(Time.Timestamp.unwrap(Time.currentTime()), FIXED_TIMESTAMP_MICROS);

        // prepare the target timestamp so that the current time is before it
        Time.Timestamp target = Time.addSeconds(FIXED_TIMESTAMP, 1);
        prepareQuorumCall(Time.currentTime().lt(target));

        vm.expectCall(REQUIRE_QUORUM, abi.encode(true));
        wrapper.wrappedRequireTimeBefore(target, "Future timestamp should pass");
        vm.clearMockedCalls();
    }

    function testRequireTimeBeforeFailure() public {
        // Ensure the current time is set to the fixed timestamp
        assertEq(Time.Timestamp.unwrap(Time.currentTime()), FIXED_TIMESTAMP_MICROS);

        // prepare the target timestamp so that the current time is before it
        Time.Timestamp target = Time.subSeconds(FIXED_TIMESTAMP, 1);
        prepareQuorumCall(Time.currentTime().lt(target));

        vm.expectCall(REQUIRE_QUORUM, abi.encode(false));
        vm.expectRevert();
        wrapper.wrappedRequireTimeBefore(target, "Future timestamp should pass");
        vm.clearMockedCalls();
    }

    function testRequireTimeAfterEdgeCase() public {
        prepareQuorumCall(Time.currentTime().gt(FIXED_TIMESTAMP));

        vm.expectCall(REQUIRE_QUORUM, abi.encode(false));
        vm.expectRevert();
        wrapper.wrappedRequireTimeAfter(FIXED_TIMESTAMP, "Past timestamp should pass");
        vm.clearMockedCalls();
    }

    function testRequireTimeBeforeEdgeCase() public {
        prepareQuorumCall(Time.currentTime().lt(FIXED_TIMESTAMP));

        vm.expectCall(REQUIRE_QUORUM, abi.encode(false));
        vm.expectRevert();
        wrapper.wrappedRequireTimeBefore(FIXED_TIMESTAMP, "Past timestamp should pass");
        vm.clearMockedCalls();
    }

    function testRequireTimeAfterWithZeroTimestamp() public {
        prepareQuorumCall(Time.currentTime().gt(Time.fromMicros(0)));

        vm.expectCall(REQUIRE_QUORUM, abi.encode(true));
        wrapper.wrappedRequireTimeAfter(Time.fromMicros(0), "Zero timestamp should pass");
        vm.clearMockedCalls();
    }

    function testRequireTimeBeforeWithMaxTimestamp() public {
        prepareQuorumCall(Time.currentTime().lt(Time.fromMicros(type(uint64).max)));

        vm.expectCall(REQUIRE_QUORUM, abi.encode(true));
        wrapper.wrappedRequireTimeBefore(Time.fromMicros(type(uint64).max), "Max timestamp should pass");
        vm.clearMockedCalls();
    }
}
