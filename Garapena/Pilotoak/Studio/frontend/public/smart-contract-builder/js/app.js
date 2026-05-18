/* ═══════════════════════════════════════════════════════════════
   app.js — Lógica principal de SmartContract Builder
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const BUILDER_VERSION = '1.0.0';
const STORAGE_KEYS = {
  workspace: 'smart-contract-builder.workspace',
  template: 'smart-contract-builder.template',
};
const RUNTIME_PARAMS = new URLSearchParams(window.location.search);
const IS_EMBEDDED = RUNTIME_PARAMS.get('embed') === '1';
const PARENT_ORIGIN = window.location.origin;
let codePanelCollapsed = IS_EMBEDDED;

function detectInitialLanguage() {
  const requestedLanguage = RUNTIME_PARAMS.get('lang');
  if (requestedLanguage === 'eu' || requestedLanguage === 'es' || requestedLanguage === 'en') {
    return requestedLanguage;
  }

  const locale = (navigator.language || 'es').toLowerCase();
  if (locale.startsWith('eu')) {
    return 'eu';
  }

  if (locale.startsWith('en')) {
    return 'en';
  }

  return 'es';
}

let currentLanguage = detectInitialLanguage();

const BUILDER_TEXT = {
  eu: {
    appTitle: 'SmartContract Builder',
    appSubtitle: 'Sortu kontratu adimendunak modu bisualean, kodea idatzi gabe',
    clearButton: '🗑 Garbitu',
    clearTitle: 'Garbitu workspace-a',
    generateButton: '⚡ Sortu Solidity',
    exportButton: '↗ Erabili Playground-en',
    exportTitle: 'Bidali sortutako kontratua Playground-era',
    templatesLabel: 'Txantiloi azkarrak:',
    templates: {
      storage: '📦 Storage',
      erc20: '🪙 ERC-20 Tokena',
      erc721: '🖼 ERC-721 NFT',
      voting: '🗳 Bozketa',
      blank: '✨ Hutsik',
    },
    panelTitles: {
      visual: '🧩 Editore bisuala',
      hint: 'Arrastatu blokeak ezkerreko paneletik',
      code: '📄 Sortutako Solidity kodea',
      compiler: '🛠 Konpilatzailearen diagnostikoa',
    },
    buttons: {
      download: '⬇ Deskargatu',
      downloadTitle: 'Deskargatu Solidity fitxategia',
      copy: '📋 Kopiatu',
      copyTitle: 'Kopiatu arbelera',
      remix: '🚀 Ireki Remix-en',
      remixTitle: 'Ireki Remix IDE-n',
      showCode: '🪟 Kodea ikusi',
      showCodeTitle: 'Erakutsi kode panel osoa',
      hideCode: '🧩 Blockly handitu',
      hideCodeTitle: 'Ezkutatu kode panela eta zabaldu Blockly lan-eremua',
    },
    placeholders: {
      code: '// ⬅ Arrastatu blokeak eta sakatu "Sortu Solidity"\n// edo aukeratu goiko txantiloi azkarretako bat.',
    },
    compiler: {
      idleSummary: 'Konpilatu gabe',
      idleBody: 'Sortu Solidity kodea konpilatzailearen erroreak eta warning-ak ikusteko.',
      unavailable: 'Konpilatzailea ez dago erabilgarri',
      initializing: 'Konpilatzailea hasieratzen',
      initializingBody: 'Konpilatzailea Web Worker batean kargatzen ari da WebAssembly-k hari nagusia blokeatu ez dezan.',
      stateLabel: 'Egoera',
      detailLabel: 'Xehetasuna',
      cleanSummary: 'Gorabeherarik gabe konpilatzen du',
      cleanBody: 'Konpilatzaileak ez du errorerik edo warning-ik eman kontratu honetarako.',
      noMessage: 'Konpilatzailearen mezua ez dago erabilgarri.',
      noLocation: 'Kokapena ez dago erabilgarri',
      contractFallback: 'kontratua',
      severity: { error: 'errorea', warning: 'abisua', info: 'info', success: 'ondo' },
      errorCount: (count) => `${count} errore`,
      warningCount: (count) => `${count} abisu`,
    },
    toasts: {
      restoreError: '❌ Ezin izan da gordetako workspace-a leheneratu',
      templateLoadError: (message) => `❌ Ezin izan da txantiloia kargatu: ${message}`,
      generateFirst: '⚠ Lehenengo sortu kodea',
      exportUnavailable: '⚠ Builder hau Playground barruan ireki behar da esportatzeko',
      exportSent: '↗ Kontratua Playground-era bidali da',
      codeGenerated: '⚡ Solidity kodea sortu da',
      workspaceCleared: '🗑 Workspace-a garbitu da',
      codeCopied: '✅ Kodea arbelera kopiatu da',
      copyFallback: '⚠ Ezin izan da automatikoki kopiatu. Kodea hautatuta geratu da.',
      downloaded: (fileName) => `⬇ ${fileName} fitxategia deskargatu da`,
      openingRemix: '🚀 Remix IDE irekitzen…',
    },
    info: {
      blank: {
        title: '✨ Workspace hutsa',
        body: 'Arrastatu blokeak ezkerreko paneletik zure kontratua hutsetik eraikitzeko.<br><br>Gomendatutako ordena: <strong>Lizentzia → Pragma → Kontratua → Aldagaiak → Eraikitzailea → Funtzioak → Gertaerak</strong>.',
      },
      storage: {
        title: '📦 Storage kontratua',
        body: '<strong>Storage</strong> kontratua Solidity-ren "Hello World" klasikoa da.<br><br>Zenbaki bat blockchain-ean gordetzen du <code>almacenar()</code> bidez eta <code>obtener()</code> bidez berreskuratzen du.<br><br>💡 Egoera-aldagaiak, funtzioak eta ikusgarritasuna ikasteko aproposa da.',
      },
      erc20: {
        title: '🪙 ERC-20 token fungigarria',
        body: '<strong>ERC-20</strong> estandarrak token fungigarriak definitzen ditu.<br><br>Adibideak: USDC, DAI, UNI. Guztiek interfazea partekatzen dute: <code>transfer</code>, <code>approve</code>, <code>balanceOf</code>...<br><br>Kontratu honek OpenZeppelin heredatzen du eta <code>mint</code> funtzio bat gehitzen du <strong>Ownable</strong> babesarekin.',
      },
      erc721: {
        title: '🖼 ERC-721 NFT',
        body: '<strong>ERC-721</strong> estandarrak token ez-fungigarriak definitzen ditu.<br><br>Token bakoitzak <code>tokenId</code> bakarra du. Adibideak: CryptoPunks, Bored Apes.<br><br><code>mint</code> funtzioak NFT berriak sortzen ditu ID autoincremental batekin eta gertaera bat jaurtitzen du.',
      },
      voting: {
        title: '🗳 Bozketa sistema',
        body: '<strong>Bozketa deszentralizatu</strong> oinarrizko baten kontratua.<br><br>Helbide bakoitzak behin bakarrik bozka dezake. <code>require</code> aginduak hori bermatzen du, norbaitek bi aldiz bozkatzen badu transakzioa atzera botaz.<br><br>💡 Kontzeptu nagusiak: <strong>mappings</strong>, <strong>events</strong>, <strong>require</strong>, <strong>msg.sender</strong>.',
      },
    },
    categories: {
      contract: '📝 Kontratua',
      state: '📦 Egoera aldagaiak',
      functions: '🔧 Funtzioak',
      events: '🎯 Gertaerak',
      statements: '⚙️ Esaldiak',
      expressions: '🔢 Adierazpenak',
      erc20: '🪙 ERC-20 laguntzaileak',
      erc721: '🖼 ERC-721 laguntzaileak',
      security: '🛡 Segurtasuna / Ownable',
    },
  },
  es: {
    appTitle: 'SmartContract Builder',
    appSubtitle: 'Crea contratos inteligentes de forma visual — sin escribir codigo',
    clearButton: '🗑 Limpiar',
    clearTitle: 'Limpiar workspace',
    generateButton: '⚡ Generar Solidity',
    exportButton: '↗ Usar en Playground',
    exportTitle: 'Enviar el contrato generado al Playground',
    templatesLabel: 'Plantillas rapidas:',
    templates: {
      storage: '📦 Storage',
      erc20: '🪙 Token ERC-20',
      erc721: '🖼 NFT ERC-721',
      voting: '🗳 Votacion',
      blank: '✨ En blanco',
    },
    panelTitles: {
      visual: '🧩 Editor Visual',
      hint: 'Arrastra bloques desde el panel izquierdo',
      code: '📄 Codigo Solidity Generado',
      compiler: '🛠 Diagnostico del compilador',
    },
    buttons: {
      download: '⬇ Descargar',
      downloadTitle: 'Descargar archivo Solidity',
      copy: '📋 Copiar',
      copyTitle: 'Copiar al portapapeles',
      remix: '🚀 Abrir en Remix',
      remixTitle: 'Abrir en Remix IDE',
      showCode: '🪟 Ver código',
      showCodeTitle: 'Mostrar el panel de código completo',
      hideCode: '🧩 Dar más espacio a Blockly',
      hideCodeTitle: 'Ocultar el panel de código y ampliar el espacio visual de Blockly',
    },
    placeholders: {
      code: '// ⬅ Arrastra bloques y pulsa "Generar Solidity"\n// o escoge una plantilla rapida arriba.',
    },
    compiler: {
      idleSummary: 'Sin compilar',
      idleBody: 'Genera Solidity para ver errores y warnings del compilador.',
      unavailable: 'Compilador no disponible',
      initializing: 'Inicializando compilador',
      initializingBody: 'El compilador se esta cargando en un Web Worker para evitar el bloqueo de WebAssembly en el hilo principal.',
      stateLabel: 'Estado',
      detailLabel: 'Detalle',
      cleanSummary: 'Compila sin incidencias',
      cleanBody: 'El compilador no reporto errores ni warnings para este contrato.',
      noMessage: 'Mensaje del compilador no disponible.',
      noLocation: 'Ubicacion no disponible',
      contractFallback: 'contrato',
      severity: { error: 'error', warning: 'warning', info: 'info', success: 'success' },
      errorCount: (count) => `${count} error${count === 1 ? '' : 'es'}`,
      warningCount: (count) => `${count} warning${count === 1 ? '' : 's'}`,
    },
    toasts: {
      restoreError: '❌ No se pudo restaurar el workspace guardado',
      templateLoadError: (message) => `❌ Error al cargar la plantilla: ${message}`,
      generateFirst: '⚠ Genera el codigo primero',
      exportUnavailable: '⚠ Este Builder debe abrirse dentro del Playground para exportar',
      exportSent: '↗ Contrato enviado al Playground',
      codeGenerated: '⚡ Codigo Solidity generado',
      workspaceCleared: '🗑 Workspace limpiado',
      codeCopied: '✅ Codigo copiado al portapapeles',
      copyFallback: '⚠ No se pudo copiar automaticamente. El codigo quedo seleccionado.',
      downloaded: (fileName) => `⬇ Archivo ${fileName} descargado`,
      openingRemix: '🚀 Abriendo Remix IDE…',
    },
    info: {
      blank: {
        title: '✨ Workspace en blanco',
        body: 'Arrastra bloques desde el panel izquierdo para construir tu propio contrato desde cero.<br><br>Orden recomendado: <strong>Licencia → Pragma → Contrato → Variables → Constructor → Funciones → Eventos</strong>.',
      },
      storage: {
        title: '📦 Contrato Storage',
        body: 'El contrato <strong>Storage</strong> es el "Hola Mundo" de Solidity.<br><br>Almacena un numero en la blockchain con <code>almacenar()</code> y lo recupera con <code>obtener()</code>.<br><br>💡 Ideal para aprender las bases de variables de estado, funciones y visibilidad.',
      },
      erc20: {
        title: '🪙 Token Fungible ERC-20',
        body: 'El estandar <strong>ERC-20</strong> define tokens fungibles.<br><br>Ejemplos: USDC, DAI, UNI. Todos comparten la misma interfaz: <code>transfer</code>, <code>approve</code>, <code>balanceOf</code>...<br><br>Este contrato hereda de OpenZeppelin y añade una funcion <code>mint</code> protegida con <strong>Ownable</strong>.',
      },
      erc721: {
        title: '🖼 NFT ERC-721',
        body: 'El estandar <strong>ERC-721</strong> define tokens no fungibles.<br><br>Cada token tiene un <code>tokenId</code> unico. Ejemplos: CryptoPunks, Bored Apes.<br><br>La funcion <code>mint</code> crea nuevos NFTs con un ID autoincremental y emite un evento.',
      },
      voting: {
        title: '🗳 Sistema de Votacion',
        body: 'Un contrato de <strong>votacion descentralizada</strong> basica.<br><br>Cada direccion puede votar <em>una sola vez</em>. El <code>require</code> garantiza esto, revirtiendo la transaccion si alguien intenta votar dos veces.<br><br>💡 Conceptos clave: <strong>mappings</strong>, <strong>events</strong>, <strong>require</strong>, <strong>msg.sender</strong>.',
      },
    },
    categories: {
      contract: '📝 Contrato',
      state: '📦 Variables de Estado',
      functions: '🔧 Funciones',
      events: '🎯 Eventos',
      statements: '⚙️ Sentencias',
      expressions: '🔢 Expresiones',
      erc20: '🪙 ERC-20 Helpers',
      erc721: '🖼 ERC-721 Helpers',
      security: '🛡 Seguridad / Ownable',
    },
  },
  en: {
    appTitle: 'SmartContract Builder',
    appSubtitle: 'Build smart contracts visually without writing code',
    clearButton: '🗑 Clear',
    clearTitle: 'Clear workspace',
    generateButton: '⚡ Generate Solidity',
    exportButton: '↗ Use in Playground',
    exportTitle: 'Send the generated contract to the Playground',
    templatesLabel: 'Quick templates:',
    templates: {
      storage: '📦 Storage',
      erc20: '🪙 ERC-20 Token',
      erc721: '🖼 ERC-721 NFT',
      voting: '🗳 Voting',
      blank: '✨ Blank',
    },
    panelTitles: {
      visual: '🧩 Visual Editor',
      hint: 'Drag blocks from the left panel',
      code: '📄 Generated Solidity Code',
      compiler: '🛠 Compiler diagnostics',
    },
    buttons: {
      download: '⬇ Download',
      downloadTitle: 'Download Solidity file',
      copy: '📋 Copy',
      copyTitle: 'Copy to clipboard',
      remix: '🚀 Open in Remix',
      remixTitle: 'Open in Remix IDE',
      showCode: '🪟 Show code',
      showCodeTitle: 'Show the full code panel',
      hideCode: '🧩 Give Blockly more room',
      hideCodeTitle: 'Hide the code panel and expand the Blockly workspace',
    },
    placeholders: {
      code: '// ⬅ Drag blocks and press "Generate Solidity"\n// or choose a quick template above.',
    },
    compiler: {
      idleSummary: 'Not compiled',
      idleBody: 'Generate Solidity to inspect compiler errors and warnings.',
      unavailable: 'Compiler unavailable',
      initializing: 'Initializing compiler',
      initializingBody: 'The compiler is loading in a Web Worker to avoid blocking the main thread with WebAssembly.',
      stateLabel: 'State',
      detailLabel: 'Detail',
      cleanSummary: 'Compiled without issues',
      cleanBody: 'The compiler did not report errors or warnings for this contract.',
      noMessage: 'Compiler message unavailable.',
      noLocation: 'Location unavailable',
      contractFallback: 'contract',
      severity: { error: 'error', warning: 'warning', info: 'info', success: 'success' },
      errorCount: (count) => `${count} error${count === 1 ? '' : 's'}`,
      warningCount: (count) => `${count} warning${count === 1 ? '' : 's'}`,
    },
    toasts: {
      restoreError: '❌ Could not restore the saved workspace',
      templateLoadError: (message) => `❌ Could not load the template: ${message}`,
      generateFirst: '⚠ Generate the code first',
      exportUnavailable: '⚠ This Builder must be opened inside the Playground to export',
      exportSent: '↗ Contract sent to the Playground',
      codeGenerated: '⚡ Solidity code generated',
      workspaceCleared: '🗑 Workspace cleared',
      codeCopied: '✅ Code copied to clipboard',
      copyFallback: '⚠ Could not copy automatically. The code has been selected instead.',
      downloaded: (fileName) => `⬇ Downloaded file ${fileName}`,
      openingRemix: '🚀 Opening Remix IDE…',
    },
    info: {
      blank: {
        title: '✨ Blank workspace',
        body: 'Drag blocks from the left panel to build your own contract from scratch.<br><br>Recommended order: <strong>License → Pragma → Contract → Variables → Constructor → Functions → Events</strong>.',
      },
      storage: {
        title: '📦 Storage contract',
        body: 'The <strong>Storage</strong> contract is the Solidity "Hello World".<br><br>It stores a number on-chain with <code>almacenar()</code> and reads it back with <code>obtener()</code>.<br><br>💡 Ideal for learning state variables, functions and visibility.',
      },
      erc20: {
        title: '🪙 ERC-20 fungible token',
        body: 'The <strong>ERC-20</strong> standard defines fungible tokens.<br><br>Examples: USDC, DAI, UNI. They all share the same interface: <code>transfer</code>, <code>approve</code>, <code>balanceOf</code>...<br><br>This contract inherits from OpenZeppelin and adds a <code>mint</code> function protected by <strong>Ownable</strong>.',
      },
      erc721: {
        title: '🖼 ERC-721 NFT',
        body: 'The <strong>ERC-721</strong> standard defines non-fungible tokens.<br><br>Each token has a unique <code>tokenId</code>. Examples: CryptoPunks, Bored Apes.<br><br>The <code>mint</code> function creates new NFTs with an auto-incrementing ID and emits an event.',
      },
      voting: {
        title: '🗳 Voting system',
        body: 'A basic <strong>decentralized voting</strong> contract.<br><br>Each address can vote only once. The <code>require</code> statement enforces this by reverting if someone tries to vote twice.<br><br>💡 Core concepts: <strong>mappings</strong>, <strong>events</strong>, <strong>require</strong>, <strong>msg.sender</strong>.',
      },
    },
    categories: {
      contract: '📝 Contract',
      state: '📦 State Variables',
      functions: '🔧 Functions',
      events: '🎯 Events',
      statements: '⚙️ Statements',
      expressions: '🔢 Expressions',
      erc20: '🪙 ERC-20 Helpers',
      erc721: '🖼 ERC-721 Helpers',
      security: '🛡 Security / Ownable',
    },
  },
};

function getBuilderText() {
  return BUILDER_TEXT[currentLanguage] || BUILDER_TEXT.es;
}

function isPlaceholderCode(code) {
  if (!code) {
    return true;
  }

  return Object.values(BUILDER_TEXT).some(entry => code.startsWith(entry.placeholders.code.split('\n')[0]));
}

// ──────────────────────────────────────────────
// PLANTILLAS XML predefinidas
// ──────────────────────────────────────────────
const TEMPLATES = {

  blank: `<xml xmlns="https://developers.google.com/blockly/xml"></xml>`,

  // ── Storage ──────────────────────────────────
  storage: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="sol_license" x="20" y="20">
    <field name="LICENSE">MIT</field>
    <next>
      <block type="sol_pragma">
        <field name="VERSION">^0.8.20</field>
        <next>
          <block type="sol_contract">
            <field name="NAME">Storage</field>
            <field name="INHERITS"></field>
            <statement name="BODY">
              <block type="sol_state_var_uint256">
                <field name="VISIBILITY">private</field>
                <field name="NAME">numero</field>
                <next>
                  <block type="sol_function">
                    <field name="NAME">almacenar</field>
                    <field name="PARAMS">uint256 _num</field>
                    <field name="VISIBILITY">public</field>
                    <field name="RETURNS"></field>
                    <statement name="BODY">
                      <block type="sol_assign">
                        <field name="TARGET">numero</field>
                        <field name="OP">=</field>
                        <value name="VALUE">
                          <block type="sol_param_ref">
                            <field name="NAME">_num</field>
                          </block>
                        </value>
                      </block>
                    </statement>
                    <next>
                      <block type="sol_function_view">
                        <field name="NAME">obtener</field>
                        <field name="PARAMS"></field>
                        <field name="VISIBILITY">public</field>
                        <field name="RETURNS">uint256</field>
                        <statement name="BODY">
                          <block type="sol_return">
                            <value name="VALUE">
                              <block type="sol_var_ref">
                                <field name="NAME">numero</field>
                              </block>
                            </value>
                          </block>
                        </statement>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </statement>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>`,

  // ── ERC-20 ───────────────────────────────────
  erc20: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="sol_license" x="20" y="20">
    <field name="LICENSE">MIT</field>
    <next>
      <block type="sol_pragma">
        <field name="VERSION">^0.8.20</field>
        <next>
          <block type="sol_ownable">
            <next>
              <block type="sol_contract">
                <field name="NAME">MiToken</field>
                <field name="INHERITS">ERC20, Ownable</field>
                <statement name="BODY">
                  <block type="sol_erc20_header">
                    <field name="TOKEN_NAME">MiToken</field>
                    <field name="SYMBOL">MTK</field>
                    <next>
                      <block type="sol_event">
                        <field name="NAME">TokensMinted</field>
                        <field name="PARAMS">address indexed to, uint256 amount</field>
                        <next>
                          <block type="sol_constructor">
                            <field name="PARAMS">uint256 initialSupply</field>
                            <statement name="BODY">
                              <block type="sol_erc20_mint">
                                <field name="TO">msg.sender</field>
                                <field name="AMOUNT">initialSupply</field>
                              </block>
                            </statement>
                            <next>
                              <block type="sol_function">
                                <field name="NAME">mint</field>
                                <field name="PARAMS">address to, uint256 amount</field>
                                <field name="VISIBILITY">public</field>
                                <field name="RETURNS"></field>
                                <statement name="BODY">
                                  <block type="sol_only_owner_modifier">
                                    <next>
                                      <block type="sol_erc20_mint">
                                        <field name="TO">to</field>
                                        <field name="AMOUNT">amount</field>
                                        <next>
                                          <block type="sol_emit">
                                            <field name="NAME">TokensMinted</field>
                                            <field name="ARGS">to, amount</field>
                                          </block>
                                        </next>
                                      </block>
                                    </next>
                                  </block>
                                </statement>
                              </block>
                            </next>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </statement>
              </block>
            </next>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>`,

  // ── ERC-721 ──────────────────────────────────
  erc721: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="sol_license" x="20" y="20">
    <field name="LICENSE">MIT</field>
    <next>
      <block type="sol_pragma">
        <field name="VERSION">^0.8.20</field>
        <next>
          <block type="sol_ownable">
            <next>
              <block type="sol_contract">
                <field name="NAME">MiNFT</field>
                <field name="INHERITS">ERC721, Ownable</field>
                <statement name="BODY">
                  <block type="sol_erc721_header">
                    <field name="NFT_NAME">MiNFT</field>
                    <field name="SYMBOL">MNFT</field>
                    <next>
                      <block type="sol_state_var_uint256">
                        <field name="VISIBILITY">private</field>
                        <field name="NAME">_tokenIdCounter</field>
                        <next>
                          <block type="sol_event">
                            <field name="NAME">NFTMinted</field>
                            <field name="PARAMS">address indexed to, uint256 indexed tokenId</field>
                            <next>
                              <block type="sol_constructor">
                                <field name="PARAMS"></field>
                                <statement name="BODY">
                                </statement>
                                <next>
                                  <block type="sol_function">
                                    <field name="NAME">mint</field>
                                    <field name="PARAMS">address to</field>
                                    <field name="VISIBILITY">public</field>
                                    <field name="RETURNS"></field>
                                    <statement name="BODY">
                                      <block type="sol_only_owner_modifier">
                                        <next>
                                          <block type="sol_assign">
                                            <field name="TARGET">uint256 tokenId</field>
                                            <field name="OP">=</field>
                                            <value name="VALUE">
                                              <block type="sol_var_ref">
                                                <field name="NAME">_tokenIdCounter</field>
                                              </block>
                                            </value>
                                            <next>
                                              <block type="sol_assign">
                                                <field name="TARGET">_tokenIdCounter</field>
                                                <field name="OP">+=</field>
                                                <value name="VALUE">
                                                  <block type="sol_number">
                                                    <field name="NUM">1</field>
                                                  </block>
                                                </value>
                                                <next>
                                                  <block type="sol_erc721_mint">
                                                    <field name="TO">to</field>
                                                    <field name="TOKEN_ID">tokenId</field>
                                                    <next>
                                                      <block type="sol_emit">
                                                        <field name="NAME">NFTMinted</field>
                                                        <field name="ARGS">to, tokenId</field>
                                                      </block>
                                                    </next>
                                                  </block>
                                                </next>
                                              </block>
                                            </next>
                                          </block>
                                        </next>
                                      </block>
                                    </statement>
                                  </block>
                                </next>
                              </block>
                            </next>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </statement>
              </block>
            </next>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>`,

  // ── Votación ─────────────────────────────────
  voting: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="sol_license" x="20" y="20">
    <field name="LICENSE">MIT</field>
    <next>
      <block type="sol_pragma">
        <field name="VERSION">^0.8.20</field>
        <next>
          <block type="sol_contract">
            <field name="NAME">Votacion</field>
            <field name="INHERITS"></field>
            <statement name="BODY">
              <block type="sol_state_var_address">
                <field name="VISIBILITY">public</field>
                <field name="NAME">propietario</field>
                <next>
                  <block type="sol_state_var_mapping">
                    <field name="KEY_TYPE">address</field>
                    <field name="VAL_TYPE">bool</field>
                    <field name="VISIBILITY">public</field>
                    <field name="NAME">haVotado</field>
                    <next>
                      <block type="sol_state_var_uint256">
                        <field name="VISIBILITY">public</field>
                        <field name="NAME">votosA</field>
                        <next>
                          <block type="sol_state_var_uint256">
                            <field name="VISIBILITY">public</field>
                            <field name="NAME">votosB</field>
                            <next>
                              <block type="sol_event">
                                <field name="NAME">VotoEmitido</field>
                                <field name="PARAMS">address indexed votante, uint8 opcion</field>
                                <next>
                                  <block type="sol_constructor">
                                    <field name="PARAMS"></field>
                                    <statement name="BODY">
                                      <block type="sol_assign">
                                        <field name="TARGET">propietario</field>
                                        <field name="OP">=</field>
                                        <value name="VALUE">
                                          <block type="sol_msg_sender"></block>
                                        </value>
                                      </block>
                                    </statement>
                                    <next>
                                      <block type="sol_function">
                                        <field name="NAME">votar</field>
                                        <field name="PARAMS">uint8 opcion</field>
                                        <field name="VISIBILITY">public</field>
                                        <field name="RETURNS"></field>
                                        <statement name="BODY">
                                          <block type="sol_require">
                                            <value name="COND">
                                              <block type="sol_compare">
                                                <value name="A">
                                                  <block type="sol_mapping_get">
                                                    <field name="MAP">haVotado</field>
                                                    <field name="KEY">msg.sender</field>
                                                  </block>
                                                </value>
                                                <field name="OP">==</field>
                                                <value name="B">
                                                  <block type="sol_bool_val">
                                                    <field name="BOOL">false</field>
                                                  </block>
                                                </value>
                                              </block>
                                            </value>
                                            <field name="MSG">Ya has votado</field>
                                            <next>
                                              <block type="sol_mapping_set">
                                                <field name="MAP">haVotado</field>
                                                <field name="KEY">msg.sender</field>
                                                <field name="OP">=</field>
                                                <value name="VALUE">
                                                  <block type="sol_bool_val">
                                                    <field name="BOOL">true</field>
                                                  </block>
                                                </value>
                                                <next>
                                                  <block type="sol_if">
                                                    <value name="COND">
                                                      <block type="sol_compare">
                                                        <value name="A">
                                                          <block type="sol_param_ref">
                                                            <field name="NAME">opcion</field>
                                                          </block>
                                                        </value>
                                                        <field name="OP">==</field>
                                                        <value name="B">
                                                          <block type="sol_number">
                                                            <field name="NUM">1</field>
                                                          </block>
                                                        </value>
                                                      </block>
                                                    </value>
                                                    <statement name="THEN">
                                                      <block type="sol_assign">
                                                        <field name="TARGET">votosA</field>
                                                        <field name="OP">+=</field>
                                                        <value name="VALUE">
                                                          <block type="sol_number">
                                                            <field name="NUM">1</field>
                                                          </block>
                                                        </value>
                                                      </block>
                                                    </statement>
                                                    <next>
                                                      <block type="sol_emit">
                                                        <field name="NAME">VotoEmitido</field>
                                                        <field name="ARGS">msg.sender, opcion</field>
                                                      </block>
                                                    </next>
                                                  </block>
                                                </next>
                                              </block>
                                            </next>
                                          </block>
                                        </statement>
                                      </block>
                                    </next>
                                  </block>
                                </next>
                              </block>
                            </next>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </statement>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>`
};

// ──────────────────────────────────────────────
// MENSAJES EDUCATIVOS por plantilla
// ──────────────────────────────────────────────
function getTemplateInfo(name) {
  const infoTexts = getBuilderText().info;
  return infoTexts[name] || infoTexts.blank;
}

// ══════════════════════════════════════════════
// INICIALIZACIÓN DE BLOCKLY
// ══════════════════════════════════════════════
let workspace;
let lastCompiledCode = '';
let compilerWorker = null;
let compilerRequestId = 0;
let latestDiagnosticsRequestId = 0;
let compilerWorkerUrl = '';
let currentTemplate = 'storage';
let workspacePersistTimer = 0;
const pendingCompileRequests = new Map();
const compilerState = {
  ready: false,
  initializing: false,
  failed: false,
  error: '',
  logs: [],
};

function initBlockly() {
  workspace = Blockly.inject('blocklyDiv', {
    toolbox: document.getElementById('toolbox'),
    scrollbars: true,
    trashcan: true,
    zoom: {
      controls: true,
      wheel: true,
      startScale: 1.0,
      maxScale: 3,
      minScale: 0.3,
      scaleSpeed: 1.1,
    },
    grid: {
      spacing: 24,
      length: 3,
      colour: '#1e293b',
      snap: true,
    },
    theme: buildDarkTheme(),
    renderer: 'zelos',
    move: {
      scrollbars: true,
      drag: true,
      wheel: true,
    },
  });

  if (!restorePersistedWorkspace()) {
    loadTemplate('storage');
  }

  workspace.addChangeListener(() => {
    scheduleWorkspacePersist();
  });
}

// ──────────────────────────────────────────────
// TEMA OSCURO
// ──────────────────────────────────────────────
function buildDarkTheme() {
  const blockStyles = {
    contract_blocks:   { colourPrimary: '#4F46E5', colourSecondary: '#6366f1', colourTertiary: '#4338CA' },
    statevar_blocks:   { colourPrimary: '#7C3AED', colourSecondary: '#8B5CF6', colourTertiary: '#6D28D9' },
    function_blocks:   { colourPrimary: '#0284C7', colourSecondary: '#0EA5E9', colourTertiary: '#0369A1' },
    event_blocks:      { colourPrimary: '#D97706', colourSecondary: '#F59E0B', colourTertiary: '#B45309' },
    statement_blocks:  { colourPrimary: '#059669', colourSecondary: '#10B981', colourTertiary: '#047857' },
    expression_blocks: { colourPrimary: '#DC2626', colourSecondary: '#EF4444', colourTertiary: '#B91C1C' },
    erc20_blocks:      { colourPrimary: '#B45309', colourSecondary: '#D97706', colourTertiary: '#92400E' },
    erc721_blocks:     { colourPrimary: '#9D174D', colourSecondary: '#BE185D', colourTertiary: '#831843' },
    security_blocks:   { colourPrimary: '#475569', colourSecondary: '#64748B', colourTertiary: '#334155' },
  };

  const componentStyles = {
    workspaceBackgroundColour: '#0f172a',
    toolboxBackgroundColour:   '#1a2235',
    toolboxForegroundColour:   '#94a3b8',
    flyoutBackgroundColour:    '#111827',
    flyoutForegroundColour:    '#e2e8f0',
    flyoutOpacity:             0.98,
    scrollbarColour:           '#334155',
    insertionMarkerColour:     '#6366f1',
    insertionMarkerOpacity:    0.5,
    scrollbarOpacity:          0.6,
    cursorColour:              '#6366f1',
  };

  return Blockly.Theme.defineTheme('solidityDark', { blockStyles, componentStyles });
}

function updateToggleCodeButton() {
  const button = document.getElementById('btn-toggle-code');
  if (!button) {
    return;
  }

  const text = getBuilderText();
  button.textContent = codePanelCollapsed ? text.buttons.showCode : text.buttons.hideCode;
  button.title = codePanelCollapsed ? text.buttons.showCodeTitle : text.buttons.hideCodeTitle;
  button.setAttribute('aria-pressed', String(!codePanelCollapsed));
}

function setCodePanelCollapsed(nextValue) {
  codePanelCollapsed = Boolean(nextValue);
  document.body.classList.toggle('code-panel-collapsed', codePanelCollapsed);
  updateToggleCodeButton();

  if (workspace) {
    window.setTimeout(() => Blockly.svgResize(workspace), 40);
  }
}

function toggleCodePanel() {
  setCodePanelCollapsed(!codePanelCollapsed);
}

function applyStaticTexts() {
  const text = getBuilderText();
  document.documentElement.lang = currentLanguage;
  document.title = text.appTitle;

  const mappedTextContent = [
    ['builderAppTitle', text.appTitle],
    ['builderAppSubtitle', text.appSubtitle],
    ['btn-clear', text.clearButton],
    ['btn-generate', text.generateButton],
    ['btn-export', text.exportButton],
    ['templatesLabel', text.templatesLabel],
    ['visualPanelTitle', text.panelTitles.visual],
    ['visualPanelHint', text.panelTitles.hint],
    ['codePanelTitle', text.panelTitles.code],
    ['compilerTitle', text.panelTitles.compiler],
    ['btn-download', text.buttons.download],
    ['btn-copy', text.buttons.copy],
    ['btn-remix', text.buttons.remix],
  ];

  mappedTextContent.forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });

  const mappedTitles = [
    ['btn-clear', text.clearTitle],
    ['btn-export', text.exportTitle],
    ['btn-download', text.buttons.downloadTitle],
    ['btn-copy', text.buttons.copyTitle],
    ['btn-remix', text.buttons.remixTitle],
  ];

  mappedTitles.forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.title = value;
    }
  });

  document.querySelectorAll('.tpl-btn').forEach(button => {
    const templateId = button.dataset.tpl;
    if (templateId && text.templates[templateId]) {
      button.textContent = text.templates[templateId];
    }
  });

  document.querySelectorAll('#toolbox category[data-category]').forEach(category => {
    const key = category.dataset.category;
    if (key && text.categories[key]) {
      category.setAttribute('name', text.categories[key]);
    }
  });

  if (workspace) {
    workspace.updateToolbox(document.getElementById('toolbox'));
  }

  const codeElement = document.getElementById('solidityCode');
  if (codeElement && isPlaceholderCode(codeElement.textContent || '')) {
    codeElement.textContent = text.placeholders.code;
    updateCodeLineNumbers(text.placeholders.code);
  }

  updateToggleCodeButton();
  applyTemplateUi(currentTemplate || 'blank');
}

function applyTemplateUi(name) {
  const info = getTemplateInfo(name);
  updateInfoBox(info.title, info.body);

  document.querySelectorAll('.tpl-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.tpl === name);
  });
}

function setLanguage(language) {
  if (!BUILDER_TEXT[language] || currentLanguage === language) {
    return;
  }

  currentLanguage = language;
  applyStaticTexts();

  if (workspace) {
    window.setTimeout(() => Blockly.svgResize(workspace), 0);
  }
}

function parseWorkspaceXml(xmlText) {
  if (typeof Blockly.Xml.textToDom === 'function') {
    return Blockly.Xml.textToDom(xmlText);
  }

  return new DOMParser().parseFromString(xmlText, 'text/xml').documentElement;
}

function serializeWorkspace() {
  if (!workspace) {
    return '';
  }

  try {
    return Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
  } catch {
    return '';
  }
}

function persistWorkspaceState() {
  const snapshot = serializeWorkspace();
  if (!snapshot) {
    return;
  }

  localStorage.setItem(STORAGE_KEYS.workspace, snapshot);
  localStorage.setItem(STORAGE_KEYS.template, currentTemplate || 'blank');
}

function scheduleWorkspacePersist() {
  window.clearTimeout(workspacePersistTimer);
  workspacePersistTimer = window.setTimeout(() => {
    persistWorkspaceState();
  }, 250);
}

function clearPersistedWorkspace() {
  localStorage.removeItem(STORAGE_KEYS.workspace);
  localStorage.removeItem(STORAGE_KEYS.template);
}

function loadWorkspaceXml(xmlText, options = {}) {
  if (!xmlText) {
    return false;
  }

  const { generate = true, persist = true } = options;

  try {
    const dom = parseWorkspaceXml(xmlText);
    workspace.clear();
    Blockly.Xml.domToWorkspace(dom, workspace);
    workspace.scrollCenter();

    if (persist) {
      persistWorkspaceState();
    }

    if (generate) {
      window.setTimeout(generateAndDisplay, 100);
    }

    return true;
  } catch (error) {
    console.error('Error restaurando el workspace:', error);
    showToast(getBuilderText().toasts.restoreError, 'error');
    return false;
  }
}

function restorePersistedWorkspace() {
  const snapshot = localStorage.getItem(STORAGE_KEYS.workspace);
  if (!snapshot) {
    return false;
  }

  const storedTemplate = localStorage.getItem(STORAGE_KEYS.template);
  currentTemplate = storedTemplate && TEMPLATES[storedTemplate] ? storedTemplate : 'blank';

  const restored = loadWorkspaceXml(snapshot, { generate: false, persist: false });
  if (!restored) {
    clearPersistedWorkspace();
    currentTemplate = 'storage';
    return false;
  }

  applyTemplateUi(currentTemplate);
  window.setTimeout(generateAndDisplay, 100);
  return true;
}

function postToPlayground(type, payload = {}) {
  if (!IS_EMBEDDED || !window.parent || window.parent === window) {
    return false;
  }

  window.parent.postMessage({ type, payload }, PARENT_ORIGIN);
  return true;
}

function notifyPlaygroundReady() {
  postToPlayground('builder:ready', {
    templateId: currentTemplate,
    hasWorkspace: Boolean(serializeWorkspace()),
    language: currentLanguage,
  });
}

function exportToPlayground() {
  let code = getGeneratedCode();
  if (!code) {
    generateAndDisplay();
    code = getGeneratedCode();
  }

  if (!code) {
    showToast(getBuilderText().toasts.generateFirst, 'error');
    return;
  }

  const payload = {
    fileName: getDownloadFileName(code),
    sourceCode: code,
    templateId: currentTemplate || 'blank',
    updatedAt: new Date().toISOString(),
    workspaceSnapshot: serializeWorkspace(),
    builderVersion: BUILDER_VERSION,
  };

  if (!postToPlayground('builder:export-solidity', payload)) {
    showToast(getBuilderText().toasts.exportUnavailable, 'error');
    return;
  }

  persistWorkspaceState();
  showToast(getBuilderText().toasts.exportSent, 'success');
}

function handlePlaygroundMessage(event) {
  if (event.origin !== PARENT_ORIGIN || !event.data || typeof event.data !== 'object') {
    return;
  }

  const payload = event.data.payload || {};
  if (event.data.type === 'playground:set-language') {
    if (typeof payload.language === 'string') {
      setLanguage(payload.language);
    }
    return;
  }

  if (event.data.type === 'playground:load-workspace') {
    if (typeof payload.language === 'string') {
      setLanguage(payload.language);
    }

    if (typeof payload.templateId === 'string' && TEMPLATES[payload.templateId]) {
      currentTemplate = payload.templateId;
      applyTemplateUi(currentTemplate);
    }

    if (typeof payload.workspaceSnapshot === 'string' && payload.workspaceSnapshot.trim()) {
      loadWorkspaceXml(payload.workspaceSnapshot);
    }
  }
}

// ══════════════════════════════════════════════
// CARGA DE PLANTILLAS
// ══════════════════════════════════════════════
function loadTemplate(name) {
  const xml = TEMPLATES[name];
  if (!xml) return;

  currentTemplate = name;

  workspace.clear();
  try {
    // DOMParser nativo: compatible con cualquier versión de Blockly
    const parser = new DOMParser();
    const dom = parser.parseFromString(xml, 'text/xml').documentElement;
    if (dom.querySelector('parsererror')) throw new Error('XML inválido');
    Blockly.Xml.domToWorkspace(dom, workspace);
    workspace.scrollCenter();
  } catch (e) {
    console.error('Error cargando plantilla:', e);
    showToast(getBuilderText().toasts.templateLoadError(e.message), 'error');
    return;
  }

  applyTemplateUi(name);
  persistWorkspaceState();

  // Genera código automáticamente
  setTimeout(() => {
    generateAndDisplay();
    notifyPlaygroundReady();
  }, 100);
}

// ══════════════════════════════════════════════
// GENERACIÓN Y DISPLAY DEL CÓDIGO
// ══════════════════════════════════════════════
function generateAndDisplay() {
  const code = generateSolidity(workspace);
  const el = document.getElementById('solidityCode');
  el.textContent = code;
  updateCodeLineNumbers(code);

  // Re-highlight
  if (window.hljs) {
    delete el.dataset.highlighted;
    hljs.highlightElement(el);
  }

  compileAndRenderDiagnostics(code);
}

// ══════════════════════════════════════════════
// INFO BOX
// ══════════════════════════════════════════════
function updateInfoBox(title, body) {
  const box = document.getElementById('infoBox');
  box.innerHTML = `<h3>${title}</h3><p>${body}</p>`;
}

function updateCodeLineNumbers(code) {
  const lineNumbersEl = document.getElementById('lineNumbers');
  const lineCount = Math.max(1, code.split('\n').length);
  const numbers = [];

  for (let line = 1; line <= lineCount; line += 1) {
    numbers.push(String(line));
  }

  lineNumbersEl.textContent = numbers.join('\n');
}

// ══════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════
let toastTimer;
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCompilerDebugState() {
  return {
    ready: compilerState.ready,
    initializing: compilerState.initializing,
    failed: compilerState.failed,
    lastLog: compilerState.logs.length ? compilerState.logs[compilerState.logs.length - 1] : '',
  };
}

function buildCompilerWorkerSource() {
  return `'use strict';

let compilerReady = false;
let solcBridge = null;
const compilerLogs = [];

function pushLog(message) {
  compilerLogs.push(String(message));
  if (compilerLogs.length > 20) {
    compilerLogs.shift();
  }
}

function bindSolcMethod(soljson, methodName, returnType, argTypes) {
  if (!soljson || typeof soljson.cwrap !== 'function') {
    return null;
  }

  try {
    return soljson.cwrap(methodName, returnType, argTypes);
  } catch {
    return null;
  }
}

function createSolcBridge(soljson) {
  const compileStandard = bindSolcMethod(soljson, 'solidity_compile', 'string', ['string', 'number', 'number']);
  if (!compileStandard) {
    throw new Error('No se pudo enlazar solidity_compile en el worker.');
  }

  const alloc = bindSolcMethod(soljson, 'solidity_alloc', 'number', ['number']) || soljson._malloc;
  const reset = bindSolcMethod(soljson, 'solidity_reset', null, []);
  const copyFromCString = soljson.UTF8ToString || soljson.Pointer_stringify;
  const addFunction = soljson.addFunction || (soljson.Runtime && soljson.Runtime.addFunction);
  const removeFunction = soljson.removeFunction || (soljson.Runtime && soljson.Runtime.removeFunction);

  if (typeof alloc !== 'function' || typeof copyFromCString !== 'function') {
    throw new Error('El worker no pudo inicializar las utilidades de memoria de solc.');
  }

  if (typeof addFunction !== 'function' || typeof removeFunction !== 'function') {
    throw new Error('El runtime del compilador no soporta callbacks dentro del worker.');
  }

  return {
    compile(input, callbacks = {}) {
      const importCallback = callbacks.import || (() => ({ error: 'File import callback not supported' }));

      const writeCString = (text, pointerLocation) => {
        const length = soljson.lengthBytesUTF8(text);
        const buffer = alloc(length + 1);
        soljson.stringToUTF8(text, buffer, length + 1);
        soljson.setValue(pointerLocation, buffer, '*');
      };

      const wrappedCallback = (context, kindPtr, dataPtr, contentsPtr, errorPtr) => {
        if (context !== 0) {
          return;
        }

        const kind = copyFromCString(kindPtr);
        const data = copyFromCString(dataPtr);
        const result = kind === 'source'
          ? importCallback(data)
          : { error: 'Unsupported callback kind: ' + kind };

        if (result && typeof result.contents === 'string') {
          writeCString(result.contents, contentsPtr);
        }

        if (result && typeof result.error === 'string') {
          writeCString(result.error, errorPtr);
        }
      };

      const callbackPtr = addFunction(wrappedCallback, 'viiiii');

      try {
        return compileStandard(input, callbackPtr, 0);
      } finally {
        removeFunction(callbackPtr);
        if (typeof reset === 'function') {
          reset();
        }
      }
    }
  };
}

function postWorkerMessage(type, payload) {
  self.postMessage(Object.assign({ type: type }, payload || {}));
}

self.Module = {
  print(message) {
    pushLog(message);
  },
  printErr(message) {
    pushLog(message);
  },
  onAbort(reason) {
    postWorkerMessage('error', {
      error: String(reason || 'El runtime del compilador abortó dentro del worker.'),
      logs: compilerLogs.slice(),
    });
  },
  onRuntimeInitialized() {
    try {
      solcBridge = createSolcBridge(self.Module);
      compilerReady = true;
      postWorkerMessage('ready');
    } catch (error) {
      postWorkerMessage('error', {
        error: error instanceof Error ? error.message : 'No se pudo inicializar solc en el worker.',
        logs: compilerLogs.slice(),
      });
    }
  },
};

var Module = self.Module;

try {
${window.__soljsonSource || ''}
} catch (error) {
  postWorkerMessage('error', {
    error: error instanceof Error ? error.message : 'No se pudo cargar soljson en el worker.',
    logs: compilerLogs.slice(),
  });
}

self.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.type !== 'compile') {
    return;
  }

  if (!compilerReady || !solcBridge) {
    postWorkerMessage('compile-error', {
      requestId: data.requestId,
      error: 'El compilador todavía no está listo en el worker.',
      logs: compilerLogs.slice(),
    });
    return;
  }

  try {
    const output = solcBridge.compile(data.input, {
      import: (path) => ({ error: 'Import no resuelto: ' + path }),
    });

    postWorkerMessage('compile-result', {
      requestId: data.requestId,
      output: output,
    });
  } catch (error) {
    postWorkerMessage('compile-error', {
      requestId: data.requestId,
      error: error instanceof Error ? error.message : 'Falló la compilación dentro del worker.',
      logs: compilerLogs.slice(),
    });
  }
});`;
}

function initCompilerWorker() {
  if (compilerWorker || compilerState.initializing || compilerState.ready) {
    return;
  }

  compilerState.initializing = true;
  compilerState.failed = false;
  compilerState.error = '';
  compilerState.logs = [];

  if (!window.__soljsonSource) {
    compilerState.initializing = false;
    compilerState.failed = true;
    compilerState.error = 'No se encontró window.__soljsonSource. El bundle textual de soljson no se cargó.';
    return;
  }

  compilerWorkerUrl = URL.createObjectURL(new Blob([buildCompilerWorkerSource()], { type: 'text/javascript' }));
  compilerWorker = new Worker(compilerWorkerUrl);

  compilerWorker.addEventListener('message', (event) => {
    const message = event.data || {};

    if (message.type === 'ready') {
      compilerState.ready = true;
      compilerState.initializing = false;
      compilerState.failed = false;
      compilerState.error = '';
      compileAndRenderDiagnostics(getGeneratedCode() || lastCompiledCode);
      return;
    }

    if (message.type === 'error') {
      compilerState.ready = false;
      compilerState.initializing = false;
      compilerState.failed = true;
      compilerState.error = message.error || 'El worker del compilador falló al inicializarse.';
      compilerState.logs = Array.isArray(message.logs) ? message.logs : [];
      compileAndRenderDiagnostics(getGeneratedCode() || lastCompiledCode);
      return;
    }

    if (message.type === 'compile-result') {
      const request = pendingCompileRequests.get(message.requestId);
      if (!request) {
        return;
      }

      pendingCompileRequests.delete(message.requestId);
      request.resolve(JSON.parse(message.output));
      return;
    }

    if (message.type === 'compile-error') {
      const request = pendingCompileRequests.get(message.requestId);
      compilerState.logs = Array.isArray(message.logs) ? message.logs : compilerState.logs;

      if (!request) {
        return;
      }

      pendingCompileRequests.delete(message.requestId);
      request.reject(new Error(message.error || 'La compilación falló dentro del worker.'));
    }
  });

  compilerWorker.addEventListener('error', (event) => {
    compilerState.ready = false;
    compilerState.initializing = false;
    compilerState.failed = true;
    compilerState.error = event.message || 'No se pudo arrancar el worker del compilador.';
    compileAndRenderDiagnostics(getGeneratedCode() || lastCompiledCode);
  });
}

function setCompilerPanel(summary, type, bodyHtml) {
  const summaryEl = document.getElementById('compilerSummary');
  const outputEl = document.getElementById('compilerOutput');

  summaryEl.textContent = summary;
  summaryEl.className = `compiler-summary ${type}`;
  outputEl.innerHTML = bodyHtml;
}

function getMessageLocation(error) {
  const text = getBuilderText();
  if (!error || !error.sourceLocation) {
    return text.compiler.noLocation;
  }

  const file = error.sourceLocation.file || text.compiler.contractFallback;
  const start = Number.isFinite(error.sourceLocation.start) ? error.sourceLocation.start : null;
  const end = Number.isFinite(error.sourceLocation.end) ? error.sourceLocation.end : null;

  if (start === null || end === null) {
    return file;
  }

  return `${file} · chars ${start}-${end}`;
}

function renderCompilerMessages(messages) {
  const text = getBuilderText();
  return messages.map(message => {
    const severity = message.severity === 'error' ? 'error' : 'warning';
    const compilerMessage = message.formattedMessage || message.message || text.compiler.noMessage;
    return `
      <div class="compiler-message ${severity}">
        <div class="compiler-message-header">
          <span class="compiler-message-type">${text.compiler.severity[severity]}</span>
          <span class="compiler-message-location">${escapeHtml(getMessageLocation(message))}</span>
        </div>
        <div class="compiler-message-text">${escapeHtml(compilerMessage)}</div>
      </div>
    `;
  }).join('');
}

function buildCompilerInput(code) {
  const fileName = getDownloadFileName(code);
  return {
    language: 'Solidity',
    sources: {
      [fileName]: {
        content: code,
      },
    },
    settings: {
      optimizer: {
        enabled: false,
        runs: 200,
      },
      outputSelection: {
        '*': {
          '*': ['abi'],
        },
      },
    },
  };
}

function compileSolidity(code) {
  if (!compilerWorker || !compilerState.ready) {
    return Promise.reject(new Error(getBuilderText().compiler.unavailable));
  }

  const requestId = ++compilerRequestId;
  const input = JSON.stringify(buildCompilerInput(code));

  return new Promise((resolve, reject) => {
    pendingCompileRequests.set(requestId, { resolve, reject });
    compilerWorker.postMessage({
      type: 'compile',
      requestId,
      input,
    });
  });
}

async function compileAndRenderDiagnostics(code) {
  const text = getBuilderText();
  lastCompiledCode = code;
  const currentRequestId = ++latestDiagnosticsRequestId;

  if (isPlaceholderCode(code)) {
    setCompilerPanel(
      text.compiler.idleSummary,
      'info',
      text.compiler.idleBody
    );
    return;
  }

  if (compilerState.failed) {
    const failureMessage = compilerState.error || text.compiler.unavailable;
    const details = compilerState.logs.length ? `\n\n${text.compiler.detailLabel}: ${escapeHtml(compilerState.logs[compilerState.logs.length - 1])}` : '';
    setCompilerPanel(
      text.compiler.unavailable,
      'error',
      `<div class="compiler-message error"><div class="compiler-message-header"><span class="compiler-message-type">${text.compiler.severity.error}</span><span class="compiler-message-location">solc-worker</span></div><div class="compiler-message-text">${escapeHtml(failureMessage)}${details}</div></div>`
    );
    return;
  }

  if (!compilerState.ready) {
    initCompilerWorker();
    const debugState = getCompilerDebugState();
    const extraDebug = [
      `initializing=${debugState.initializing}`,
      `ready=${debugState.ready}`,
      `failed=${debugState.failed}`,
    ].join(' · ');
    const extraMessage = debugState.lastLog ? `\n\n${text.compiler.detailLabel}: ${escapeHtml(debugState.lastLog)}` : '';
    setCompilerPanel(
      text.compiler.initializing,
      'info',
      `<div class="compiler-message"><div class="compiler-message-header"><span class="compiler-message-type">${text.compiler.severity.info}</span><span class="compiler-message-location">solc-worker</span></div><div class="compiler-message-text">${escapeHtml(text.compiler.initializingBody)}\n\n${text.compiler.stateLabel}: ${extraDebug}${extraMessage}</div></div>`
    );
    return;
  }

  try {
    const output = await compileSolidity(code);
    if (currentRequestId !== latestDiagnosticsRequestId) {
      return;
    }

    const messages = Array.isArray(output.errors) ? output.errors : [];
    const errors = messages.filter(message => message.severity === 'error');
    const warnings = messages.filter(message => message.severity === 'warning');

    if (!messages.length) {
      setCompilerPanel(
        text.compiler.cleanSummary,
        'success',
        `<div class="compiler-message success"><div class="compiler-message-header"><span class="compiler-message-type">${text.compiler.severity.success}</span><span class="compiler-message-location">solc 0.8.20</span></div><div class="compiler-message-text">${escapeHtml(text.compiler.cleanBody)}</div></div>`
      );
      return;
    }

    const summaryParts = [];
    if (errors.length) {
      summaryParts.push(text.compiler.errorCount(errors.length));
    }
    if (warnings.length) {
      summaryParts.push(text.compiler.warningCount(warnings.length));
    }

    setCompilerPanel(
      summaryParts.join(' · '),
      errors.length ? 'error' : 'warning',
      renderCompilerMessages(messages)
    );
  } catch (error) {
    if (currentRequestId !== latestDiagnosticsRequestId) {
      return;
    }

    const message = error instanceof Error ? error.message : text.compiler.unavailable;
    setCompilerPanel(
      text.compiler.unavailable,
      'error',
      `<div class="compiler-message error"><div class="compiler-message-header"><span class="compiler-message-type">${text.compiler.severity.error}</span><span class="compiler-message-location">solc-worker</span></div><div class="compiler-message-text">${escapeHtml(message)}</div></div>`
    );
  }
}

function getGeneratedCode() {
  const code = document.getElementById('solidityCode').textContent.trim();
  if (isPlaceholderCode(code)) {
    return '';
  }
  return code;
}

function selectCodeBlock() {
  const codeEl = document.getElementById('solidityCode');
  const selection = window.getSelection();
  const range = document.createRange();

  range.selectNodeContents(codeEl);
  selection.removeAllRanges();
  selection.addRange(range);
}

function fallbackCopyText(code) {
  const ta = document.createElement('textarea');
  ta.value = code;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '0';
  ta.style.left = '-9999px';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }

  document.body.removeChild(ta);
  return copied;
}

function encodeBase64Unicode(value) {
  return btoa(unescape(encodeURIComponent(value)));
}

function getDownloadFileName(code) {
  const contractMatch = code.match(/contract\s+([A-Za-z_][A-Za-z0-9_]*)/);
  if (contractMatch) {
    return `${contractMatch[1]}.sol`;
  }
  return 'SmartContract.sol';
}

// ══════════════════════════════════════════════
// COPIAR AL PORTAPAPELES
// ══════════════════════════════════════════════
async function copyToClipboard() {
  const text = getBuilderText();
  const code = getGeneratedCode();
  if (!code) {
    showToast(text.toasts.generateFirst, 'error');
    return;
  }

  try {
    if (!navigator.clipboard || !window.isSecureContext) {
      throw new Error('Clipboard API unavailable');
    }

    await navigator.clipboard.writeText(code);
    showToast(text.toasts.codeCopied, 'success');
  } catch {
    if (fallbackCopyText(code)) {
      showToast(text.toasts.codeCopied, 'success');
      return;
    }

    selectCodeBlock();
    showToast(text.toasts.copyFallback, 'error');
  }
}

function downloadGeneratedFile() {
  const text = getBuilderText();
  const code = getGeneratedCode();
  if (!code) {
    showToast(text.toasts.generateFirst, 'error');
    return;
  }

  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = getDownloadFileName(code);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 0);
  showToast(text.toasts.downloaded(link.download), 'success');
}

// ══════════════════════════════════════════════
// ABRIR EN REMIX IDE
// ══════════════════════════════════════════════
function openInRemix() {
  const text = getBuilderText();
  const code = getGeneratedCode();
  if (!code) {
    showToast(text.toasts.generateFirst, 'error');
    return;
  }

  const encoded = encodeBase64Unicode(code);
  const remixUrl = new URL('https://remix.ethereum.org/');
  remixUrl.hash = `code=${encoded}&autoCompile=true&activate=solidity,fileManager&minimizeterminal=true`;

  const remixWindow = window.open('', '_blank');
  if (remixWindow) {
    remixWindow.opener = null;
    remixWindow.location.replace(remixUrl.toString());
    showToast(text.toasts.openingRemix, 'info');
    return;
  }

  window.location.href = remixUrl.toString();
  showToast(text.toasts.openingRemix, 'info');
}

// ══════════════════════════════════════════════
// LIMPIAR WORKSPACE
// ══════════════════════════════════════════════
function clearWorkspace() {
  const text = getBuilderText();
  const placeholder = text.placeholders.code;
  workspace.clear();
  currentTemplate = 'blank';
  clearPersistedWorkspace();
  document.getElementById('solidityCode').textContent = placeholder;
  updateCodeLineNumbers(placeholder);
  applyTemplateUi('blank');
  compileAndRenderDiagnostics('');
  showToast(text.toasts.workspaceCleared, 'info');
  if (window.hljs) {
    const el = document.getElementById('solidityCode');
    delete el.dataset.highlighted;
    hljs.highlightElement(el);
  }
  notifyPlaygroundReady();
}

// ══════════════════════════════════════════════
// EVENT LISTENERS
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.toggle('embedded-builder', IS_EMBEDDED);
  setCodePanelCollapsed(codePanelCollapsed);
  applyStaticTexts();
  initBlockly();
  updateCodeLineNumbers(document.getElementById('solidityCode').textContent);
  initCompilerWorker();
  window.addEventListener('message', handlePlaygroundMessage);

  document.getElementById('btn-generate').addEventListener('click', () => {
    generateAndDisplay();
    persistWorkspaceState();
    showToast(getBuilderText().toasts.codeGenerated, 'success');
  });

  document.getElementById('btn-clear').addEventListener('click', clearWorkspace);
  document.getElementById('btn-download').addEventListener('click', downloadGeneratedFile);
  document.getElementById('btn-copy').addEventListener('click', copyToClipboard);
  document.getElementById('btn-remix').addEventListener('click', openInRemix);
  document.getElementById('btn-export').addEventListener('click', exportToPlayground);
  document.getElementById('btn-toggle-code').addEventListener('click', toggleCodePanel);

  document.querySelectorAll('.tpl-btn').forEach(btn => {
    btn.addEventListener('click', () => loadTemplate(btn.dataset.tpl));
  });

  // Highlight.js init
  if (window.hljs) {
    hljs.highlightAll();
  }

  notifyPlaygroundReady();
});

// Resize Blockly cuando cambia la ventana
window.addEventListener('resize', () => {
  if (workspace) Blockly.svgResize(workspace);
});
