const { numToHex, setNull, delKeys } = require("./util");
const { format } = require("js-conflux-sdk");
const debug = require("debug")("web3-providers-http-proxy:format");

const EPOCH_MAP = {
  earliest: "earliest",
  latest: "latest_state",
  pending: "latest_state"
};

function formatCommonInput(params, cfx, txIndex = 0, epochIndex = 1) {
  let ti = txIndex;
  if (params[ti]) {
    let networkId = cfx && cfx.networkId;
    // format tx gas and gasPrice
    if (params[ti].gas && Number.isInteger(params[ti].gas)) {
      params[ti].gas = numToHex(params[ti].gas);
    }
    if (params[ti].gasPrice && Number.isInteger(params[ti].gasPrice)) {
      params[ti].gasPrice = numToHex(params[ti].gasPrice);
    }
    if (params[ti].from)
      params[ti].from = format.address(params[ti].from, networkId);
    if (params[ti].to) params[ti].to = formatAddress(params[ti].to, networkId);
  }
  formatEpochOfParams(params, epochIndex);
  return params;
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
  block.miner = formatHexAddress(block.miner);
  // format tx object
  if (
    block.tranactions &&
    block.tranactions.length > 0 &&
    typeof block.tranactions[0] === "object"
  ) {
    for (let tx of block.tranactions) {
      formatTransaction(tx);
    }
  }
  delKeys(block, [
    "adaptive",
    "blame",
    "deferredLogsBloomHash",
    "deferredReceiptsRoot",
    "deferredStateRoot",
    "epochNumber",
    "height",
    "powQuality",
    "refereeHashes"
  ]);
  setNull(block, [
    "extraData",
    "gasUsed",
    "logsBloom",
    "mixHash",
    "sha3Uncles",
    "totalDifficulty"
  ]);
  return block;
}

function formatTransaction(tx) {
  // blockNumber?   TODO maybe cause big problem
  tx.input = tx.data;
  tx.from = formatHexAddress(tx.from);
  tx.to = formatHexAddress(tx.to);

  delKeys(tx, [
    "chainId",
    "contractCreated",
    "data",
    "epochHeight",
    "status",
    "storageLimit"
  ]);
  setNull(tx, ["blockNumber"]);
  return tx;
}

async function formatTxParams(cfx, options) {
  if (options.value === undefined) {
    options.value = "0x0";
  }

  if (options.nonce === undefined) {
    options.nonce = await cfx.getNextNonce(options.from);
  }

  if (options.gasPrice === undefined) {
    options.gasPrice = cfx.defaultGasPrice;
  }
  if (options.gasPrice === undefined) {
    const recommendGas = Number.parseInt(await cfx.getGasPrice());
    options.gasPrice = numToHex(recommendGas || 1); // MIN_GAS_PRICE
  }

  if (options.gas === undefined) {
    options.gas = cfx.defaultGas;
  }

  if (options.storageLimit === undefined) {
    options.storageLimit = cfx.defaultStorageLimit;
  }

  if (options.gas === undefined || options.storageLimit === undefined) {
    const {
      gasUsed,
      storageCollateralized
    } = await cfx.estimateGasAndCollateral(options);

    if (options.gas === undefined) {
      options.gas = gasUsed;
    }

    if (options.storageLimit === undefined) {
      options.storageLimit = storageCollateralized;
    }
  }

  if (options.epochHeight === undefined) {
    options.epochHeight = await cfx.getEpochNumber();
  }

  if (options.chainId === undefined) {
    options.chainId = cfx.defaultChainId;
  }

  if (options.chainId === undefined) {
    const status = await cfx.getStatus();
    options.chainId = status.chainId;
  }

  const hasAccount = !cfx.getAccount(options.from);
  if (hasAccount) {
    options = format.callTxAdvance(cfx.networkId)(options);
  }
  return options;
}

function formatEpoch(tag) {
  return EPOCH_MAP[tag] || tag;
}

function formatEpochOfParams(params, index) {
  if (params[index]) {
    params[index] = formatEpoch(params[index]);
  }
}

// function formatHexAddress(args) {
//     debug("format hex address:", typeof args, args);
//     if (typeof args === "string")
//         return formatOne(args);

//     if (Array.isArray(args)) {
//         for (let i in args) {
//             args[i] = formatOne(args[i]);
//         }
//         return args;
//     }

//     return args;

//     function formatOne(cfxAddr) {
//         // debug("cfxAddr type:", typeof cfxAddr);
//         if (typeof cfxAddr != "string")
//             return cfxAddr;
//         // let lowerArg = cfxAddr.toLowerCase();
//         // debug("cfxAddr lower:", lowerArg);
//         // if (lowerArg.startsWith("cfx") || lowerArg.startsWith("net")) {
//         if (/(^| )(cfx|net).*:\w{42}$/ig.test(cfxAddr)) {
//             debug("format to hex address:", cfxAddr);
//             let hexAddr = format.hexAddress(cfxAddr);
//             debug("formated hex address", hexAddr);
//             return hexAddr;
//         }
//         return cfxAddr;
//     }
// }

function formatAddress(stringWithAddr, networkId) {
  if (!stringWithAddr) return stringWithAddr;

  return stringWithAddr.replace(/\b0x[a-f0-9]{40}\b/gi, str =>
    format.address(str, networkId)
  );
}

function formatHexAddress(address) {
  if (/(^| )(cfx|net).*:\w{42}$/gi.test(address)) {
    // debug("format to hex address:", address);
    let hexAddr = format.hexAddress(address);
    // debug("formated hex address", hexAddr);
    return hexAddr;
  }
  return address;
}

function repleacEthKeywords(data) { 
  if (typeof data === "string") {
    data = data.replace(/(^| )eth(\n|$| )/g, "$1cfx$2");
    data = data.replace(/(^| )ETH(\n|$| )/g, "$1CFX$2");
    data = data.replace(/\bgwei\b/gi, "GDrip");
  }
  return data;
}

function isContainHexAddress(obj, cache = new Map()) {
  if (!obj) return false;

  // console.log("cache.get(", obj,")", cache.get(obj));
  if (cache.has(obj)) return cache.get(obj);

  // console.log("check", obj, typeof obj);
  if (typeof obj === "string") {
    let result = /\b0x[a-f0-9]{40}\b/gi.test(obj);
    cache.set(Object(obj), result);
    return result;
  }

  if (Array.isArray(obj)) {
    cache.set(Object(obj), "pending");
    for (let i in obj) {
      let result = isContainHexAddress(obj[i], cache);
      cache.set(Object(obj[i]), result);
      if (result == true) {
        cache.set(Object(obj), true);
        return true;
      }
    }
    cache.set(Object(obj), false);
    return false;
  }

  if (typeof obj === "object") {
    cache.set(Object(obj), "pending");

    if (obj.constructor) {
      let ignoredObjs = ["ENS"];
      if (ignoredObjs.indexOf(obj.constructor.name) > -1) {
        cache.set(Object(obj), false);
        return false;
      }
    }

    let keys = Object.keys(obj);
    for (let k of keys) {
      try {
        let result = isContainHexAddress(obj[k], cache);
        cache.set(Object(obj[k]), result);
        if (result == true) {
          cache.set(Object(obj), true);
          return true;
        }
      } catch {
      }
    }
    cache.set(Object(obj), false);
    return false;
  }

  cache.set(Object(obj), false);
  return false;
}

function deepFormatAnyAddress(obj, networkId, tohex = false, cache = new Map()
) {
  // from, to, contractAddress, contractConcrete, address, string
  // console.log("deepFormatAddress obj", obj, typeof obj);

  if (!obj) return obj;
  if (cache.has(obj)) return cache.get(obj);

  // console.log("pre format obj", obj, typeof obj);

  let result = obj;
  if (typeof obj === "string") {
    result = tohex ? formatHexAddress(obj) : formatAddress(obj, networkId);
    cache.set(Object(obj), result);
  } else if (Array.isArray(obj)) {
    cache.set(Object(obj), obj);
    // console.log("is array", Array.isArray(obj));
    for (let i in obj) {
      obj[i] = deepFormatAnyAddress(obj[i], networkId, tohex, cache);
    }
    result = obj;
  } else if (typeof obj === "object") {
    cache.set(Object(obj), obj);
    Object.keys(obj).map(k => {
      debug("deepFormatAnyAddress key", k);
      obj[k] = deepFormatAnyAddress(obj[k], networkId, tohex, cache);
    });
    result = obj;
  }

  // cache.set(Object(obj), result);
  // console.log("map", map);
  // console.log("post format obj", result);
  return result;
}

function formatTxHexAddress(tx) {
  return format.callTxAdvance(0, true)(tx);
}

module.exports = {
  formatCommonInput,
  formatTransaction,
  formatBlock,
  formatTxParams,
  formatEpoch,
  formatEpochOfParams,
  formatAddress: formatAddress,
  formatHexAddress,
  formatTxHexAddress,
  deepFormatAddress: (obj, networkId) => deepFormatAnyAddress(obj, networkId),
  deepFormatHexAddress: obj => deepFormatAnyAddress(obj, 0, true),
  repleacEthKeywords,
  isContainHexAddress
};
