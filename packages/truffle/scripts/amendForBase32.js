const fs = require("fs");
const path = require("path");

const cliPath = path.join(__dirname, "../build/cli.bundled.js");
const replaces = [
  {
    old: "var inputAddressFormatter = function (address) {",
    new: "var inputAddressFormatter = function (address) { return address"
  },
  {
    old:
      "    if(options.data && !utils.isHex(options.data)) {\n" +
      "        throw new Error('The data field must be HEX encoded data.');\n" +
      "    }",

    new:
      "//    if(options.data && !utils.isHex(options.data)) {\n" +
      "//        throw new Error('The data field must be HEX encoded data.');\n" +
      "//    }"
  },
  {
    old: "var toChecksumAddress = function (address) {",
    new: "var toChecksumAddress = function (address) { return address"
  },
  {
    old: "function isAddress(address) {",
    new: "function isAddress(address) { return true"
  },
  {
    old: "var isAddress = function (address) {",
    new: "var isAddress = function (address) { return true"
  }
];

let content = fs.readFileSync(cliPath).toString();
replaces.forEach(i => (content = content.replaceAll(i.old, i.new)));
fs.writeFileSync(cliPath, content);
