export const START = "SESSION_START";
export function start(provider, txHash) {
  return {
    type: START,
    provider,
    txHash //OPTIONAL
  };
}

export const LOAD_TRANSACTION = "LOAD_TRANSACTION";
export function loadTransaction(txHash) {
  return {
    type: LOAD_TRANSACTION,
    txHash
  };
}

//triggers the unload() saga
export const UNLOAD_TRANSACTION = "UNLOAD_TRANSACTION";
export function unloadTransaction() {
  return {
    type: UNLOAD_TRANSACTION
  };
}

//does the actual unloading
export const BLANK_TRANSACTION = "BLANK_TRANSACTION";
export function blankTransaction() {
  return {
    type: BLANK_TRANSACTION
  };
}

export const READY = "SESSION_READY";
export function ready() {
  return {
    type: READY
  };
}

export const WAIT = "SESSION_WAIT";
export function wait() {
  return {
    type: WAIT
  };
}

export const ERROR = "SESSION_ERROR";
export function error(error) {
  return {
    type: ERROR,
    error
  };
}

export const RECORD_CONTRACTS = "RECORD_CONTRACTS";
export function recordContracts(contexts, sources) {
  return {
    type: RECORD_CONTRACTS,
    contexts,
    sources
  };
}

export const SAVE_TRANSACTION = "SAVE_TRANSACTION";
export function saveTransaction(transaction) {
  return {
    type: SAVE_TRANSACTION,
    transaction
  };
}

export const SAVE_RECEIPT = "SAVE_RECEIPT";
export function saveReceipt(receipt) {
  return {
    type: SAVE_RECEIPT,
    receipt
  };
}

export const SAVE_BLOCK = "SAVE_BLOCK";
export function saveBlock(block) {
  return {
    type: SAVE_BLOCK,
    block
  };
}
