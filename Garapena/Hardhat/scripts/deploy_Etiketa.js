// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[1]; // Using the second account for deployment
  // Create a contract factory for the Etiketa contract with the deployer account
  const EtiketaFactory = await hre.ethers.getContractFactory("Etiketa", deployer);

 // const etiketa = await hre.ethers.deployContract("Etiketa", {
   // gasPrice: null, gasLimit: null,
  //});
  // Deploy the Etiketa contract
  const etiketa = await EtiketaFactory.deploy({gasPrice: null, gasLimit: null,});


  await etiketa.waitForDeployment();

  //const ownerAddress = await etiketa.owner();

  console.log(
    `Etiketa deployed to ${etiketa.target}`
  );
  //console.log(`Owner is set to ${ownerAddress}`);
  //console.log(`Does the owner match the second account? ${ownerAddress === deployer.address}`);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
