import cors from "cors";
import express from "express";
import multer from "multer";
import solc from "solc";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const port = Number(process.env.PORT ?? 3001);
const compilerVersion = solc.version();
const evmVersion = "london";
const supportContractNames = new Set(["Ownable", "ERC20", "ERC721", "ReentrancyGuard"]);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", compilerVersion, evmVersion });
});

function validateSoliditySource(fileName, sourceCode) {
  if (!fileName.toLowerCase().endsWith(".sol")) {
    return "El fichero debe tener extension .sol.";
  }

  if (!sourceCode.trim()) {
    return "El codigo fuente Solidity no puede estar vacio.";
  }

  return "";
}

function getPreferredContractName(fileName) {
  return fileName.replace(/\.sol$/i, "").trim();
}

function getCallableFunctionCount(abi) {
  return (abi ?? []).filter((item) => item?.type === "function").length;
}

function getWritableFunctionCount(abi) {
  return (abi ?? []).filter((item) => item?.type === "function" && item?.stateMutability !== "view" && item?.stateMutability !== "pure").length;
}

function scoreCompiledContract(contract, preferredContractName) {
  let score = 0;

  if (contract.deployable) {
    score += 1000;
  }

  if (contract.contractName === preferredContractName) {
    score += 700;
  }

  if (!supportContractNames.has(contract.contractName)) {
    score += 250;
  }

  score += contract.writableFunctionCount * 20;
  score += contract.callableFunctionCount * 5;

  return score;
}

function compileSoliditySource(fileName, sourceCode) {
  const input = {
    language: "Solidity",
    sources: {
      [fileName]: {
        content: sourceCode,
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion,
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  let output;
  try {
    output = JSON.parse(solc.compile(JSON.stringify(input)));
  } catch (error) {
    return {
      status: 500,
      body: {
        error: "No se pudo ejecutar solc.",
        detail: error instanceof Error ? error.message : String(error),
      },
    };
  }

  const diagnostics = output.errors ?? [];
  const errors = diagnostics.filter((entry) => entry.severity === "error").map((entry) => entry.formattedMessage);
  const warnings = diagnostics.filter((entry) => entry.severity !== "error").map((entry) => entry.formattedMessage);

  if (errors.length > 0) {
    return {
      status: 400,
      body: {
        error: "La compilacion ha fallado.",
        compilerVersion,
        evmVersion,
        errors,
        warnings,
      },
    };
  }

  const preferredContractName = getPreferredContractName(fileName);
  const analyzedContracts = Object.entries(output.contracts ?? {}).flatMap(([sourceName, contractsByName]) => {
    return Object.entries(contractsByName).map(([contractName, artifact]) => {
      const abi = artifact?.abi ?? [];
      const bytecodeObject = artifact?.evm?.bytecode?.object ?? "";
      const bytecode = bytecodeObject ? `0x${bytecodeObject}` : "";
      return {
        id: `${sourceName}:${contractName}`,
        sourceName,
        contractName,
        abi,
        bytecode,
        deployable: bytecode.length > 2,
        callableFunctionCount: getCallableFunctionCount(abi),
        writableFunctionCount: getWritableFunctionCount(abi),
      };
    });
  });

  analyzedContracts.sort((left, right) => {
    const scoreDifference = scoreCompiledContract(right, preferredContractName) - scoreCompiledContract(left, preferredContractName);
    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return left.contractName.localeCompare(right.contractName);
  });

  const recommendedContractId = (analyzedContracts.find((contract) => contract.deployable) ?? analyzedContracts[0])?.id ?? "";
  const compiledContracts = analyzedContracts.map(({ writableFunctionCount, ...contract }) => ({
    ...contract,
    recommended: contract.id === recommendedContractId,
  }));

  return {
    status: 200,
    body: {
      compilerVersion,
      evmVersion,
      warnings,
      contracts: compiledContracts,
    },
  };
}

app.post("/api/compile", upload.single("contract"), (request, response) => {
  if (!request.file) {
    response.status(400).json({ error: "Debes subir un fichero .sol." });
    return;
  }

  const fileName = request.file.originalname || "Contract.sol";
  const sourceCode = request.file.buffer.toString("utf8");
  const validationError = validateSoliditySource(fileName, sourceCode);
  if (validationError) {
    response.status(400).json({ error: validationError });
    return;
  }

  const result = compileSoliditySource(fileName, sourceCode);
  response.status(result.status).json(result.body);
});

app.post("/api/compile/source", (request, response) => {
  const { fileName, sourceCode } = request.body ?? {};
  if (typeof fileName !== "string" || typeof sourceCode !== "string") {
    response.status(400).json({ error: "Debes enviar fileName y sourceCode en formato JSON." });
    return;
  }

  const normalizedFileName = fileName.trim() || "BuilderContract.sol";
  const validationError = validateSoliditySource(normalizedFileName, sourceCode);
  if (validationError) {
    response.status(400).json({ error: validationError });
    return;
  }

  const result = compileSoliditySource(normalizedFileName, sourceCode);
  response.status(result.status).json(result.body);
});

app.listen(port, () => {
  console.log(`Besu contract compiler listening on port ${port}`);
});
