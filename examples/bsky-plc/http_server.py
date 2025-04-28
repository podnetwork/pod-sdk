#!/usr/bin/env python3

import json
import os
import sys

import base58
from flask import Flask, request, jsonify
from web3 import Web3
from threading import Lock

app = Flask(__name__)
create_mutex = Lock()

# Connect to Ethereum/Pod L1 node
PROVIDER_URL = os.environ.get('PROVIDER_URL', 'http://localhost:8545')
w3 = Web3(Web3.HTTPProvider(PROVIDER_URL))


# Contract details
CONTRACT_ADDRESS = w3.to_checksum_address(os.environ.get(
    'CONTRACT_ADDRESS',
    '0x852be42A4fc0dC62F383Eb4d21dd8613BcA28398',
))

CONTRACT_ABI = [
    {
        "inputs": [{"internalType": "bytes32", "name": "did", "type": "bytes32"}],
        "name": "getLastOperation",
        "outputs": [
            {"internalType": "bytes", "name": "operation", "type": "bytes"},
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "bytes", "name": "encodedOp", "type": "bytes"},
            {"internalType": "bytes32", "name": "did", "type": "bytes32"},
            {"internalType": "string", "name": "prev", "type": "string"},
        ],
        "name": "add",
        "stateMutability": "nonpayable",
        "type": "function"
    },
]


def get_contract():
    """Create and return contract instance"""
    return w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)


def send_transaction(transaction):
    signed_txn = w3.eth.account.sign_transaction(
        transaction, private_key=PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
    return w3.eth.wait_for_transaction_receipt(tx_hash)


@app.route("/<did>", methods=["GET"])
def resolve_did(did):
    contract = get_contract()

    last_op = get_last_operation(did)
    if last_op is None:
        return jsonify({"message": "DID not found"}), 404

    contexts = [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/multikey/v1',
    ]

    methods = []
    for keyid, key in last_op["verificationMethods"].items():
        raw_key = key.removeprefix("did:key:")
        methods.append({
            "id": f"{did}#{keyid}",
            "type": "Multikey",
            "controller": did,
            "publicKeyMultibase": raw_key,
        })

        multikey_bytes = base58.b58decode(raw_key[1:])
        if multikey_bytes[:2] == bytes([0x80, 0x24]):
            context = 'https://w3id.org/security/suites/ecdsa-2019/v1'
        elif multikey_bytes[:2] == bytes([0xe7, 0x01]):
            context = 'https://w3id.org/security/suites/secp256k1-2019/v1'
        else:
            return jsonify({"message": f"unknown verification method key type: {multikey_bytes[:2]}"}), 500
        if not context in contexts:
            contexts.append(context)

    services = []
    for id, svc in last_op["services"].items():
        services.append({
            "id": f"#{id}",
            "type": svc["type"],
            "serviceEndpoint": svc["endpoint"],
        })

    return jsonify({
        "@context": contexts,
        "id": did,
        "alsoKnownAs": last_op["alsoKnownAs"],
        "verificationMethod": methods,
        "service": services,
    }), 200


@app.route("/<did>", methods=["POST"])
def create_plc(did):
    data = request.get_json(force=True)
    print(f"Creating PLC for did {did} with data: {data}")

    if data["type"] != "plc_operation":
        return "NOT IMPLEMENTED", 501

    # FIXME: input validation

    tx_receipt = create_update_did(did, data)

    return jsonify({
        "status": "success",
        "did": did,
        "transactionHash": tx_receipt.transactionHash.hex()
    }), 200


def create_update_did(did, data):
    # Mutex needed to avoid sending a TX with invalid nonce
    # When many DIDs are created in parallel
    with create_mutex:
        sender_nonce = w3.eth.get_transaction_count(SENDER_ADDRESS)

        prev = data.get("prev", None)
        if prev is None:
            prev = ""

        tx = get_contract().functions.add(
            bytes(json.dumps(data), "utf-8"),
            bytes(did, "utf-8"),
            prev,
        ).build_transaction({
            "from":  SENDER_ADDRESS,
            "nonce": sender_nonce,
            "gas":   30_000_000,
            "gasPrice": w3.eth.gas_price,
        })

        return send_transaction(tx)


@app.route("/<did>/log/last", methods=["GET"])
def get_last(did):
    last_op = get_last_operation(did)
    if last_op is None:
        return jsonify({"message": "DID not found"}), 404

    return jsonify(last_op), 200


@app.route("/<did>/data", methods=["GET"])
def get_plc_data(did):
    count = request.args.get("count", "10")
    after = request.args.get("after")

    last_op = get_last_operation(did)
    if last_op is None:
        return jsonify({"message": "DID not found"}), 404

    return jsonify({
        "did": did,
        "verificationMethods": last_op["verificationMethods"],
        "rotationKeys": last_op["rotationKeys"],
        "alsoKnownAs": last_op["alsoKnownAs"],
        "services": last_op["services"],
    }), 200


@app.route("/export", methods=["GET"])
def export():
    return jsonify({"message": "Not implemented"}), 501


@app.route("/<did>/log", methods=["GET"])
def get_plc_log(did):
    return jsonify({"message": "Not implemented"}), 501


@app.route("/<did>/log/audit", methods=["GET"])
def get_plc_audit_log(did):
    return jsonify({"message": "Not implemented"}), 501


def get_last_operation(did):
    result = get_contract().functions.getLastOperation(did).call({
        "from":  SENDER_ADDRESS,
    })
    if len(result) == 0:
        return None

    return json.loads(result)


if __name__ == "__main__":
    PRIVATE_KEY = os.environ.get('PRIVATE_KEY')
    if PRIVATE_KEY == None:
        print("Please set PRIVATE_KEY env to a key of funded account. It will be used to pay for transactions.")
        sys.exit(1)

    SENDER_ADDRESS = w3.eth.account.from_key(PRIVATE_KEY).address

    port = int(os.environ.get('PORT', 2582))
    print(f"Starting DID server on port {port}")
    print(f"Connected to blockchain at {PROVIDER_URL}")
    print(f"Using contract at {CONTRACT_ADDRESS}")

    print(f"Sending transactions from {SENDER_ADDRESS}")
    app.run(host='0.0.0.0', port=port, debug=True)
