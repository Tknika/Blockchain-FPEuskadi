// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Etiketa {
    struct Form {
        string responsable;
        uint256 lote;
        uint256 fechaElaboracion;
    }

    address private owner;
    mapping(uint256 => Form) private forms;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the contract owner can perform this action");
        _;
    }

    function createForm(string memory _responsable, uint256 _lote, uint256 _fechaElaboracion) public onlyOwner {
        require(forms[_lote].lote == 0, "Form with this lote already exists");
        forms[_lote] = Form(_responsable, _lote, _fechaElaboracion);
    }

    function getForm(uint256 _lote) public view returns (string memory, uint256, uint256) {
        require(forms[_lote].lote != 0, "Form does not exist");
        Form memory form = forms[_lote];
        return (form.responsable, form.lote, form.fechaElaboracion);
    }

    function updateForm(string memory _responsable, uint256 _lote, uint256 _fechaElaboracion) public onlyOwner {
        require(forms[_lote].lote != 0, "Form does not exist");
        forms[_lote] = Form(_responsable, _lote, _fechaElaboracion);
    }
}