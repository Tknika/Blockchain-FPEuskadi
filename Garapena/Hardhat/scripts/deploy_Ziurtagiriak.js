// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0]; // Using the first account for deployment
  // Create a contract factory for the Ziurtagiriak contract with the deployer account
  const ZiurtagiriakFactory = await hre.ethers.getContractFactory("Ziurtagiriak", deployer);

  //const ziurtagiriak = await hre.ethers.deployContract("Ziurtagiriak", {
    //gasPrice: null, gasLimit: null,
  //});

  const ziurtagiriak = await ZiurtagiriakFactory.deploy({gasPrice: null, gasLimit: null,});

  await ziurtagiriak.waitForDeployment();

  console.log(
    `Ziurtagiriak deployed to ${ziurtagiriak.target}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
