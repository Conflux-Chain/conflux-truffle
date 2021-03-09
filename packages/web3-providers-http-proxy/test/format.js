const format = require("../src/format");
const { expect } = require("chai");

describe("should format accounts", async function() {
  it("account array", function() {
    accounts = [
      "0x15359711FDDfe27c6009F63C9E0A5d26cC78ED44",
      "0x16359711FDDfe27c6009F63C9E0A5d26cC78ED44"
    ];
    expects = [
      "cfxtest:aamxnf2v91t8e9dabh5d3humnyxp28hrjutn9y9a04",
      "cfxtest:aandnf2v91t8e9dabh5d3humnyxp28hrjuab1mwbmm"
    ];
    formatedAccounts = format.deepFormatAddress(accounts, 1);
    expect(formatedAccounts).to.be.deep.equal(expects);
  });
});
