const util = require('./util');
const yargs = require("yargs/yargs");

// not work
function syncFunc(asyncFunc) {
  return function() {
    var sync = true;
    var data = null;
    console.log("asyncFunc start.");
    // setTimeout(() => {
    asyncFunc(...arguments).then(config => {
      console.log("asyncFunc done.", config);
      if (err) throw err;
      sync = false;
      data = config;
    });
    // sync = false;
    // }, 2000);

    while (sync) {
      require("deasync").sleep(100);
      console.log("sleep", sync);
    }

    return data;
  };
}

async function detectNetworkId() {
  // console.log("start detect config");
  const { Environment } = require("@truffle/environment");
  const Config = require("@truffle/config");
  
  const inputArguments = process.argv.slice(2);
  let args = yargs();
  let argv = args.parse(inputArguments);
  const config = Config.detect({network:argv.network});
  // console.trace("config.network",config.network);
  await Environment.detect(config);
  // console.trace(config.networks[config.network].network_id);
  return config.networks[config.network].network_id;
}

let detectNetowrkIdSync = syncFunc(detectNetworkId);
// let detectConfigSync = syncFunc(async () => { return { networkId: 10 }; });

module.exports = {
  ...util,
  detectNetworkId,
  detectNetowrkIdSync
};
