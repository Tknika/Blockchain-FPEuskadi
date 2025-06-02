// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import {ERC721} from "openzeppelin-v5.3.0/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "openzeppelin-v5.3.0/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721Enumerable} from "openzeppelin-v5.3.0/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "openzeppelin-v5.3.0/access/Ownable.sol";

contract FormakuntzaBFPE is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
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

    function _setTokenTextInfo(uint256 tokenId, string memory textInfo) internal virtual {
        //require(_exists(tokenId), "ERC721: Text info set of nonexistent token");
        _tokenTextInfo[tokenId] = textInfo;
    }

    function tokenTextInfo(uint256 tokenId) public view returns (string memory) {
        //require(_exists(tokenId), "ERC721: Text info query for nonexistent token");
        return _tokenTextInfo[tokenId];
    }

    // Function to get the next tokenId
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