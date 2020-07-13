const Web3HttpProvider = require("web3-providers-http");
const defaultAdaptor = require("./util").defaultAdaptor;
const ethToConflux = require("./ethToConflux");

class Web3HttpProviderProxy extends Web3HttpProvider {
  constructor(host, options) {
    super(host, options);
    this.chainAdaptor = options.chainAdaptor || defaultAdaptor;
  }

  send(payload, callback) {
    const adapted = this.chainAdaptor(payload);
    let supersend = super.send.bind(this);

    if (adapted.then) adapted.then(execute);
    else execute(adapted);

    function execute(_adapted) {
      supersend(_adapted.adaptedPayload, function(err, result) {
        // console.log(`Send RPC:`, _adapted.adaptedPayload);
        if (err) {
          callback(err);
        } else {
          // let adaptorResult = _modified.outputFn(result);
          // console.log("adaptor rpc response:", adaptorResult);
          callback(null, _adapted.adaptedOutputFn(result));
        }
      });
    }
  }
}

module.exports = {
  HttpProvider: Web3HttpProviderProxy,
  ethToConflux
};
