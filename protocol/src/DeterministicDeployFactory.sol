// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract DeterministicDeployFactory {
    event Deploy(address addr);

    function deploy(bytes memory bytecode, uint _salt) external {
        address addr;

        assembly {
            addr := create2(
                0,
                add(bytecode, 0x20), // Skip the first 32 bytes which contain the length of the bytecode
                mload(bytecode), // Load the length of the bytecode
                _salt
            )
            if iszero(extcodesize(addr)) {
                revert(0, 0)
            }
        }
        emit Deploy(addr);
    }

    function getAddress(bytes memory bytecode, uint _salt) public view returns (address) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff), address(this), _salt, keccak256(bytecode)
          )
        );

        return address (uint160(uint(hash)));
    }
}
