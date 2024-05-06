// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Etiketa {
    // Define a struct with two strings: publicData and privateData
    struct Form {
        string publicData;
        string privateData;
    }

    address private owner;
    // Mapping to store forms using a uint256 identifier, renamed from id to lote
    mapping(uint256 => Form) private forms;

    event FormCreated(uint256 lote, string publicData, string privateData);
    event FormUpdated(uint256 lote, string publicData, string privateData);

    constructor() {
        owner = msg.sender; // Set the contract deployer as the owner
    }

    // Modifier to restrict function access to the contract owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the contract owner can perform this action");
        _;
    }

    function createForm(uint256 _lote, string memory _publicData, string memory _privateData) public onlyOwner {
        require(bytes(forms[_lote].publicData).length == 0, "Form with this lote already exists");
        forms[_lote] = Form(_publicData, _privateData);
        emit FormCreated(_lote, _publicData, _privateData);
    }

    function updateForm(uint256 _lote, string memory _publicData, string memory _privateData) public onlyOwner {
        require(bytes(forms[_lote].publicData).length != 0, "Form does not exist");
        forms[_lote] = Form(_publicData, _privateData);
        emit FormUpdated(_lote, _publicData, _privateData);
    }
    // Function to retrieve form data by its lote
    function getForm(uint256 _lote) public view returns (string memory, string memory) {
        require(bytes(forms[_lote].publicData).length != 0, "Form does not exist");
        Form memory form = forms[_lote];
        return (form.publicData, form.privateData);
    }
}
