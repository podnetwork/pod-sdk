// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {BridgeMintBurn} from "pod-protocol/BridgeMintBurn.sol";
import {IBridge} from "pod-protocol/interfaces/IBridge.sol";

contract DeployMintBurn is Script {
    function run(
        address sourceChainBridgeAddr,
        IBridge.TokenLimits memory nativeTokenLimits,
        uint96 sourceChainId,
        string memory tokenName,
        string memory tokenSymbol,
        address tokenAddr,
        address mirrorTokenAddr,
        uint8 tokenDecimals
    ) external returns (address bridgeMintBurn) {
        vm.startBroadcast();
        BridgeMintBurn bmb = new BridgeMintBurn(sourceChainBridgeAddr, nativeTokenLimits, sourceChainId);

        if (tokenAddr != address(0)) {
            bmb.createAndWhitelistMirrorToken(
                tokenName, tokenSymbol, tokenAddr, mirrorTokenAddr, tokenDecimals, nativeTokenLimits
            );
        }
        vm.stopBroadcast();
        console.log("BridgeMintBurn deployed at:", address(bmb));

        return address(bmb);
    }
}
