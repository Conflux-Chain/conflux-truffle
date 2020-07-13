const { emptyFn, numToHex } = require("./util");
const debug = require("debug")("ethToConflux");
const { Account, Conflux } = require("js-conflux-sdk");

// TODO MAP latest_checkpoint
const TAG_MAP = {
  earliest: "earliest",
  latest: "latest_state",
  pending: "latest_state"
};
const DEFAULT_PASSWORD = "123456";

let cfx = undefined;
const accountAddresses = [];
const accounts = {};

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
    input: function(params) {
      mapParamsTagAtIndex(params, 0);
      return params;
    }
  },

  eth_getBalance: {
    method: "cfx_getBalance",
    input: function(params) {
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
    method: "accounts",
    output: function(response) {
      if (accountAddresses && accountAddresses.length > 0) {
        response.result = Object.keys(accounts);
        response.error = null;
      }

      return response;
    }
  },

  eth_getTransactionCount: {
    method: "cfx_getNextNonce", // NOT right
    input: function(params) {
      mapParamsTagAtIndex(params, 1);
      return params;
    }
  },

  eth_getCode: {
    method: "cfx_getCode",
    input: function(params) {
      mapParamsTagAtIndex(params, 1);
      return params;
    },
    output: function(response) {
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
    output: function(response) {
      if (response && response.result && response.result.gasUsed) {
        response.result = response.result.gasUsed;
      }
      return response;
    }
  },

  eth_sendTransaction: {
    method: function(params) {
      if (params.length && accounts[params[0].from]) {
        return "cfx_sendRawTransaction";
      }
      return "send_transaction";
    },

    input: async function(params) {
      if (params.length > 0) {
        const txInput = params[0];

        // simple handle txInput.to
        if (txInput.to) {
          txInput.to = "0x1" + txInput.to.slice(3);
        }
        if (txInput.data) {
          let len = txInput.data.length;
          len = (len - 6) % 32;
          if (len == 0) txInput.to = "0x8" + txInput.to.slice(3);
        }

        if (accounts[txInput.from]) {
          await formatTxInput.bind(cfx)(txInput);
          let signedTx = accounts[txInput.from].signTransaction(txInput);
          params[0] = "0x" + signedTx.encode(true).toString("hex");
        } else if (params.length == 1) {
          params.push(DEFAULT_PASSWORD);
        }
      }

      return params;
    }
  },

  eth_getStorageAt: {
    method: "cfx_getStorageAt",
    input: function(params) {
      mapParamsTagAtIndex(params, 2);
      return params;
    }
  },

  eth_getBlockByHash: {
    method: "cfx_getBlockByHash",
    output: function(response) {
      formatBlock(response.result);
      return response;
    }
  },

  eth_getBlockByNumber: {
    method: "cfx_getBlockByEpochNumber",
    input: function(params) {
      mapParamsTagAtIndex(params, 0);
      return params;
    },
    output: function(response) {
      formatBlock(response.result);
      return response;
    }
  },

  eth_getTransactionByHash: {
    method: "cfx_getTransactionByHash",
    output: function(response) {
      formatTx(response.result);
      return response;
    }
  },

  web3_clientVersion: {
    method: "cfx_clientVersion"
  },

  eth_chainId: {
    method: "cfx_getStatus",
    output: function(response) {
      // return hardcode due to not support yet.
      response.result = 1592304361448;
      response.error = undefined;
      return response;

      if (response.result && response.result.chain_id)
        response.result = response.result.chain_id;
      return response;
    }
  },

  eth_sendRawTransaction: {
    method: "cfx_sendRawTransaction"
  },

  eth_getTransactionReceipt: {
    method: "cfx_getTransactionReceipt",
    output: function(response) {
      if (response && response.result) {
        txReceipt = response.result;
        txReceipt.contractAddress = txReceipt.contractCreated;
        txReceipt.blockNumber = txReceipt.epochNumber;
        txReceipt.transactionIndex = txReceipt.index;
        txReceipt.status = txReceipt.outcomeStatus === 0 ? 1 : 0; // conflux和以太坊状态相反
        // txReceipt.gasUsed = `0x${txReceipt.gasUsed.toString(16)}`;
      }
      return response;
    }
  },

  eth_getLogs: {
    method: "cfx_getLogs",
    input: function(params) {
      if (params.length > 0) {
        let fromBlock = params[0].fromBlock;
        let toBlock = params[0].toBlock;
        params[0].fromEpoch = mapTag(fromBlock);
        params[0].toEpoch = mapTag(toBlock);
      }
      return params;
    }
  }

  // eth_sign: {
  //   method: 'sign'
  // }
};

bridge["net_version"] = bridge.eth_chainId;

async function formatTxInput(options) {
  // console.log("this of formatTxInput:", this);
  if (options.nonce === undefined) {
    options.nonce = await this.getNextNonce(options.from);
  }

  if (options.gasPrice === undefined) {
    options.gasPrice = this.defaultGasPrice;
  }
  if (options.gasPrice === undefined) {
    options.gasPrice = (await this.getGasPrice()) || 1; // MIN_GAS_PRICE
  }

  if (options.gas === undefined) {
    options.gas = this.defaultGas;
  }

  if (options.storageLimit === undefined) {
    options.storageLimit = this.defaultStorageLimit;
  }

  if (options.gas === undefined || options.storageLimit === undefined) {
    const {
      gasUsed,
      storageCollateralized
    } = await this.estimateGasAndCollateral(options);

    if (options.gas === undefined) {
      options.gas = gasUsed;
    }

    if (options.storageLimit === undefined) {
      options.storageLimit = storageCollateralized;
    }
  }

  if (options.epochHeight === undefined) {
    options.epochHeight = await this.getEpochNumber();
  }

  if (options.chainId === undefined) {
    options.chainId = this.defaultChainId;
  }
  if (options.chainId === undefined) {
    const status = await this.getStatus();
    options.chainId = status.chainId;
  }
}

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

function setAccounts(privateKeys) {
  if (!privateKeys) return;

  if (typeof privateKeys == "string") {
    privateKeys = [privateKeys];
  }

  privateKeys
    .map(key => {
      let account = new Account(key);
      accountAddresses.push(account.toString());
      return account;
    })
    .map(account => (accounts[account.toString()] = account));
}

function setHost(host) {
  // console.log("set host:", host);
  cfx = new Conflux({
    url: host
  });
}

function deepClone(obj, hash = new WeakMap()) {
  if (Object(obj) !== obj) return obj; // primitives
  if (hash.has(obj)) return hash.get(obj); // cyclic reference
  const result =
    obj instanceof Set
      ? new Set(obj) // See note about this!
      : obj instanceof Map
        ? new Map(Array.from(obj, ([key, val]) => [key, deepClone(val, hash)]))
        : obj instanceof Date
          ? new Date(obj)
          : obj instanceof RegExp
            ? new RegExp(obj.source, obj.flags)
            : // ... add here any specific treatment for other classes ...
              // and finally a catch-all:
              obj.constructor
              ? new obj.constructor()
              : Object.create(null);
  hash.set(obj, result);
  return Object.assign(
    result,
    ...Object.keys(obj).map(key => ({ [key]: deepClone(obj[key], hash) }))
  );
}

function ethToConflux(options) {
  // it's better to use class
  setHost(options.url || `http://${options.host}:${options.port}`);
  setAccounts(options.privateKeys);

  return async function(payload) {
    // clone new one to avoid change old payload
    const newPayload = deepClone(payload);
    // eslint-disable-next-line no-unused-vars
    const oldMethod = newPayload.method;
    const handler = bridge[newPayload.method];

    if (!handler) {
      console.log(`Mapping "${oldMethod}" to nothing`);
      return {
        adaptedOutputFn: emptyFn,
        adaptedPayload: newPayload
      };
    }

    let inputFn = handler.input || emptyFn;
    newPayload.method =
      (typeof handler.method == "function" &&
        handler.method(newPayload.params)) ||
      handler.method;
    newPayload.params = await inputFn(newPayload.params);
    console.log(`Mapping "${oldMethod}" to "${newPayload.method}"`);
    return {
      adaptedOutputFn: handler.output || emptyFn,
      adaptedPayload: newPayload
    };
  };
}

module.exports = ethToConflux;
