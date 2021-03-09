# Conflux-Truffle

<img src="conflux.png" width="400"><img src="truffle.png" width="100">
-----------------------

Conflux-Truffle is a development environment, testing framework and asset pipeline for Conflux, aiming to make life as an Conflux developer easier. With Conflux-Truffle, you get:

* Built-in smart contract compilation, linking, deployment and binary management.
* Automated contract testing with Mocha and Chai.
* Configurable build pipeline with support for custom build processes.
* Scriptable deployment & migrations framework.
* Network management for deploying to many public & private networks.
* Interactive console for direct contract communication.
* Instant rebuilding of assets during development.
* External script runner that executes scripts within a Conflux-Truffle environment.

| ℹ️ **Contributors**: Please see the [Development](#development) section of this README. |
| --- |

### Install

```
$ npm install -g conflux-truffle
```

### Quick Usage

For a default set of contracts and tests, run the following within an empty project directory:

```
$ cfxtruffle init
```

From there, you can run `cfxtruffle compile`, `cfxtruffle migrate` and `cfxtruffle test` to compile your contracts, deploy those contracts to the network, and run their associated unit tests.

Conflux-Truffle comes bundled with a local development blockchain server that launches automatically when you invoke the commands  above. If you'd like to [configure a more advanced development environment](http://truffleframework.com/docs/advanced/configuration) we recommend you install the conflux-rust docker separately by running `docker pull confluxchain/conflux-rust` at the command line.

+ [conflux-rust-docker](https://hub.docker.com/r/confluxchain/conflux-rust)
### Documentation

* [How to guide](https://github.com/Conflux-Chain/conflux-truffle/blob/conflux/how-to-use.md)
* [Chinese version how-to](https://github.com/Pana/conflux-101/blob/master/docs/conflux-truffle.md)
* [Ultimate tutorial (More detailed guide)](./ultimate-guide.md)

### Development

We welcome pull requests. To get started, just fork this repo, clone it locally, and run:

```shell
# Install
npm install -g yarn
yarn bootstrap

# Test
yarn test

# Adding dependencies to a package
cd packages/<truffle-package>
yarn add <npm-package> [--dev] # Use yarn
```

If you'd like to update a dependency to the same version across all packages, you might find [this utility](https://www.npmjs.com/package/lerna-update-wizard) helpful.

*Notes on project branches:*
+    `master`: Stable, released version (v5)
+    `beta`: Released beta version
+    `develop`: Work targeting stable release (v5)
+    `next`: Upcoming feature development and most new work

Please make pull requests against `next` for any substantial changes. Small changes and bugfixes can be considered for `develop`.

There is a bit more information in the [CONTRIBUTING.md](./CONTRIBUTING.md) file.

### Change Log

Please see the change logs from [here](https://github.com/Conflux-Chain/conflux-truffle/blob/conflux/CHANGE_LOG.md)
### License

MIT
