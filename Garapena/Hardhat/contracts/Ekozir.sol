// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Ekozir - Private Encrypted Messaging Groups
 * @dev Smart contract for creating private groups where members can share encrypted messages
 * @author Blockchain-FPEuskadi
 */
contract Ekozir {
    // Struct to represent a private group
    struct Group {
        uint256 id;
        string name;
        address creator;
        address[] members;
        mapping(address => bool) isMember;
        mapping(address => string) memberPublicKeys; // Optional: store public keys for encryption
        uint256 messageCount;
        bool exists;
        uint256 createdAt;
    }
    
    // Struct to represent an encrypted message
    struct Message {
        uint256 id;
        uint256 groupId;
        address sender;
        string encryptedContent; // Encrypted message content (encrypted with symmetric key)
        mapping(address => string) encryptedKeys; // Symmetric key encrypted for each member
        address[] keyRecipients; // Addresses for whom keys are encrypted
        uint256 timestamp;
        bytes32 messageHash; // Hash for integrity verification
    }
    
    // State variables
    uint256 private _groupCounter;
    uint256 private _messageCounter;
    
    mapping(uint256 => Group) public groups;
    mapping(uint256 => Message) public messages;
    mapping(uint256 => uint256[]) public groupMessages; // groupId => messageIds[]
    mapping(address => uint256[]) public userGroups; // user => groupIds[]
    mapping(address => string) public userPublicKeys; // user => publicKey
    
    // Events
    event GroupCreated(uint256 indexed groupId, string name, address indexed creator, uint256 timestamp);
    event MemberAdded(uint256 indexed groupId, address indexed member, address indexed addedBy);
    event MemberRemoved(uint256 indexed groupId, address indexed member, address indexed removedBy);
    event MessageSent(uint256 indexed messageId, uint256 indexed groupId, address indexed sender, uint256 timestamp);
    event PublicKeyUpdated(address indexed user, string publicKey);
    
    // Modifiers
    modifier groupExists(uint256 _groupId) {
        require(groups[_groupId].exists, "Group does not exist");
        _;
    }
    
    modifier onlyGroupMember(uint256 _groupId) {
        require(groups[_groupId].isMember[msg.sender], "Not a group member");
        _;
    }
    
    modifier onlyGroupCreator(uint256 _groupId) {
        require(groups[_groupId].creator == msg.sender, "Only group creator can perform this action");
        _;
    }
    
    /**
     * @dev Set or update user's public key for encryption purposes
     * @param _publicKey The user's public key in string format
     */
    function setPublicKey(string memory _publicKey) external {
        require(bytes(_publicKey).length > 0, "Public key cannot be empty");
        userPublicKeys[msg.sender] = _publicKey;
        emit PublicKeyUpdated(msg.sender, _publicKey);
    }
    
    /**
     * @dev Create a new private group
     * @param _name Name of the group
     * @param _initialMembers Array of initial member addresses (optional)
     * @return groupId The ID of the newly created group
     */
    function createGroup(string memory _name, address[] memory _initialMembers) external returns (uint256) {
        require(bytes(_name).length > 0, "Group name cannot be empty");
        
        _groupCounter++;
        uint256 newGroupId = _groupCounter;
        
        Group storage newGroup = groups[newGroupId];
        newGroup.id = newGroupId;
        newGroup.name = _name;
        newGroup.creator = msg.sender;
        newGroup.exists = true;
        newGroup.createdAt = block.timestamp;
        
        // Add creator as first member
        newGroup.members.push(msg.sender);
        newGroup.isMember[msg.sender] = true;
        userGroups[msg.sender].push(newGroupId);
        
        // Add creator's public key if available
        if (bytes(userPublicKeys[msg.sender]).length > 0) {
            newGroup.memberPublicKeys[msg.sender] = userPublicKeys[msg.sender];
        }
        
        // Add initial members
        for (uint256 i = 0; i < _initialMembers.length; i++) {
            address member = _initialMembers[i];
            if (member != msg.sender && member != address(0) && !newGroup.isMember[member]) {
                newGroup.members.push(member);
                newGroup.isMember[member] = true;
                userGroups[member].push(newGroupId);
                
                // Add member's public key if available
                if (bytes(userPublicKeys[member]).length > 0) {
                    newGroup.memberPublicKeys[member] = userPublicKeys[member];
                }
                
                emit MemberAdded(newGroupId, member, msg.sender);
            }
        }
        
        emit GroupCreated(newGroupId, _name, msg.sender, block.timestamp);
        return newGroupId;
    }
    
    /**
     * @dev Add a member to an existing group
     * @param _groupId The ID of the group
     * @param _member Address of the member to add
     */
    function addMember(uint256 _groupId, address _member) external groupExists(_groupId) onlyGroupCreator(_groupId) {
        require(_member != address(0), "Invalid member address");
        require(!groups[_groupId].isMember[_member], "Address is already a member");
        
        Group storage group = groups[_groupId];
        group.members.push(_member);
        group.isMember[_member] = true;
        userGroups[_member].push(_groupId);
        
        // Add member's public key if available
        if (bytes(userPublicKeys[_member]).length > 0) {
            group.memberPublicKeys[_member] = userPublicKeys[_member];
        }
        
        emit MemberAdded(_groupId, _member, msg.sender);
    }
    
    /**
     * @dev Remove a member from a group
     * @param _groupId The ID of the group
     * @param _member Address of the member to remove
     */
    function removeMember(uint256 _groupId, address _member) external groupExists(_groupId) onlyGroupCreator(_groupId) {
        require(_member != groups[_groupId].creator, "Cannot remove group creator");
        require(groups[_groupId].isMember[_member], "Address is not a member");
        
        Group storage group = groups[_groupId];
        group.isMember[_member] = false;
        
        // Remove from members array
        for (uint256 i = 0; i < group.members.length; i++) {
            if (group.members[i] == _member) {
                group.members[i] = group.members[group.members.length - 1];
                group.members.pop();
                break;
            }
        }
        
        // Remove from user's groups
        uint256[] storage userGroupsList = userGroups[_member];
        for (uint256 i = 0; i < userGroupsList.length; i++) {
            if (userGroupsList[i] == _groupId) {
                userGroupsList[i] = userGroupsList[userGroupsList.length - 1];
                userGroupsList.pop();
                break;
            }
        }
        
        // Remove public key from group
        delete group.memberPublicKeys[_member];
        
        emit MemberRemoved(_groupId, _member, msg.sender);
    }
    
    /**
     * @dev Send an encrypted message to a group
     * @param _groupId The ID of the group
     * @param _encryptedContent The encrypted message content (encrypted with symmetric key)
     * @param _recipients Array of recipient addresses
     * @param _encryptedKeys Array of symmetric keys encrypted for each recipient
     * @param _messageHash Hash of the original message for integrity
     */
    function sendMessage(
        uint256 _groupId,
        string memory _encryptedContent,
        address[] memory _recipients,
        string[] memory _encryptedKeys,
        bytes32 _messageHash
    ) external groupExists(_groupId) onlyGroupMember(_groupId) {
        require(bytes(_encryptedContent).length > 0, "Message content cannot be empty");
        require(_recipients.length == _encryptedKeys.length, "Recipients and keys arrays must have same length");
        require(_recipients.length > 0, "Must have at least one recipient");
        
        // Verify all recipients are group members
        Group storage group = groups[_groupId];
        for (uint256 i = 0; i < _recipients.length; i++) {
            require(group.isMember[_recipients[i]], "All recipients must be group members");
            require(bytes(_encryptedKeys[i]).length > 0, "Encrypted key cannot be empty");
        }
        
        _messageCounter++;
        uint256 newMessageId = _messageCounter;
        
        Message storage newMessage = messages[newMessageId];
        newMessage.id = newMessageId;
        newMessage.groupId = _groupId;
        newMessage.sender = msg.sender;
        newMessage.encryptedContent = _encryptedContent;
        newMessage.timestamp = block.timestamp;
        newMessage.messageHash = _messageHash;
        
        // Store encrypted keys for each recipient
        for (uint256 i = 0; i < _recipients.length; i++) {
            newMessage.encryptedKeys[_recipients[i]] = _encryptedKeys[i];
            newMessage.keyRecipients.push(_recipients[i]);
        }
        
        // Add to group messages
        groupMessages[_groupId].push(newMessageId);
        groups[_groupId].messageCount++;
        
        emit MessageSent(newMessageId, _groupId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Get group information
     * @param _groupId The ID of the group
     * @return id Group ID
     * @return name Group name
     * @return creator Group creator address
     * @return members Array of member addresses
     * @return messageCount Number of messages in the group
     * @return createdAt Group creation timestamp
     */
    function getGroup(uint256 _groupId) external view groupExists(_groupId) returns (
        uint256 id,
        string memory name,
        address creator,
        address[] memory members,
        uint256 messageCount,
        uint256 createdAt
    ) {
        Group storage group = groups[_groupId];
        return (
            group.id,
            group.name,
            group.creator,
            group.members,
            group.messageCount,
            group.createdAt
        );
    }
    
    /**
     * @dev Get member's public key within a group
     * @param _groupId The ID of the group
     * @param _member Address of the member
     * @return publicKey The member's public key
     */
    function getMemberPublicKey(uint256 _groupId, address _member) external view 
        groupExists(_groupId) onlyGroupMember(_groupId) returns (string memory) {
        require(groups[_groupId].isMember[_member], "Address is not a group member");
        return groups[_groupId].memberPublicKeys[_member];
    }
    
    /**
     * @dev Get all public keys of group members
     * @param _groupId The ID of the group
     * @return members Array of member addresses
     * @return publicKeys Array of corresponding public keys
     */
    function getGroupMemberPublicKeys(uint256 _groupId) external view 
        groupExists(_groupId) onlyGroupMember(_groupId) returns (address[] memory, string[] memory) {
        Group storage group = groups[_groupId];
        address[] memory members = group.members;
        string[] memory publicKeys = new string[](members.length);
        
        for (uint256 i = 0; i < members.length; i++) {
            publicKeys[i] = group.memberPublicKeys[members[i]];
        }
        
        return (members, publicKeys);
    }
    
    /**
     * @dev Get message IDs for a group (only for group members)
     * @param _groupId The ID of the group
     * @return messageIds Array of message IDs
     */
    function getGroupMessageIds(uint256 _groupId) external view 
        groupExists(_groupId) onlyGroupMember(_groupId) returns (uint256[] memory) {
        return groupMessages[_groupId];
    }
    
    /**
     * @dev Get a specific message (only for group members)
     * @param _messageId The ID of the message
     * @return id Message ID
     * @return groupId Group ID
     * @return sender Sender address
     * @return encryptedContent Encrypted message content
     * @return encryptedKey Encrypted symmetric key for the caller
     * @return timestamp Message timestamp
     * @return messageHash Message hash for integrity
     */
    function getMessage(uint256 _messageId) external view returns (
        uint256 id,
        uint256 groupId,
        address sender,
        string memory encryptedContent,
        string memory encryptedKey,
        uint256 timestamp,
        bytes32 messageHash
    ) {
        require(_messageId > 0 && _messageId <= _messageCounter, "Message does not exist");
        Message storage message = messages[_messageId];
        require(groups[message.groupId].isMember[msg.sender], "Not authorized to read this message");
        
        return (
            message.id,
            message.groupId,
            message.sender,
            message.encryptedContent,
            message.encryptedKeys[msg.sender], // Only return the key encrypted for this user
            message.timestamp,
            message.messageHash
        );
    }
    
    /**
     * @dev Get the encrypted key for a specific message (only for authorized recipients)
     * @param _messageId The ID of the message
     * @return encryptedKey The symmetric key encrypted for the caller
     */
    function getMessageKey(uint256 _messageId) external view returns (string memory) {
        require(_messageId > 0 && _messageId <= _messageCounter, "Message does not exist");
        Message storage message = messages[_messageId];
        require(groups[message.groupId].isMember[msg.sender], "Not authorized to read this message");
        require(bytes(message.encryptedKeys[msg.sender]).length > 0, "No key available for this user");
        
        return message.encryptedKeys[msg.sender];
    }
    
    /**
     * @dev Get groups that a user is a member of
     * @param _user Address of the user
     * @return groupIds Array of group IDs
     */
    function getUserGroups(address _user) external view returns (uint256[] memory) {
        return userGroups[_user];
    }
    
    /**
     * @dev Check if a user is a member of a group
     * @param _groupId The ID of the group
     * @param _user Address of the user
     * @return isMember True if user is a member
     */
    function isGroupMember(uint256 _groupId, address _user) external view groupExists(_groupId) returns (bool) {
        return groups[_groupId].isMember[_user];
    }
    
    /**
     * @dev Get total number of groups created
     * @return count Total group count
     */
    function getTotalGroups() external view returns (uint256) {
        return _groupCounter;
    }
    
    /**
     * @dev Get total number of messages sent
     * @return count Total message count
     */
    function getTotalMessages() external view returns (uint256) {
        return _messageCounter;
    }
}
