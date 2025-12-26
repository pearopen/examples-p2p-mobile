# Basic Chat

- P2P basic chat app with blind peering running in mobile environment

- Stack: holepunch, bare, bare-kit, react-native-bare-kit, corestore, hyperswarm, blind-pairing, hyperdb, hrpc, autobase, blind-peering

## Usage
In the script `build` in `package.json`, update your target, e.g. ios-arm64, linux-x64
- see more at https://github.com/holepunchto/bare-pack#target

Then
```shell
# run a blind peer + print listening-key
npm i -g blind-peer-cli@latest
npx blind-peer -s /tmp/blind1

# user1: create room
npm i
npm run build
npm run ios
# or npm run android

# user2: clone into separate dir + join room
npm i
npm run build
npm run ios
# or npm run android
```
