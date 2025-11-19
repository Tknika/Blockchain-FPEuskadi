# Encryption Library Setup

The Ekozir app requires `@metamask/eth-sig-util` for ECIES encryption. The library has been bundled for browser use.

## Setup (Already Done)

The library bundle has been created at `app/static/js/eth-sig-util.umd.js` using browserify.

## To Rebuild (if needed)

If you need to rebuild the bundle (e.g., after updating the library), run:

```bash
cd Garapena/Pilotoak/EkozirAPP
npm install @metamask/eth-sig-util browserify --save-dev
npx browserify -r @metamask/eth-sig-util -s EthSigUtil -o app/static/js/eth-sig-util.umd.js
```

## How It Works

1. The bundle is loaded in `base.html` as a script tag
2. Browserify exports the library as `EthSigUtil` global variable
3. The encryption function uses `EthSigUtil.encrypt()` to encrypt symmetric keys
4. MetaMask's `eth_decrypt` is used to decrypt the keys on the recipient side

## Library Reference

- GitHub: https://github.com/MetaMask/eth-sig-util
- NPM: https://www.npmjs.com/package/@metamask/eth-sig-util
- The `encrypt` function signature: `encrypt({ publicKey, data, version })`
  - `publicKey`: base64-encoded public key (from MetaMask)
  - `data`: string to encrypt (will be UTF-8 decoded)
  - `version`: "x25519-xsalsa20-poly1305"

