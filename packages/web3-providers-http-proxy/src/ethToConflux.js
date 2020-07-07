const { emptyFn, numToHex } = require("./util");
const debug = require("debug")("ethToConflux");

// TODO MAP latest_checkpoint
const TAG_MAP = {
  earliest: "earliest",
  latest: "latest_state",
  pending: "latest_state"
};
const DEFAULT_PASSWORD = "123456";

function formatInput(params) {
  // 1. add nonce parameter to tx object
  // TODO
  // 2. block number tag map
  if (params[0]) {
    // format tx gas and gasPrice
    if (params[0].gas && Number.isInteger(params[0].gas)) {
      params[0].gas = numToHex(params[0].gas);
    }
    if (params[0].gasPrice && Number.isInteger(params[0].gasPrice)) {
      params[0].gasPrice = numToHex(params[0].gasPrice);
    }
  }
  mapParamsTagAtIndex(params, 1);
  return params;
}

const bridge = {
  eth_blockNumber: {
    method: "cfx_epochNumber",
    input: function (params) {
      mapParamsTagAtIndex(params, 0);
      return params;
    }
  },
  eth_sendRawTransaction: {
    method: "cfx_sendRawTransaction"
  },
  eth_getBalance: {
    method: "cfx_getBalance",
    input: function (params) {
      mapParamsTagAtIndex(params, 1);
      return params;
    }
  },
  eth_call: {
    method: "cfx_call",
    input: formatInput
  },
  eth_gasPrice: {
    method: "cfx_gasPrice"
  },
  eth_accounts: {
    method: "accounts"
  },
  eth_getTransactionCount: {
    method: "cfx_getNextNonce", // NOT right
    input: function (params) {
      mapParamsTagAtIndex(params, 1);
      return params;
    }
  },
  eth_getCode: {
    method: "cfx_getCode",
    input: function (params) {
      mapParamsTagAtIndex(params, 1);
      return params;
    },
    output: function (response) {
      if (response && response.error && response.error.code == -32016) {
        response.error = null;
        response.result = "0x";
      }
      return response;
    }
  },
  eth_estimateGas: {
    method: "cfx_estimateGasAndCollateral",
    input: formatInput,
    output: function (response) {
      if (response && response.result && response.result.gasUsed) {
        response.result = response.result.gasUsed;
      }
      return response;
    }
  },
  eth_sendTransaction: {
    method: "send_transaction",
    // todo: set storagelimit and gas
    input: function (params) {
      if (params.length > 0) {
        params[0].gasPrice = params[0].gasPrice || "0x" + (1e9).toString(16);
        params[0].gas = params[0].gas || "0x1000000";
        params[0].storageLimit = params[0].storageLimit || "0x1000000";
        // simple handle
        if (params[0].to) {
          params[0].to = "0x1" + params[0].to.slice(3);
        }
        if (params[0].data) {
          let len = params[0].data.length;
          len = (len - 6) % 32;
          if (len == 0) params[0].to[2] = "0x8" + params[0].to.slice(3);
        }
      }
      if (params.length == 1) {
        params.push(DEFAULT_PASSWORD);
      }
      return params;
    }
  },
  eth_getStorageAt: {
    method: "cfx_getStorageAt",
    input: function (params) {
      mapParamsTagAtIndex(params, 2);
      return params;
    }
  },
  eth_getBlockByHash: {
    method: "cfx_getBlockByHash",
    output: function (response) {
      formatBlock(response.result);
      return response;
    }
  },
  eth_getBlockByNumber: {
    method: "cfx_getBlockByEpochNumber",
    input: function (params) {
      mapParamsTagAtIndex(params, 0);
      return params;
    },
    output: function (response) {
      formatBlock(response.result);
      return response;
    }
  },
  eth_getTransactionByHash: {
    method: "cfx_getTransactionByHash",
    output: function (response) {
      formatTx(response.result);
      return response;
    }
  },
  web3_clientVersion: {
    method: "cfx_clientVersion"
  },
  eth_chainId: {
    method: "cfx_getStatus",
    output: function (response) {
      if (response.result && response.result.chain_id)
        response.result = response.result.chain_id;
      return response;
    }
  }
  // eth_sign: {
  //   method: 'sign'
  // }
};

function formatBlock(block) {
  block.number = block.epochNumber;
  // sha3Uncles?
  // logsBloom?
  block.stateRoot = block.deferredStateRoot;
  block.receiptsRoot = block.deferredReceiptsRoot;
  // totalDifficulty?
  // extraData?
  // gasUsed?
  block.uncles = block.refereeHashes; // check?
  // format tx object
  if (
    block.tranactions &&
    block.tranactions.length > 0 &&
    typeof block.tranactions[0] === "object"
  ) {
    for (let tx of block.tranactions) {
      formatTx(tx);
    }
  }
  return block;
}

function formatTx(tx) {
  // blockNumber?   TODO maybe cause big problem
  tx.input = tx.data;
  return tx;
}

function mapTag(tag) {
  return TAG_MAP[tag] || tag;
}

function mapParamsTagAtIndex(params, index) {
  if (params[index]) {
    params[index] = mapTag(params[index]);
  }
}

function ethToConflux(payload) {
  const oldMethod = payload.method;
  const handler = bridge[payload.method];
  debug(`Mapping "${oldMethod}" to "${handler && handler.method}"`);
  if (!handler) {
    return emptyFn;
  }
  

  let inputFn = handler.input || emptyFn;
  payload.params = inputFn(payload.params);
  payload.method = handler.method;
  debug("cfx payload:", payload);
  return handler.output || emptyFn;
}

module.exports = ethToConflux;
