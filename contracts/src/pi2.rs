use alloy_sol_types::sol;

sol! {
    struct EVMCall {
        address from;
        address to;
        bytes input;
    }

    struct EVMMetadata {
        uint256 chainId;
    }

    struct Claim {
        string claimType;
        string trustBaseSpec;
        Header assumptions;
        EVMCall action;
        bytes result;
        EVMMetadata metadata;
    }

    struct Header {
        bytes32 parentHash;
        bytes32 uncleHash;
        address coinbase;
        bytes32 root;
        bytes32 txHash;
        bytes32 receiptHash;
        bytes bloom;
        uint256 difficulty;
        uint256 number;
        uint256 gasLimit;
        uint256 gasUsed;
        uint256 time;
        bytes extra;
        bytes32 mixDigest;
        bytes8 nonce;
    }

    struct StorageProof {
        bytes32 key;
        bytes32 value;
        bytes[] proof;
    }

    struct AccountProof {
        address addr;
        bytes[] accountProof;
        uint256 balance;
        bytes32 codeHash;
        uint256 nonce;
        bytes32 storageHash;
        StorageProof[] storageProof;
    }

    struct Account {
        AccountProof proof;
        bytes code;
    }

    struct VerificationData {
        Account[] accounts;
    }

    function verify(Claim memory claim, VerificationData memory verData) public pure;

    event ClaimAppended(Claim claim, VerificationData indexed verData);
}

#[cfg(test)]
mod tests {
    // use alloy_sol_types::SolCall;

    // use crate::contracts::pi2::*;

    /*

    #[test]
    fn test_calldata_decode() {
        let calldata_hex = std::fs::read_to_string("testdata/pi2_valid_proof_1").unwrap();
        let calldata = hex::decode(calldata_hex).unwrap();

        let decoded = verifyCall::abi_decode(&calldata, true).unwrap();
        log::debug!(
            "decoded {:?} {:?}\n\n\n",
            decoded.claim.result,
            decoded.verData.accounts[0].code
        );
    }
    */
}
