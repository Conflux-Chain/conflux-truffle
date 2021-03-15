const { emptyFn, deepClone, delKeys } = require("./util");
const debug = require("debug")("ethToConflux");
const { PrivateKeyAccount, Conflux } = require("js-conflux-sdk");
const format = require("./format");

let cfx = undefined;
const accountAddresses = [];
const accounts = {};

const bridge = {
  eth_blockNumber: {
    method: "cfx_epochNumber",
    input: function (params) {
      // console.log("------rpc cfx_epochNumber");
      format.formatEpochOfParams(params, 0);
      return params;
    }
  },

  eth_sendRawTransaction: {
    method: "cfx_sendRawTransaction"
  },

  eth_getBalance: {
    method: "cfx_getBalance",
    input: function (params) {
      format.formatEpochOfParams(params, 1);
      params[0] = format.formatAddress(params[0], cfx.networkId);
      return params;
    }
  },

  eth_call: {
    method: "cfx_call",
    input: function (params) {
      return format.formatCommonInput(params, cfx);
    }
  },

  eth_gasPrice: {
    method: "cfx_gasPrice"
  },

  eth_accounts: {
    method: "accounts",
    output: function (response) {
      if (response && accountAddresses && accountAddresses.length > 0) {
        response.result = accountAddresses;
        response.error = null;
      } else if (response && response.result) {
        response.result = response.result.map(format.formatHexAddress);
      }
      return response;
    }
  },

  eth_getTransactionCount: {
    method: "cfx_getNextNonce", // NOT right
    input: function (params) {
      format.formatEpochOfParams(params, 1);
      params[0] = format.formatAddress(params[0], cfx.networkId);
      return params;
    }
  },

  eth_getCode: {
    method: "cfx_getCode",
    input: function (params) {
      format.formatEpochOfParams(params, 1);
      params[0] = format.formatAddress(params[0], cfx.networkId);
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
    input: function (params) {
      format.formatCommonInput(params, cfx);
    },
    output: function (response) {
      if (response && response.result && response.result.gasUsed) {
        response.result = response.result.gasUsed;
      }
      return response;
    }
  },

  eth_sendTransaction: {
    method: function (params) {
      if (params.length && getAccount(params[0].from)) {
        return "cfx_sendRawTransaction";
      }
      return "cfx_sendTransaction";
    },

    input: async function (params) {
      if (params.length > 0) {
        const txInput = params[0];
        const from = getAccount(txInput.from);

        params[0] = await format.formatTxParams(cfx, txInput);
        debug("formated inputTx:", params[0]);
        if (from) {
          let signedTx = await from.signTransaction(params[0]);
          params[0] = "0x" + signedTx.encode(true).toString("hex");
        }
      }
      return params;
    }
  },

  eth_getStorageAt: {
    method: "cfx_getStorageAt",
    input: function (params) {
      format.formatEpochOfParams(params, 2);
      return params;
    }
  },

  eth_getBlockByHash: {
    method: "cfx_getBlockByHash",
    output: function (response) {
      if (response && response.result) {
        format.formatBlock(response.result);
      }
      return response;
    }
  },

  eth_getBlockByNumber: {
    method: "cfx_getBlockByEpochNumber",
    input: function (params) {
      format.formatEpochOfParams(params, 0);
      return params;
    },
    output: function (response) {
      if (response && response.result) {
        format.formatBlock(response.result);
      }
      return response;
    }
  },

  eth_getTransactionByHash: {
    method: "cfx_getTransactionByHash",
    output: function (response) {
      if (response && response.result)
        format.formatTransaction(response.result);
      return response;
    }
  },

  web3_clientVersion: {
    method: "cfx_clientVersion"
  },

  eth_chainId: {
    method: "cfx_getStatus",
    output: function (response) {
      debug("convert cfx_getStatus response:", response);
      if (response && response.result && response.result.chainId) {
        response.result = Number.parseInt(response.result.chainId);
      }
      return response;
    }
  },

  net_version: {
    method: "cfx_getStatus",
    output: function (response) {
      debug("convert cfx_getStatus response:", response);
      if (response && response.result && response.result.networkId) {
        response.result = Number.parseInt(response.result.networkId);
      }
      return response;
    }
  },

  eth_getTransactionReceipt: {
    method: "cfx_getTransactionReceipt",
    output: function (response) {
      if (response && response.result) {
        txReceipt = response.result;
        txReceipt.contractCreated = format.formatHexAddress(
          txReceipt.contractCreated
        );
        txReceipt.from = format.formatHexAddress(txReceipt.from);
        txReceipt.to = format.formatHexAddress(txReceipt.to);
        if (txReceipt.logs) {
          for (i in txReceipt.logs) {
            l = txReceipt.logs[i];
            l.address = format.formatHexAddress(l.address);
            l.blockNumber = txReceipt.epochNumber;
            l.transactionIndex = txReceipt.index;
            l.logIndex = "0x"+ i.toString(16);
          }
        }

        txReceipt.contractAddress = txReceipt.contractCreated;
        txReceipt.blockNumber = txReceipt.epochNumber;
        txReceipt.transactionIndex = txReceipt.index;
        // console.log("txReceipt.outcomeStatus",Number.parseInt(txReceipt.outcomeStatus));
        txReceipt.status = Number.parseInt(txReceipt.outcomeStatus)
          ? "0x0"
          : "0x1"; // conflux和以太坊状态相反
        txReceipt.cumulativeGasUsed = txReceipt.gasUsed; // TODO simple set

        // txReceipt.gasUsed = `0x${txReceipt.gasUsed.toString(16)}`;
        delKeys(txReceipt, [
          "contractCreated",
          "epochNumber",
          "gasFee",
          "index",
          "outcomeStatus",
          "stateRoot"
        ]);
      }
      return response;
    }
  },

  eth_getLogs: {
    method: "cfx_getLogs",
    input: function (params) {
      if (params.length > 0) {
        let fromBlock = params[0].fromBlock;
        let toBlock = params[0].toBlock;
        params[0].fromEpoch = format.formatEpoch(fromBlock);
        params[0].toEpoch = format.formatEpoch(toBlock);
        params[0].address = format.formatAddress(params[0].address);
      }
      return params;
    },
    output: function (response) {
      if (response && response.result) {
        let logs = response.result;
        logs.forEach(l => (l.address = format.formatHexAddress(l.address)));
      }
    }
  },

  eth_sign: {
    method: "sign",
    // input: function (params) {
    //   let newParams = [params[1], params[0], DEFAULT_PASSWORD];
    //   return newParams;
    // },
    send: function (orignSend, payload, callback) {
      // console.trace("execute sign send ", payload, "callback:", callback.toString());
      payload = deepClone(payload);
      const address = payload.params[0];
      const message = payload.params[1];
      const account = getAccount(address);
      // console.log("get account done", account);

      if (account) {
        // console.log("start sign by local");
        // let signed;
        const isAddressMatched =
          message.from && message.from.toLowerCase() == address;
        let signed = isAddressMatched
          ? account.signTransaction(message)
          : account.signMessage(message);

        const response = {
          jsonrpc: payload.jsonrpc,
          result: signed,
          id: payload.id
        };
        // console.log("sign callback ", response);
        callback(null, response);
      } else {
        // console.log("start sign by rpc");
        // let newParams = [message, address, DEFAULT_PASSWORD];
        let newParams = [message, address];
        payload.method = "sign";
        payload.params = newParams;
        // debug("sign orign send ", payload);
        orignSend(payload, callback);
      }
      // console.log("sign adapt send done");
    }
  }
};

function ethToConflux(options) {
  // it's better to use class
  setHost(options.url || `http://${options.host}:${options.port}`).then(
     () => setAccounts(options.privateKeys, cfx.networkId)
  )
  .catch(e=>debug("set host error:",e));

  adaptor = async function (payload) {
    // clone new one to avoid change old payload
    const oldPayload = payload;
    payload = deepClone(payload);
    // eslint-disable-next-line no-unused-vars
    const handler = bridge[payload.method];

    debug("Mapping", oldPayload.method, "to", handler && handler.method);
    if (!handler) {
      return {
        adaptedOutputFn: emptyFn,
        adaptedPayload: payload
      };
    }

    if (handler.send) {
      return {
        adaptedSend: handler.send
      };
    }

    let inputFn = handler.input || emptyFn;
    payload.method =
      (typeof handler.method == "function" && handler.method(payload.params)) ||
      handler.method;
    payload.params = await inputFn(payload.params);
    debug("Mapping", oldPayload, "to", payload);

    return {
      adaptedOutputFn: handler.output || emptyFn,
      adaptedPayload: payload
    };
  };
  adaptor.accounts = accounts;
  return adaptor;
}

// helper methods===============================================

function setAccounts(privateKeys, networkId) {
  if (!privateKeys) return;

  if (typeof privateKeys == "string") {
    privateKeys = [privateKeys];
  }

  privateKeys.forEach(key => {
    // console.log("cfx networkId:", networkId)
    const account = new PrivateKeyAccount(key, networkId);
    const hexAddress = format.formatHexAddress(account.address);
    if (accountAddresses.indexOf(hexAddress) < 0) {
      accountAddresses.push(hexAddress);
      accounts[hexAddress] = account;
    }
  });
}

function getAccount(address) {
  debug("get account:", address, accounts);
  return accounts[format.formatHexAddress(address)];
}

async function setHost(host) {
  debug("set host:", host);
  cfx = new Conflux({
    url: host,
    // logger:console
  });
  let { networkId } = await cfx.getStatus();
  cfx.networkId = networkId;
  cfx.getAccount = getAccount;
}

// =============================================================

module.exports = ethToConflux;
