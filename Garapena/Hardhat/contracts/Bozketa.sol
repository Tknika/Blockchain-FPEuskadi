// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.22;

/**
 * @title Bozketa
 * @dev Multi-ballot voting contract with participant commitments and anonymous vote nullifiers.
 */
contract Bozketa {
    struct Proposal {
        string name;
        uint256 voteCount;
    }

    struct Participant {
        string name;
        bytes32 commitment;
    }

    struct Ballot {
        string title;
        address creator;
        uint256 startTime;
        uint256 endTime;
        uint256 voteCount;
        bool exists;
        Proposal[] proposals;
        Participant[] participants;
        mapping(bytes32 => bool) participantCommitments;
        mapping(bytes32 => bool) usedNullifiers;
    }

    uint256 private _nextBallotId;
    mapping(uint256 => Ballot) private _ballots;

    event BallotCreated(
        uint256 indexed ballotId,
        address indexed creator,
        string title,
        uint256 startTime,
        uint256 endTime
    );
    event VoteCast(uint256 indexed ballotId, bytes32 indexed nullifierHash, uint256 indexed proposalIndex);

    /**
     * @dev Create a ballot with proposals and participant invite commitments.
     * The participant names are public, while each commitment hides the invite secret.
     */
    function createBallot(
        string calldata title,
        string[] calldata proposalNames,
        string[] calldata participantNames,
        bytes32[] calldata participantCommitments,
        uint256 startTime,
        uint256 endTime
    ) external returns (uint256 ballotId) {
        require(bytes(title).length > 0, "Title is required");
        require(proposalNames.length >= 2, "At least two proposals required");
        require(participantNames.length > 0, "At least one participant required");
        require(participantNames.length == participantCommitments.length, "Participant data length mismatch");
        require(endTime == 0 || endTime > startTime, "Invalid ballot time range");

        ballotId = _nextBallotId;
        _nextBallotId++;

        Ballot storage ballot = _ballots[ballotId];
        ballot.title = title;
        ballot.creator = msg.sender;
        ballot.startTime = startTime;
        ballot.endTime = endTime;
        ballot.exists = true;

        for (uint256 i = 0; i < proposalNames.length; i++) {
            require(bytes(proposalNames[i]).length > 0, "Proposal name is required");
            ballot.proposals.push(Proposal({name: proposalNames[i], voteCount: 0}));
        }

        for (uint256 i = 0; i < participantNames.length; i++) {
            bytes32 commitment = participantCommitments[i];
            require(bytes(participantNames[i]).length > 0, "Participant name is required");
            require(commitment != bytes32(0), "Participant commitment is required");
            require(!ballot.participantCommitments[commitment], "Duplicate participant commitment");

            ballot.participantCommitments[commitment] = true;
            ballot.participants.push(Participant({name: participantNames[i], commitment: commitment}));
        }

        emit BallotCreated(ballotId, msg.sender, title, startTime, endTime);
    }

    /**
     * @dev Cast an anonymous vote by proving knowledge of an invitation secret.
     * The plain secret is visible to the transaction sender/server, but the contract only stores a nullifier hash.
     */
    function vote(uint256 ballotId, uint256 proposalIndex, bytes32 tokenSecret) external {
        Ballot storage ballot = _getBallot(ballotId);

        require(block.timestamp >= ballot.startTime, "Ballot has not started");
        require(ballot.endTime == 0 || block.timestamp <= ballot.endTime, "Ballot has ended");
        require(proposalIndex < ballot.proposals.length, "Invalid proposal");

        bytes32 commitment = keccak256(abi.encodePacked(tokenSecret, "BOZKETA_COMMITMENT"));
        require(ballot.participantCommitments[commitment], "Invalid participant token");

        bytes32 nullifierHash = keccak256(abi.encodePacked(ballotId, tokenSecret, "BOZKETA_NULLIFIER"));
        require(!ballot.usedNullifiers[nullifierHash], "Participant already voted");

        ballot.usedNullifiers[nullifierHash] = true;
        ballot.proposals[proposalIndex].voteCount++;
        ballot.voteCount++;

        emit VoteCast(ballotId, nullifierHash, proposalIndex);
    }

    function ballotCount() external view returns (uint256) {
        return _nextBallotId;
    }

    function getBallotSummary(uint256 ballotId)
        external
        view
        returns (
            string memory title,
            address creator,
            uint256 startTime,
            uint256 endTime,
            uint256 proposalCount,
            uint256 participantCount,
            uint256 voteCount
        )
    {
        Ballot storage ballot = _getBallot(ballotId);
        return (
            ballot.title,
            ballot.creator,
            ballot.startTime,
            ballot.endTime,
            ballot.proposals.length,
            ballot.participants.length,
            ballot.voteCount
        );
    }

    function getProposal(uint256 ballotId, uint256 proposalIndex)
        external
        view
        returns (string memory name, uint256 voteCount)
    {
        Ballot storage ballot = _getBallot(ballotId);
        require(proposalIndex < ballot.proposals.length, "Invalid proposal");

        Proposal storage proposal = ballot.proposals[proposalIndex];
        return (proposal.name, proposal.voteCount);
    }

    function getParticipant(uint256 ballotId, uint256 participantIndex)
        external
        view
        returns (string memory name, bytes32 commitment)
    {
        Ballot storage ballot = _getBallot(ballotId);
        require(participantIndex < ballot.participants.length, "Invalid participant");

        Participant storage participant = ballot.participants[participantIndex];
        return (participant.name, participant.commitment);
    }

    function hasVoted(uint256 ballotId, bytes32 nullifierHash) external view returns (bool) {
        Ballot storage ballot = _getBallot(ballotId);
        return ballot.usedNullifiers[nullifierHash];
    }

    function verifyCommitment(uint256 ballotId, bytes32 commitment) external view returns (bool) {
        Ballot storage ballot = _getBallot(ballotId);
        return ballot.participantCommitments[commitment];
    }

    function winningProposal(uint256 ballotId) public view returns (uint256 winningProposalIndex) {
        Ballot storage ballot = _getBallot(ballotId);
        uint256 winningVoteCount = 0;

        for (uint256 i = 0; i < ballot.proposals.length; i++) {
            if (ballot.proposals[i].voteCount > winningVoteCount) {
                winningVoteCount = ballot.proposals[i].voteCount;
                winningProposalIndex = i;
            }
        }
    }

    function winnerName(uint256 ballotId) external view returns (string memory) {
        Ballot storage ballot = _getBallot(ballotId);
        return ballot.proposals[winningProposal(ballotId)].name;
    }

    function _getBallot(uint256 ballotId) private view returns (Ballot storage ballot) {
        ballot = _ballots[ballotId];
        require(ballot.exists, "Ballot does not exist");
    }
}