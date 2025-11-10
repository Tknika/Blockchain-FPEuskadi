/* Front-end controller for the Ekozir Flask dApp. */

(() => {
  const state = {
    provider: null,
    signer: null,
    account: null,
    network: null,
    contract: null,
    contractMetadata: null,
    selectedGroupId: null,
  };

  const ui = {
    connectButton: document.getElementById("connectWallet"),
    walletInfo: document.getElementById("walletInfo"),
    setPublicKey: document.getElementById("setPublicKey"),
    publicKeyInput: document.getElementById("publicKeyInput"),
    createGroup: document.getElementById("createGroup"),
    groupName: document.getElementById("groupName"),
    groupMembers: document.getElementById("groupMembers"),
    addMember: document.getElementById("addMember"),
    removeMember: document.getElementById("removeMember"),
    memberGroupId: document.getElementById("memberGroupId"),
    memberAddress: document.getElementById("memberAddress"),
    sendMessage: document.getElementById("sendMessage"),
    messageGroupId: document.getElementById("messageGroupId"),
    messageContent: document.getElementById("messageContent"),
    messageRecipients: document.getElementById("messageRecipients"),
    messageRecipientKeys: document.getElementById("messageRecipientKeys"),
    messageSenderKey: document.getElementById("messageSenderKey"),
    refreshGroups: document.getElementById("refreshGroups"),
    groupsList: document.getElementById("groupsList"),
    messagesList: document.getElementById("messagesList"),
  };

  /**
   * Display status updates inside the wallet info panel.
   */
  function updateStatus(message, payload = null) {
    const lines = [`${message}`];
    if (payload) {
      lines.push(JSON.stringify(payload, null, 2));
    }
    ui.walletInfo.textContent = lines.join("\n");
    console.info("[Ekozir]", message, payload || "");
  }

  /**
   * Fetch contract metadata (ABI, address) from the Flask backend.
   */
  async function loadContractMetadata() {
    const response = await fetch("/api/contract/metadata");
    const { data } = await response.json();
    state.contractMetadata = data;

    if (!data.address) {
      updateStatus(
        "Contract address missing. Set EKOZIR_CONTRACT_ADDRESS in the environment."
      );
    }
  }

  /**
   * Ensure the MetaMask provider is available and connected to the desired network.
   */
  async function connectWallet() {
    if (!window.ethereum) {
      updateStatus("MetaMask is not available in this browser.");
      return;
    }

    state.provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    await state.provider.send("eth_requestAccounts", []);
    state.signer = state.provider.getSigner();
    state.account = await state.signer.getAddress();
    state.network = await state.provider.getNetwork();

    updateStatus("Wallet connected", {
      account: state.account,
      chainId: state.network.chainId,
    });

    await ensureCorrectChain();
    await ensureContractInstance();
    await refreshGroups();
  }

  /**
   * Request the user to switch networks when MetaMask is pointing somewhere else.
   */
  async function ensureCorrectChain() {
    const expectedChainId = parseInt(window.APP_CONFIG.chainId, 10);
    if (state.network.chainId === expectedChainId) {
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ethers.utils.hexValue(expectedChainId) }],
      });
      state.network = await state.provider.getNetwork();
      updateStatus("Switched to expected Besu chain", {
        chainId: state.network.chainId,
      });
    } catch (error) {
      updateStatus(
        "Please add/switch MetaMask to the Besu network manually.",
        error.message
      );
      throw error;
    }
  }

  /**
   * Build the ethers.js contract instance once we know the user account.
   */
  async function ensureContractInstance() {
    if (!state.signer) {
      throw new Error("Connect wallet first.");
    }
    if (!state.contractMetadata) {
      await loadContractMetadata();
    }
    const { address, abi } = state.contractMetadata;
    if (!address) {
      throw new Error("Ekozir contract address not configured on the backend.");
    }
    state.contract = new ethers.Contract(address, abi, state.signer);
  }

  /**
   * Call the contract to set/update the user's public key.
   */
  async function handleSetPublicKey() {
    try {
      await ensureContractInstance();
      const publicKey = ui.publicKeyInput.value.trim();
      if (!publicKey) {
        updateStatus("Please provide a public key value.");
        return;
      }

      const tx = await state.contract.setPublicKey(publicKey);
      updateStatus("Saving public key...", { txHash: tx.hash });
      await tx.wait(1);
      updateStatus("Public key saved successfully.", { txHash: tx.hash });
    } catch (error) {
      updateStatus("Failed to set public key.", { error: error.message });
    }
  }

  /**
   * Handle group creation from the UI inputs.
   */
  async function handleCreateGroup() {
    try {
      await ensureContractInstance();
      const name = ui.groupName.value.trim();
      if (!name) {
        updateStatus("Group name cannot be empty.");
        return;
      }

      const rawMembers = ui.groupMembers.value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);

      const tx = await state.contract.createGroup(name, rawMembers);
      updateStatus("Creating group...", { txHash: tx.hash });
      const receipt = await tx.wait(1);
      updateStatus("Group created.", { txHash: tx.hash, block: receipt.blockNumber });
      await refreshGroups();
    } catch (error) {
      updateStatus("Failed to create group.", { error: error.message });
    }
  }

  /**
   * Add or remove a member depending on the supplied handler.
   */
  function buildMembershipHandler(methodName) {
    return async () => {
      try {
        await ensureContractInstance();
        const groupId = parseInt(ui.memberGroupId.value, 10);
        const address = ui.memberAddress.value.trim();

        if (!groupId || !address) {
          updateStatus("Group ID and member address are required.");
          return;
        }

        const tx = await state.contract[methodName](groupId, address);
        updateStatus(`${methodName} transaction sent`, { txHash: tx.hash });
        await tx.wait(1);
        updateStatus(`${methodName} completed`, { txHash: tx.hash });
        await refreshGroups();
      } catch (error) {
        updateStatus(`Failed to ${methodName}.`, { error: error.message });
      }
    };
  }

  /**
   * Build the payload required by `sendMessage`.
   */
  function buildMessagePayload() {
    const groupId = parseInt(ui.messageGroupId.value, 10);
    const content = ui.messageContent.value.trim();
    const senderKey = ui.messageSenderKey.value.trim();
    const recipients = ui.messageRecipients.value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const recipientKeys = ui.messageRecipientKeys.value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (!groupId || !content || !senderKey) {
      throw new Error("Group ID, message content and sender key are required.");
    }
    if (recipients.length === 0) {
      throw new Error("Provide at least one recipient address.");
    }
    if (recipients.length !== recipientKeys.length) {
      throw new Error("Recipients and keys must contain the same number of entries.");
    }

    const messageHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(content)
    );

    return {
      groupId,
      content,
      recipients,
      recipientKeys,
      senderKey,
      messageHash,
    };
  }

  /**
   * Dispatch the `sendMessage` transaction.
   */
  async function handleSendMessage() {
    try {
      await ensureContractInstance();
      const payload = buildMessagePayload();
      const tx = await state.contract.sendMessage(
        payload.groupId,
        payload.content,
        payload.recipients,
        payload.recipientKeys,
        payload.senderKey,
        payload.messageHash
      );
      updateStatus("Sending message...", { txHash: tx.hash });
      await tx.wait(1);
      updateStatus("Message sent successfully.", { txHash: tx.hash });
      if (state.selectedGroupId === payload.groupId) {
        await loadMessages(payload.groupId);
      }
    } catch (error) {
      updateStatus("Failed to send message.", { error: error.message });
    }
  }

  /**
   * Fetch the groups the user belongs to and display them on the dashboard.
   */
  async function refreshGroups() {
    if (!state.account) {
      updateStatus("Connect MetaMask to load group information.");
      return;
    }
    try {
      const response = await fetch(`/api/users/${state.account}/groups`);
      const { data } = await response.json();
      const groupIds = data.groups || [];
      ui.groupsList.innerHTML = "";

      if (groupIds.length === 0) {
        ui.groupsList.innerHTML =
          '<p class="muted">No groups found for this account.</p>';
        return;
      }

      for (const groupId of groupIds) {
        const group = await loadGroup(groupId);
        renderGroup(group);
      }
    } catch (error) {
      updateStatus("Failed to load groups.", { error: error.message });
    }
  }

  /**
   * Retrieve group metadata and member keys from the Flask API.
   */
  async function loadGroup(groupId) {
    const params = new URLSearchParams({ caller: state.account });
    const response = await fetch(`/api/groups/${groupId}?${params.toString()}`);
    const { data } = await response.json();
    return data;
  }

  /**
   * Render group details inside the groups panel.
   */
  function renderGroup(groupData) {
    const wrapper = document.createElement("div");
    wrapper.className = "list-item";

    const group = groupData.group;
    const members = groupData.members || [];

    const memberList = members
      .map((entry) => `<li>${entry.address} <span class="muted">${entry.publicKey || "no key"}</span></li>`)
      .join("");

    wrapper.innerHTML = `
      <strong>#${group.id} — ${group.name}</strong>
      <span class="muted">Members: ${group.members.length}, Messages: ${group.messageCount}</span>
      <p class="muted">Creator: ${group.creator}</p>
      <ul>${memberList}</ul>
      <button class="view-group" data-group="${group.id}">View messages</button>
    `;

    wrapper
      .querySelector(".view-group")
      .addEventListener("click", async (event) => {
        const targetGroupId = parseInt(event.target.dataset.group, 10);
        state.selectedGroupId = targetGroupId;
        await loadMessages(targetGroupId);
      });

    ui.groupsList.appendChild(wrapper);
  }

  /**
   * Fetch and render all messages for a group.
   */
  async function loadMessages(groupId) {
    try {
      const params = new URLSearchParams({ caller: state.account });
      const response = await fetch(
        `/api/groups/${groupId}/messages?${params.toString()}`
      );
      const { data } = await response.json();
      const messageIds = data.messageIds || [];

      ui.messagesList.innerHTML = "";
      if (messageIds.length === 0) {
        ui.messagesList.innerHTML =
          '<p class="muted">No messages stored for this group yet.</p>';
        return;
      }

      for (const messageId of messageIds) {
        const details = await loadMessage(messageId);
        renderMessage(details);
      }
    } catch (error) {
      updateStatus("Failed to load messages.", { error: error.message });
    }
  }

  /**
   * Retrieve message detail from the Flask API.
   */
  async function loadMessage(messageId) {
    const params = new URLSearchParams({ caller: state.account });
    const response = await fetch(
      `/api/messages/${messageId}?${params.toString()}`
    );
    const { data } = await response.json();
    return data;
  }

  /**
   * Render message information inside the messages panel.
   */
  function renderMessage(messageData) {
    const wrapper = document.createElement("div");
    wrapper.className = "list-item";

    const msg = messageData.message;
    const confirmations = messageData.confirmations || [];
    const stats = messageData.stats || {};

    const confirmationList = confirmations
      .map(
        (entry) =>
          `<li>${entry.recipient} — ${
            entry.confirmed ? "✅ confirmed" : "⏳ pending"
          }</li>`
      )
      .join("");

    wrapper.innerHTML = `
      <strong>Message #${msg.id}</strong>
      <p class="muted">Sender: ${msg.sender}</p>
      <p class="muted">Encrypted content: ${msg.encryptedContent}</p>
      <p class="muted">Encrypted key (you): ${msg.encryptedKey || "N/A"}</p>
      <p class="muted">Timestamp: ${msg.timestamp}</p>
      <p class="muted">Hash: ${msg.messageHash}</p>
      <p class="muted">Stats: ${
        Object.keys(stats).length
          ? `${stats.confirmedCount}/${stats.totalRecipients} confirmed`
          : "Only the sender can see stats"
      }</p>
      <ul>${confirmationList}</ul>
    `;

    ui.messagesList.appendChild(wrapper);
  }

  /**
   * Hook up event listeners once the DOM is ready.
   */
  function registerEventListeners() {
    ui.connectButton.addEventListener("click", connectWallet);
    ui.setPublicKey.addEventListener("click", handleSetPublicKey);
    ui.createGroup.addEventListener("click", handleCreateGroup);
    ui.addMember.addEventListener("click", buildMembershipHandler("addMember"));
    ui.removeMember.addEventListener(
      "click",
      buildMembershipHandler("removeMember")
    );
    ui.sendMessage.addEventListener("click", handleSendMessage);
    ui.refreshGroups.addEventListener("click", refreshGroups);
  }

  /**
   * Entry point: load metadata and wait for user interaction.
   */
  async function bootstrap() {
    await loadContractMetadata();
    registerEventListeners();
  }

  bootstrap().catch((error) => {
    updateStatus("Failed to bootstrap application.", { error: error.message });
  });
})();

