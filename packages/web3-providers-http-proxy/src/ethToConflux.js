const { emptyFn, deepClone, delKeys } = require("./util");
const debug = require("debug")("ethToConflux");
const { PrivateKeyAccount, Conflux } = require("js-conflux-sdk");
const format = require("./format");
const { internalContractAddrs } = require("./constants");

let cfx = undefined;
var accounts;


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
      if (response && accounts && accounts.length) {
        response.result = accounts.map(a => a.address);
        response.error = null;
      }
      return response;
    }
  },

  eth_getTransactionCount: {
    method: "cfx_getNextNonce", // NOT right
    input: function (params) {
      format.formatEpochOfParams(params, 1);
      return params;
    }
  },

  eth_getCode: {
    send: function (orignSend, payload, callback) {
      if (internalContractAddrs.indexOf(format.formatHexAddress(payload.params[0])) > -1) {
        const response = {
          jsonrpc: payload.jsonrpc,
          result: "0x8060",
          id: payload.id
        };
        callback(null, response);
      } else {
        payload.method = "cfx_getCode";
        payload.params[0].address = format.formatAddress(payload.params[0].address, cfx.networkId);
        format.formatEpochOfParams(payload.params, 1);

        orignSend(payload, function (err, res) {
          if (res && res.error && res.error.code == -32016) {
            res.error = null;
            res.result = "0x";
          }
          callback(err, res);
        });
      }

    }
  },

  eth_estimateGas: {
    method: "cfx_estimateGasAndCollateral",
    input: function (params) {
      format.formatCommonInput(params, cfx);
      return params;
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
        if (txReceipt.logs) {
          for (i in txReceipt.logs) {
            l = txReceipt.logs[i];
            l.blockNumber = txReceipt.epochNumber;
            l.transactionIndex = txReceipt.index;
            l.logIndex = "0x" + i.toString(16);
          }
        }

        txReceipt.contractAddress = txReceipt.contractCreated;
        txReceipt.blockNumber = txReceipt.epochNumber;
        txReceipt.transactionIndex = txReceipt.index;
        txReceipt.status = Number.parseInt(txReceipt.outcomeStatus)
          ? "0x0"
          : "0x1"; // conflux和以太坊状态相反
        txReceipt.cumulativeGasUsed = txReceipt.gasUsed; // TODO simple set

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
        params[0].address = format.formatAddress(params[0].address, cfx.networkId);
        delKeys(params[0], [
          "fromBlock",
          "toBlock"
        ]);
      }
      return params;
    },
    output: function (response) {
      if (response && response.result) {
        let logs = response.result;
        logs.forEach(l => {
          l.blockNumber = l.epochNumber;
        });
      }
      return response;
    }
  },

  eth_sign: {
    method: "sign",
    send: function (orignSend, payload, callback) {
      payload = deepClone(payload);
      const address = payload.params[0];
      const message = payload.params[1];
      const account = getAccount(address);

      if (account) {
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
        callback(null, response);
      } else {
        let newParams = [message, address];
        payload.method = "sign";
        payload.params = newParams;
        orignSend(payload, callback);
      }
    }
  },

  eth_subscribe: {
    method: "cfx_subscribe"
  }


};

function ethToConflux(options) {
  // console.log("ethToConflux in");
  // it's better to use class

  setHost(options.url || `http://${options.host}:${options.port}`);
  adaptor = async function (payload) {

    await setNetowrkId();
    await setAccounts(options.privateKeys, cfx.networkId);
    adaptor.accounts = accounts;

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
  return adaptor;
}

// helper methods===============================================

function formatPrivateKeys(privateKeys) {
  if (privateKeys == undefined) return;

  if (typeof privateKeys == "string") {
    privateKeys = [privateKeys];
  }
  if (!Array.isArray(privateKeys)) {
    throw new Error("PrivateKeys must be string or array");
  }
  return privateKeys.map(format.formatPrivateKey);
}

async function setAccounts(privateKeys, networkId) {
  if (!accounts) {
    if (privateKeys) {
      accounts = formatPrivateKeys(privateKeys)
        .map(k => new PrivateKeyAccount(k, networkId));
      return;
    }

    try {
      accounts = await cfx.getAccounts();
    }
    catch {
      accounts = [];
    }
  }
}

function getAccount(address) {
  debug("get account:", address, accounts);
  let filterd = accounts.filter(a => a.address == address);
  return filterd.length ? filterd[0] : undefined;
}

function setHost(host) {
  if (!cfx) {
    debug("set host:", host);
    cfx = new Conflux({
      url: host,
      // logger:console
    });
  }
}

async function setNetowrkId() {
  if (!cfx.networkId) {
    let { networkId } = await cfx.getStatus();
    cfx.networkId = networkId;
    cfx.getAccount = getAccount;
  }
}

// =============================================================

module.exports = ethToConflux;
