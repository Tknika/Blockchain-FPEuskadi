require("@nomicfoundation/hardhat-toolbox");
const fs = require('fs'); // Required to read files from the filesystem

const { ziurtagiriakPK, etiketaPK } = require('./secrets.json'); // Import private keys from secrets.json

// Read the JWT token from a file named jwt.token
const jwtToken = fs.readFileSync('JWT_1', 'utf8').trim();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.22"
      },
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
	    url: "http://localhost:8545", // Besu node URL (default http RPC port is 8545)
	    chainId: 1337, // Actual chain ID
	    gasPrice: 0,
	    gas: 0x1ffffffffffffe,
	    gasMultiplier: 0,
      accounts: [
      	ziurtagiriakPK, // Ziurtagiriak contract deployer private key
        etiketaPK, // Etiketa contract deployer private key
        formakuntzaPK, // Formakuntza contract deployer private key
        // Additional private keys can be added here if needed
      ],
      httpHeaders: {
        Authorization: `Bearer ${jwtToken}` // Use the JWT token read from jwt.token file for secured endpoints
      },
    },
  },
};
