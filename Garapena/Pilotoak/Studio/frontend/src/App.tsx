import { ChangeEvent, FormEvent, useEffect, useId, useRef, useState, type RefObject } from "react";
import { BrowserProvider, Contract, ContractFactory, JsonRpcProvider, ethers } from "ethers";
import type { AbiInput, AbiItem, CompileResponse, CompiledContract, EthereumProvider } from "./types";

const besuRpcUrl = import.meta.env.VITE_BESU_RPC_URL ?? "http://192.168.100.1:8545";
const networkName = import.meta.env.VITE_NETWORK_NAME ?? "Besu";
const nativeCurrencyName = import.meta.env.VITE_NATIVE_CURRENCY_NAME ?? "Ether";
const nativeCurrencySymbol = import.meta.env.VITE_NATIVE_CURRENCY_SYMBOL ?? "ETH";
const blockExplorerUrl = import.meta.env.VITE_BLOCK_EXPLORER_URL ?? "";
const configuredChainId = import.meta.env.VITE_CHAIN_ID ?? "1337";
const builderFrameUrl = "/smart-contract-builder/index.html?embed=1&v=20260413-4";
const headerLogoUrl = "/brand/BFPE-logoa.png";
const languageStorageKey = "besu-playground.language";
const configuredChainIdHex = configuredChainId.startsWith("0x")
  ? configuredChainId.toLowerCase()
  : `0x${BigInt(configuredChainId).toString(16)}`;
const providerPollingIntervalMs = 15_000;
const configuredNetwork = {
  chainId: Number(configuredChainId),
  name: networkName,
};

type ContractFormState = Record<string, string>;
type Language = "eu" | "es" | "en";
type ContractSourceMode = "upload" | "builder";
type WorkflowStep = "source" | "compile" | "deploy" | "interact";
type BuilderTemplateId = "storage" | "erc20" | "erc721" | "voting" | "blank";

type BuilderSource = {
  fileName: string;
  sourceCode: string;
  templateId?: BuilderTemplateId;
  updatedAt: string;
  workspaceSnapshot?: string;
  builderVersion?: string;
};

type ExplorerLinkKind = "address" | "tx" | "block";
type InteractionExplorerMeta = {
  txHash: string;
  blockNumber?: string;
};

const translations = {
  eu: {
    languageLabel: "Hizkuntza",
    languages: { eu: "Euskara", es: "Castellano", en: "English" },
    eyebrow: "Solidity + Hyperledger Besu",
    title: "BFPE SmartContract Studio",
    heroCopy: "Backend-ak London EVMrako konpilatzen du eta hedapena erabiltzailearen walletetik sinatzen da, gako pribatuak gorde gabe.",
    targetNetwork: "Helburuko sarea",
    connectWallet: "Konektatu wallet-a",
    reconnectWallet: "Berriz konektatu wallet-a",
    switchNetwork: "Aldatu Besu sarera",
    walletDisconnected: "Wallet-a ez dago konektatuta.",
    walletDisconnectedShort: "Wallet-a deskonektatuta dago.",
    walletConnected: (address: string) => `${networkName} sarean konektatutako wallet-a: ${address}`,
    walletWrongNetwork: (address: string) => `Wallet-a ${address} kontuarekin konektatuta dago, baina ez ${networkName} sarean.`,
    noInjectedWallet: "Ez dago wallet iniektaturik nabigatzailean.",
    requestingWallet: "Wallet-erako sarbidea eskatzen...",
    switchingNetwork: `${networkName} sarera aldatzen...`,
    walletConnectFailed: "Ezin izan da wallet-a konektatu.",
    switchNetworkFailed: "Ezin izan da wallet-a espero zen Besu sarera aldatu.",
    sourceTitle: "0. Kontratuaren jatorria",
    sourceBadge: "Upload / Builder",
    sourceModeAria: "Kontratuaren jatorriaren hautaketa",
    uploadMode: "Igo Solidity",
    builderMode: "SmartContract Builder",
    uploadIntro: "Modu honek .sol fitxategi bat igotzeko eta egungo fluxuarekin jarraitzeko balio du.",
    uploadHintNoFile: "Oraindik ez duzu .sol fitxategirik hautatu.",
    builderIntro: "Erabili integratutako Blockly editorea Solidity sortzeko eta bidali kontratua zuzenean Playground-era.",
    builderPending: "Oraindik ez dago SmartContract Builder-etik esportatutako kontraturik.",
    builderReady: (fileName: string, templateLabel: string) => `Builder-etik jasotako kontratua: ${fileName} · txantiloia ${templateLabel}.`,
    builderTemplatesTitle: "Aurreikusitako txantiloiak",
    builderWorkspaceTitle: "Blockly Builder integratua",
    builderNextStep: "Sortu Solidity kodea Builder barruan eta erabili " + '"Use in Playground"' + " botoia uneko konpilazio eta hedapen fluxura bidaltzeko.",
    builderTemplates: {
      storage: "Storage",
      erc20: "ERC20",
      erc721: "ERC721",
      voting: "Voting",
      blank: "Blank",
    },
    activeSourceLabel: "Iturri aktiboa",
    activeSourceUpload: (fileName: string) => `Eskuzko igoera · ${fileName}`,
    activeSourceUploadMissing: "Eskuzko igoera · fitxategirik hautatu gabe",
    activeSourceBuilder: (fileName: string, templateLabel: string) => `Builder · ${fileName} · txantiloia ${templateLabel}`,
    activeSourceBuilderPending: "Builder · Solidity esportazioaren zain",
    compileNeedsUploadSource: "Hautatu .sol fitxategi bat konpilatzeko.",
    compileNeedsBuilderSource: "SmartContract Builder-ek oraindik ez du kontraturik esportatu Playground-era.",
    compileTitle: "1. Konpilazioa",
    deployTitle: "2. Hedapena",
    interactionTitle: "3. ABI-tik sortutako interakzioa",
    interactionBadge: "Irakurketa eta idazketa",
    userWalletBadge: "Wallet",
    copyWalletAddress: "Kopiatu wallet helbidea",
    copiedWalletAddress: "Kopiatuta!",
    solidityFile: "Solidity fitxategia",
    selectedFile: (fileName: string) => `Hautatutako fitxategia: ${fileName}`,
    compileButton: "Konpilatu kontratua",
    compilingButton: "Konpilatzen...",
    compileFirst: "Lehenengo kontratu zabalgarri bat konpilatu.",
    compiler: (version: string) => `Konpilatzailea: ${version}`,
    compiledContract: "Konpilatutako kontratua",
    deployable: "zabalgarria",
    noBytecode: "bytecoderik gabe",
    downloadAbi: "Deskargatu ABI",
    constructorLabel: (name: string, index: number, type: string) => `Eraikitzailea: ${name || `param_${index}`} · ${type}`,
    deployButton: (name: string) => `${name} zabaldu`,
    deployingButton: "Zabaltzen...",
    preparingDeployment: "Hedapena prestatzen...",
    waitingForBlock: "Blokearen baieztapena itxaroten...",
    deployedAt: (address: string) => `Kontratua ondo zabaldu da hemen: ${address}`,
    noContractSelected: "Ez dago hautatutako kontratu konpilaturik.",
    selectedContractNotDeployable: "Hautatutako kontratuak ez du bytecode zabalgarririk sortzen.",
    needWalletToDeploy: "Wallet iniektatu bat behar duzu zabaltzeko.",
    deployFailed: "Hedapenak huts egin du.",
    txHash: (hash: string) => `Tx hash: ${hash}`,
    deployedAddress: "Zabaldutako helbidea",
    interactionReadyAfterDeploy: "Interakzio panela prest dago, beherago kontratuaren funtzioak probatzeko.",
    contractAddress: "Kontratuaren helbidea",
    generateInterfaceHint: "Aukeratu konpilatutako kontratu bat interfazea sortzeko.",
    noCallableFunctions: "ABIak ez du publikoki deitu daitekeen funtziorik azaltzen.",
    payableValue: `Balioa ${nativeCurrencySymbol}tan`,
    readButton: "Irakurri",
    writeButton: "Bidali transakzioa",
    executing: "Exekutatzen...",
    copiedAddress: "Helbidea arbelean kopiatu da.",
    copyAddress: "Kopiatu kontratuaren helbidea",
    copyFailed: "Ezin izan da helbidea kopiatu.",
    blockLabel: "Blokea",
    explorerAddressLabel: "Helbidea",
    explorerTxLabel: "Transakzioa",
    openInExplorer: "Ireki explorer-ean",
    noContractAddress: "Lehenengo kontratuaren helbidea adierazi.",
    needWalletToSend: "Wallet konektatu bat behar duzu transakzioak bidaltzeko.",
    txConfirmed: (blockNumber: string, hash: string) => `Tx baieztatua ${blockNumber} blokean. Hash-a: ${hash}`,
    executionFailed: "Exekuzioak huts egin du.",
    selectFileFirst: "Lehenengo Solidity fitxategi bat hautatu.",
    compileFailed: "Konpilazioak huts egin du.",
    tupleJsonError: "tuple parametroak JSON formatuan bidali behar dira.",
    arrayJsonError: (type: string) => `${type} parametroa JSON array gisa bidali behar da.`,
    functionModeRead: "Irakurketa",
    functionModeWrite: "Idazketa",
    functionModeWriteValue: "Idazketa + balioa",
    jsonPlaceholder: "Erabili JSON: [] / {}",
    boolPlaceholder: "true edo false",
    boolSelectPlaceholder: "Hautatu true edo false",
    boolTrue: "true",
    boolFalse: "false",
    addressPlaceholder: "0x...",
    arrayHint: "Erabili JSON array bat, adibidez [1,2] edo [\"0x...\"].",
    tupleHint: "Erabili JSON objektu edo array bat, adibidez {\"owner\":\"0x...\"} edo [\"0x...\"].",
    boolHint: "Aukeratu true edo false balioa.",
    numberHint: "Idatzi zenbaki oso bat testu gisa, adibidez 42.",
    addressHint: "Idatzi helbidea 0x aurrizkiarekin.",
    bytesHint: "Idatzi balio hexadezimala 0x aurrizkiarekin.",
    unknownBlock: "ezezaguna",
    functionFallback: "funtzioa",
    payablePlaceholder: "0.0",
    argLabel: (name: string, index: number, type: string) => `${name || `arg_${index}`} · ${type}`,
    confirmSourceChange: "Iturria aldatzeak egungo konpilazioa, hedapena eta interakzio emaitzak berrezarriko ditu. Jarraitu nahi duzu?",
    confirmFileReplace: "Beste Solidity fitxategi bat hautatzeak egungo konpilazioa, hedapena eta interakzio emaitzak berrezarriko ditu. Jarraitu nahi duzu?",
  },
  es: {
    languageLabel: "Idioma",
    languages: { eu: "Euskera", es: "Castellano", en: "English" },
    eyebrow: "Solidity + Hyperledger Besu",
    title: "BFPE SmartContract Studio",
    heroCopy: "El backend compila para London EVM y el despliegue se firma desde la wallet del usuario, sin custodiar claves.",
    targetNetwork: "Red objetivo",
    connectWallet: "Conectar wallet",
    reconnectWallet: "Reconectar wallet",
    switchNetwork: "Cambiar a red Besu",
    walletDisconnected: "Wallet no conectada.",
    walletDisconnectedShort: "Wallet desconectada.",
    walletConnected: (address: string) => `Wallet conectada en ${networkName}: ${address}`,
    walletWrongNetwork: (address: string) => `Wallet conectada con ${address}, pero en una red distinta a ${networkName}.`,
    noInjectedWallet: "No hay una wallet inyectada en el navegador.",
    requestingWallet: "Solicitando acceso a la wallet...",
    switchingNetwork: `Cambiando a la red ${networkName}...`,
    walletConnectFailed: "No se pudo conectar la wallet.",
    switchNetworkFailed: "No se pudo cambiar la wallet a la red Besu esperada.",
    sourceTitle: "0. Origen del contrato",
    sourceBadge: "Upload / Builder",
    sourceModeAria: "Seleccion del origen del contrato",
    uploadMode: "Subir Solidity",
    builderMode: "SmartContract Builder",
    uploadIntro: "Usa este modo para subir un fichero .sol y continuar con el flujo actual.",
    uploadHintNoFile: "Todavia no has seleccionado un fichero .sol.",
    builderIntro: "Usa el editor Blockly integrado para generar Solidity y enviar el contrato directamente al Playground.",
    builderPending: "Todavia no hay un contrato exportado desde SmartContract Builder.",
    builderReady: (fileName: string, templateLabel: string) => `Contrato recibido desde Builder: ${fileName} · plantilla ${templateLabel}.`,
    builderTemplatesTitle: "Plantillas previstas",
    builderWorkspaceTitle: "Blockly Builder integrado",
    builderNextStep: "Genera el Solidity dentro del Builder y usa el boton \"Usar en Playground\" para enviarlo al flujo actual de compilacion y despliegue.",
    builderTemplates: {
      storage: "Storage",
      erc20: "ERC20",
      erc721: "ERC721",
      voting: "Voting",
      blank: "Blank",
    },
    activeSourceLabel: "Origen activo",
    activeSourceUpload: (fileName: string) => `Subida manual · ${fileName}`,
    activeSourceUploadMissing: "Subida manual · sin fichero seleccionado",
    activeSourceBuilder: (fileName: string, templateLabel: string) => `Builder · ${fileName} · plantilla ${templateLabel}`,
    activeSourceBuilderPending: "Builder · esperando exportacion de Solidity",
    compileNeedsUploadSource: "Selecciona un fichero .sol para compilar.",
    compileNeedsBuilderSource: "SmartContract Builder todavia no ha exportado un contrato al Playground.",
    compileTitle: "1. Compilacion",
    deployTitle: "2. Despliegue",
    interactionTitle: "3. Interaccion generada desde el ABI",
    interactionBadge: "Lectura y escritura",
    userWalletBadge: "Wallet",
    copyWalletAddress: "Copiar dirección de wallet",
    copiedWalletAddress: "¡Copiado!",
    solidityFile: "Fichero Solidity",
    selectedFile: (fileName: string) => `Archivo seleccionado: ${fileName}`,
    compileButton: "Compilar contrato",
    compilingButton: "Compilando...",
    compileFirst: "Compila primero un contrato desplegable.",
    compiler: (version: string) => `Compilador: ${version}`,
    compiledContract: "Contrato compilado",
    deployable: "desplegable",
    noBytecode: "sin bytecode",
    downloadAbi: "Descargar ABI",
    constructorLabel: (name: string, index: number, type: string) => `Constructor: ${name || `param_${index}`} · ${type}`,
    deployButton: (name: string) => `Desplegar ${name}`,
    deployingButton: "Desplegando...",
    preparingDeployment: "Preparando despliegue...",
    waitingForBlock: "Esperando confirmacion del bloque...",
    deployedAt: (address: string) => `Contrato desplegado correctamente en ${address}`,
    noContractSelected: "No hay un contrato compilado seleccionado.",
    selectedContractNotDeployable: "El contrato seleccionado no genera bytecode desplegable.",
    needWalletToDeploy: "Necesitas una wallet inyectada para desplegar.",
    deployFailed: "El despliegue ha fallado.",
    txHash: (hash: string) => `Tx hash: ${hash}`,
    deployedAddress: "Direccion desplegada",
    interactionReadyAfterDeploy: "La seccion de interaccion ya esta preparada mas abajo para probar las funciones del contrato.",
    contractAddress: "Direccion del contrato",
    generateInterfaceHint: "Selecciona un contrato compilado para generar la interfaz.",
    noCallableFunctions: "El ABI no expone funciones publicas invocables.",
    payableValue: `Valor en ${nativeCurrencySymbol}`,
    readButton: "Leer",
    writeButton: "Enviar transaccion",
    executing: "Ejecutando...",
    copiedAddress: "Direccion copiada al portapapeles.",
    copyAddress: "Copiar direccion del contrato",
    copyFailed: "No se pudo copiar la direccion.",
    blockLabel: "Bloque",
    explorerAddressLabel: "Direccion",
    explorerTxLabel: "Transaccion",
    openInExplorer: "Abrir en el explorer",
    noContractAddress: "Indica primero una direccion de contrato.",
    needWalletToSend: "Necesitas una wallet conectada para enviar transacciones.",
    txConfirmed: (blockNumber: string, hash: string) => `Tx confirmada en bloque ${blockNumber}. Hash: ${hash}`,
    executionFailed: "La ejecucion ha fallado.",
    selectFileFirst: "Selecciona primero un fichero Solidity.",
    compileFailed: "La compilacion ha fallado.",
    tupleJsonError: "Los parametros tuple deben enviarse en formato JSON.",
    arrayJsonError: (type: string) => `El parametro ${type} debe enviarse como array JSON.`,
    functionModeRead: "Lectura",
    functionModeWrite: "Escritura",
    functionModeWriteValue: "Escritura + valor",
    jsonPlaceholder: "Usa JSON: [] / {}",
    boolPlaceholder: "true o false",
    boolSelectPlaceholder: "Selecciona true o false",
    boolTrue: "true",
    boolFalse: "false",
    addressPlaceholder: "0x...",
    arrayHint: "Usa un array JSON, por ejemplo [1,2] o [\"0x...\"].",
    tupleHint: "Usa un objeto o array JSON, por ejemplo {\"owner\":\"0x...\"} o [\"0x...\"].",
    boolHint: "Elige un valor true o false.",
    numberHint: "Escribe un numero entero como texto, por ejemplo 42.",
    addressHint: "Escribe una direccion con prefijo 0x.",
    bytesHint: "Escribe un valor hexadecimal con prefijo 0x.",
    unknownBlock: "desconocido",
    functionFallback: "funcion",
    payablePlaceholder: "0.0",
    argLabel: (name: string, index: number, type: string) => `${name || `arg_${index}`} · ${type}`,
    confirmSourceChange: "Cambiar de origen reiniciara la compilacion, el despliegue y los resultados de interaccion actuales. ¿Quieres continuar?",
    confirmFileReplace: "Seleccionar otro fichero Solidity reiniciara la compilacion, el despliegue y los resultados de interaccion actuales. ¿Quieres continuar?",
  },
  en: {
    languageLabel: "Language",
    languages: { eu: "Euskara", es: "Spanish", en: "English" },
    eyebrow: "Solidity + Hyperledger Besu",
    title: "BFPE SmartContract Studio",
    heroCopy: "The backend compiles for London EVM and deployment is signed from the user's wallet, without storing private keys.",
    targetNetwork: "Target network",
    connectWallet: "Connect wallet",
    reconnectWallet: "Reconnect wallet",
    switchNetwork: "Switch to Besu network",
    walletDisconnected: "Wallet not connected.",
    walletDisconnectedShort: "Wallet disconnected.",
    walletConnected: (address: string) => `Wallet connected on ${networkName}: ${address}`,
    walletWrongNetwork: (address: string) => `Wallet connected with ${address}, but on a different network than ${networkName}.`,
    noInjectedWallet: "No injected wallet was found in the browser.",
    requestingWallet: "Requesting wallet access...",
    switchingNetwork: `Switching to ${networkName}...`,
    walletConnectFailed: "Could not connect the wallet.",
    switchNetworkFailed: "Could not switch the wallet to the expected Besu network.",
    sourceTitle: "0. Contract source",
    sourceBadge: "Upload / Builder",
    sourceModeAria: "Contract source selection",
    uploadMode: "Upload Solidity",
    builderMode: "SmartContract Builder",
    uploadIntro: "Use this mode to upload a .sol file and continue with the current flow.",
    uploadHintNoFile: "You have not selected a .sol file yet.",
    builderIntro: "Use the embedded Blockly editor to generate Solidity and send the contract directly into the Playground.",
    builderPending: "There is no contract exported from SmartContract Builder yet.",
    builderReady: (fileName: string, templateLabel: string) => `Contract received from Builder: ${fileName} · template ${templateLabel}.`,
    builderTemplatesTitle: "Planned templates",
    builderWorkspaceTitle: "Embedded Blockly Builder",
    builderNextStep: "Generate Solidity inside the Builder and use \"Use in Playground\" to send it into the current compile and deploy flow.",
    builderTemplates: {
      storage: "Storage",
      erc20: "ERC20",
      erc721: "ERC721",
      voting: "Voting",
      blank: "Blank",
    },
    activeSourceLabel: "Active source",
    activeSourceUpload: (fileName: string) => `Manual upload · ${fileName}`,
    activeSourceUploadMissing: "Manual upload · no file selected",
    activeSourceBuilder: (fileName: string, templateLabel: string) => `Builder · ${fileName} · template ${templateLabel}`,
    activeSourceBuilderPending: "Builder · waiting for Solidity export",
    compileNeedsUploadSource: "Select a .sol file to compile.",
    compileNeedsBuilderSource: "SmartContract Builder has not exported a contract to the Playground yet.",
    compileTitle: "1. Compilation",
    deployTitle: "2. Deployment",
    interactionTitle: "3. ABI-generated interaction",
    interactionBadge: "Read and write",
    userWalletBadge: "Wallet",
    copyWalletAddress: "Copy wallet address",
    copiedWalletAddress: "Copied!",
    solidityFile: "Solidity file",
    selectedFile: (fileName: string) => `Selected file: ${fileName}`,
    compileButton: "Compile contract",
    compilingButton: "Compiling...",
    compileFirst: "Compile a deployable contract first.",
    compiler: (version: string) => `Compiler: ${version}`,
    compiledContract: "Compiled contract",
    deployable: "deployable",
    noBytecode: "no bytecode",
    downloadAbi: "Download ABI",
    constructorLabel: (name: string, index: number, type: string) => `Constructor: ${name || `param_${index}`} · ${type}`,
    deployButton: (name: string) => `Deploy ${name}`,
    deployingButton: "Deploying...",
    preparingDeployment: "Preparing deployment...",
    waitingForBlock: "Waiting for block confirmation...",
    deployedAt: (address: string) => `Contract deployed successfully at ${address}`,
    noContractSelected: "No compiled contract is selected.",
    selectedContractNotDeployable: "The selected contract does not generate deployable bytecode.",
    needWalletToDeploy: "You need an injected wallet to deploy.",
    deployFailed: "Deployment failed.",
    txHash: (hash: string) => `Tx hash: ${hash}`,
    deployedAddress: "Deployed address",
    interactionReadyAfterDeploy: "The interaction section below is ready to test the contract functions.",
    contractAddress: "Contract address",
    generateInterfaceHint: "Select a compiled contract to generate the interface.",
    noCallableFunctions: "The ABI does not expose callable public functions.",
    payableValue: `Value in ${nativeCurrencySymbol}`,
    readButton: "Read",
    writeButton: "Send transaction",
    executing: "Running...",
    copiedAddress: "Address copied to clipboard.",
    copyAddress: "Copy contract address",
    copyFailed: "Could not copy the address.",
    blockLabel: "Block",
    explorerAddressLabel: "Address",
    explorerTxLabel: "Transaction",
    openInExplorer: "Open in explorer",
    noContractAddress: "Provide a contract address first.",
    needWalletToSend: "You need a connected wallet to send transactions.",
    txConfirmed: (blockNumber: string, hash: string) => `Transaction confirmed in block ${blockNumber}. Hash: ${hash}`,
    executionFailed: "Execution failed.",
    selectFileFirst: "Select a Solidity file first.",
    compileFailed: "Compilation failed.",
    tupleJsonError: "Tuple parameters must be sent in JSON format.",
    arrayJsonError: (type: string) => `Parameter ${type} must be sent as a JSON array.`,
    functionModeRead: "Read",
    functionModeWrite: "Write",
    functionModeWriteValue: "Write + value",
    jsonPlaceholder: "Use JSON: [] / {}",
    boolPlaceholder: "true or false",
    boolSelectPlaceholder: "Choose true or false",
    boolTrue: "true",
    boolFalse: "false",
    addressPlaceholder: "0x...",
    arrayHint: "Use a JSON array, for example [1,2] or [\"0x...\"].",
    tupleHint: "Use a JSON object or array, for example {\"owner\":\"0x...\"} or [\"0x...\"].",
    boolHint: "Choose either true or false.",
    numberHint: "Enter an integer value as text, for example 42.",
    addressHint: "Enter an address with the 0x prefix.",
    bytesHint: "Enter a hexadecimal value with the 0x prefix.",
    unknownBlock: "unknown",
    functionFallback: "function",
    payablePlaceholder: "0.0",
    argLabel: (name: string, index: number, type: string) => `${name || `arg_${index}`} · ${type}`,
    confirmSourceChange: "Changing the source will reset the current compilation, deployment, and interaction results. Do you want to continue?",
    confirmFileReplace: "Selecting a different Solidity file will reset the current compilation, deployment, and interaction results. Do you want to continue?",
  },
} as const;

const experienceCopy = {
  eu: {
    recommendedTag: "Gomendatua",
    recommendedContract: "Iradokitako kontratua",
    compiledContractsSummary: (total: number, deployables: number, warnings: number) => `${total} kontratu · ${deployables} zabalgarri · ${warnings} abisu`,
    callableFunctionsSummary: (count: number) => `${count} ABI funtzio deigarri`,
    guideBadge: "Uneko gida",
    guideTitles: {
      source: "Prestatu kontratuaren jatorria",
      compile: "Balidatu konpilazioaren emaitza",
      deploy: "Prestatu hedapena",
      interact: "Probatu zabaldutako kontratua",
    },
    guideStates: {
      sourceUploadPending: "Hautatu Solidity fitxategi autoedukia edo pasa Builder-era ikusiz sortzeko.",
      sourceUploadReady: "Jatorria prest dago. Hurrengo pausoa konpilatzea eta zer kontratu hedatu behar den berrikustea da.",
      sourceBuilderPending: "Sortu Solidity Builder barruan eta esportatu Playground-era fluxuarekin jarraitzeko.",
      sourceBuilderReady: "Builder-ak kontratua eman du. Nahi duzunean pasa zaitezke konpilaziora.",
      compilePending: "Oraindik ez dago jatorri honetarako konpilazio baliorik.",
      compileReady: "Konpilazioak artefaktuak itzuli ditu. Begiratu gomendatutako kontratua hedatu aurretik.",
      deployPending: "Konpilatutako kontratu zabalgarri bat eta wallet-a sare egokian behar dituzu.",
      deployReady: "Berrikusi constructor-a, egiaztatu kontua eta sinatu hedapena wallet-etik.",
      interactPending: "Erabili zabaldutako helbidea edo itsatsi eskuzko bat ABI-tik deiak sortzeko.",
      interactReady: "Interfazea prest dago kontratuarekin irakurri eta idazteko.",
    },
    guideTips: {
      prepareUpload: "Bertsio didaktiko honetan hobe da .sol autoeduki batekin lan egitea import erroreak saihesteko.",
      exportBuilder: "Builder-etik, erabili \"Use in Playground\" botoia kode aktiboa sinkronizatzeko.",
      runCompile: "Konpilatu ABI-a, bytecode-a eta warning-ak berrikusi ondoren hedatu aurretik.",
      reviewWarnings: "Warning-ak agertzen badira, baloratu onargarriak diren aurrera egin aurretik.",
      reviewRecommendation: "Gomendatutako kontratuak fitxategiaren kontratu nagusia lehenesten du laguntza-oinarrien aurretik.",
      fillConstructor: "Kontratuak constructor-a badu, bete parametro guztiak hedatu aurretik.",
      checkWallet: "Ziurtatu wallet-a konektatuta dagoela eta Besu sare egokian dagoela sinatu aurretik.",
      useDeployedAddress: "Hedatu berri baduzu, helbidea automatikoki eramaten da interakzio gunera.",
      readVsWrite: "Irakurketa funtzioek ez dute gasik kontsumitzen; idazketek sinadura eta baieztapena behar dute.",
    },
  },
  es: {
    recommendedTag: "Recomendado",
    recommendedContract: "Contrato sugerido",
    compiledContractsSummary: (total: number, deployables: number, warnings: number) => `${total} contratos · ${deployables} desplegables · ${warnings} warnings`,
    callableFunctionsSummary: (count: number) => `${count} funciones invocables en el ABI`,
    guideBadge: "Guia del paso",
    guideTitles: {
      source: "Prepara el origen del contrato",
      compile: "Valida el resultado de la compilacion",
      deploy: "Prepara el despliegue",
      interact: "Prueba el contrato desplegado",
    },
    guideStates: {
      sourceUploadPending: "Selecciona un fichero Solidity autocontenido o cambia al Builder para generarlo visualmente.",
      sourceUploadReady: "El origen ya esta listo. El siguiente paso natural es compilar y revisar que contrato conviene desplegar.",
      sourceBuilderPending: "Genera el Solidity dentro del Builder y exportalo al Playground para continuar con el flujo.",
      sourceBuilderReady: "El Builder ya ha entregado un contrato. Puedes pasar a compilacion cuando quieras.",
      compilePending: "Todavia no hay una compilacion valida para este origen.",
      compileReady: "La compilacion ya devolvio artefactos. Revisa el contrato recomendado antes de desplegar.",
      deployPending: "Necesitas un contrato desplegable compilado y una wallet en la red correcta.",
      deployReady: "Revisa el constructor, confirma la cuenta y firma el despliegue desde tu wallet.",
      interactPending: "Usa la direccion desplegada o pega una manual para generar llamadas desde el ABI.",
      interactReady: "La interfaz ya esta lista para leer y escribir contra el contrato.",
    },
    guideTips: {
      prepareUpload: "En esta version didactica conviene trabajar con un .sol autocontenido para evitar errores de imports.",
      exportBuilder: "Desde el Builder, usa el boton \"Usar en Playground\" para sincronizar el codigo activo.",
      runCompile: "Compila antes de desplegar para revisar warnings, ABI y bytecode disponibles.",
      reviewWarnings: "Si aparecen warnings, decide si son aceptables antes de continuar.",
      reviewRecommendation: "El contrato recomendado intenta priorizar el contrato principal del fichero frente a bases auxiliares.",
      fillConstructor: "Si el contrato tiene constructor, completa todos los parametros antes de desplegar.",
      checkWallet: "Asegurate de tener la wallet conectada y en la red Besu correcta antes de firmar.",
      useDeployedAddress: "Si acabas de desplegar, la direccion se propaga automaticamente a la zona de interaccion.",
      readVsWrite: "Las funciones de lectura no consumen gas; las de escritura requieren firma y confirmacion.",
    },
  },
  en: {
    recommendedTag: "Recommended",
    recommendedContract: "Suggested contract",
    compiledContractsSummary: (total: number, deployables: number, warnings: number) => `${total} contracts · ${deployables} deployable · ${warnings} warnings`,
    callableFunctionsSummary: (count: number) => `${count} callable ABI functions`,
    guideBadge: "Current guide",
    guideTitles: {
      source: "Prepare the contract source",
      compile: "Validate the compilation result",
      deploy: "Prepare the deployment",
      interact: "Test the deployed contract",
    },
    guideStates: {
      sourceUploadPending: "Select a self-contained Solidity file or switch to the Builder to generate it visually.",
      sourceUploadReady: "The source is ready. The natural next step is to compile and review which contract should be deployed.",
      sourceBuilderPending: "Generate Solidity inside the Builder and export it to the Playground to continue the flow.",
      sourceBuilderReady: "The Builder has already delivered a contract. You can move on to compilation whenever you want.",
      compilePending: "There is still no valid compilation for this source.",
      compileReady: "Compilation already returned artifacts. Review the recommended contract before deploying.",
      deployPending: "You need a compiled deployable contract and a wallet on the correct network.",
      deployReady: "Review the constructor, confirm the account, and sign the deployment from your wallet.",
      interactPending: "Use the deployed address or paste a manual one to generate calls from the ABI.",
      interactReady: "The interface is ready to read from and write to the contract.",
    },
    guideTips: {
      prepareUpload: "In this teaching-oriented version it is best to work with a self-contained .sol file to avoid import errors.",
      exportBuilder: "From the Builder, use the \"Use in Playground\" button to sync the active code.",
      runCompile: "Compile before deploying so you can review warnings, ABI, and available bytecode.",
      reviewWarnings: "If warnings appear, decide whether they are acceptable before moving on.",
      reviewRecommendation: "The recommended contract tries to prioritize the main contract in the file over helper bases.",
      fillConstructor: "If the contract has a constructor, complete every parameter before deploying.",
      checkWallet: "Make sure the wallet is connected and on the correct Besu network before signing.",
      useDeployedAddress: "If you just deployed, the address is propagated automatically to the interaction area.",
      readVsWrite: "Read functions do not consume gas; write functions require signature and confirmation.",
    },
  },
} as const;

type Translation = (typeof translations)[Language];
type ExperienceText = (typeof experienceCopy)[Language];

function detectInitialLanguage(): Language {
  if (typeof window !== "undefined") {
    const storedLanguage = window.localStorage.getItem(languageStorageKey);
    if (storedLanguage === "eu" || storedLanguage === "es" || storedLanguage === "en") {
      return storedLanguage;
    }
  }

  if (typeof navigator === "undefined") {
    return "es";
  }

  const locale = navigator.language.toLowerCase();
  if (locale.startsWith("eu")) {
    return "eu";
  }

  if (locale.startsWith("en")) {
    return "en";
  }

  return "es";
}

function isReadOnlyFunction(item: AbiItem) {
  return item.type === "function" && (item.stateMutability === "view" || item.stateMutability === "pure");
}

function getFunctionSignature(item: AbiItem, fallbackLabel: string) {
  const inputs = item.inputs?.map((input) => input.type).join(",") ?? "";
  return `${item.name ?? fallbackLabel}(${inputs})`;
}

function getBuilderTemplateLabel(templateId: BuilderTemplateId | undefined, text: Translation) {
  if (!templateId) {
    return text.builderMode;
  }

  return text.builderTemplates[templateId];
}

function isBuilderTemplateId(value: unknown): value is BuilderTemplateId {
  return value === "storage" || value === "erc20" || value === "erc721" || value === "voting" || value === "blank";
}

function toSerializable(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toSerializable(item));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(([key]) => Number.isNaN(Number(key)));
    return Object.fromEntries(entries.map(([key, entry]) => [key, toSerializable(entry)]));
  }

  return value;
}

function stringifyValue(value: unknown) {
  const serializable = toSerializable(value);
  if (typeof serializable === "string") {
    return serializable;
  }

  return JSON.stringify(serializable, null, 2);
}

function parseTupleValue(rawValue: unknown, components: AbiInput[], tupleJsonError: string) {
  if (Array.isArray(rawValue)) {
    return components.map((_, index) => rawValue[index]);
  }

  if (rawValue && typeof rawValue === "object") {
    return components.map((component) => (rawValue as Record<string, unknown>)[component.name]);
  }

  throw new Error(tupleJsonError);
}

function parseArrayValue(type: string, rawValue: unknown, arrayJsonError: (type: string) => string) {
  const data = typeof rawValue === "string" ? JSON.parse(rawValue || "[]") : rawValue;
  if (!Array.isArray(data)) {
    throw new Error(arrayJsonError(type));
  }

  return data;
}

function parseParamValue(
  param: AbiInput,
  rawValue: unknown,
  tupleJsonError: string,
  arrayJsonError: (type: string) => string,
): unknown {
  const type = param.type;

  if (type.includes("[")) {
    const baseType = type.replace(/\[[^\]]*\]$/, "");
    return parseArrayValue(type, rawValue, arrayJsonError).map((item) => {
      return parseParamValue({ name: "", type: baseType, components: param.components }, item, tupleJsonError, arrayJsonError);
    });
  }

  if (type.startsWith("tuple")) {
    const parsed = typeof rawValue === "string" ? JSON.parse(rawValue || "{}") : rawValue;
    const tupleValues = parseTupleValue(parsed, param.components ?? [], tupleJsonError);
    return tupleValues.map((item, index) => {
      const component = param.components?.[index] ?? { name: "", type: "string" };
      return parseParamValue(component, item, tupleJsonError, arrayJsonError);
    });
  }

  if (type === "bool") {
    return rawValue === true || rawValue === "true";
  }

  if (type.startsWith("uint") || type.startsWith("int")) {
    return String(rawValue ?? "").trim();
  }

  if (type === "address") {
    return ethers.getAddress(String(rawValue ?? "").trim());
  }

  if (type.startsWith("bytes")) {
    return String(rawValue ?? "").trim();
  }

  return rawValue ?? "";
}

function getParameterPlaceholder(param: AbiInput, text: Translation) {
  if (param.type.includes("[") || param.type.startsWith("tuple")) {
    return text.jsonPlaceholder;
  }

  if (param.type === "bool") {
    return text.boolPlaceholder;
  }

  if (param.type === "address") {
    return text.addressPlaceholder;
  }

  return param.type;
}

function getParameterHelpText(param: AbiInput, text: Translation) {
  if (param.type.includes("[")) {
    return text.arrayHint;
  }

  if (param.type.startsWith("tuple")) {
    return text.tupleHint;
  }

  if (param.type === "bool") {
    return text.boolHint;
  }

  if (param.type.startsWith("uint") || param.type.startsWith("int")) {
    return text.numberHint;
  }

  if (param.type === "address") {
    return text.addressHint;
  }

  if (param.type.startsWith("bytes")) {
    return text.bytesHint;
  }

  return "";
}

function getFunctionModeLabel(item: AbiItem, text: Translation) {
  if (item.stateMutability === "payable") {
    return text.functionModeWriteValue;
  }

  if (isReadOnlyFunction(item)) {
    return text.functionModeRead;
  }

  return text.functionModeWrite;
}

function getExplorerUrl(kind: ExplorerLinkKind, value: string | number) {
  if (!blockExplorerUrl) {
    return "";
  }

  const normalizedBase = blockExplorerUrl.replace(/\/+$/, "");
  const encodedValue = encodeURIComponent(String(value));

  if (kind === "address") {
    return `${normalizedBase}/address/${encodedValue}`;
  }

  if (kind === "tx") {
    return `${normalizedBase}/tx/${encodedValue}`;
  }

  return `${normalizedBase}/block/${encodedValue}`;
}

function createBrowserRpcProvider(ethereum: EthereumProvider) {
  return new BrowserProvider(ethereum, configuredNetwork, {
    staticNetwork: true,
    pollingInterval: providerPollingIntervalMs,
  });
}

function createReadOnlyRpcProvider() {
  return new JsonRpcProvider(besuRpcUrl, configuredNetwork, {
    staticNetwork: true,
    pollingInterval: providerPollingIntervalMs,
  });
}

type ExplorerValueLinkProps = {
  href: string;
  value: string;
  title: string;
};

function ExplorerValueLink({ href, value, title }: ExplorerValueLinkProps) {
  return (
    <a className="value-link" href={href} target="_blank" rel="noreferrer" title={title}>
      {value}
    </a>
  );
}

type WorkflowGuidanceModel = {
  title: string;
  body: string;
  tips: string[];
};

function getWorkflowGuidance(args: {
  activeStep: WorkflowStep;
  sourceMode: ContractSourceMode;
  selectedFile: File | null;
  builderSource: BuilderSource | null;
  compileData: CompileResponse | null;
  selectedContract: CompiledContract | null;
  deployedAddress: string;
  interactionAddress: string;
  walletNeedsNetworkSwitch: boolean;
  experienceText: ExperienceText;
}) {
  const {
    activeStep,
    sourceMode,
    selectedFile,
    builderSource,
    compileData,
    selectedContract,
    deployedAddress,
    interactionAddress,
    walletNeedsNetworkSwitch,
    experienceText,
  } = args;

  switch (activeStep) {
    case "source": {
      if (sourceMode === "upload") {
        return {
          title: experienceText.guideTitles.source,
          body: selectedFile ? experienceText.guideStates.sourceUploadReady : experienceText.guideStates.sourceUploadPending,
          tips: [
            experienceText.guideTips.prepareUpload,
            experienceText.guideTips.runCompile,
            experienceText.guideTips.reviewRecommendation,
          ],
        } satisfies WorkflowGuidanceModel;
      }

      return {
        title: experienceText.guideTitles.source,
        body: builderSource ? experienceText.guideStates.sourceBuilderReady : experienceText.guideStates.sourceBuilderPending,
        tips: [
          experienceText.guideTips.exportBuilder,
          experienceText.guideTips.runCompile,
          experienceText.guideTips.reviewRecommendation,
        ],
      } satisfies WorkflowGuidanceModel;
    }

    case "compile": {
      return {
        title: experienceText.guideTitles.compile,
        body: compileData ? experienceText.guideStates.compileReady : experienceText.guideStates.compilePending,
        tips: [
          experienceText.guideTips.runCompile,
          experienceText.guideTips.reviewWarnings,
          experienceText.guideTips.reviewRecommendation,
        ],
      } satisfies WorkflowGuidanceModel;
    }

    case "deploy": {
      return {
        title: experienceText.guideTitles.deploy,
        body: selectedContract ? experienceText.guideStates.deployReady : experienceText.guideStates.deployPending,
        tips: [
          experienceText.guideTips.fillConstructor,
          walletNeedsNetworkSwitch ? experienceText.guideTips.checkWallet : experienceText.guideTips.checkWallet,
          experienceText.guideTips.reviewRecommendation,
        ],
      } satisfies WorkflowGuidanceModel;
    }

    case "interact":
    default: {
      return {
        title: experienceText.guideTitles.interact,
        body: deployedAddress || interactionAddress ? experienceText.guideStates.interactReady : experienceText.guideStates.interactPending,
        tips: [
          experienceText.guideTips.useDeployedAddress,
          experienceText.guideTips.readVsWrite,
          experienceText.guideTips.checkWallet,
        ],
      } satisfies WorkflowGuidanceModel;
    }
  }
}

function getInputMode(param: AbiInput) {
  if (param.type.startsWith("uint") || param.type.startsWith("int")) {
    return "numeric";
  }

  return undefined;
}

type ParameterFieldProps = {
  text: Translation;
  param: AbiInput;
  label: string;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
};

function ParameterField({ text, param, label, value, onChange, compact = false }: ParameterFieldProps) {
  const fieldId = useId();
  const helpText = getParameterHelpText(param, text);
  const groupClassName = compact ? "input-group compact-group" : "input-group";
  const baseClassName = `typed-field${param.type === "address" || param.type.startsWith("bytes") ? " mono-field" : ""}`;

  if (param.type === "bool") {
    return (
      <label htmlFor={fieldId} className={groupClassName}>
        <span>{label}</span>
        <select id={fieldId} value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">{text.boolSelectPlaceholder}</option>
          <option value="true">{text.boolTrue}</option>
          <option value="false">{text.boolFalse}</option>
        </select>
        {helpText && <small className="input-hint">{helpText}</small>}
      </label>
    );
  }

  if (param.type.includes("[") || param.type.startsWith("tuple")) {
    return (
      <label htmlFor={fieldId} className={groupClassName}>
        <span>{label}</span>
        <textarea
          id={fieldId}
          className={baseClassName}
          rows={3}
          placeholder={getParameterPlaceholder(param, text)}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {helpText && <small className="input-hint">{helpText}</small>}
      </label>
    );
  }

  return (
    <label htmlFor={fieldId} className={groupClassName}>
      <span>{label}</span>
      <input
        id={fieldId}
        className={baseClassName}
        type="text"
        inputMode={getInputMode(param)}
        placeholder={getParameterPlaceholder(param, text)}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {helpText && <small className="input-hint">{helpText}</small>}
    </label>
  );
}

function buildDownload(fileName: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function getPrimaryAccount(accounts: unknown) {
  if (!Array.isArray(accounts)) {
    return "";
  }

  return typeof accounts[0] === "string" ? accounts[0] : "";
}

function shortenAddress(address: string) {
  if (!address || address.length < 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

type HeroHeaderProps = {
  language: Language;
  onLanguageChange: (language: Language) => void;
  text: Translation;
  walletAddress: string;
  walletStatus: string;
  showSwitchNetwork: boolean;
  onConnectWallet: () => void;
  onSwitchNetwork: () => void;
  onWalletMenuOpen?: () => void;
};

type WalletAvatarIconProps = {
  compact?: boolean;
};

function WalletAvatarIcon({ compact = false }: WalletAvatarIconProps) {
  const className = compact
    ? "wallet-menu-avatar wallet-menu-avatar-compact wallet-menu-avatar-icon"
    : "wallet-menu-avatar wallet-menu-avatar-icon";

  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M5 8.25h13a2 2 0 0 1 2 2V16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8.25Z" />
        <path d="M5 9V6.75A1.75 1.75 0 0 1 6.75 5H18" />
        <circle cx="16.75" cy="13.1" r="0.9" className="wallet-menu-avatar-icon-dot" />
      </svg>
    </span>
  );
}

function HeroHeader({
  language,
  onLanguageChange,
  text,
  walletAddress,
  walletStatus,
  showSwitchNetwork,
  onConnectWallet,
  onSwitchNetwork,
  onWalletMenuOpen,
}: HeroHeaderProps) {
  const [logoVisible, setLogoVisible] = useState(true);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const walletMenuRef = useRef<HTMLDivElement>(null);

  async function handleCopyWalletAddress() {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setAddressCopied(true);
      window.setTimeout(() => setAddressCopied(false), 2000);
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  function openWalletMenu() {
    setWalletMenuOpen((current) => {
      const next = !current;
      if (next) onWalletMenuOpen?.();
      return next;
    });
  }
  const walletHeading = walletAddress ? shortenAddress(walletAddress) : text.walletDisconnectedShort;
  const walletStateClassName = showSwitchNetwork
    ? "wallet-network-state warning"
    : walletAddress
      ? "wallet-network-state success"
      : "wallet-network-state";
  const languageOptions: Array<{ code: Language; shortLabel: string; title: string }> = [
    { code: "eu", shortLabel: "EU", title: text.languages.eu },
    { code: "es", shortLabel: "ES", title: text.languages.es },
    { code: "en", shortLabel: "EN", title: text.languages.en },
  ];

  useEffect(() => {
    if (!walletMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!walletMenuRef.current?.contains(event.target as Node)) {
        setWalletMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setWalletMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [walletMenuOpen]);

  return (
    <header className="app-header-shell">
      <div className="app-header-bar">
        <div className="brand-stack">
          <div className="brand-identity">
            {logoVisible && (
              <div className="brand-logo-frame" aria-hidden="true">
                <img className="brand-logo" src={headerLogoUrl} alt="" onError={() => setLogoVisible(false)} />
              </div>
            )}

            <div className="brand-copy">
              <h1 className="app-title">{text.title}</h1>
            </div>
          </div>
        </div>

        <div className="header-utility">
          <div className="header-control-row">
            <nav className="header-language-nav" aria-label={text.languageLabel}>
              {languageOptions.map((option) => (
                <a
                  key={option.code}
                  href="#"
                  className={language === option.code ? "header-language-link active" : "header-language-link"}
                  aria-current={language === option.code ? "page" : undefined}
                  aria-label={option.title}
                  title={option.title}
                  onClick={(event) => {
                    event.preventDefault();
                    onLanguageChange(option.code);
                  }}
                >
                  {option.shortLabel}
                </a>
              ))}
            </nav>

            <div className="wallet-menu-shell" ref={walletMenuRef}>
              <button
                className={[
                  "wallet-menu-trigger",
                  walletMenuOpen ? "active" : "",
                  !walletAddress ? "wallet-menu-trigger-disconnected" : "",
                ].filter(Boolean).join(" ")}
                type="button"
                aria-expanded={walletMenuOpen}
                aria-haspopup="dialog"
                aria-label={walletAddress ? text.userWalletBadge : text.connectWallet}
                onClick={openWalletMenu}
              >
                <WalletAvatarIcon compact />
                {walletAddress ? (
                  <span className="wallet-menu-trigger-copy">
                    <span className="wallet-menu-label">{text.userWalletBadge}</span>
                    <strong title={walletAddress}>{walletHeading}</strong>
                  </span>
                ) : (
                  <span className="wallet-menu-trigger-copy">
                    <span className="wallet-menu-connect-cta">{text.connectWallet}</span>
                  </span>
                )}
                <span className={walletStateClassName} />
                <span className="wallet-menu-caret" aria-hidden="true">▾</span>
              </button>

              {walletMenuOpen && (
                <div className="wallet-menu-dropdown">
                  <div className="wallet-menu-card">
                    {!walletAddress ? (
                      // ── DISCONNECTED STATE ────────────────────────────────────
                      <>
                        <div className="wallet-menu-main">
                          <WalletAvatarIcon />
                          <div className="wallet-menu-copy">
                            <div className="wallet-menu-line">
                              <span className="wallet-menu-label">{text.userWalletBadge}</span>
                              <span className={walletStateClassName} />
                            </div>
                            <p className="wallet-menu-status">{walletStatus || text.walletDisconnectedShort}</p>
                          </div>
                        </div>

                        <div className="wallet-menu-meta">
                          <div className="wallet-menu-meta-row">
                            <span>{networkName}</span>
                            <span className="wallet-menu-meta-divider">•</span>
                            <span>Chain ID {configuredChainId}</span>
                          </div>
                          <p className="wallet-menu-rpc" title={besuRpcUrl}>{besuRpcUrl}</p>
                        </div>

                        <div className="network-actions compact-network-actions wallet-menu-actions">
                          <button
                            className="primary-button"
                            type="button"
                            onClick={() => { setWalletMenuOpen(false); onConnectWallet(); }}
                          >
                            {text.connectWallet}
                          </button>
                        </div>
                      </>
                    ) : (
                      // ── CONNECTED STATE ───────────────────────────────────────
                      <>
                        <div className="wallet-menu-main">
                          <WalletAvatarIcon />
                          <div className="wallet-menu-copy">
                            <div className="wallet-menu-line">
                              <span className="wallet-menu-label">{text.userWalletBadge}</span>
                              <span className={walletStateClassName} />
                            </div>
                            <div className="wallet-address-copy-row">
                              <strong title={walletAddress}>{walletHeading}</strong>
                              <button
                                type="button"
                                className="wallet-address-copy-btn"
                                onClick={handleCopyWalletAddress}
                                title={text.copyWalletAddress}
                                aria-label={text.copyWalletAddress}
                              >
                                {addressCopied ? (
                                  <span className="wallet-address-copied-label">{text.copiedWalletAddress}</span>
                                ) : (
                                  <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <rect x="9" y="9" width="13" height="13" rx="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="wallet-menu-meta">
                          <div className="wallet-menu-meta-row">
                            <span>{networkName}</span>
                            <span className="wallet-menu-meta-divider">•</span>
                            <span>Chain ID {configuredChainId}</span>
                          </div>
                          <p className="wallet-menu-rpc" title={besuRpcUrl}>{besuRpcUrl}</p>
                        </div>

                        <div className="network-actions compact-network-actions wallet-menu-actions">
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => { setWalletMenuOpen(false); onConnectWallet(); }}
                          >
                            {text.reconnectWallet}
                          </button>
                          {showSwitchNetwork && (
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => { setWalletMenuOpen(false); onSwitchNetwork(); }}
                            >
                              {text.switchNetwork}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

type WorkflowTabsProps = {
  activeStep: WorkflowStep;
  availableSteps: Record<WorkflowStep, boolean>;
  completedSteps: Record<WorkflowStep, boolean>;
  onStepChange: (step: WorkflowStep) => void;
  text: Translation;
};

function WorkflowTabs({ activeStep, availableSteps, completedSteps, onStepChange, text }: WorkflowTabsProps) {
  const stripStepPrefix = (label: string) => label.replace(/^\d+\.\s*/, "");
  const tabs: Array<{ id: WorkflowStep; title: string }> = [
    { id: "source", title: stripStepPrefix(text.sourceTitle) },
    { id: "compile", title: stripStepPrefix(text.compileTitle) },
    { id: "deploy", title: stripStepPrefix(text.deployTitle) },
    { id: "interact", title: stripStepPrefix(text.interactionTitle) },
  ];

  return (
    <nav className="workflow-tabs" aria-label="Contract workflow">
      {tabs.map((tab, index) => {
        const isActive = activeStep === tab.id;
        const isComplete = completedSteps[tab.id];
        const isEnabled = availableSteps[tab.id];
        const className = isActive
          ? "workflow-tab active"
          : isComplete
            ? "workflow-tab complete"
            : "workflow-tab";

        return (
          <button
            key={tab.id}
            type="button"
            className={className}
            disabled={!isEnabled}
            aria-current={isActive ? "step" : undefined}
            onClick={() => onStepChange(tab.id)}
          >
            <span className="workflow-tab-index">{index + 1}</span>
            <span className="workflow-tab-title">{tab.title}</span>
          </button>
        );
      })}
    </nav>
  );
}

type WorkflowGuidanceProps = {
  experienceText: ExperienceText;
  model: WorkflowGuidanceModel;
};

function WorkflowGuidance({ experienceText, model }: WorkflowGuidanceProps) {
  return (
    <article className="workflow-guidance-card">
      <span className="pill subtle-pill">{experienceText.guideBadge}</span>
      <strong>{model.title}</strong>
      <p className="muted-line">{model.body}</p>
      <ul className="workflow-guidance-list">
        {model.tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </article>
  );
}

type SourceIntakePanelProps = {
  text: Translation;
  sourceMode: ContractSourceMode;
  onSourceModeChange: (mode: ContractSourceMode) => void;
  selectedFile: File | null;
  onSelectFile: (event: ChangeEvent<HTMLInputElement>) => void;
  builderSource: BuilderSource | null;
  builderFrameRef: RefObject<HTMLIFrameElement>;
  onBuilderFrameLoad: () => void;
};

function SourceIntakePanel({
  text,
  sourceMode,
  onSourceModeChange,
  selectedFile,
  onSelectFile,
  builderSource,
  builderFrameRef,
  onBuilderFrameLoad,
}: SourceIntakePanelProps) {
  const builderStatus = builderSource
    ? text.builderReady(builderSource.fileName, getBuilderTemplateLabel(builderSource.templateId, text))
    : text.builderPending;

  const modeSwitch = (
    <div className="mode-switch source-mode-switch" aria-label={text.sourceModeAria}>
      <button
        className={sourceMode === "upload" ? "mode-button active" : "mode-button"}
        type="button"
        aria-pressed={sourceMode === "upload"}
        onClick={() => onSourceModeChange("upload")}
      >
        {text.uploadMode}
      </button>
      <button
        className={sourceMode === "builder" ? "mode-button active" : "mode-button"}
        type="button"
        aria-pressed={sourceMode === "builder"}
        onClick={() => onSourceModeChange("builder")}
      >
        {text.builderMode}
      </button>
    </div>
  );

  if (sourceMode === "builder") {
    return (
      <section className="panel panel-wide stage-panel source-stage-panel source-stage-panel-builder">
        <div className="panel-heading builder-workspace-heading">
          <div>
            <h2>{text.sourceTitle}</h2>
            <p className="muted-line">{text.builderIntro}</p>
          </div>
          <span className="pill">{text.sourceBadge}</span>
        </div>

        <div className="builder-workspace-stage">
          <div className="builder-workspace-toolbar">
            <div className="builder-workspace-switch">{modeSwitch}</div>
            <div className="builder-workspace-meta">
              <span className="pill subtle-pill">{text.builderMode}</span>
              {builderSource && <span className="label-chip">{builderSource.fileName}</span>}
            </div>
          </div>

          <div className="builder-workspace-status">
            <div className="builder-placeholder-card compact-builder-card">
              <strong>{text.builderWorkspaceTitle}</strong>
              <p className="muted-line">{text.builderNextStep}</p>
            </div>
            <pre className="message dark-box builder-status-box builder-status-box-inline">{builderStatus}</pre>
          </div>

          <div className="builder-frame-shell builder-frame-shell-expanded builder-frame-shell-workspace">
            <iframe
              className="builder-frame builder-frame-expanded builder-frame-workspace"
              ref={builderFrameRef}
              src={builderFrameUrl}
              title={text.builderMode}
              onLoad={onBuilderFrameLoad}
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel panel-wide stage-panel source-stage-panel">
      <div className="panel-heading">
        <h2>{text.sourceTitle}</h2>
        <span className="pill">{text.sourceBadge}</span>
      </div>

      <div className="source-workspace">
        <aside className="source-sidebar-card">
          {modeSwitch}

          <div className="source-pane">
            <p className="muted-line">{text.uploadIntro}</p>
            <p className="muted-line">{selectedFile ? text.selectedFile(selectedFile.name) : text.uploadHintNoFile}</p>
          </div>
        </aside>

        <div className="source-main-stage">
          <div className="upload-stage-card">
            <span className="pill subtle-pill">{text.uploadMode}</span>
            <h3>{text.solidityFile}</h3>
            <p className="muted-line">{text.uploadIntro}</p>
            <label className="upload-dropzone">
              <span className="upload-dropzone-title">{selectedFile ? selectedFile.name : text.solidityFile}</span>
              <span className="muted-line">{selectedFile ? text.selectedFile(selectedFile.name) : text.uploadHintNoFile}</span>
              <input type="file" accept=".sol" onChange={onSelectFile} />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}

type CompilePanelProps = {
  text: Translation;
  experienceText: ExperienceText;
  sourceMode: ContractSourceMode;
  selectedFile: File | null;
  builderSource: BuilderSource | null;
  compileBusy: boolean;
  compileError: string;
  compileData: CompileResponse | null;
  selectedContractId: string;
  onSelectedContractChange: (contractId: string) => void;
  onCompile: (event: FormEvent<HTMLFormElement>) => void;
  selectedContract: CompiledContract | null;
};

function CompilePanel({
  text,
  experienceText,
  sourceMode,
  selectedFile,
  builderSource,
  compileBusy,
  compileError,
  compileData,
  selectedContractId,
  onSelectedContractChange,
  onCompile,
  selectedContract,
}: CompilePanelProps) {
  const canCompile = sourceMode === "upload" ? Boolean(selectedFile) : Boolean(builderSource?.sourceCode);
  const recommendedContract = compileData?.contracts.find((contract) => contract.recommended) ?? null;
  const deployableContracts = compileData?.contracts.filter((contract) => contract.deployable).length ?? 0;
  const activeSourceLabel = sourceMode === "upload"
    ? selectedFile
      ? text.activeSourceUpload(selectedFile.name)
      : text.activeSourceUploadMissing
    : builderSource
      ? text.activeSourceBuilder(builderSource.fileName, getBuilderTemplateLabel(builderSource.templateId, text))
      : text.activeSourceBuilderPending;

  const compileHint = sourceMode === "upload" ? text.compileNeedsUploadSource : text.compileNeedsBuilderSource;

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{text.compileTitle}</h2>
        <span className="pill">EVM London</span>
      </div>

      <div className="source-summary">
        <span className="label-chip">{text.activeSourceLabel}</span>
        <p className="muted-line">{activeSourceLabel}</p>
      </div>

      <form className="stack-form" onSubmit={onCompile}>
        <button className="primary-button" type="submit" disabled={compileBusy || !canCompile}>
          {compileBusy ? text.compilingButton : text.compileButton}
        </button>
      </form>

      {!canCompile && <p className="muted-line">{compileHint}</p>}
      {compileError && <pre className="message error-box">{compileError}</pre>}

      {compileData && (
        <div className="result-block">
          <p className="muted-line">{text.compiler(compileData.compilerVersion)}</p>
          <div className="compile-brief-grid">
            <article className="compile-brief-card">
              <span className="label-chip">{experienceText.recommendedContract}</span>
              <strong>{recommendedContract?.contractName ?? "-"}</strong>
              <p className="muted-line">
                {recommendedContract
                  ? experienceText.callableFunctionsSummary(recommendedContract.callableFunctionCount)
                  : compileHint}
              </p>
            </article>
            <article className="compile-brief-card">
              <span className="label-chip">{text.compiledContract}</span>
              <strong>{experienceText.compiledContractsSummary(compileData.contracts.length, deployableContracts, compileData.warnings.length)}</strong>
              <p className="muted-line">{experienceText.guideTips.reviewRecommendation}</p>
            </article>
          </div>

          <label className="input-group">
            <span>{text.compiledContract}</span>
            <select value={selectedContractId} onChange={(event) => onSelectedContractChange(event.target.value)}>
              {compileData.contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.contractName} · {contract.deployable ? text.deployable : text.noBytecode}{contract.recommended ? ` · ${experienceText.recommendedTag}` : ""}
                </option>
              ))}
            </select>
          </label>

          {compileData.warnings.length > 0 && (
            <pre className="message warning-box">{compileData.warnings.join("\n\n")}</pre>
          )}

          {selectedContract && (
            <button
              className="secondary-button"
              type="button"
              onClick={() => buildDownload(`${selectedContract.contractName}.abi.json`, JSON.stringify(selectedContract.abi, null, 2))}
            >
              {text.downloadAbi}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

type DeployPanelProps = {
  text: Translation;
  selectedContract: CompiledContract | null;
  constructorInputs: AbiInput[];
  deploymentInputs: ContractFormState;
  onDeploymentInputChange: (paramName: string, value: string) => void;
  deployBusy: boolean;
  onDeploy: () => void;
  deployStatus: string;
  deploymentTxHash: string;
  deploymentBlockNumber: string;
  deployedAddress: string;
  onCopyDeployedAddress: () => void;
  copyStatus: string;
};

function DeployPanel({
  text,
  selectedContract,
  constructorInputs,
  deploymentInputs,
  onDeploymentInputChange,
  deployBusy,
  onDeploy,
  deployStatus,
  deploymentTxHash,
  deploymentBlockNumber,
  deployedAddress,
  onCopyDeployedAddress,
  copyStatus,
}: DeployPanelProps) {
  const deployedAddressHref = deployedAddress ? getExplorerUrl("address", deployedAddress) : "";
  const deploymentTxHref = deploymentTxHash ? getExplorerUrl("tx", deploymentTxHash) : "";
  const deploymentBlockHref = deploymentBlockNumber ? getExplorerUrl("block", deploymentBlockNumber) : "";

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{text.deployTitle}</h2>
        <span className="pill">{text.userWalletBadge}</span>
      </div>

      {!selectedContract && <p className="muted-line">{text.compileFirst}</p>}

      {selectedContract && (
        <div className="stack-form">
          {constructorInputs.map((param, index) => {
            const key = `${param.name || "param"}_${index}`;
            return (
              <ParameterField
                key={key}
                text={text}
                param={param}
                label={text.constructorLabel(param.name, index, param.type)}
                value={deploymentInputs[key] ?? ""}
                onChange={(value) => onDeploymentInputChange(key, value)}
              />
            );
          })}

          <button className="primary-button" type="button" disabled={deployBusy} onClick={onDeploy}>
            {deployBusy ? text.deployingButton : text.deployButton(selectedContract.contractName)}
          </button>

          {deployStatus && <pre className="message info-box">{deployStatus}</pre>}
          {(deploymentTxHash || deploymentBlockNumber) && (
            <div className="explorer-link-list">
              {deploymentTxHash && (
                <p className="muted-line">
                  {text.explorerTxLabel}: {deploymentTxHref ? <ExplorerValueLink href={deploymentTxHref} value={deploymentTxHash} title={text.openInExplorer} /> : deploymentTxHash}
                </p>
              )}
              {deploymentBlockNumber && (
                <p className="muted-line">
                  {text.blockLabel}: {deploymentBlockHref ? <ExplorerValueLink href={deploymentBlockHref} value={deploymentBlockNumber} title={text.openInExplorer} /> : deploymentBlockNumber}
                </p>
              )}
            </div>
          )}
          {deployedAddress && (
            <div className="address-copy-row">
              <p className="success-line">
                {text.deployedAddress}: {deployedAddressHref ? <ExplorerValueLink href={deployedAddressHref} value={deployedAddress} title={text.openInExplorer} /> : deployedAddress}
              </p>
              <button
                className="icon-button"
                type="button"
                aria-label={text.copyAddress}
                title={text.copyAddress}
                onClick={onCopyDeployedAddress}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 9h10v10H9z" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M5 5h10v10" fill="none" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </button>
            </div>
          )}
          {copyStatus && <p className="muted-line">{copyStatus}</p>}
        </div>
      )}
    </section>
  );
}

type InteractionPanelProps = {
  text: Translation;
  selectedContract: CompiledContract | null;
  contractFunctions: AbiItem[];
  interactionAddress: string;
  onInteractionAddressChange: (value: string) => void;
  interactionInputs: Record<string, ContractFormState>;
  onInteractionInputChange: (signature: string, paramName: string, value: string) => void;
  interactionBusy: string;
  onInvokeFunction: (item: AbiItem) => void;
  interactionResults: Record<string, string>;
  interactionExplorerData: Record<string, InteractionExplorerMeta>;
  panelRef: RefObject<HTMLElement>;
  isHighlighted: boolean;
};

function InteractionPanel({
  text,
  selectedContract,
  contractFunctions,
  interactionAddress,
  onInteractionAddressChange,
  interactionInputs,
  onInteractionInputChange,
  interactionBusy,
  onInvokeFunction,
  interactionResults,
  interactionExplorerData,
  panelRef,
  isHighlighted,
}: InteractionPanelProps) {
  return (
    <section className={isHighlighted ? "panel panel-wide panel-spotlight" : "panel panel-wide"} ref={panelRef} tabIndex={-1}>
      <div className="panel-heading">
        <h2>{text.interactionTitle}</h2>
        <span className="pill">{text.interactionBadge}</span>
      </div>

      {!selectedContract && <p className="muted-line">{text.generateInterfaceHint}</p>}

      {selectedContract && (
        <>
          <label className="input-group">
            <span>{text.contractAddress}</span>
            <input
              type="text"
              placeholder={text.addressPlaceholder}
              value={interactionAddress}
              onChange={(event) => onInteractionAddressChange(event.target.value)}
            />
          </label>

          <div className="function-grid">
            {contractFunctions.length === 0 && <p className="muted-line">{text.noCallableFunctions}</p>}

            {contractFunctions.map((item, functionIndex) => {
              const signature = getFunctionSignature(item, text.functionFallback);
              const explorerMeta = interactionExplorerData[signature];
              const interactionTxHref = explorerMeta?.txHash ? getExplorerUrl("tx", explorerMeta.txHash) : "";
              const interactionBlockHref = explorerMeta?.blockNumber ? getExplorerUrl("block", explorerMeta.blockNumber) : "";
              return (
                <article key={`${signature}_${functionIndex}`} className="function-card">
                  <div className="function-header">
                    <h3>{signature}</h3>
                    <span className="pill subtle-pill" title={item.stateMutability}>{getFunctionModeLabel(item, text)}</span>
                  </div>

                  {(item.inputs ?? []).map((param, index) => {
                    const key = `${param.name || "param"}_${index}`;
                    return (
                      <ParameterField
                        key={key}
                        text={text}
                        param={param}
                        label={text.argLabel(param.name, index, param.type)}
                        value={interactionInputs[signature]?.[key] ?? ""}
                        onChange={(value) => onInteractionInputChange(signature, key, value)}
                        compact
                      />
                    );
                  })}

                  {item.stateMutability === "payable" && (
                    <label className="input-group compact-group">
                      <span>{text.payableValue}</span>
                      <input
                        type="text"
                        placeholder={text.payablePlaceholder}
                        value={interactionInputs[signature]?.__payableValue ?? ""}
                        onChange={(event) => onInteractionInputChange(signature, "__payableValue", event.target.value)}
                      />
                    </label>
                  )}

                  <button
                    className="secondary-button"
                    type="button"
                    disabled={interactionBusy === signature}
                    onClick={() => onInvokeFunction(item)}
                  >
                    {interactionBusy === signature ? text.executing : isReadOnlyFunction(item) ? text.readButton : text.writeButton}
                  </button>

                  {interactionResults[signature] && <pre className="message dark-box">{interactionResults[signature]}</pre>}
                  {explorerMeta && (
                    <div className="explorer-link-list compact-explorer-links">
                      <p className="muted-line">
                        {text.explorerTxLabel}: {interactionTxHref ? <ExplorerValueLink href={interactionTxHref} value={explorerMeta.txHash} title={text.openInExplorer} /> : explorerMeta.txHash}
                      </p>
                      {explorerMeta.blockNumber && (
                        <p className="muted-line">
                          {text.blockLabel}: {interactionBlockHref ? <ExplorerValueLink href={interactionBlockHref} value={explorerMeta.blockNumber} title={text.openInExplorer} /> : explorerMeta.blockNumber}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function App() {
  const [language, setLanguage] = useState<Language>(detectInitialLanguage);
  const [activeStep, setActiveStep] = useState<WorkflowStep>("source");
  const [sourceMode, setSourceMode] = useState<ContractSourceMode>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [builderSource, setBuilderSource] = useState<BuilderSource | null>(null);
  const [compileData, setCompileData] = useState<CompileResponse | null>(null);
  const [builderReady, setBuilderReady] = useState(false);
  const builderFrameRef = useRef<HTMLIFrameElement>(null);
  const [compileError, setCompileError] = useState<string>("");
  const [compileBusy, setCompileBusy] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletStatus, setWalletStatus] = useState("");
  const [walletNeedsNetworkSwitch, setWalletNeedsNetworkSwitch] = useState(false);
  const [deploymentInputs, setDeploymentInputs] = useState<ContractFormState>({});
  const [deployBusy, setDeployBusy] = useState(false);
  const [deployStatus, setDeployStatus] = useState("");
  const [deploymentTxHash, setDeploymentTxHash] = useState("");
  const [deploymentBlockNumber, setDeploymentBlockNumber] = useState("");
  const [deployedAddress, setDeployedAddress] = useState("");
  const [interactionAddress, setInteractionAddress] = useState("");
  const [interactionInputs, setInteractionInputs] = useState<Record<string, ContractFormState>>({});
  const [interactionBusy, setInteractionBusy] = useState("");
  const [interactionResults, setInteractionResults] = useState<Record<string, string>>({});
  const [interactionExplorerData, setInteractionExplorerData] = useState<Record<string, InteractionExplorerMeta>>({});
  const [copyStatus, setCopyStatus] = useState("");
  const [highlightInteractionPanel, setHighlightInteractionPanel] = useState(false);
  const interactionPanelRef = useRef<HTMLElement>(null);
  const walletSyncRef = useRef<((provider: EthereumProvider, knownAccounts?: unknown) => Promise<void>) | null>(null);

  const text = translations[language];
  const experienceText = experienceCopy[language];
  const selectedContract: CompiledContract | null =
    compileData?.contracts.find((contract) => contract.id === selectedContractId) ?? null;

  function postMessageToBuilder(type: string, payload: Record<string, unknown>) {
    builderFrameRef.current?.contentWindow?.postMessage({ type, payload }, window.location.origin);
  }

  function resetPipelineState() {
    setCompileData(null);
    setCompileError("");
    setSelectedContractId("");
    setDeploymentInputs({});
    setDeployStatus("");
    setDeploymentTxHash("");
    setDeploymentBlockNumber("");
    setDeployedAddress("");
    setInteractionAddress("");
    setInteractionInputs({});
    setInteractionResults({});
    setInteractionExplorerData({});
    setCopyStatus("");
  }

  function hasPipelineState() {
    return Boolean(
      compileData ||
      compileError ||
      compileBusy ||
      selectedContractId ||
      deployBusy ||
      deployStatus ||
      deploymentTxHash ||
      deploymentBlockNumber ||
      deployedAddress ||
      interactionAddress ||
      interactionBusy ||
      copyStatus ||
      Object.keys(deploymentInputs).length ||
      Object.keys(interactionInputs).length ||
      Object.keys(interactionResults).length,
    );
  }

  function confirmPipelineReset(reason: "source" | "file") {
    if (!hasPipelineState()) {
      return true;
    }

    return window.confirm(reason === "source" ? text.confirmSourceChange : text.confirmFileReplace);
  }

  function spotlightInteractionPanel() {
    setHighlightInteractionPanel(false);
    window.setTimeout(() => {
      setHighlightInteractionPanel(true);
      interactionPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      interactionPanelRef.current?.focus({ preventScroll: true });
    }, 80);
  }

  async function syncWalletState(provider: EthereumProvider, knownAccounts?: unknown) {
    try {
      const accounts = knownAccounts !== undefined
        ? knownAccounts
        : await provider.request({ method: "eth_accounts" });
      const nextAccount = getPrimaryAccount(accounts);
      setWalletAddress(nextAccount);

      if (!nextAccount) {
        setWalletNeedsNetworkSwitch(false);
        setWalletStatus(text.walletDisconnectedShort);
        return;
      }

      const currentChainId = String(await provider.request({ method: "eth_chainId" }));
      const onExpectedNetwork = currentChainId.toLowerCase() === configuredChainIdHex;
      setWalletNeedsNetworkSwitch(!onExpectedNetwork);
      setWalletStatus(onExpectedNetwork ? text.walletConnected(nextAccount) : text.walletWrongNetwork(nextAccount));
    } catch (error) {
      setWalletAddress("");
      setWalletNeedsNetworkSwitch(false);
      setWalletStatus(error instanceof Error ? error.message : text.walletDisconnected);
    }
  }

  useEffect(() => {
    if (!compileData?.contracts.length) {
      setSelectedContractId("");
      return;
    }

    const recommendedContract = compileData.contracts.find((contract) => contract.recommended)
      ?? compileData.contracts.find((contract) => contract.deployable)
      ?? compileData.contracts[0];
    setSelectedContractId(recommendedContract.id);
  }, [compileData]);

  useEffect(() => {
    setDeploymentInputs({});
    setInteractionInputs({});
    setInteractionResults({});
    setInteractionExplorerData({});
  }, [selectedContractId]);

  useEffect(() => {
    if (!copyStatus) {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopyStatus(""), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [copyStatus]);

  useEffect(() => {
    if (!highlightInteractionPanel) {
      return;
    }

    const timeoutId = window.setTimeout(() => setHighlightInteractionPanel(false), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [highlightInteractionPanel]);

  useEffect(() => {
    window.localStorage.setItem(languageStorageKey, language);
  }, [language]);

  useEffect(() => {
    const handleBuilderMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || !event.data || typeof event.data !== "object") {
        return;
      }

      if (!("type" in event.data) || typeof event.data.type !== "string") {
        return;
      }

      if (event.data.type === "builder:ready") {
        setBuilderReady(true);
        return;
      }

      if (event.data.type !== "builder:export-solidity") {
        return;
      }

      const payload = "payload" in event.data ? event.data.payload : undefined;
      if (!payload || typeof payload !== "object") {
        return;
      }

      const nextSource = {
        fileName: typeof payload.fileName === "string" && payload.fileName.trim() ? payload.fileName : "BuilderContract.sol",
        sourceCode: typeof payload.sourceCode === "string" ? payload.sourceCode : "",
        templateId: isBuilderTemplateId(payload.templateId) ? payload.templateId : undefined,
        updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : new Date().toISOString(),
        workspaceSnapshot: typeof payload.workspaceSnapshot === "string" ? payload.workspaceSnapshot : undefined,
        builderVersion: typeof payload.builderVersion === "string" ? payload.builderVersion : undefined,
      } satisfies BuilderSource;

      if (!nextSource.sourceCode.trim()) {
        return;
      }

      setBuilderSource(nextSource);
      setSelectedFile(null);
      setSourceMode("builder");
      setActiveStep("compile");
      setBuilderReady(true);
      setCompileData(null);
      setCompileError("");
      setSelectedContractId("");
      setDeploymentInputs({});
      setDeployStatus("");
      setDeploymentTxHash("");
      setDeploymentBlockNumber("");
      setDeployedAddress("");
      setInteractionAddress("");
      setInteractionInputs({});
      setInteractionResults({});
      setInteractionExplorerData({});
      setCopyStatus("");
    };

    window.addEventListener("message", handleBuilderMessage);
    return () => window.removeEventListener("message", handleBuilderMessage);
  }, []);

  useEffect(() => {
    if (!builderReady || sourceMode !== "builder") {
      return;
    }

    postMessageToBuilder("playground:set-language", { language });
  }, [builderReady, language, sourceMode]);

  useEffect(() => {
    if (!builderReady || sourceMode !== "builder" || !builderSource) {
      return;
    }

    postMessageToBuilder("playground:load-workspace", {
      language,
      templateId: builderSource.templateId,
      workspaceSnapshot: builderSource.workspaceSnapshot,
    });
  }, [builderReady, builderSource, language, sourceMode]);

  // Always keep the ref pointing to the latest syncWalletState so event handlers
  // (registered once with empty deps) always call the version with the current text.
  walletSyncRef.current = syncWalletState;

  // Re-sync status text whenever the language changes so messages are in the right language.
  useEffect(() => {
    const provider = window.ethereum;
    if (!provider?.on) {
      setWalletNeedsNetworkSwitch(false);
      setWalletStatus(text.walletDisconnected);
      return;
    }
    void walletSyncRef.current?.(provider);
  }, [text]);

  // Register MetaMask event listeners ONCE. Handlers always call the latest
  // syncWalletState via the ref, avoiding stale-closure issues.
  useEffect(() => {
    const provider = window.ethereum;
    if (!provider?.on) {
      return;
    }

    const handleAccountsChanged = (accounts: unknown) => {
      void walletSyncRef.current?.(provider, accounts);
    };

    const handleChainChanged = () => {
      void walletSyncRef.current?.(provider);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void walletSyncRef.current?.(provider);
      }
    };

    const handleWindowFocus = () => {
      void walletSyncRef.current?.(provider);
    };

    void walletSyncRef.current?.(provider);

    // Poll every 4 s to detect MetaMask lock / disconnect, since MetaMask does
    // not always fire accountsChanged when the user locks their wallet.
    const pollIntervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void walletSyncRef.current?.(provider);
      }
    }, 4000);

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.clearInterval(pollIntervalId);
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ensureExpectedNetwork(provider: EthereumProvider) {
    const currentChainId = String(await provider.request({ method: "eth_chainId" }));
    if (currentChainId.toLowerCase() === configuredChainIdHex) {
      return;
    }

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: configuredChainIdHex }],
      });
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? Number((error as { code?: unknown }).code) : undefined;
      if (code !== 4902) {
        throw error;
      }

      const chainConfig = {
        chainId: configuredChainIdHex,
        chainName: networkName,
        nativeCurrency: {
          name: nativeCurrencyName,
          symbol: nativeCurrencySymbol,
          decimals: 18,
        },
        rpcUrls: [besuRpcUrl],
        blockExplorerUrls: blockExplorerUrl ? [blockExplorerUrl] : [],
      };

      await provider.request({
        method: "wallet_addEthereumChain",
        params: [chainConfig],
      });
    }
  }

  async function connectWallet() {
    if (!window.ethereum) {
      setWalletNeedsNetworkSwitch(false);
      setWalletStatus(text.noInjectedWallet);
      return;
    }

    setWalletStatus(text.requestingWallet);

    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
    } catch (error) {
      setWalletStatus(error instanceof Error ? error.message : text.walletConnectFailed);
      return;
    }

    try {
      await ensureExpectedNetwork(window.ethereum);
    } catch {
      // Network switch rejected or failed; syncWalletState will detect and show the mismatch.
    }

    await syncWalletState(window.ethereum);
  }

  async function switchWalletNetwork() {
    if (!window.ethereum) {
      setWalletNeedsNetworkSwitch(false);
      setWalletStatus(text.noInjectedWallet);
      return;
    }

    setWalletStatus(text.switchingNetwork);

    try {
      await ensureExpectedNetwork(window.ethereum);
    } catch (error) {
      setWalletStatus(error instanceof Error ? error.message : text.switchNetworkFailed);
    }

    await syncWalletState(window.ethereum);
  }

  async function copyDeployedAddress() {
    if (!deployedAddress) {
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error(text.copyFailed);
      }

      await navigator.clipboard.writeText(deployedAddress);
      setCopyStatus(text.copiedAddress);
    } catch {
      setCopyStatus(text.copyFailed);
    }
  }

  function handleSourceModeChange(nextMode: ContractSourceMode) {
    if (nextMode === sourceMode) {
      return;
    }

    if (!confirmPipelineReset("source")) {
      return;
    }

    setBuilderReady(false);
    setActiveStep("source");
    setSourceMode(nextMode);
    resetPipelineState();
  }

  function handleBuilderFrameLoad() {
    setBuilderReady(false);
  }

  function onSelectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (!confirmPipelineReset("file")) {
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    setActiveStep("compile");
    resetPipelineState();
  }

  async function compileContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (sourceMode === "upload") {
      if (!selectedFile) {
        setCompileError(text.compileNeedsUploadSource);
        return;
      }
    } else {
      if (!builderSource?.sourceCode) {
        setCompileError(text.compileNeedsBuilderSource);
        return;
      }
    }

    setCompileBusy(true);
    setCompileError("");
    setCompileData(null);

    try {
      const response = sourceMode === "upload"
        ? await (async () => {
            const formData = new FormData();
            formData.append("contract", selectedFile as File);
            return fetch("/api/compile", {
              method: "POST",
              body: formData,
            });
          })()
        : await fetch("/api/compile/source", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fileName: builderSource?.fileName || "BuilderContract.sol",
              sourceCode: builderSource?.sourceCode || "",
            }),
          });
      const payload = await response.json();
      if (!response.ok) {
        const messages = [payload.error, ...(payload.errors ?? []), ...(payload.warnings ?? [])].filter(Boolean).join("\n\n");
        throw new Error(messages || text.compileFailed);
      }

      setCompileData(payload as CompileResponse);
      setActiveStep("deploy");
    } catch (error) {
      setCompileError(error instanceof Error ? error.message : text.compileFailed);
    } finally {
      setCompileBusy(false);
    }
  }

  function updateDeploymentInput(paramName: string, value: string) {
    setDeploymentInputs((current) => ({ ...current, [paramName]: value }));
  }

  function updateInteractionInput(signature: string, paramName: string, value: string) {
    setInteractionInputs((current) => ({
      ...current,
      [signature]: {
        ...(current[signature] ?? {}),
        [paramName]: value,
      },
    }));
  }

  async function deploySelectedContract() {
    if (!selectedContract) {
      setDeployStatus(text.noContractSelected);
      return;
    }

    if (!selectedContract.deployable) {
      setDeployStatus(text.selectedContractNotDeployable);
      return;
    }

    if (!window.ethereum) {
      setDeployStatus(text.needWalletToDeploy);
      return;
    }

    setDeployBusy(true);
    setDeployStatus(text.preparingDeployment);
    setDeploymentTxHash("");
    setDeploymentBlockNumber("");

    try {
      await ensureExpectedNetwork(window.ethereum);
      const browserProvider = createBrowserRpcProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      const constructorItem = selectedContract.abi.find((item) => item.type === "constructor");
      const constructorArgs = (constructorItem?.inputs ?? []).map((param, index) => {
        const key = `${param.name || "param"}_${index}`;
        return parseParamValue(param, deploymentInputs[key] ?? "", text.tupleJsonError, text.arrayJsonError);
      });

      const factory = new ContractFactory(selectedContract.abi, selectedContract.bytecode, signer);
      const deployedContract = await factory.deploy(...constructorArgs);
      const deploymentTransaction = deployedContract.deploymentTransaction();
      if (!deploymentTransaction) {
        throw new Error(text.deployFailed);
      }

      setDeploymentTxHash(deploymentTransaction.hash ?? "");
      setDeployStatus(text.waitingForBlock);
      const deploymentReceipt = await deploymentTransaction.wait();
      const address = await deployedContract.getAddress();
      setDeploymentBlockNumber(deploymentReceipt?.blockNumber ? String(deploymentReceipt.blockNumber) : "");
      setDeployedAddress(address);
      setInteractionAddress(address);
      setActiveStep("interact");
      setDeployStatus(`${text.deployedAt(address)}\n${text.interactionReadyAfterDeploy}`);
      spotlightInteractionPanel();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "";
      setDeployStatus(errorMessage && errorMessage !== text.deployFailed ? `${text.deployFailed}\n${errorMessage}` : text.deployFailed);
    } finally {
      setDeployBusy(false);
    }
  }

  async function getReadOnlyRunner() {
    if (window.ethereum) {
      try {
        const currentChainId = String(await window.ethereum.request({ method: "eth_chainId" }));
        if (currentChainId.toLowerCase() === configuredChainIdHex) {
          return createBrowserRpcProvider(window.ethereum);
        }
      } catch {
        // Fall back to the direct JSON-RPC endpoint if the injected provider is unavailable.
      }
    }

    return createReadOnlyRpcProvider();
  }

  async function invokeFunction(item: AbiItem) {
    if (!selectedContract || !item.name || item.type !== "function") {
      return;
    }

    const signature = getFunctionSignature(item, text.functionFallback);
    if (!interactionAddress) {
      setInteractionResults((current) => ({
        ...current,
        [signature]: text.noContractAddress,
      }));
      return;
    }

    const formState = interactionInputs[signature] ?? {};
    const params = (item.inputs ?? []).map((param, index) => {
      const key = `${param.name || "param"}_${index}`;
      return parseParamValue(param, formState[key] ?? "", text.tupleJsonError, text.arrayJsonError);
    });

    setInteractionBusy(signature);
    setInteractionExplorerData((current) => {
      if (!(signature in current)) {
        return current;
      }

      const next = { ...current };
      delete next[signature];
      return next;
    });
    setInteractionResults((current) => ({ ...current, [signature]: text.executing }));

    try {
      const runner = isReadOnlyFunction(item)
        ? await getReadOnlyRunner()
        : await (async () => {
            if (!window.ethereum) {
              throw new Error(text.needWalletToSend);
            }

            await ensureExpectedNetwork(window.ethereum);
            const provider = createBrowserRpcProvider(window.ethereum);
            return provider.getSigner();
          })();

      const contract = new Contract(interactionAddress, selectedContract.abi, runner);
      const method = contract.getFunction(signature);

      if (isReadOnlyFunction(item)) {
        const result = await method(...params);
        setInteractionResults((current) => ({ ...current, [signature]: stringifyValue(result) }));
        return;
      }

      const payableValue = formState.__payableValue ?? "";
      const overrides = item.stateMutability === "payable" && payableValue
        ? [{ value: ethers.parseEther(payableValue) }]
        : [];

      const transaction = await method(...params, ...overrides);
      const receipt = await transaction.wait();
      setInteractionExplorerData((current) => ({
        ...current,
        [signature]: {
          txHash: transaction.hash,
          blockNumber: receipt?.blockNumber ? String(receipt.blockNumber) : undefined,
        },
      }));
      setInteractionResults((current) => ({
        ...current,
        [signature]: text.txConfirmed(String(receipt?.blockNumber ?? text.unknownBlock), transaction.hash),
      }));
    } catch (error) {
      setInteractionResults((current) => ({
        ...current,
        [signature]: error instanceof Error ? error.message : text.executionFailed,
      }));
    } finally {
      setInteractionBusy("");
    }
  }

  const constructorInputs = selectedContract?.abi.find((item) => item.type === "constructor")?.inputs ?? [];
  const contractFunctions = selectedContract?.abi.filter((item) => item.type === "function") ?? [];
  const sourceIsReady = sourceMode === "upload" ? Boolean(selectedFile) : Boolean(builderSource?.sourceCode);
  const workflowGuidance = getWorkflowGuidance({
    activeStep,
    sourceMode,
    selectedFile,
    builderSource,
    compileData,
    selectedContract,
    deployedAddress,
    interactionAddress,
    walletNeedsNetworkSwitch,
    experienceText,
  });
  const availableSteps: Record<WorkflowStep, boolean> = {
    source: true,
    compile: sourceIsReady,
    deploy: Boolean(compileData?.contracts.length),
    interact: Boolean(selectedContract),
  };
  const completedSteps: Record<WorkflowStep, boolean> = {
    source: sourceIsReady,
    compile: Boolean(compileData?.contracts.length),
    deploy: Boolean(deployedAddress),
    interact: Boolean(deployedAddress || Object.keys(interactionResults).length),
  };

  function handleWorkflowStepChange(step: WorkflowStep) {
    if (!availableSteps[step]) {
      return;
    }

    setActiveStep(step);
  }

  return (
    <div className="app-shell">
      <HeroHeader
        language={language}
        onLanguageChange={setLanguage}
        text={text}
        walletAddress={walletAddress}
        walletStatus={walletStatus}
        showSwitchNetwork={walletNeedsNetworkSwitch}
        onConnectWallet={connectWallet}
        onSwitchNetwork={switchWalletNetwork}
        onWalletMenuOpen={() => { if (window.ethereum) void syncWalletState(window.ethereum); }}
      />

      <main className="workflow-shell workflow-shell-builder">
        <div className="workflow-nav-panel workflow-nav-panel-builder">
          <WorkflowTabs
            activeStep={activeStep}
            availableSteps={availableSteps}
            completedSteps={completedSteps}
            onStepChange={handleWorkflowStepChange}
            text={text}
          />
          <div className="workflow-support-grid workflow-support-grid-guide-only">
            <WorkflowGuidance experienceText={experienceText} model={workflowGuidance} />
          </div>
        </div>

        <div className="workflow-stage">
          {activeStep === "source" && (
            <SourceIntakePanel
              text={text}
              sourceMode={sourceMode}
              onSourceModeChange={handleSourceModeChange}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              builderSource={builderSource}
              builderFrameRef={builderFrameRef}
              onBuilderFrameLoad={handleBuilderFrameLoad}
            />
          )}

          {activeStep === "compile" && (
            <CompilePanel
              text={text}
              experienceText={experienceText}
              sourceMode={sourceMode}
              selectedFile={selectedFile}
              builderSource={builderSource}
              compileBusy={compileBusy}
              compileError={compileError}
              compileData={compileData}
              selectedContractId={selectedContractId}
              onSelectedContractChange={setSelectedContractId}
              onCompile={compileContract}
              selectedContract={selectedContract}
            />
          )}

          {activeStep === "deploy" && (
            <DeployPanel
              text={text}
              selectedContract={selectedContract}
              constructorInputs={constructorInputs}
              deploymentInputs={deploymentInputs}
              onDeploymentInputChange={updateDeploymentInput}
              deployBusy={deployBusy}
              onDeploy={deploySelectedContract}
              deployStatus={deployStatus}
              deploymentTxHash={deploymentTxHash}
              deploymentBlockNumber={deploymentBlockNumber}
              deployedAddress={deployedAddress}
              onCopyDeployedAddress={copyDeployedAddress}
              copyStatus={copyStatus}
            />
          )}

          {activeStep === "interact" && (
            <InteractionPanel
              text={text}
              selectedContract={selectedContract}
              contractFunctions={contractFunctions}
              interactionAddress={interactionAddress}
              onInteractionAddressChange={setInteractionAddress}
              interactionInputs={interactionInputs}
              onInteractionInputChange={updateInteractionInput}
              interactionBusy={interactionBusy}
              onInvokeFunction={invokeFunction}
              interactionResults={interactionResults}
              interactionExplorerData={interactionExplorerData}
              panelRef={interactionPanelRef}
              isHighlighted={highlightInteractionPanel}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
