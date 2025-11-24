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
        string creator; // Public key (JSON string) of the creator
        string[] members; // Array of public keys (JSON strings)
        mapping(string => bool) isMember; // Public key => is member
        uint256 messageCount;
        bool exists;
        uint256 createdAt;
    }
    
    // Struct to represent an encrypted message
    struct Message {
        uint256 id;
        uint256 groupId;
        string sender; // Public key (JSON string) of the sender
        string recipient; // Public key (JSON string) of the recipient
        string encryptedContent; // Encrypted message content (encrypted with symmetric key)
        string encryptedKey; // Symmetric key encrypted for the recipient
        string encryptedKeyForSender; // Symmetric key encrypted for the sender (so sender can read their own messages)
        bool confirmed; // Track if recipient confirmed receiving the message
        uint256 confirmationTimestamp; // When the recipient confirmed
        uint256 timestamp;
        bytes32 messageHash; // Hash for integrity verification
    }
    
    // State variables
    address public owner; // Contract owner address
    uint256 private _groupCounter;
    uint256 private _messageCounter;
    
    mapping(uint256 => Group) public groups;
    mapping(uint256 => Message) public messages;
    mapping(uint256 => uint256[]) public groupMessages; // groupId => messageIds[]
    mapping(string => uint256[]) public userGroups; // publicKey (JSON) => groupIds[]
    string[] public registeredPublicKeys; // List of registered public keys (JSON strings)
    mapping(string => string) public userNames; // publicKey (JSON) => name
    
    // Mapping from group ID to sender public key to their sent messages in that group
    mapping(uint256 => mapping(string => uint256[])) private groupUserSentMessages;
    
    // Mapping from group ID to recipient public key to their received messages in that group
    mapping(uint256 => mapping(string => uint256[])) private groupUserReceivedMessages;
    
    // Mapping to track sender-recipient message pairs within a group
    mapping(uint256 => mapping(string => mapping(string => uint256[]))) private groupSenderRecipientMessages;
    
    // Events
    event GroupCreated(uint256 indexed groupId, string name, string indexed creator, uint256 timestamp);
    event MemberAdded(uint256 indexed groupId, string indexed member, string indexed addedBy);
    event MemberRemoved(uint256 indexed groupId, string indexed member, string indexed removedBy);
    event MessageSent(uint256 indexed messageId, uint256 indexed groupId, string indexed sender, string recipient, uint256 timestamp);
    event MessageConfirmed(uint256 indexed messageId, uint256 indexed groupId, string indexed recipient, uint256 timestamp);
    event UserSignedUp(string indexed publicKey, string name);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner can execute this function");
        _;
    }
    
    modifier groupExists(uint256 _groupId) {
        require(groups[_groupId].exists, "Group does not exist");
        _;
    }
    
    /**
     * @dev Constructor sets the contract owner to the deployer
     */
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Sign up a user with both public key and name
     * @param _publicKey The user's public key in JSON string format
     * @param _name The user's name
     */
    function signUp(string memory _publicKey, string memory _name) external onlyOwner {
        require(bytes(_publicKey).length > 0, "Public key cannot be empty");
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(!isPublicKeyRegistered(_publicKey), "Public key already registered");
        
        registeredPublicKeys.push(_publicKey);
        userNames[_publicKey] = _name;
        emit UserSignedUp(_publicKey, _name);
    }
    
    /**
     * @dev Check if a public key is registered
     * @param _publicKey The public key (JSON string) to check
     * @return True if the public key is registered
     */
    function isPublicKeyRegistered(string memory _publicKey) public view returns (bool) {
        return bytes(userNames[_publicKey]).length > 0;
    }
    
    /**
     * @dev Create a new private group
     * @param _name Name of the group
     * @param _creatorPublicKey Public key (JSON string) of the creator
     * @param _initialMemberPublicKeys Array of initial member public keys (JSON strings, optional)
     * @return groupId The ID of the newly created group
     */
    function createGroup(
        string memory _name,
        string memory _creatorPublicKey,
        string[] memory _initialMemberPublicKeys
    ) external onlyOwner returns (uint256) {
        require(bytes(_name).length > 0, "Group name cannot be empty");
        require(bytes(_creatorPublicKey).length > 0, "Creator public key cannot be empty");
        require(isPublicKeyRegistered(_creatorPublicKey), "Creator must be registered");
        
        _groupCounter++;
        uint256 newGroupId = _groupCounter;
        
        Group storage newGroup = groups[newGroupId];
        newGroup.id = newGroupId;
        newGroup.name = _name;
        newGroup.creator = _creatorPublicKey;
        newGroup.exists = true;
        newGroup.createdAt = block.timestamp;
        
        // Add creator as first member
        newGroup.members.push(_creatorPublicKey);
        newGroup.isMember[_creatorPublicKey] = true;
        userGroups[_creatorPublicKey].push(newGroupId);
        
        // Add initial members
        for (uint256 i = 0; i < _initialMemberPublicKeys.length; i++) {
            string memory memberPublicKey = _initialMemberPublicKeys[i];
            if (
                keccak256(bytes(memberPublicKey)) != keccak256(bytes(_creatorPublicKey)) &&
                bytes(memberPublicKey).length > 0 &&
                !newGroup.isMember[memberPublicKey]
            ) {
                // Verify member has signed up
                require(isPublicKeyRegistered(memberPublicKey), "Member must be registered");
                
                newGroup.members.push(memberPublicKey);
                newGroup.isMember[memberPublicKey] = true;
                userGroups[memberPublicKey].push(newGroupId);
                
                emit MemberAdded(newGroupId, memberPublicKey, _creatorPublicKey);
            }
        }
        
        emit GroupCreated(newGroupId, _name, _creatorPublicKey, block.timestamp);
        return newGroupId;
    }
    
    /**
     * @dev Add a member to an existing group
     * @param _groupId The ID of the group
     * @param _creatorPublicKey Public key (JSON string) of the creator (for authorization)
     * @param _memberPublicKey Public key (JSON string) of the member to add
     */
    function addMember(
        uint256 _groupId,
        string memory _creatorPublicKey,
        string memory _memberPublicKey
    ) external onlyOwner groupExists(_groupId) {
        Group storage group = groups[_groupId];
        require(
            keccak256(bytes(group.creator)) == keccak256(bytes(_creatorPublicKey)),
            "Only group creator can add members"
        );
        require(bytes(_memberPublicKey).length > 0, "Member public key cannot be empty");
        require(!group.isMember[_memberPublicKey], "Public key is already a member");
        require(isPublicKeyRegistered(_memberPublicKey), "Member must be registered");
        
        group.members.push(_memberPublicKey);
        group.isMember[_memberPublicKey] = true;
        userGroups[_memberPublicKey].push(_groupId);
        
        emit MemberAdded(_groupId, _memberPublicKey, _creatorPublicKey);
    }
    
    /**
     * @dev Remove a member from a group
     * @param _groupId The ID of the group
     * @param _creatorPublicKey Public key (JSON string) of the creator (for authorization)
     * @param _memberPublicKey Public key (JSON string) of the member to remove
     */
    function removeMember(
        uint256 _groupId,
        string memory _creatorPublicKey,
        string memory _memberPublicKey
    ) external onlyOwner groupExists(_groupId) {
        Group storage group = groups[_groupId];
        require(
            keccak256(bytes(group.creator)) == keccak256(bytes(_creatorPublicKey)),
            "Only group creator can remove members"
        );
        require(
            keccak256(bytes(_memberPublicKey)) != keccak256(bytes(group.creator)),
            "Cannot remove group creator"
        );
        require(group.isMember[_memberPublicKey], "Public key is not a member");
        
        group.isMember[_memberPublicKey] = false;
        
        // Remove from members array
        for (uint256 i = 0; i < group.members.length; i++) {
            if (keccak256(bytes(group.members[i])) == keccak256(bytes(_memberPublicKey))) {
                group.members[i] = group.members[group.members.length - 1];
                group.members.pop();
                break;
            }
        }
        
        // Remove from user's groups
        uint256[] storage userGroupsList = userGroups[_memberPublicKey];
        for (uint256 i = 0; i < userGroupsList.length; i++) {
            if (userGroupsList[i] == _groupId) {
                userGroupsList[i] = userGroupsList[userGroupsList.length - 1];
                userGroupsList.pop();
                break;
            }
        }
        
        emit MemberRemoved(_groupId, _memberPublicKey, _creatorPublicKey);
    }
    
    /**
     * @dev Send an encrypted message to a single recipient in a group
     * @param _groupId The ID of the group
     * @param _senderPublicKey Public key (JSON string) of the sender
     * @param _recipientPublicKey Public key (JSON string) of the recipient
     * @param _encryptedContent The encrypted message content (encrypted with symmetric key)
     * @param _encryptedKey The symmetric key encrypted for the recipient
     * @param _encryptedKeyForSender The symmetric key encrypted for the sender (so sender can read their own messages)
     * @param _messageHash Hash of the original message for integrity
     */
    function sendMessage(
        uint256 _groupId,
        string memory _senderPublicKey,
        string memory _recipientPublicKey,
        string memory _encryptedContent,
        string memory _encryptedKey,
        string memory _encryptedKeyForSender,
        bytes32 _messageHash
    ) external onlyOwner groupExists(_groupId) {
        require(bytes(_senderPublicKey).length > 0, "Sender public key cannot be empty");
        require(bytes(_recipientPublicKey).length > 0, "Recipient public key cannot be empty");
        require(
            keccak256(bytes(_senderPublicKey)) != keccak256(bytes(_recipientPublicKey)),
            "Cannot send message to yourself"
        );
        require(bytes(_encryptedContent).length > 0, "Message content cannot be empty");
        require(bytes(_encryptedKey).length > 0, "Encrypted key cannot be empty");
        require(bytes(_encryptedKeyForSender).length > 0, "Encrypted key for sender cannot be empty");
        
        // Verify sender and recipient are group members
        Group storage group = groups[_groupId];
        require(group.isMember[_senderPublicKey], "Sender must be a group member");
        require(group.isMember[_recipientPublicKey], "Recipient must be a group member");
        
        _messageCounter++;
        uint256 newMessageId = _messageCounter;
        
        Message storage newMessage = messages[newMessageId];
        newMessage.id = newMessageId;
        newMessage.groupId = _groupId;
        newMessage.sender = _senderPublicKey;
        newMessage.recipient = _recipientPublicKey;
        newMessage.encryptedContent = _encryptedContent;
        newMessage.encryptedKey = _encryptedKey;
        newMessage.encryptedKeyForSender = _encryptedKeyForSender;
        newMessage.timestamp = block.timestamp;
        newMessage.messageHash = _messageHash;
        newMessage.confirmed = false;
        
        // Update group-specific message tracking
        groupUserSentMessages[_groupId][_senderPublicKey].push(newMessageId);
        groupUserReceivedMessages[_groupId][_recipientPublicKey].push(newMessageId);
        groupSenderRecipientMessages[_groupId][_senderPublicKey][_recipientPublicKey].push(newMessageId);
        
        // Add to group messages
        groupMessages[_groupId].push(newMessageId);
        groups[_groupId].messageCount++;
        
        emit MessageSent(newMessageId, _groupId, _senderPublicKey, _recipientPublicKey, block.timestamp);
    }
    
    /**
     * @dev Get group information
     * @param _groupId The ID of the group
     * @return id Group ID
     * @return name Group name
     * @return creator Group creator public key (JSON string)
     * @return members Array of member public keys (JSON strings)
     * @return messageCount Number of messages in the group
     * @return createdAt Group creation timestamp
     */
    function getGroup(uint256 _groupId) external view groupExists(_groupId) returns (
        uint256 id,
        string memory name,
        string memory creator,
        string[] memory members,
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
     * @dev Get user's name by public key
     * @param _publicKey Public key (JSON string) of the user
     * @return name The user's name
     */
    function getUserName(string memory _publicKey) external view returns (string memory) {
        return userNames[_publicKey];
    }
    
    /**
     * @dev Get all member information (public keys, names) for a group
     * @param _groupId The ID of the group
     * @param _callerPublicKey Public key (JSON string) of the caller (for authorization)
     * @return members Array of member public keys (JSON strings)
     * @return names Array of corresponding names
     * @return publicKeys Array of corresponding public keys (same as members, for compatibility)
     */
    function getGroupMemberInfo(uint256 _groupId, string memory _callerPublicKey) external view 
        groupExists(_groupId) returns (
            string[] memory members,
            string[] memory names,
            string[] memory publicKeys
        ) {
        Group storage group = groups[_groupId];
        require(group.isMember[_callerPublicKey], "Not a group member");
        
        string[] memory memberPublicKeys = group.members;
        string[] memory memberNames = new string[](memberPublicKeys.length);
        
        for (uint256 i = 0; i < memberPublicKeys.length; i++) {
            memberNames[i] = userNames[memberPublicKeys[i]];
        }
        
        return (memberPublicKeys, memberNames, memberPublicKeys);
    }
    
    /**
     * @dev Get message IDs for a group (only for group members)
     * @param _groupId The ID of the group
     * @param _callerPublicKey Public key (JSON string) of the caller (for authorization)
     * @return messageIds Array of message IDs
     */
    function getGroupMessageIds(uint256 _groupId, string memory _callerPublicKey) external view 
        groupExists(_groupId) returns (uint256[] memory) {
        Group storage group = groups[_groupId];
        require(group.isMember[_callerPublicKey], "Not a group member");
        return groupMessages[_groupId];
    }
    
    /**
     * @dev Get a specific message (only for sender or recipient)
     * @param _messageId The ID of the message
     * @param _callerPublicKey Public key (JSON string) of the caller (for authorization)
     * @return id Message ID
     * @return groupId Group ID
     * @return sender Sender public key (JSON string)
     * @return recipient Recipient public key (JSON string)
     * @return encryptedContent Encrypted message content
     * @return encryptedKey Encrypted symmetric key (for recipient if caller is recipient, for sender if caller is sender)
     * @return timestamp Message timestamp
     * @return messageHash Message hash for integrity
     */
    function getMessage(uint256 _messageId, string memory _callerPublicKey) external view returns (
        uint256 id,
        uint256 groupId,
        string memory sender,
        string memory recipient,
        string memory encryptedContent,
        string memory encryptedKey,
        uint256 timestamp,
        bytes32 messageHash
    ) {
        require(_messageId > 0 && _messageId <= _messageCounter, "Message does not exist");
        Message storage message = messages[_messageId];
        require(
            keccak256(bytes(message.sender)) == keccak256(bytes(_callerPublicKey)) ||
            keccak256(bytes(message.recipient)) == keccak256(bytes(_callerPublicKey)),
            "Not authorized to read this message"
        );
        
        // Return encryptedKeyForSender if caller is sender, encryptedKey if caller is recipient
        string memory keyToReturn = keccak256(bytes(message.sender)) == keccak256(bytes(_callerPublicKey))
            ? message.encryptedKeyForSender
            : message.encryptedKey;
        
        return (
            message.id,
            message.groupId,
            message.sender,
            message.recipient,
            message.encryptedContent,
            keyToReturn,
            message.timestamp,
            message.messageHash
        );
    }
    
    /**
     * @dev Confirm reception of a message (only for the recipient)
     * @param _messageId The ID of the message to confirm
     * @param _recipientPublicKey Public key (JSON string) of the recipient (for authorization)
     */
    function confirmMessageReception(uint256 _messageId, string memory _recipientPublicKey) external onlyOwner {
        require(_messageId > 0 && _messageId <= _messageCounter, "Message does not exist");
        Message storage message = messages[_messageId];
        require(
            keccak256(bytes(message.recipient)) == keccak256(bytes(_recipientPublicKey)),
            "Only the recipient can confirm this message"
        );
        require(!message.confirmed, "Message already confirmed");
        
        message.confirmed = true;
        message.confirmationTimestamp = block.timestamp;
        
        emit MessageConfirmed(_messageId, message.groupId, _recipientPublicKey, block.timestamp);
    }
    
    /**
     * @dev Get groups that a user is a member of
     * @param _publicKey Public key (JSON string) of the user
     * @return groupIds Array of group IDs
     */
    function getUserGroups(string memory _publicKey) external view returns (uint256[] memory) {
        return userGroups[_publicKey];
    }
    
    /**
     * @dev Check if a user is a member of a group
     * @param _groupId The ID of the group
     * @param _publicKey Public key (JSON string) of the user
     * @return isMember True if user is a member
     */
    function isGroupMember(uint256 _groupId, string memory _publicKey) external view groupExists(_groupId) returns (bool) {
        return groups[_groupId].isMember[_publicKey];
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
    
    /**
     * @dev Check if a message has been confirmed (only sender or recipient can check)
     * @param _messageId The ID of the message
     * @param _callerPublicKey Public key (JSON string) of the caller (for authorization)
     * @return confirmed True if the message has been confirmed
     * @return timestamp When the confirmation was made (0 if not confirmed)
     */
    function getMessageConfirmation(uint256 _messageId, string memory _callerPublicKey) external view returns (bool confirmed, uint256 timestamp) {
        require(_messageId > 0 && _messageId <= _messageCounter, "Message does not exist");
        Message storage message = messages[_messageId];
        
        // Only allow sender or recipient to check confirmation
        require(
            keccak256(bytes(message.sender)) == keccak256(bytes(_callerPublicKey)) ||
            keccak256(bytes(message.recipient)) == keccak256(bytes(_callerPublicKey)),
            "Not authorized to check this message"
        );
        
        return (
            message.confirmed,
            message.confirmationTimestamp
        );
    }
    
    /**
     * @dev Get all messages sent by a specific user in a group
     * @param _groupId The ID of the group
     * @param _senderPublicKey Public key (JSON string) of the sender
     * @param _callerPublicKey Public key (JSON string) of the caller (for authorization)
     * @return messageIds Array of message IDs sent by the user in the group
     */
    function getGroupMessagesSentBy(
        uint256 _groupId,
        string memory _senderPublicKey,
        string memory _callerPublicKey
    ) external view groupExists(_groupId) returns (uint256[] memory) {
        Group storage group = groups[_groupId];
        require(group.isMember[_callerPublicKey], "Not a group member");
        return groupUserSentMessages[_groupId][_senderPublicKey];
    }
    
    /**
     * @dev Get all messages received by a specific user in a group
     * @param _groupId The ID of the group
     * @param _recipientPublicKey Public key (JSON string) of the recipient
     * @param _callerPublicKey Public key (JSON string) of the caller (for authorization)
     * @return messageIds Array of message IDs received by the user in the group
     */
    function getGroupMessagesReceivedBy(
        uint256 _groupId,
        string memory _recipientPublicKey,
        string memory _callerPublicKey
    ) external view groupExists(_groupId) returns (uint256[] memory) {
        Group storage group = groups[_groupId];
        require(group.isMember[_callerPublicKey], "Not a group member");
        return groupUserReceivedMessages[_groupId][_recipientPublicKey];
    }
    
    /**
     * @dev Get all messages sent by a specific user to a specific recipient in a group
     * @param _groupId The ID of the group
     * @param _senderPublicKey Public key (JSON string) of the sender
     * @param _recipientPublicKey Public key (JSON string) of the recipient
     * @param _callerPublicKey Public key (JSON string) of the caller (for authorization)
     * @return messageIds Array of message IDs
     */
    function getGroupMessagesBetween(
        uint256 _groupId,
        string memory _senderPublicKey,
        string memory _recipientPublicKey,
        string memory _callerPublicKey
    ) external view groupExists(_groupId) returns (uint256[] memory) {
        Group storage group = groups[_groupId];
        require(group.isMember[_callerPublicKey], "Not a group member");
        return groupSenderRecipientMessages[_groupId][_senderPublicKey][_recipientPublicKey];
    }
    
}
