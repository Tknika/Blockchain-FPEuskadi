const hre = require("hardhat");

async function main() {
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[4] || accounts[0];

  if (!deployer) {
    throw new Error("No deployer account configured. Add bozketaPK to secrets.json or configure a Hardhat account.");
  }

  const BozketaFactory = await hre.ethers.getContractFactory("Bozketa", deployer);
  const bozketa = await BozketaFactory.deploy({ gasPrice: null, gasLimit: null });

  await bozketa.waitForDeployment();

  console.log(`Bozketa deployed to ${bozketa.target}`);
  console.log(`Deployer address: ${deployer.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
