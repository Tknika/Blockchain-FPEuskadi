/* ═══════════════════════════════════════════════════════════════
   blocks.js — Definición de bloques Blockly personalizados
   para construir Smart Contracts en Solidity
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ──────────────────────────────────────────────
// HELPERS DE COLOR (Blockly usa HSV hue 0-360)
// ──────────────────────────────────────────────
const COLORS = {
  contract:   230,  // índigo
  stateVar:   270,  // violeta
  function_:  200,  // azul cielo
  event:      45,   // ámbar
  statement:  160,  // esmeralda
  expression: 0,    // rojo
  erc20:      35,   // naranja
  erc721:     320,  // rosa
  security:   210,  // gris azulado
};

// ══════════════════════════════════════════════
// 1. BLOQUES DE CONTRATO
// ══════════════════════════════════════════════

// Pragma
Blockly.Blocks['sol_pragma'] = {
  init() {
    this.appendDummyInput()
      .appendField('pragma solidity')
      .appendField(new Blockly.FieldDropdown([
        ['^0.8.20', '^0.8.20'],
        ['^0.8.19', '^0.8.19'],
        ['^0.8.0',  '^0.8.0'],
        ['^0.7.0',  '^0.7.0'],
      ]), 'VERSION');
    this.setColour(COLORS.contract);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Declara la versión del compilador Solidity requerida.');
    this.setHelpUrl('https://docs.soliditylang.org/en/latest/layout-of-source-files.html#pragma');
  }
};

// License
Blockly.Blocks['sol_license'] = {
  init() {
    this.appendDummyInput()
      .appendField('// SPDX-License-Identifier:')
      .appendField(new Blockly.FieldDropdown([
        ['MIT',         'MIT'],
        ['GPL-3.0',     'GPL-3.0'],
        ['Apache-2.0',  'Apache-2.0'],
        ['UNLICENSED',  'UNLICENSED'],
      ]), 'LICENSE');
    this.setColour(COLORS.contract);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Identificador de licencia SPDX, obligatorio en Solidity ≥0.6.8.');
  }
};

// Contract root block
Blockly.Blocks['sol_contract'] = {
  init() {
    this.appendDummyInput()
      .appendField('contract')
      .appendField(new Blockly.FieldTextInput('MiContrato'), 'NAME')
      .appendField('is')
      .appendField(new Blockly.FieldTextInput(''), 'INHERITS');
    this.appendStatementInput('BODY')
      .setCheck(null)
      .appendField('cuerpo');
    this.setColour(COLORS.contract);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Bloque principal del contrato. Inserta aquí variables, funciones y eventos.');
    this.setHelpUrl('https://docs.soliditylang.org/en/latest/contracts.html');
  }
};

// ══════════════════════════════════════════════
// 2. VARIABLES DE ESTADO
// ══════════════════════════════════════════════

function makeStateVar(type, defaultName) {
  Blockly.Blocks[`sol_state_var_${type}`] = {
    init() {
      this.appendDummyInput()
        .appendField(type)
        .appendField(new Blockly.FieldDropdown([
          ['public',  'public'],
          ['private', 'private'],
          ['internal','internal'],
        ]), 'VISIBILITY')
        .appendField(new Blockly.FieldTextInput(defaultName), 'NAME');
      this.setColour(COLORS.stateVar);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip(`Variable de estado de tipo ${type}.`);
    }
  };
}

makeStateVar('uint256', 'contador');
makeStateVar('string',  'mensaje');
makeStateVar('address', 'propietario');
makeStateVar('bool',    'activo');
makeStateVar('bytes32', 'hash');

// Mapping
Blockly.Blocks['sol_state_var_mapping'] = {
  init() {
    this.appendDummyInput()
      .appendField('mapping(')
      .appendField(new Blockly.FieldDropdown([
        ['address','address'],['uint256','uint256'],['bytes32','bytes32']
      ]), 'KEY_TYPE')
      .appendField('=>')
      .appendField(new Blockly.FieldDropdown([
        ['uint256','uint256'],['bool','bool'],['address','address'],['string','string']
      ]), 'VAL_TYPE')
      .appendField(')')
      .appendField(new Blockly.FieldDropdown([
        ['public','public'],['private','private'],['internal','internal']
      ]), 'VISIBILITY')
      .appendField(new Blockly.FieldTextInput('saldos'), 'NAME');
    this.setColour(COLORS.stateVar);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Mapping: tabla hash de clave→valor.');
  }
};

// ══════════════════════════════════════════════
// 3. FUNCIONES
// ══════════════════════════════════════════════

// Constructor
Blockly.Blocks['sol_constructor'] = {
  init() {
    this.appendDummyInput()
      .appendField('constructor(')
      .appendField(new Blockly.FieldTextInput(''), 'PARAMS')
      .appendField(')');
    this.appendStatementInput('BODY').setCheck(null).appendField('código');
    this.setColour(COLORS.function_);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Se ejecuta una sola vez al desplegar el contrato.');
  }
};

// Function normal
Blockly.Blocks['sol_function'] = {
  init() {
    this.appendDummyInput()
      .appendField('function')
      .appendField(new Blockly.FieldTextInput('miFuncion'), 'NAME')
      .appendField('(')
      .appendField(new Blockly.FieldTextInput(''), 'PARAMS')
      .appendField(')')
      .appendField(new Blockly.FieldDropdown([
        ['public',   'public'],
        ['external', 'external'],
        ['internal', 'internal'],
        ['private',  'private'],
      ]), 'VISIBILITY');
    this.appendDummyInput()
      .appendField('returns (')
      .appendField(new Blockly.FieldTextInput(''), 'RETURNS')
      .appendField(')');
    this.appendStatementInput('BODY').setCheck(null).appendField('código');
    this.setColour(COLORS.function_);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Función que puede modificar el estado del contrato.');
  }
};

// View function
Blockly.Blocks['sol_function_view'] = {
  init() {
    this.appendDummyInput()
      .appendField('function')
      .appendField(new Blockly.FieldTextInput('obtener'), 'NAME')
      .appendField('(')
      .appendField(new Blockly.FieldTextInput(''), 'PARAMS')
      .appendField(')')
      .appendField(new Blockly.FieldDropdown([
        ['public','public'],['external','external'],['internal','internal']
      ]), 'VISIBILITY')
      .appendField('view');
    this.appendDummyInput()
      .appendField('returns (')
      .appendField(new Blockly.FieldTextInput('uint256'), 'RETURNS')
      .appendField(')');
    this.appendStatementInput('BODY').setCheck(null).appendField('código');
    this.setColour(COLORS.function_);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Función de sólo lectura: no gasta gas al llamarse off-chain.');
  }
};

// Payable function
Blockly.Blocks['sol_function_payable'] = {
  init() {
    this.appendDummyInput()
      .appendField('function')
      .appendField(new Blockly.FieldTextInput('depositar'), 'NAME')
      .appendField('(')
      .appendField(new Blockly.FieldTextInput(''), 'PARAMS')
      .appendField(')')
      .appendField(new Blockly.FieldDropdown([
        ['public','public'],['external','external']
      ]), 'VISIBILITY')
      .appendField('payable');
    this.appendStatementInput('BODY').setCheck(null).appendField('código');
    this.setColour(COLORS.function_);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Función payable: puede recibir Ether.');
  }
};

// Modifier
Blockly.Blocks['sol_modifier'] = {
  init() {
    this.appendDummyInput()
      .appendField('modifier')
      .appendField(new Blockly.FieldTextInput('soloOwner'), 'NAME')
      .appendField('(');
    this.appendDummyInput().appendField(')');
    this.appendStatementInput('BODY').setCheck(null).appendField('código');
    this.setColour(COLORS.function_);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Modifier: pre/post condición reutilizable para funciones.');
  }
};

// ══════════════════════════════════════════════
// 4. EVENTOS
// ══════════════════════════════════════════════

Blockly.Blocks['sol_event'] = {
  init() {
    this.appendDummyInput()
      .appendField('event')
      .appendField(new Blockly.FieldTextInput('Transferencia'), 'NAME')
      .appendField('(')
      .appendField(new Blockly.FieldTextInput('address indexed from, address indexed to, uint256 value'), 'PARAMS')
      .appendField(')');
    this.setColour(COLORS.event);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Declara un evento que se emite al blockchain (logs).');
  }
};

Blockly.Blocks['sol_emit'] = {
  init() {
    this.appendDummyInput()
      .appendField('emit')
      .appendField(new Blockly.FieldTextInput('Transferencia'), 'NAME')
      .appendField('(')
      .appendField(new Blockly.FieldTextInput('msg.sender, to, amount'), 'ARGS')
      .appendField(')');
    this.setColour(COLORS.event);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Emite un evento declarado previamente.');
  }
};

// ══════════════════════════════════════════════
// 5. SENTENCIAS
// ══════════════════════════════════════════════

// Asignación
Blockly.Blocks['sol_assign'] = {
  init() {
    this.appendValueInput('VALUE')
      .appendField(new Blockly.FieldTextInput('variable'), 'TARGET')
      .appendField(new Blockly.FieldDropdown([
        ['=','='],['+=','+='],[ '-=','-='],['*=','*=']
      ]), 'OP');
    this.setColour(COLORS.statement);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Asigna un valor a una variable.');
  }
};

// require
Blockly.Blocks['sol_require'] = {
  init() {
    this.appendValueInput('COND')
      .appendField('require (');
    this.appendDummyInput()
      .appendField(', "')
      .appendField(new Blockly.FieldTextInput('Error: condición no cumplida'), 'MSG')
      .appendField('" )');
    this.setColour(COLORS.statement);
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Lanza un error y revierte la transacción si la condición es falsa.');
  }
};

// if
Blockly.Blocks['sol_if'] = {
  init() {
    this.appendValueInput('COND').appendField('if (');
    this.appendDummyInput().appendField(') {');
    this.appendStatementInput('THEN').setCheck(null);
    this.appendDummyInput().appendField('}');
    this.setColour(COLORS.statement);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Condicional if.');
  }
};

// return
Blockly.Blocks['sol_return'] = {
  init() {
    this.appendValueInput('VALUE').appendField('return');
    this.setColour(COLORS.statement);
    this.setPreviousStatement(true, null);
    this.setTooltip('Retorna un valor desde una función.');
  }
};

// mapping set
Blockly.Blocks['sol_mapping_set'] = {
  init() {
    this.appendDummyInput()
      .appendField(new Blockly.FieldTextInput('saldos'), 'MAP')
      .appendField('[')
      .appendField(new Blockly.FieldTextInput('msg.sender'), 'KEY')
      .appendField(']')
      .appendField(new Blockly.FieldDropdown([
        ['=','='],['+=','+='],[ '-=','-=']
      ]), 'OP');
    this.appendValueInput('VALUE');
    this.setColour(COLORS.statement);
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Escribe un valor en un mapping.');
  }
};

// mapping get (expression)
Blockly.Blocks['sol_mapping_get'] = {
  init() {
    this.appendDummyInput()
      .appendField(new Blockly.FieldTextInput('saldos'), 'MAP')
      .appendField('[')
      .appendField(new Blockly.FieldTextInput('msg.sender'), 'KEY')
      .appendField(']');
    this.setOutput(true, null);
    this.setColour(COLORS.statement);
    this.setTooltip('Lee un valor de un mapping.');
  }
};

// transfer Ether
Blockly.Blocks['sol_transfer'] = {
  init() {
    this.appendDummyInput()
      .appendField(new Blockly.FieldTextInput('destinatario'), 'ADDR')
      .appendField('.transfer(');
    this.appendValueInput('AMOUNT');
    this.appendDummyInput().appendField(')');
    this.setColour(COLORS.statement);
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Transfiere Ether a una dirección.');
  }
};

// msg.sender
Blockly.Blocks['sol_msg_sender'] = {
  init() {
    this.appendDummyInput().appendField('msg.sender');
    this.setOutput(true, null);
    this.setColour(COLORS.statement);
    this.setTooltip('Dirección de quien llama la función actual.');
  }
};

// msg.value
Blockly.Blocks['sol_msg_value'] = {
  init() {
    this.appendDummyInput().appendField('msg.value');
    this.setOutput(true, null);
    this.setColour(COLORS.statement);
    this.setTooltip('Cantidad de Wei enviado en la transacción actual.');
  }
};

// ══════════════════════════════════════════════
// 6. EXPRESIONES / VALORES
// ══════════════════════════════════════════════

Blockly.Blocks['sol_number'] = {
  init() {
    this.appendDummyInput()
      .appendField(new Blockly.FieldNumber(0), 'NUM');
    this.setOutput(true, null);
    this.setColour(COLORS.expression);
    this.setTooltip('Número literal.');
  }
};

Blockly.Blocks['sol_string_val'] = {
  init() {
    this.appendDummyInput()
      .appendField('"')
      .appendField(new Blockly.FieldTextInput('Hola mundo'), 'TEXT')
      .appendField('"');
    this.setOutput(true, null);
    this.setColour(COLORS.expression);
    this.setTooltip('Cadena de texto literal.');
  }
};

Blockly.Blocks['sol_bool_val'] = {
  init() {
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([['true','true'],['false','false']]), 'BOOL');
    this.setOutput(true, null);
    this.setColour(COLORS.expression);
    this.setTooltip('Valor booleano (verdadero/falso).');
  }
};

Blockly.Blocks['sol_address_val'] = {
  init() {
    this.appendDummyInput()
      .appendField('address(')
      .appendField(new Blockly.FieldTextInput('0x000...'), 'ADDR')
      .appendField(')');
    this.setOutput(true, null);
    this.setColour(COLORS.expression);
    this.setTooltip('Dirección Ethereum literal.');
  }
};

Blockly.Blocks['sol_arithmetic'] = {
  init() {
    this.appendValueInput('A');
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([
        ['+','+'],['-','-'],['*','*'],['/','/'],['%','%']
      ]), 'OP');
    this.appendValueInput('B');
    this.setOutput(true, null);
    this.setColour(COLORS.expression);
    this.setInputsInline(true);
    this.setTooltip('Operación aritmética.');
  }
};

Blockly.Blocks['sol_compare'] = {
  init() {
    this.appendValueInput('A');
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([
        ['==','=='],['!=','!='],['<','<'],['<=','<='],
        ['>','>'],['>=',' >=']
      ]), 'OP');
    this.appendValueInput('B');
    this.setOutput(true, null);
    this.setColour(COLORS.expression);
    this.setInputsInline(true);
    this.setTooltip('Comparación entre dos valores.');
  }
};

Blockly.Blocks['sol_logic_op'] = {
  init() {
    this.appendValueInput('A');
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([
        ['&&','&&'],['||','||']
      ]), 'OP');
    this.appendValueInput('B');
    this.setOutput(true, null);
    this.setColour(COLORS.expression);
    this.setInputsInline(true);
    this.setTooltip('Operador lógico AND / OR.');
  }
};

Blockly.Blocks['sol_var_ref'] = {
  init() {
    this.appendDummyInput()
      .appendField(new Blockly.FieldTextInput('miVariable'), 'NAME');
    this.setOutput(true, null);
    this.setColour(COLORS.expression);
    this.setTooltip('Referencia a una variable de estado.');
  }
};

Blockly.Blocks['sol_param_ref'] = {
  init() {
    this.appendDummyInput()
      .appendField('param:')
      .appendField(new Blockly.FieldTextInput('amount'), 'NAME');
    this.setOutput(true, null);
    this.setColour(COLORS.expression);
    this.setTooltip('Referencia a un parámetro de función.');
  }
};

// ══════════════════════════════════════════════
// 7. ERC-20 HELPERS
// ══════════════════════════════════════════════

Blockly.Blocks['sol_erc20_header'] = {
  init() {
    this.appendDummyInput()
      .appendField('📦 Añadir base ERC20 integrada');
    this.appendDummyInput()
      .appendField('Nombre token:')
      .appendField(new Blockly.FieldTextInput('MiToken'), 'TOKEN_NAME');
    this.appendDummyInput()
      .appendField('Símbolo:')
      .appendField(new Blockly.FieldTextInput('MTK'), 'SYMBOL');
    this.setColour(COLORS.erc20);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Genera la metadata necesaria para un token ERC-20 compilable en local.');
  }
};

Blockly.Blocks['sol_erc20_mint'] = {
  init() {
    this.appendDummyInput()
      .appendField('_mint(')
      .appendField(new Blockly.FieldTextInput('msg.sender'), 'TO')
      .appendField(',')
      .appendField(new Blockly.FieldTextInput('1000000'), 'AMOUNT')
      .appendField('* 10**decimals())');
    this.setColour(COLORS.erc20);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Acuña (mint) tokens ERC-20. Úsalo dentro del constructor.');
  }
};

Blockly.Blocks['sol_erc20_transfer_logic'] = {
  init() {
    this.appendDummyInput()
      .appendField('function transfer override');
    this.appendDummyInput()
      .appendField('  → llama a super.transfer(to, amount)');
    this.setColour(COLORS.erc20);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Override de transfer ERC-20 con lógica adicional.');
  }
};

// ══════════════════════════════════════════════
// 8. ERC-721 HELPERS
// ══════════════════════════════════════════════

Blockly.Blocks['sol_erc721_header'] = {
  init() {
    this.appendDummyInput()
      .appendField('📦 Añadir base ERC721 integrada');
    this.appendDummyInput()
      .appendField('Nombre NFT:')
      .appendField(new Blockly.FieldTextInput('MiNFT'), 'NFT_NAME');
    this.appendDummyInput()
      .appendField('Símbolo:')
      .appendField(new Blockly.FieldTextInput('MNFT'), 'SYMBOL');
    this.setColour(COLORS.erc721);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Genera la metadata necesaria para un NFT ERC-721 compilable en local.');
  }
};

Blockly.Blocks['sol_erc721_mint'] = {
  init() {
    this.appendDummyInput()
      .appendField('_safeMint(')
      .appendField(new Blockly.FieldTextInput('to'), 'TO')
      .appendField(',')
      .appendField(new Blockly.FieldTextInput('tokenId'), 'TOKEN_ID')
      .appendField(')');
    this.setColour(COLORS.erc721);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Acuña (mint) un NFT ERC-721.');
  }
};

// ══════════════════════════════════════════════
// 9. SEGURIDAD / OWNABLE
// ══════════════════════════════════════════════

Blockly.Blocks['sol_ownable'] = {
  init() {
    this.appendDummyInput()
      .appendField('🛡 Añadir Ownable integrado');
    this.setColour(COLORS.security);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Añade una base Ownable local para restringir funciones al propietario del contrato.');
  }
};

Blockly.Blocks['sol_only_owner_modifier'] = {
  init() {
    this.appendDummyInput()
      .appendField('onlyOwner  ← añadir a función');
    this.setColour(COLORS.security);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Indica que la siguiente función sólo puede ser llamada por el owner. Colócalo dentro del cuerpo de la función como recordatorio.');
  }
};

Blockly.Blocks['sol_reentrancy_guard'] = {
  init() {
    this.appendDummyInput()
      .appendField('🛡 Añadir ReentrancyGuard integrado');
    this.setColour(COLORS.security);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip('Añade una base ReentrancyGuard local para proteger contra ataques de reentrada.');
  }
};
