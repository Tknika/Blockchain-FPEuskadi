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
    isSignedIn: false,
  };

  const ui = {
    connectButton: document.getElementById("connectWallet"),
    walletInfo: document.getElementById("walletInfo"),
    setPublicKey: document.getElementById("setPublicKey"),
    publicKeyInput: document.getElementById("publicKeyInput"),
    autoRegisterPublicKey: document.getElementById("autoRegisterPublicKey"),
    signInStatus: document.getElementById("signInStatus"),
    signedInSections: document.querySelectorAll("[data-requires-signin]"),
    createGroup: document.getElementById("createGroup"),
    groupName: document.getElementById("groupName"),
    groupMembers: document.getElementById("groupMembers"),
    addMember: document.getElementById("addMember"),
    removeMember: document.getElementById("removeMember"),
    memberGroupSelect: document.getElementById("memberGroupSelect"),
    memberAddress: document.getElementById("memberAddress"),
    sendMessage: document.getElementById("sendMessage"),
    messageGroupSelect: document.getElementById("messageGroupSelect"),
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
    await syncPublicKeyStatus();
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
   * Show or hide sections that require the user to be signed in (wallet connected + key published).
   */
  function updateSignedInUI() {
    const shouldDisplay = Boolean(state.account && state.isSignedIn);
    ui.signedInSections.forEach((section) => {
      if (!section) {
        return;
      }
      section.style.display = shouldDisplay ? "" : "none";
    });

    if (!shouldDisplay) {
      clearGroupSelectors();
      ui.groupsList.innerHTML = '<p class="muted">Sign in to view your groups.</p>';
      ui.messagesList.innerHTML = '<p class="muted">Sign in to view group messages.</p>';
    }
  }

  /**
   * Reset the group selection dropdowns to their placeholder state.
   */
  function clearGroupSelectors() {
    if (ui.memberGroupSelect) {
      ui.memberGroupSelect.innerHTML =
        '<option value="">Select one of your groups</option>';
    }
    if (ui.messageGroupSelect) {
      ui.messageGroupSelect.innerHTML =
        '<option value="">Select one of your groups</option>';
    }
  }

  /**
   * Refresh the UI with the latest on-chain public key status for the connected account.
   */
  async function syncPublicKeyStatus() {
    if (!state.account) {
      ui.signInStatus.textContent = "Connect your wallet to check registration status.";
      state.isSignedIn = false;
      updateSignedInUI();
      return;
    }

    try {
      await ensureContractInstance();
      const existingKey = await state.contract.userPublicKeys(state.account);
      const hasKey = Boolean(existingKey && existingKey.length > 0);
      state.isSignedIn = hasKey;

      if (hasKey) {
        ui.signInStatus.textContent = "Signed up — public key already published for this wallet.";
        ui.publicKeyInput.value = existingKey;
      } else {
        ui.signInStatus.textContent =
          "Not signed up yet — publish your public key so other members can share secrets.";
        ui.publicKeyInput.value = "";
      }
      updateSignedInUI();
    } catch (error) {
      ui.signInStatus.textContent =
        "Unable to check public key status. See wallet info panel for details.";
      updateStatus("Failed to fetch public key status.", { error: error.message });
      state.isSignedIn = false;
      updateSignedInUI();
    }
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
      await syncPublicKeyStatus();
      await refreshGroups();
    } catch (error) {
      updateStatus("Failed to set public key.", { error: error.message });
    }
  }

  /**
   * Ask MetaMask for the account's encryption public key and register it on-chain.
   */
  async function handleAutoRegisterPublicKey() {
    if (!window.ethereum) {
      updateStatus("MetaMask is not available in this browser.");
      return;
    }

    try {
      await ensureContractInstance();

      const encryptionKey = await window.ethereum.request({
        method: "eth_getEncryptionPublicKey",
        params: [state.account],
      });

      if (!encryptionKey) {
        updateStatus("MetaMask did not return an encryption public key for this account.");
        return;
      }

      ui.publicKeyInput.value = encryptionKey;

      const tx = await state.contract.setPublicKey(encryptionKey);
      updateStatus("Publishing MetaMask encryption key...", { txHash: tx.hash });
      await tx.wait(1);
      updateStatus("Public key published via MetaMask.", { txHash: tx.hash });
      await syncPublicKeyStatus();
      await refreshGroups();
    } catch (error) {
      if (error && error.code === 4001) {
        updateStatus("MetaMask request rejected by the user.");
      } else if (error && error.message && error.message.includes("eth_getEncryptionPublicKey")) {
        updateStatus(
          "MetaMask could not expose the encryption public key for this account.",
          { error: error.message }
        );
      } else {
        updateStatus("Failed to publish MetaMask encryption key.", { error: error.message });
      }
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
        const groupId = parseInt(ui.memberGroupSelect.value, 10);
        const address = ui.memberAddress.value.trim();

        if (!groupId || !address) {
          updateStatus("Select a group and provide a member address.");
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
    const groupId = parseInt(ui.messageGroupSelect.value, 10);
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
      throw new Error("Select a group, provide message content and sender key.");
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
    if (!state.isSignedIn) {
      updateStatus("Publish your public key to access group information.");
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
        clearGroupSelectors();
        ui.messagesList.innerHTML =
          '<p class="muted">Join or create a group to see messages.</p>';
        return;
      }

      const collectedGroups = [];
      for (const groupId of groupIds) {
        const group = await loadGroup(groupId);
        renderGroup(group);
        collectedGroups.push(group.group);
      }
      populateGroupSelectors(collectedGroups);
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
        if (ui.messageGroupSelect && !ui.messageGroupSelect.value) {
          ui.messageGroupSelect.value = String(targetGroupId);
        }
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
    ui.autoRegisterPublicKey.addEventListener("click", handleAutoRegisterPublicKey);
    ui.createGroup.addEventListener("click", handleCreateGroup);
    ui.addMember.addEventListener("click", buildMembershipHandler("addMember"));
    ui.removeMember.addEventListener(
      "click",
      buildMembershipHandler("removeMember")
    );
    ui.sendMessage.addEventListener("click", handleSendMessage);
    ui.refreshGroups.addEventListener("click", refreshGroups);
    ui.memberGroupSelect.addEventListener("change", (event) => {
      const selected = parseInt(event.target.value, 10);
      if (selected) {
        state.selectedGroupId = selected;
      }
    });
    ui.messageGroupSelect.addEventListener("change", async (event) => {
      const selected = parseInt(event.target.value, 10);
      if (selected) {
        state.selectedGroupId = selected;
        await loadMessages(selected);
      } else {
        ui.messagesList.innerHTML =
          '<p class="muted">Select a group to view its messages.</p>';
      }
    });
  }

  /**
   * Populate group selection dropdowns with the latest list of groups.
   */
  function populateGroupSelectors(groups) {
    clearGroupSelectors();

    if (!groups || groups.length === 0) {
      return;
    }

    const options = groups
      .map(
        (group) =>
          `<option value="${group.id}">#${group.id} — ${group.name}</option>`
      )
      .join("");

    const defaultOption = '<option value="">Select one of your groups</option>';

    if (ui.memberGroupSelect) {
      ui.memberGroupSelect.innerHTML = `${defaultOption}${options}`;
    }
    if (ui.messageGroupSelect) {
      ui.messageGroupSelect.innerHTML = `${defaultOption}${options}`;
    }

    if (state.selectedGroupId) {
      const selectedId = String(state.selectedGroupId);
      if (
        ui.memberGroupSelect &&
        [...ui.memberGroupSelect.options].some((opt) => opt.value === selectedId)
      ) {
        ui.memberGroupSelect.value = selectedId;
      }
      if (
        ui.messageGroupSelect &&
        [...ui.messageGroupSelect.options].some((opt) => opt.value === selectedId)
      ) {
        ui.messageGroupSelect.value = selectedId;
      }
    }
  }

  /**
   * Entry point: load metadata and wait for user interaction.
   */
  async function bootstrap() {
    await loadContractMetadata();
    registerEventListeners();
    updateSignedInUI();
  }

  bootstrap().catch((error) => {
    updateStatus("Failed to bootstrap application.", { error: error.message });
  });
})();

