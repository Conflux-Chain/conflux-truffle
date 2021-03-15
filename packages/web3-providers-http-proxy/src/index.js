const Web3HttpProvider = require("web3-providers-http");
const defaultAdaptor = require("./util").defaultAdaptor;
const ethToConflux = require("./ethToConflux");
const debug = require("debug")("provider-proxy");
const format = require("./format");
const confluxUtil = require("./confluxUtil");
const util = require('util');

class Web3HttpProviderProxy extends Web3HttpProvider {
  constructor(host, options) {
    super(host, options);
    this.chainAdaptor = options.chainAdaptor || defaultAdaptor;
    this.id = "Web3HttpProviderProxy";
  }

  send(payload, callback) {
    // throw new Error( "test callback error handler");
    // console.trace("provider-proxy send trace stack");
    const adapted = this.chainAdaptor(payload);
    debug("adapted:", adapted);
    const superSend = super.send.bind(this);

    if (adapted.then) {
      adapted.then(execute).catch(wrappedCallback);
    } else {
      try {
        execute(adapted);
      } catch (err) {
        wrappedCallback(err);
      }
    }

    function wrappedCallback(err, result) {
      if (result && result.error && result.error.message) {
        let errData = result.error.data;
        // result.error.message += `\n> raw rpc payload is: ${JSON.stringify(
        //   payload
        // )}`;
        result.error.message += errData ? `\n> error data: ${util.inspect(errData)}` : "";
      }
      if (err) debug("error:", err.stack);
      callback(err, result);
    };

    function execute(_adapted) {
      // console.log("execute ", _adapted);
      if (_adapted.adaptedSend) {
        _adapted.adaptedSend(superSend, payload, wrappedCallback);
        return;
      }

      debug(`\nsend rpc:`, _adapted.adaptedPayload);
      superSend(_adapted.adaptedPayload, function (err, result) {
        let adaptorResult = result && _adapted.adaptedOutputFn(result);
        debug("adaptor rpc response:", adaptorResult, "\n");

        if (adaptorResult.error && adaptorResult.error.message) {
          adaptorResult.error.message += `\n> adapted payload is: ${JSON.stringify(
            _adapted.adaptedPayload
          )}`;
        }
        // console.trace("wrappedCallback",err,adaptorResult);
        wrappedCallback(err, adaptorResult);
      });
    };
  }
}

module.exports = {
  HttpProvider: Web3HttpProviderProxy,
  ethToConflux,
  format,
  confluxUtil
};
