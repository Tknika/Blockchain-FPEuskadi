// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "openzeppelin-v4.9.3/utils/introspection/IERC165.sol";
import "openzeppelin-v4.9.3/token/ERC721/IERC721.sol";
import "openzeppelin-v4.9.3/token/ERC721/IERC721Receiver.sol";
import "openzeppelin-v4.9.3/token/ERC721/extensions/IERC721Metadata.sol";
import "openzeppelin-v4.9.3/utils/Address.sol";
import "openzeppelin-v4.9.3/utils/Context.sol";
import "openzeppelin-v4.9.3/utils/math/Math.sol";
import "openzeppelin-v4.9.3/utils/math/SignedMath.sol";
import "openzeppelin-v4.9.3/utils/Strings.sol";
import "openzeppelin-v4.9.3/utils/introspection/ERC165.sol";
import "openzeppelin-v4.9.3/token/ERC721/ERC721.sol";
import "openzeppelin-v4.9.3/token/ERC721/extensions/ERC721Enumerable.sol";
import "openzeppelin-v4.9.3/token/ERC721/extensions/ERC721URIStorage.sol";
import "openzeppelin-v4.9.3/security/Pausable.sol";
import "openzeppelin-v4.9.3/access/AccessControl.sol";
import "openzeppelin-v4.9.3/token/ERC721/extensions/ERC721Burnable.sol";
import "openzeppelin-v4.9.3/utils/Counters.sol";

/// @custom:security-contact ander.lo@icjardin.com
contract Ziurtagiriak is ERC721, ERC721Enumerable, ERC721URIStorage, Pausable, AccessControl, ERC721Burnable {
    using Counters for Counters.Counter;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    Counters.Counter private _tokenIdCounter;

    constructor() ERC721("Ziurtagiriak", "ZFP") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function safeMint(address to, string memory uri) public onlyRole(MINTER_ROLE) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        whenNotPaused
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    // The following functions are overrides required by Solidity.

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}