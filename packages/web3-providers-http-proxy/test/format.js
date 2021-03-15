const format = require("../src/format");
const { expect } = require("chai");

describe("should format accounts", async function () {
  it("account array", function () {
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
  it("object with address array", function () {
    input = { '0': ['0x15359711FDDfe27c6009F63C9E0A5d26cC78ED44'] };
    expects = { '0': ['cfxtest:aamxnf2v91t8e9dabh5d3humnyxp28hrjutn9y9a04'] };
    formatedAccounts = format.deepFormatAddress(input, 1);
    expect(formatedAccounts).to.be.deep.equal(expects);
  });
  it("function arguemnts with adress array", function () {
    (function () {
      // console.trace(arguments);
      let input = arguments;
      let expects = { '0': ['cfxtest:aamxnf2v91t8e9dabh5d3humnyxp28hrjutn9y9a04'] };
      let formatedAccounts = format.deepFormatAddress(input, 1);
      // console.trace(formatedAccounts, expects);
      expect(formatedAccounts[0]).to.be.deep.equal(expects[0]);
      
    })(['0x15359711FDDfe27c6009F63C9E0A5d26cC78ED44']);
  });
});

describe("is contain hex address", async function () {
  it("object recursion with address", function () {
    objA = {};
    objA.orign = objA;
    objA.addr = "0x15359711FDDfe27c6009F63C9E0A5d26cC78ED44";
    expect(format.isContainHexAddress(objA)).to.be.equal(true);
  });
  it("object recursion without address", function () {
    objA = {};
    objA.orign = objA;
    expect(format.isContainHexAddress(objA)).to.be.equal(false);
  });
  it("object un-recursion with address", function () {
    objA = {};
    objA.a = {
      name: "a"
    };
    objA.b = {
      name: "b",
      addr: "0x15359711FDDfe27c6009F63C9E0A5d26cC78ED44"
    };
    expect(format.isContainHexAddress(objA)).to.be.equal(true);
  });
  it("object un-recursion without address", function () {
    objA = {};
    objA.a = {
      name: "a"
    };
    objA.b = {
      name: "b"
    };
    expect(format.isContainHexAddress(objA)).to.be.equal(false);
  });
});