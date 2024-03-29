require("@nomicfoundation/hardhat-toolbox");

const { ziurtagiriakPK, etiketaPK } = require('./secrets.json'); // import or create your private keys

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.9"
      },
      {
        version: "0.8.0"
      }
    ]
  },
  defaultNetwork: "besu",
  networks: {
    besu: {
	    allowUnlimitedContractSize: true,
	    url: "http://localhost:8545", // Replace with the actual Besu node URL (default http RPC port is 8545)
	    chainId: 1337, // Replace with the actual chain ID
	    gasPrice: 0,
	    gas: 0x1ffffffffffffe,
	    gasMultiplier: 0,
      accounts: [
      	ziurtagiriakPK, // Ziurtagiriak contract deployer private key
        etiketaPK, // Etiketa contract deployer private key
        // Add more private keys if needed
      ],
    },
  },
};
