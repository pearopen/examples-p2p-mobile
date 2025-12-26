# Basic Video Stream

- P2P basic video stream app running in mobile environment

- Stack: holepunch, bare, bare-kit, react-native-bare-kit, autobase, hyperdb, blind-pairing, hyperswarm, corestore

## Usage
In the script `build` in `package.json`, update your target, e.g. ios-arm64, linux-x64
- see more at https://github.com/holepunchto/bare-pack#target

Then
```shell
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
