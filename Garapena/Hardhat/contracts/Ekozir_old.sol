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
        uint256 messageCount;
        bool exists;
        uint256 createdAt;
    }
    
    // Struct to represent an encrypted message
    struct Message {
        uint256 id;
        uint256 groupId;
        address sender;
        address recipient; // Single recipient for individual messages
        string encryptedContent; // Encrypted message content (encrypted with symmetric key)
        string encryptedKey; // Symmetric key encrypted for the recipient
        bool confirmed; // Track if recipient confirmed receiving the message
        uint256 confirmationTimestamp; // When the recipient confirmed
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
    mapping(address => string) public userNames; // user => name
    
    // Mapping from group ID to user address to their sent messages in that group
    mapping(uint256 => mapping(address => uint256[])) private groupUserSentMessages;
    
    // Mapping from group ID to user address to their received messages in that group
    mapping(uint256 => mapping(address => uint256[])) private groupUserReceivedMessages;
    
    // Mapping to track sender-recipient message pairs within a group
    mapping(uint256 => mapping(address => mapping(address => uint256[]))) private groupSenderRecipientMessages;
    
    // Events
    event GroupCreated(uint256 indexed groupId, string name, address indexed creator, uint256 timestamp);
    event MemberAdded(uint256 indexed groupId, address indexed member, address indexed addedBy);
    event MemberRemoved(uint256 indexed groupId, address indexed member, address indexed removedBy);
    event MessageSent(uint256 indexed messageId, uint256 indexed groupId, address indexed sender, address recipient, uint256 timestamp);
    event MessageConfirmed(uint256 indexed messageId, uint256 indexed groupId, address indexed recipient, uint256 timestamp);
    event UserSignedUp(address indexed user, string publicKey, string name);
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
     * @dev Sign up a user with both public key and name
     * @param _publicKey The user's public key in string format
     * @param _name The user's name
     */
    function signUp(string memory _publicKey, string memory _name) external {
        require(bytes(_publicKey).length > 0, "Public key cannot be empty");
        require(bytes(_name).length > 0, "Name cannot be empty");
        userPublicKeys[msg.sender] = _publicKey;
        userNames[msg.sender] = _name;
        emit UserSignedUp(msg.sender, _publicKey, _name);
    }
    
    /**
     * @dev Set or update user's public key for encryption purposes (kept for backward compatibility)
     * @param _publicKey The user's public key in string format
     */
    function setPublicKey(string memory _publicKey) external {
        require(bytes(_publicKey).length > 0, "Public key cannot be empty");
        require(bytes(userNames[msg.sender]).length > 0, "User must sign up first with name");
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
        
        // Add initial members
        for (uint256 i = 0; i < _initialMembers.length; i++) {
            address member = _initialMembers[i];
            if (member != msg.sender && member != address(0) && !newGroup.isMember[member]) {
                // Verify member has signed up (has both public key and name)
                require(bytes(userPublicKeys[member]).length > 0, "Member must have a public key");
                require(bytes(userNames[member]).length > 0, "Member must have a name");
                
                newGroup.members.push(member);
                newGroup.isMember[member] = true;
                userGroups[member].push(newGroupId);
                
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
        require(bytes(userPublicKeys[_member]).length > 0, "Member must have a public key");
        require(bytes(userNames[_member]).length > 0, "Member must have a name");
        
        Group storage group = groups[_groupId];
        group.members.push(_member);
        group.isMember[_member] = true;
        userGroups[_member].push(_groupId);
        
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
        
        emit MemberRemoved(_groupId, _member, msg.sender);
    }
    
    /**
     * @dev Send an encrypted message to a single recipient in a group
     * @param _groupId The ID of the group
     * @param _recipient Address of the recipient
     * @param _encryptedContent The encrypted message content (encrypted with symmetric key)
     * @param _encryptedKey The symmetric key encrypted for the recipient
     * @param _messageHash Hash of the original message for integrity
     */
    function sendMessage(
        uint256 _groupId,
        address _recipient,
        string memory _encryptedContent,
        string memory _encryptedKey,
        bytes32 _messageHash
    ) external groupExists(_groupId) onlyGroupMember(_groupId) {
        require(_recipient != address(0), "Invalid recipient address");
        require(_recipient != msg.sender, "Cannot send message to yourself");
        require(bytes(_encryptedContent).length > 0, "Message content cannot be empty");
        require(bytes(_encryptedKey).length > 0, "Encrypted key cannot be empty");
        
        // Verify recipient is a group member
        Group storage group = groups[_groupId];
        require(group.isMember[_recipient], "Recipient must be a group member");
        
        _messageCounter++;
        uint256 newMessageId = _messageCounter;
        
        Message storage newMessage = messages[newMessageId];
        newMessage.id = newMessageId;
        newMessage.groupId = _groupId;
        newMessage.sender = msg.sender;
        newMessage.recipient = _recipient;
        newMessage.encryptedContent = _encryptedContent;
        newMessage.encryptedKey = _encryptedKey;
        newMessage.timestamp = block.timestamp;
        newMessage.messageHash = _messageHash;
        newMessage.confirmed = false;
        
        // Update group-specific message tracking
        groupUserSentMessages[_groupId][msg.sender].push(newMessageId);
        groupUserReceivedMessages[_groupId][_recipient].push(newMessageId);
        groupSenderRecipientMessages[_groupId][msg.sender][_recipient].push(newMessageId);
        
        // Add to group messages
        groupMessages[_groupId].push(newMessageId);
        groups[_groupId].messageCount++;
        
        emit MessageSent(newMessageId, _groupId, msg.sender, _recipient, block.timestamp);
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
     * @dev Get user's name
     * @param _user Address of the user
     * @return name The user's name
     */
    function getUserName(address _user) external view returns (string memory) {
        return userNames[_user];
    }
    
    /**
     * @dev Get all member information (addresses, names, public keys) for a group
     * @param _groupId The ID of the group
     * @return members Array of member addresses
     * @return names Array of corresponding names
     * @return publicKeys Array of corresponding public keys
     */
    function getGroupMemberInfo(uint256 _groupId) external view 
        groupExists(_groupId) onlyGroupMember(_groupId) returns (
            address[] memory members,
            string[] memory names,
            string[] memory publicKeys
        ) {
        Group storage group = groups[_groupId];
        address[] memory memberAddresses = group.members;
        string[] memory memberNames = new string[](memberAddresses.length);
        string[] memory memberPublicKeys = new string[](memberAddresses.length);
        
        for (uint256 i = 0; i < memberAddresses.length; i++) {
            memberNames[i] = userNames[memberAddresses[i]];
            memberPublicKeys[i] = userPublicKeys[memberAddresses[i]];
        }
        
        return (memberAddresses, memberNames, memberPublicKeys);
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
     * @dev Get a specific message (only for sender or recipient)
     * @param _messageId The ID of the message
     * @return id Message ID
     * @return groupId Group ID
     * @return sender Sender address
     * @return recipient Recipient address
     * @return encryptedContent Encrypted message content
     * @return encryptedKey Encrypted symmetric key for the recipient
     * @return timestamp Message timestamp
     * @return messageHash Message hash for integrity
     */
    function getMessage(uint256 _messageId) external view returns (
        uint256 id,
        uint256 groupId,
        address sender,
        address recipient,
        string memory encryptedContent,
        string memory encryptedKey,
        uint256 timestamp,
        bytes32 messageHash
    ) {
        require(_messageId > 0 && _messageId <= _messageCounter, "Message does not exist");
        Message storage message = messages[_messageId];
        require(
            message.sender == msg.sender || message.recipient == msg.sender,
            "Not authorized to read this message"
        );
        
        return (
            message.id,
            message.groupId,
            message.sender,
            message.recipient,
            message.encryptedContent,
            message.encryptedKey,
            message.timestamp,
            message.messageHash
        );
    }
    
    /**
     * @dev Confirm reception of a message (only for the recipient)
     * @param _messageId The ID of the message to confirm
     */
    function confirmMessageReception(uint256 _messageId) external {
        require(_messageId > 0 && _messageId <= _messageCounter, "Message does not exist");
        Message storage message = messages[_messageId];
        require(message.recipient == msg.sender, "Only the recipient can confirm this message");
        require(!message.confirmed, "Message already confirmed");
        
        message.confirmed = true;
        message.confirmationTimestamp = block.timestamp;
        
        emit MessageConfirmed(_messageId, message.groupId, msg.sender, block.timestamp);
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
    
    /**
     * @dev Check if a message has been confirmed (only sender or recipient can check)
     * @param _messageId The ID of the message
     * @return confirmed True if the message has been confirmed
     * @return timestamp When the confirmation was made (0 if not confirmed)
     */
    function getMessageConfirmation(uint256 _messageId) external view returns (bool confirmed, uint256 timestamp) {
        require(_messageId > 0 && _messageId <= _messageCounter, "Message does not exist");
        Message storage message = messages[_messageId];
        
        // Only allow sender or recipient to check confirmation
        require(
            message.sender == msg.sender || message.recipient == msg.sender,
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
     * @param _sender Address of the sender
     * @return messageIds Array of message IDs sent by the user in the group
     */
    function getGroupMessagesSentBy(uint256 _groupId, address _sender) external view 
        groupExists(_groupId) onlyGroupMember(_groupId) returns (uint256[] memory) {
        return groupUserSentMessages[_groupId][_sender];
    }
    
    /**
     * @dev Get all messages received by a specific user in a group
     * @param _groupId The ID of the group
     * @param _recipient Address of the recipient
     * @return messageIds Array of message IDs received by the user in the group
     */
    function getGroupMessagesReceivedBy(uint256 _groupId, address _recipient) external view 
        groupExists(_groupId) onlyGroupMember(_groupId) returns (uint256[] memory) {
        return groupUserReceivedMessages[_groupId][_recipient];
    }
    
    /**
     * @dev Get all messages sent by a specific user to a specific recipient in a group
     * @param _groupId The ID of the group
     * @param _sender Address of the sender
     * @param _recipient Address of the recipient
     * @return messageIds Array of message IDs
     */
    function getGroupMessagesBetween(uint256 _groupId, address _sender, address _recipient) external view 
        groupExists(_groupId) onlyGroupMember(_groupId) returns (uint256[] memory) {
        return groupSenderRecipientMessages[_groupId][_sender][_recipient];
    }
}
