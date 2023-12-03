require("@nomicfoundation/hardhat-toolbox");

const { privateKey } = require('./secrets.json'); // import or create your private key

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  defaultNetwork: "besu",
  networks: {
    besu: {
	    allowUnlimitedContractSize: true,
	    url: "http://localhost:21003", // Replace with the actual Besu node URL
	    chainId: 1337, // Replace with the actual chain ID
	    gasPrice: 0,
	    gas: 0,
	    gasMultiplier: 0,
      accounts: [
      	privateKey,
        // Add more private keys if needed
      ],
    },
  },
};
