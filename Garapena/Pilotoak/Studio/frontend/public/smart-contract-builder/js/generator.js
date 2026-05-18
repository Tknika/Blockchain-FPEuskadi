/* ═══════════════════════════════════════════════════════════════
   generator.js — Generador de código Solidity desde bloques Blockly
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// Creamos el generador Solidity extendiendo el generador base de Blockly
const SolidityGenerator = new Blockly.Generator('Solidity');

// Caracteres de nombre de variable legal
SolidityGenerator.PRECEDENCE = 0;

const ONLY_OWNER_TOKEN = '__SOLIDITY_BUILDER_ONLY_OWNER__';
const ERC20_META_TOKEN = '__SOLIDITY_BUILDER_ERC20_META__';
const ERC721_META_TOKEN = '__SOLIDITY_BUILDER_ERC721_META__';

const SUPPORT_CONTRACTS = {
  Ownable: `abstract contract Ownable {
  address public owner;

  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

  constructor() {
    owner = msg.sender;
    emit OwnershipTransferred(address(0), owner);
  }

  modifier onlyOwner() {
    require(msg.sender == owner, "Ownable: caller is not the owner");
    _;
  }

  function transferOwnership(address newOwner) public onlyOwner {
    require(newOwner != address(0), "Ownable: new owner is the zero address");
    emit OwnershipTransferred(owner, newOwner);
    owner = newOwner;
  }
}
`,
  ERC20: `abstract contract ERC20 {
  string public name;
  string public symbol;
  uint8 public constant decimals = 18;
  uint256 public totalSupply;

  mapping(address => uint256) private _balances;

  event Transfer(address indexed from, address indexed to, uint256 value);

  constructor(string memory name_, string memory symbol_) {
    name = name_;
    symbol = symbol_;
  }

  function balanceOf(address account) public view returns (uint256) {
    return _balances[account];
  }

  function transfer(address to, uint256 amount) public virtual returns (bool) {
    _transfer(msg.sender, to, amount);
    return true;
  }

  function _transfer(address from, address to, uint256 amount) internal {
    require(to != address(0), "ERC20: transfer to the zero address");
    require(_balances[from] >= amount, "ERC20: transfer amount exceeds balance");
    _balances[from] -= amount;
    _balances[to] += amount;
    emit Transfer(from, to, amount);
  }

  function _mint(address to, uint256 amount) internal {
    require(to != address(0), "ERC20: mint to the zero address");
    totalSupply += amount;
    _balances[to] += amount;
    emit Transfer(address(0), to, amount);
  }
}
`,
  ERC721: `abstract contract ERC721 {
  string public name;
  string public symbol;

  mapping(uint256 => address) private _owners;
  mapping(address => uint256) private _balances;

  event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

  constructor(string memory name_, string memory symbol_) {
    name = name_;
    symbol = symbol_;
  }

  function balanceOf(address account) public view returns (uint256) {
    require(account != address(0), "ERC721: zero address query");
    return _balances[account];
  }

  function ownerOf(uint256 tokenId) public view returns (address) {
    address tokenOwner = _owners[tokenId];
    require(tokenOwner != address(0), "ERC721: invalid token ID");
    return tokenOwner;
  }

  function _safeMint(address to, uint256 tokenId) internal {
    _mint(to, tokenId);
  }

  function _mint(address to, uint256 tokenId) internal {
    require(to != address(0), "ERC721: mint to the zero address");
    require(_owners[tokenId] == address(0), "ERC721: token already minted");
    _balances[to] += 1;
    _owners[tokenId] = to;
    emit Transfer(address(0), to, tokenId);
  }
}
`,
  ReentrancyGuard: `abstract contract ReentrancyGuard {
  uint256 private _status = 1;

  modifier nonReentrant() {
    require(_status == 1, "ReentrancyGuard: reentrant call");
    _status = 2;
    _;
    _status = 1;
  }
}
`,
};

SolidityGenerator.requiredSupportContracts = new Set();

// Helper: obtiene el código de un input de valor
function val(block, inputName) {
  return SolidityGenerator.valueToCode(block, inputName, SolidityGenerator.PRECEDENCE) || '0';
}

// Helper: obtiene el código de statements
function stmts(block, inputName) {
  return SolidityGenerator.statementToCode(block, inputName) || '';
}

function markSupportContract(name) {
  SolidityGenerator.requiredSupportContracts.add(name);
}

function solidityStringLiteral(value) {
  return JSON.stringify(value);
}

function extractFunctionDecorators(body) {
  const modifiers = [];
  const lines = body.split('\n');
  const keptLines = [];

  for (const line of lines) {
    if (line.includes(ONLY_OWNER_TOKEN)) {
      modifiers.push('onlyOwner');
      continue;
    }
    keptLines.push(line);
  }

  return {
    body: keptLines.join('\n'),
    modifiers: [...new Set(modifiers)],
  };
}

function extractContractMetadata(body) {
  const metadata = {
    erc20: null,
    erc721: null,
  };

  const lines = body.split('\n');
  const keptLines = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith(`// ${ERC20_META_TOKEN}`)) {
      const json = trimmed.slice(`// ${ERC20_META_TOKEN}`.length);
      metadata.erc20 = JSON.parse(json);
      continue;
    }

    if (trimmed.startsWith(`// ${ERC721_META_TOKEN}`)) {
      const json = trimmed.slice(`// ${ERC721_META_TOKEN}`.length);
      metadata.erc721 = JSON.parse(json);
      continue;
    }

    keptLines.push(line);
  }

  return {
    body: keptLines.join('\n'),
    metadata,
  };
}

function buildBaseInitializers(metadata) {
  const initializers = [];

  if (metadata.erc20) {
    initializers.push(`ERC20(${solidityStringLiteral(metadata.erc20.name)}, ${solidityStringLiteral(metadata.erc20.symbol)})`);
  }

  if (metadata.erc721) {
    initializers.push(`ERC721(${solidityStringLiteral(metadata.erc721.name)}, ${solidityStringLiteral(metadata.erc721.symbol)})`);
  }

  return initializers;
}

function injectBaseInitializers(body, initializers) {
  if (!initializers.length) {
    return body;
  }

  const initializerClause = initializers.join(' ');
  const constructorPattern = /constructor(\s*\([^)]*\))\s*\{/;

  if (constructorPattern.test(body)) {
    return body.replace(constructorPattern, `constructor$1 ${initializerClause} {`);
  }

  return `\n    constructor() ${initializerClause} {\n    }\n` + body;
}

function buildSupportCode() {
  const orderedContracts = ['Ownable', 'ERC20', 'ERC721', 'ReentrancyGuard'];
  return orderedContracts
    .filter(name => SolidityGenerator.requiredSupportContracts.has(name))
    .map(name => SUPPORT_CONTRACTS[name])
    .join('\n');
}

function injectSupportContracts(source, supportCode) {
  if (!supportCode) {
    return source;
  }

  const pragmaMatches = [...source.matchAll(/pragma solidity [^;]+;\n?/g)];
  if (!pragmaMatches.length) {
    return `${supportCode}\n${source}`;
  }

  const lastPragma = pragmaMatches[pragmaMatches.length - 1];
  const insertAt = lastPragma.index + lastPragma[0].length;
  return `${source.slice(0, insertAt)}\n${supportCode}\n${source.slice(insertAt)}`;
}

// ══════════════════════════════════════════════
// 1. CONTRATO
// ══════════════════════════════════════════════

SolidityGenerator['sol_license'] = function(block) {
  const lic = block.getFieldValue('LICENSE');
  return `// SPDX-License-Identifier: ${lic}\n`;
};

SolidityGenerator['sol_pragma'] = function(block) {
  const ver = block.getFieldValue('VERSION');
  return `pragma solidity ${ver};\n`;
};

SolidityGenerator['sol_contract'] = function(block) {
  const name    = block.getFieldValue('NAME');
  const inherits = block.getFieldValue('INHERITS').trim();
  let body    = stmts(block, 'BODY');

  if (/\bOwnable\b/.test(inherits)) {
    markSupportContract('Ownable');
  }
  if (/\bERC20\b/.test(inherits)) {
    markSupportContract('ERC20');
  }
  if (/\bERC721\b/.test(inherits)) {
    markSupportContract('ERC721');
  }
  if (/\bReentrancyGuard\b/.test(inherits)) {
    markSupportContract('ReentrancyGuard');
  }

  const extracted = extractContractMetadata(body);
  body = injectBaseInitializers(extracted.body, buildBaseInitializers(extracted.metadata));
  const isClause = inherits ? ` is ${inherits}` : '';
  return `contract ${name}${isClause} {\n${body}}\n`;
};

// ══════════════════════════════════════════════
// 2. VARIABLES DE ESTADO
// ══════════════════════════════════════════════

function makeStateVarGen(type) {
  SolidityGenerator[`sol_state_var_${type}`] = function(block) {
    const vis  = block.getFieldValue('VISIBILITY');
    const name = block.getFieldValue('NAME');
    return `    ${type} ${vis} ${name};\n`;
  };
}

['uint256','string','address','bool','bytes32'].forEach(makeStateVarGen);

SolidityGenerator['sol_state_var_mapping'] = function(block) {
  const k   = block.getFieldValue('KEY_TYPE');
  const v   = block.getFieldValue('VAL_TYPE');
  const vis = block.getFieldValue('VISIBILITY');
  const n   = block.getFieldValue('NAME');
  return `    mapping(${k} => ${v}) ${vis} ${n};\n`;
};

// ══════════════════════════════════════════════
// 3. FUNCIONES
// ══════════════════════════════════════════════

SolidityGenerator['sol_constructor'] = function(block) {
  const params = block.getFieldValue('PARAMS').trim();
  const extracted = extractFunctionDecorators(stmts(block, 'BODY'));
  const body   = extracted.body;
  const pStr   = params ? `(${params})` : '()';
  return `\n    constructor${pStr} {\n${body}    }\n`;
};

SolidityGenerator['sol_function'] = function(block) {
  const name    = block.getFieldValue('NAME');
  const params  = block.getFieldValue('PARAMS').trim();
  const vis     = block.getFieldValue('VISIBILITY');
  const returns = block.getFieldValue('RETURNS').trim();
  const extracted = extractFunctionDecorators(stmts(block, 'BODY'));
  const body    = extracted.body;
  const modifierStr = extracted.modifiers.length ? ` ${extracted.modifiers.join(' ')}` : '';
  const retStr  = returns ? ` returns (${returns})` : '';
  return `\n    function ${name}(${params}) ${vis}${modifierStr}${retStr} {\n${body}    }\n`;
};

SolidityGenerator['sol_function_view'] = function(block) {
  const name    = block.getFieldValue('NAME');
  const params  = block.getFieldValue('PARAMS').trim();
  const vis     = block.getFieldValue('VISIBILITY');
  const returns = block.getFieldValue('RETURNS').trim();
  const extracted = extractFunctionDecorators(stmts(block, 'BODY'));
  const body    = extracted.body;
  const modifierStr = extracted.modifiers.length ? ` ${extracted.modifiers.join(' ')}` : '';
  const retStr  = returns ? ` returns (${returns})` : '';
  return `\n    function ${name}(${params}) ${vis} view${modifierStr}${retStr} {\n${body}    }\n`;
};

SolidityGenerator['sol_function_payable'] = function(block) {
  const name   = block.getFieldValue('NAME');
  const params = block.getFieldValue('PARAMS').trim();
  const vis    = block.getFieldValue('VISIBILITY');
  const extracted = extractFunctionDecorators(stmts(block, 'BODY'));
  const body   = extracted.body;
  const modifierStr = extracted.modifiers.length ? ` ${extracted.modifiers.join(' ')}` : '';
  return `\n    function ${name}(${params}) ${vis} payable${modifierStr} {\n${body}    }\n`;
};

SolidityGenerator['sol_modifier'] = function(block) {
  const name = block.getFieldValue('NAME');
  const body = stmts(block, 'BODY');
  return `\n    modifier ${name}() {\n${body}        _;\n    }\n`;
};

// ══════════════════════════════════════════════
// 4. EVENTOS
// ══════════════════════════════════════════════

SolidityGenerator['sol_event'] = function(block) {
  const name   = block.getFieldValue('NAME');
  const params = block.getFieldValue('PARAMS').trim();
  return `    event ${name}(${params});\n`;
};

SolidityGenerator['sol_emit'] = function(block) {
  const name = block.getFieldValue('NAME');
  const args = block.getFieldValue('ARGS').trim();
  return `        emit ${name}(${args});\n`;
};

// ══════════════════════════════════════════════
// 5. SENTENCIAS
// ══════════════════════════════════════════════

SolidityGenerator['sol_assign'] = function(block) {
  const target = block.getFieldValue('TARGET');
  const op     = block.getFieldValue('OP');
  const value  = val(block, 'VALUE');
  return `        ${target} ${op} ${value};\n`;
};

SolidityGenerator['sol_require'] = function(block) {
  const cond = val(block, 'COND');
  const msg  = block.getFieldValue('MSG').replace(/"/g, '\\"');
  return `        require(${cond}, "${msg}");\n`;
};

SolidityGenerator['sol_if'] = function(block) {
  const cond = val(block, 'COND');
  const then = stmts(block, 'THEN');
  return `        if (${cond}) {\n${then}        }\n`;
};

SolidityGenerator['sol_return'] = function(block) {
  const value = val(block, 'VALUE');
  return `        return ${value};\n`;
};

SolidityGenerator['sol_mapping_set'] = function(block) {
  const map   = block.getFieldValue('MAP');
  const key   = block.getFieldValue('KEY');
  const op    = block.getFieldValue('OP');
  const value = val(block, 'VALUE');
  return `        ${map}[${key}] ${op} ${value};\n`;
};

SolidityGenerator['sol_mapping_get'] = function(block) {
  const map = block.getFieldValue('MAP');
  const key = block.getFieldValue('KEY');
  return [`${map}[${key}]`, SolidityGenerator.PRECEDENCE];
};

SolidityGenerator['sol_transfer'] = function(block) {
  const addr   = block.getFieldValue('ADDR');
  const amount = val(block, 'AMOUNT');
  return `        payable(${addr}).transfer(${amount});\n`;
};

SolidityGenerator['sol_msg_sender'] = function() {
  return ['msg.sender', SolidityGenerator.PRECEDENCE];
};

SolidityGenerator['sol_msg_value'] = function() {
  return ['msg.value', SolidityGenerator.PRECEDENCE];
};

// ══════════════════════════════════════════════
// 6. EXPRESIONES
// ══════════════════════════════════════════════

SolidityGenerator['sol_number'] = function(block) {
  const n = block.getFieldValue('NUM');
  return [String(n), SolidityGenerator.PRECEDENCE];
};

SolidityGenerator['sol_string_val'] = function(block) {
  const t = block.getFieldValue('TEXT').replace(/"/g, '\\"');
  return [`"${t}"`, SolidityGenerator.PRECEDENCE];
};

SolidityGenerator['sol_bool_val'] = function(block) {
  return [block.getFieldValue('BOOL'), SolidityGenerator.PRECEDENCE];
};

SolidityGenerator['sol_address_val'] = function(block) {
  const a = block.getFieldValue('ADDR');
  return [`address(${a})`, SolidityGenerator.PRECEDENCE];
};

SolidityGenerator['sol_arithmetic'] = function(block) {
  const a  = val(block, 'A');
  const b  = val(block, 'B');
  const op = block.getFieldValue('OP');
  return [`(${a} ${op} ${b})`, SolidityGenerator.PRECEDENCE];
};

SolidityGenerator['sol_compare'] = function(block) {
  const a  = val(block, 'A');
  const b  = val(block, 'B');
  const op = block.getFieldValue('OP').trim();
  return [`(${a} ${op} ${b})`, SolidityGenerator.PRECEDENCE];
};

SolidityGenerator['sol_logic_op'] = function(block) {
  const a  = val(block, 'A');
  const b  = val(block, 'B');
  const op = block.getFieldValue('OP');
  return [`(${a} ${op} ${b})`, SolidityGenerator.PRECEDENCE];
};

SolidityGenerator['sol_var_ref'] = function(block) {
  return [block.getFieldValue('NAME'), SolidityGenerator.PRECEDENCE];
};

SolidityGenerator['sol_param_ref'] = function(block) {
  return [block.getFieldValue('NAME'), SolidityGenerator.PRECEDENCE];
};

// ══════════════════════════════════════════════
// 7. ERC-20 HELPERS
// ══════════════════════════════════════════════

SolidityGenerator['sol_erc20_header'] = function(block) {
  const name   = block.getFieldValue('TOKEN_NAME');
  const symbol = block.getFieldValue('SYMBOL');
  markSupportContract('ERC20');
  return `    // ${ERC20_META_TOKEN}${JSON.stringify({ name, symbol })}\n`;
};

SolidityGenerator['sol_erc20_mint'] = function(block) {
  const to     = block.getFieldValue('TO');
  const amount = block.getFieldValue('AMOUNT');
  return `        _mint(${to}, ${amount} * 10 ** uint256(decimals));\n`;
};

SolidityGenerator['sol_erc20_transfer_logic'] = function() {
  return `        // lógica adicional antes de transferir\n        return super.transfer(to, amount);\n`;
};

// ══════════════════════════════════════════════
// 8. ERC-721 HELPERS
// ══════════════════════════════════════════════

SolidityGenerator['sol_erc721_header'] = function(block) {
  const name   = block.getFieldValue('NFT_NAME');
  const symbol = block.getFieldValue('SYMBOL');
  markSupportContract('ERC721');
  return `    // ${ERC721_META_TOKEN}${JSON.stringify({ name, symbol })}\n`;
};

SolidityGenerator['sol_erc721_mint'] = function(block) {
  const to  = block.getFieldValue('TO');
  const tid = block.getFieldValue('TOKEN_ID');
  return `        _safeMint(${to}, ${tid});\n`;
};

// ══════════════════════════════════════════════
// 9. SEGURIDAD
// ══════════════════════════════════════════════

SolidityGenerator['sol_ownable'] = function() {
  markSupportContract('Ownable');
  return '';
};

SolidityGenerator['sol_only_owner_modifier'] = function() {
  return `        // ${ONLY_OWNER_TOKEN}\n`;
};

SolidityGenerator['sol_reentrancy_guard'] = function() {
  markSupportContract('ReentrancyGuard');
  return '';
};

// ══════════════════════════════════════════════
// scrubNakedValue — Descarta valores sin usar
// ══════════════════════════════════════════════
SolidityGenerator.scrubNakedValue = function(line) {
  return `        ${line};\n`;
};

// ══════════════════════════════════════════════
// scrub_ — concatena el siguiente bloque en cadena
// ══════════════════════════════════════════════
SolidityGenerator.scrub_ = function(block, code, opt_thisOnly) {
  const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  let nextCode = '';
  if (nextBlock && !opt_thisOnly) {
    nextCode = SolidityGenerator.blockToCode(nextBlock);
  }
  return code + nextCode;
};

// ══════════════════════════════════════════════
// FUNCIÓN PRINCIPAL DE GENERACIÓN
// Recolecta todos los bloques top-level y los ensambla
// ══════════════════════════════════════════════
function generateSolidity(workspace) {
  const topBlocks = workspace.getTopBlocks(true);

  SolidityGenerator.requiredSupportContracts = new Set();

  const chunks = [];

  for (const block of topBlocks) {
    const code = SolidityGenerator.blockToCode(block);
    if (!code) continue;

    chunks.push(code.trimEnd());
  }

  if (!chunks.length) {
    return `// ⬅ Arrastra bloques y pulsa "Generar Solidity"\n// o escoge una plantilla rápida arriba.`;
  }

  const source = chunks.join('\n\n').trim();
  return injectSupportContracts(source, buildSupportCode()).trim();
}
