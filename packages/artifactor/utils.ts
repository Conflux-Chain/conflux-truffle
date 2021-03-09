import fse from "fs-extra";
import merge from "lodash.merge";
import assign from "lodash.assign";
import { ContractObject } from "@truffle/contract-schema";
const { format } = require("web3-providers-http-proxy");

export function writeArtifact(
  completeArtifact: ContractObject,
  outputPath: string
) {
  completeArtifact.updatedAt = new Date().toISOString();
  Object.keys(completeArtifact.networks).forEach(networkId => {
    // console.log("deepFormatAddress networkId",networkId)
    format.deepFormatAddress(
      completeArtifact.networks[networkId],
      Number.parseInt(networkId)
    );
  });
  fse.writeFileSync(
    outputPath,
    JSON.stringify(completeArtifact, null, 2),
    "utf8"
  );
}

export function finalizeArtifact(
  normalizedExistingArtifact: ContractObject,
  normalizedNewArtifact: ContractObject
) {
  const knownNetworks = merge(
    {},
    normalizedExistingArtifact.networks,
    normalizedNewArtifact.networks
  );
  const completeArtifact = assign(
    {},
    normalizedExistingArtifact,
    normalizedNewArtifact,
    { networks: knownNetworks }
  );
  return completeArtifact;
}
