// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {requireQuorum} from "./Quorum.sol";

address constant POD_TIMESTAMP_PRECOMPILE = address(uint160(uint256(keccak256("POD_TIMESTAMP"))));

using Time for Time.Timestamp;

/**
 * @title Time
 * @dev A library for working with timestamps in the POD network
 */
library Time {
    /**
     * @dev Timestamp is a uint64 that represents the number of microseconds since the Unix epoch
     * @dev Usage: Timestamp ts = podTime.fromSeconds(1234567890);
     * @dev Valid range: [0, type(uint64).max]
     */
    type Timestamp is uint64;

    uint64 constant MICROSECONDS_PER_SECOND = 1_000_000;
    uint64 constant MICROSECONDS_PER_MILLISECOND = 1_000;
    uint64 constant MILLISECONDS_PER_SECOND = 1_000;

    /**
     * @dev Get current timestamp in microseconds
     * @return The current Timestamp in microseconds
     */
    function currentTime() internal view returns (Timestamp) {
        (bool success, bytes memory output) = POD_TIMESTAMP_PRECOMPILE.staticcall("");
        require(success, "Precompile call failed");
        require(output.length == 32, "Invalid output length");

        uint64 timestamp = abi.decode(output, (uint64));

        return Timestamp.wrap(timestamp);
    }

    /**
     * @dev Get the minimum Timestamp value
     * @return The minimum Timestamp value
     */
    function min() internal pure returns (Timestamp) {
        return Timestamp.wrap(type(uint64).min);
    }

    /**
     * @dev Get the maximum Timestamp value
     * @return The maximum Timestamp value
     */
    function max() internal pure returns (Timestamp) {
        return Timestamp.wrap(type(uint64).max);
    }

    /**
     * @dev Check if a Timestamp is zero
     * @param timestamp The Timestamp to check
     * @return True if the Timestamp is zero, false otherwise
     */
    function isZero(Timestamp timestamp) internal pure returns (bool) {
        return Timestamp.unwrap(timestamp) == 0;
    }

    /**
     * @dev Create a Timestamp from seconds
     * @param seconds_ The number of seconds to create a Timestamp from
     * @return The Timestamp
     * @dev If the number of seconds is greater than the maximum value of uint64.max / MICROSECONDS_PER_SECOND, the function will revert.
     */
    function fromSeconds(uint64 seconds_) internal pure returns (Timestamp) {
        return Timestamp.wrap(seconds_ * MICROSECONDS_PER_SECOND);
    }

    /**
     * @dev Create a Timestamp from milliseconds
     * @param milliseconds The number of milliseconds to create a Timestamp from
     * @return The Timestamp
     * @dev If the number of milliseconds is greater than the maximum value of uint64.max / MICROSECONDS_PER_MILLISECOND, the function will revert.
     */
    function fromMillis(uint64 milliseconds) internal pure returns (Timestamp) {
        return Timestamp.wrap(milliseconds * MICROSECONDS_PER_MILLISECOND);
    }

    /**
     * @dev Create a Timestamp from microseconds
     * @param microseconds The number of microseconds to create a Timestamp from
     * @return The Timestamp
     */
    function fromMicros(uint64 microseconds) internal pure returns (Timestamp) {
        return Timestamp.wrap(microseconds);
    }

    /**
     * @dev Convert Timestamp to seconds
     * @param timestamp The Timestamp to convert
     * @return The number of seconds
     * @dev If the Timestamp is not divisible by MICROSECONDS_PER_SECOND, the remainder is discarded.
     */
    function toSeconds(Timestamp timestamp) internal pure returns (uint64) {
        return Timestamp.unwrap(timestamp) / MICROSECONDS_PER_SECOND;
    }

    /**
     * @dev Add seconds to a Timestamp
     * @param timestamp The Timestamp to add seconds to
     * @param seconds_ The number of seconds to add
     * @return The new Timestamp
     */
    function addSeconds(Timestamp timestamp, uint64 seconds_) internal pure returns (Timestamp) {
        return Timestamp.wrap(Timestamp.unwrap(timestamp) + (seconds_ * MICROSECONDS_PER_SECOND));
    }

    /**
     * @dev Add milliseconds to a Timestamp
     * @param timestamp The Timestamp to add milliseconds to
     * @param milliseconds The number of milliseconds to add
     * @return The new Timestamp
     */
    function addMillis(Timestamp timestamp, uint64 milliseconds) internal pure returns (Timestamp) {
        return Timestamp.wrap(Timestamp.unwrap(timestamp) + (milliseconds * MICROSECONDS_PER_MILLISECOND));
    }

    /**
     * @dev Add microseconds to a Timestamp
     * @param timestamp The Timestamp to add microseconds to
     * @param microseconds The number of microseconds to add
     * @return The new Timestamp
     */
    function addMicros(Timestamp timestamp, uint64 microseconds) internal pure returns (Timestamp) {
        return Timestamp.wrap(Timestamp.unwrap(timestamp) + microseconds);
    }

    /**
     * @dev Subtract seconds from a Timestamp (reverts if result would be negative)
     * @param timestamp The Timestamp to subtract seconds from
     * @param seconds_ The number of seconds to subtract
     * @return The new Timestamp
     */
    function subSeconds(Timestamp timestamp, uint64 seconds_) internal pure returns (Timestamp) {
        return Timestamp.wrap(Timestamp.unwrap(timestamp) - (seconds_ * MICROSECONDS_PER_SECOND));
    }

    /**
     * @dev Subtract milliseconds from a Timestamp (reverts if result would be negative)
     * @param timestamp The Timestamp to subtract milliseconds from
     * @param milliseconds The number of milliseconds to subtract
     * @return The new Timestamp
     */
    function subMillis(Timestamp timestamp, uint64 milliseconds) internal pure returns (Timestamp) {
        return Timestamp.wrap(Timestamp.unwrap(timestamp) - (milliseconds * MICROSECONDS_PER_MILLISECOND));
    }

    /**
     * @dev Subtract microseconds from a Timestamp (reverts if result would be negative)
     * @param timestamp The Timestamp to subtract microseconds from
     * @param microseconds The number of microseconds to subtract
     * @return The new Timestamp
     */
    function subMicros(Timestamp timestamp, uint64 microseconds) internal pure returns (Timestamp) {
        return Timestamp.wrap(Timestamp.unwrap(timestamp) - microseconds);
    }

    /**
     * @dev Check if two timestamps are equal
     * @param a The first Timestamp
     * @param b The second Timestamp
     * @return True if the two timestamps are equal, false otherwise
     */
    function eq(Timestamp a, Timestamp b) internal pure returns (bool) {
        return Timestamp.unwrap(a) == Timestamp.unwrap(b);
    }

    /**
     * @dev Check if one is greater than other
     * @param a The first Timestamp
     * @param b The second Timestamp
     * @return True if a is greater than b, false otherwise
     */
    function gt(Timestamp a, Timestamp b) internal pure returns (bool) {
        return Timestamp.unwrap(a) > Timestamp.unwrap(b);
    }

    /**
     * @dev Check if one is less than other
     * @param a The first Timestamp
     * @param b The second Timestamp
     * @return True if a is less than b, false otherwise
     */
    function lt(Timestamp a, Timestamp b) internal pure returns (bool) {
        return Timestamp.unwrap(a) < Timestamp.unwrap(b);
    }

    /**
     * @dev Check if one is greater than or equal to other
     * @param a The first Timestamp
     * @param b The second Timestamp
     * @return True if a is greater than or equal to b, false otherwise
     */
    function gte(Timestamp a, Timestamp b) internal pure returns (bool) {
        return Timestamp.unwrap(a) >= Timestamp.unwrap(b);
    }

    /**
     * @dev Check if one is less than or equal to other
     * @param a The first Timestamp
     * @param b The second Timestamp
     * @return True if a is less than or equal to b, false otherwise
     */
    function lte(Timestamp a, Timestamp b) internal pure returns (bool) {
        return Timestamp.unwrap(a) <= Timestamp.unwrap(b);
    }

    /**
     * @dev Check if a Timestamp is between two other Timestamps
     * @param timestamp The Timestamp to check
     * @param lower The lower bound
     * @param upper The upper bound
     * @return True if the Timestamp is between the two other Timestamps, false otherwise
     * @dev If the lower bound is greater than the upper bound, the function will revert.
     */
    function between(Timestamp timestamp, Timestamp lower, Timestamp upper) internal pure returns (bool) {
        require(lower.lte(upper), "Invalid bounds");
        return timestamp.gte(lower) && timestamp.lte(upper);
    }

    /**
     * @dev Calculate the difference between two timestamps in microseconds
     * @param a The first Timestamp
     * @param b The second Timestamp
     * @return The difference between the two timestamps in microseconds
     */
    function diffMicros(Timestamp a, Timestamp b) internal pure returns (uint64) {
        if (a.gt(b)) {
            return Timestamp.unwrap(a) - Timestamp.unwrap(b);
        } else {
            return Timestamp.unwrap(b) - Timestamp.unwrap(a);
        }
    }

    /**
     * @dev Calculate the difference between two timestamps in milliseconds
     * @param a The first Timestamp
     * @param b The second Timestamp
     * @return The difference between the two timestamps in milliseconds
     * @dev If the difference is not divisible by MICROSECONDS_PER_MILLISECOND, the remainder is discarded.
     */
    function diffMillis(Timestamp a, Timestamp b) internal pure returns (uint64) {
        return diffMicros(a, b) / MICROSECONDS_PER_MILLISECOND;
    }

    /**
     * @dev Calculate the difference between two timestamps in seconds
     * @param a The first Timestamp
     * @param b The second Timestamp
     * @return The difference between the two timestamps in seconds
     * @dev If the difference is not divisible by MICROSECONDS_PER_SECOND, the remainder is discarded.
     */
    function diffSeconds(Timestamp a, Timestamp b) internal pure returns (uint64) {
        return diffMicros(a, b) / MICROSECONDS_PER_SECOND;
    }

    /**
     * @dev Get the minimum of two Timestamps
     * @param a The first Timestamp
     * @param b The second Timestamp
     * @return The minimum of the two Timestamps
     */
    function min(Timestamp a, Timestamp b) internal pure returns (Timestamp) {
        return a.lt(b) ? a : b;
    }

    /**
     * @dev Get the maximum of two Timestamps
     * @param a The first Timestamp
     * @param b The second Timestamp
     * @return The maximum of the two Timestamps
     */
    function max(Timestamp a, Timestamp b) internal pure returns (Timestamp) {
        return a.gt(b) ? a : b;
    }
}

/**
 * @dev Requires that the current time is after a given timestamp
 * @param _timestamp The timestamp to check against
 * @param _message The message to revert with if the current time is not after the given timestamp
 */
function requireTimeAfter(Time.Timestamp _timestamp, string memory _message) view {
    requireQuorum(Time.currentTime().gt(_timestamp), _message);
}

/**
 * @dev Requires that the current time is before a given timestamp
 * @param _timestamp The timestamp to check against
 * @param _message The message to revert with if the current time is not before the given timestamp
 */
function requireTimeBefore(Time.Timestamp _timestamp, string memory _message) view {
    requireQuorum(Time.currentTime().lt(_timestamp), _message);
}
