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
  const config = Config.detect({});
  // console.trace(config);
  await Environment.detect(config);
  // console.trace(config.networks[config.network].network_id);
  return config.networks[config.network].network_id;
}

let detectNetowrkIdSync = syncFunc(detectNetworkId);
// let detectConfigSync = syncFunc(async () => { return { networkId: 10 }; });

module.exports = {
  detectNetworkId,
  detectNetowrkIdSync
};
