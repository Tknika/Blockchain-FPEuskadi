const hre = require("hardhat");

async function main() {
  //const [deployer] = await hre.ethers.getSigners();
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[2];
  console.log("Deploying contracts with the account:", deployer.address);

  const FormakuntzaBFPE = await hre.ethers.getContractFactory("FormakuntzaBFPE");
  const formakuntza = await FormakuntzaBFPE.deploy(deployer.address);

  //await formakuntza.waitForDeployment();
  const receipt = await formakuntza.deploymentTransaction().wait();

  console.log("FormakuntzaBFPE deployed to:", formakuntza.address);
  console.log("FormakuntzaBFPE deployed to:", receipt.contractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });