// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract FormakuntzaBFPEv2 is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    uint256 private _nextTokenId;

    // Mapping from token ID to additional text information
    mapping(uint256 => string) private _tokenTextInfo;

    constructor(address initialOwner)
        ERC721("FormakuntzaBFPE", "FBFPE")
        Ownable(initialOwner)
    {}

    function safeMint(address to, string memory uri, string memory textInfo) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _setTokenTextInfo(tokenId, textInfo);
        return tokenId;
    }

    function batchSafeMint(address to, string[] memory uris, string[] memory textInfos) public onlyOwner returns (uint256[] memory) {
        require(uris.length == textInfos.length, "Arrays length mismatch");

        uint256[] memory mintedIds = new uint256[](uris.length);

        for (uint256 i = 0; i < uris.length; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
            _setTokenURI(tokenId, uris[i]);
            _setTokenTextInfo(tokenId, textInfos[i]);
            mintedIds[i] = tokenId;
        }

        return mintedIds;
    }

    // -----------------------------
    // Función para migración / ID explícito
    // -----------------------------
    function mintWithId(address to, uint256 tokenId, string memory uri, string memory textInfo) public onlyOwner {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _setTokenTextInfo(tokenId, textInfo);
        if (tokenId >= _nextTokenId) {
                _nextTokenId = tokenId + 1;
            }
    }

    function _setTokenTextInfo(uint256 tokenId, string memory textInfo) internal virtual {
         _tokenTextInfo[tokenId] = textInfo; // Token existe → actualizar
    }

    function tokenTextInfo(uint256 tokenId) public view returns (string memory) {
        return _tokenTextInfo[tokenId]; // Token existe → devolver info
    }

    // Function to get the next token ID
    function getNextTokenId() public view returns (uint256) {
        return _nextTokenId;
    }

    // The following functions are overrides required by Solidity.

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}