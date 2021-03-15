import { Web3Shim } from "..";
import { Conflux } from "js-conflux-sdk";
// @ts-ignore
import { ethToConflux, HttpProvider } from "web3-providers-http-proxy";

// We simply return plain ol' Web3.js
export const ConfluxDefinition = {
  async initNetworkType(web3: Web3Shim) {
    // console.log("init network by conflux type");

    overrides.initCfx(web3);
    overrides.provider(web3);
    // overrides.cfxSendTransaction(web3);
  }
};

var cfx: Conflux;

const overrides = {
  initCfx: (web3: Web3Shim) => {
    // save cfx object
    cfx = new Conflux({
      // @ts-ignore
      url: web3.currentProvider.host // TODO get network config from web3 object
      // @ts-ignore
      // logger:console
    });
    // @ts-ignore
    cfx.updateNetworkId().catch(console.error);

    // @ts-ignore
    web3.cfx = cfx;
    // @ts-ignore
    // web3.cfxutil = util;
    // @ts-ignore
    cfx.getAccounts = web3.eth.getAccounts;
  },

  provider: (web3: Web3Shim) => {
    if (!(web3.currentProvider instanceof HttpProvider)) {
      let provider = new HttpProvider(
        // @ts-ignore
        web3.currentProvider.host,
        {
          keepAlive: false,
          // @ts-ignore
          chainAdaptor: ethToConflux({ url: web3.currentProvider.host })
        }
      );
      web3.setProvider(provider);
    }
  },
  // cfxSendTransaction: (web3: Web3Shim) => {
  //   if (web3.currentProvider instanceof HttpProvider) {
  //     const old = cfx.sendTransaction;
  //     // @ts-ignore
  //     const ethToConfluxAdaptor = web3.currentProvider.chainAdaptor;
  //     const accounts = ethToConfluxAdaptor.accounts;
  //     const newMethod = function() {
  //       const from = arguments[0].from;
  //       if (from && typeof from === "string") {
  //         arguments[0].from = accounts[from.toLowerCase()] || from;
  //       }
  //       // @ts-ignore
  //       return old(...arguments);
  //     };
  //     cfx.sendTransaction = newMethod;
  //   }
  // }
};
