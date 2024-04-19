// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EtiketaPrivate {

    address private owner;
    mapping(uint256 => string) private formsJson;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the contract owner can perform this action");
        _;
    }

    function createForm(uint256 _lote, string memory _formJson) public onlyOwner {
        require(bytes(formsJson[_lote]).length == 0, "Form with this lote already exists");
        formsJson[_lote] = _formJson;
    }

    function getForm(uint256 _lote) public view returns (string memory) {
        require(bytes(formsJson[_lote]).length != 0, "Form does not exist");
        return formsJson[_lote];
    }

    function updateForm(uint256 _lote, string memory _formJson) public onlyOwner {
        require(bytes(formsJson[_lote]).length != 0, "Form does not exist");
        formsJson[_lote] = _formJson;
    }
}