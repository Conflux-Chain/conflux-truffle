
# Change Log

## v1.0.0
1. support addresses format follow cip37
2. upgrade js-conflux-sdk version to v1.5.11
3. sync new features with truffle
4. display storage usage after contract deploy successfully
5. support `cfx` and `cfxsdk` in context of commands `cfxtruffle console`, `cfxtruffle test`, `cfxtruffle execute`

## v0.0.8
support contract method `call` and `send` with options `storageLimit`,`epochHeight`,`chainId`

## v0.0.7
`cfxtruffle exec` supports context `cfx`

## v0.0.6
1. `cfxtruffle console` supports subcommand `cfxutil`
2. `cfxtruffle console` supports auto sign transaction by configed privateKeys when `cfx.sendTransaction`
3. enhanced error handle in `cfxtruffle console`

## v0.0.5
1. Support config privateKeys for signing in local and send transaction to remote node
2. Provide more detail info when execute rpc error in `cfxtruffle console`
