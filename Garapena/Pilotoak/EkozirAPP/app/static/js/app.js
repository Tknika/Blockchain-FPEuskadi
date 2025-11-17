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
    signUpSection: document.getElementById("signUpSection"),
    signUp: document.getElementById("signUp"),
    userNameInput: document.getElementById("userNameInput"),
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
    recipientSelection: document.getElementById("recipientSelection"),
    recipientCheckboxes: document.getElementById("recipientCheckboxes"),
    messageContent: document.getElementById("messageContent"),
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
   * Show or hide the sign-up section based on wallet connection and registration status.
   */
  function updateSignUpUI() {
    if (!state.account) {
      // Wallet not connected - hide sign-up section
      if (ui.signUpSection) {
        ui.signUpSection.style.display = "none";
      }
      return;
    }

    // Wallet connected - show sign-up section only if not registered
    if (ui.signUpSection) {
      ui.signUpSection.style.display = state.isSignedIn ? "none" : "";
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
   * Refresh the UI with the latest on-chain public key and name status for the connected account.
   */
  async function syncPublicKeyStatus() {
    if (!state.account) {
      ui.signInStatus.textContent = "Connect your wallet to check registration status.";
      state.isSignedIn = false;
      updateSignedInUI();
      updateSignUpUI();
      return;
    }

    try {
      await ensureContractInstance();
      const existingKey = await state.contract.userPublicKeys(state.account);
      const existingName = await state.contract.userNames(state.account);
      const hasKey = Boolean(existingKey && existingKey.length > 0);
      const hasName = Boolean(existingName && existingName.length > 0);
      state.isSignedIn = hasKey && hasName;

      if (state.isSignedIn) {
        ui.signInStatus.textContent = "Signed up — public key and name already published for this wallet.";
        ui.publicKeyInput.value = existingKey;
        ui.userNameInput.value = existingName;
      } else {
        ui.signInStatus.textContent =
          "Not signed up yet — publish your public key and name so other members can share secrets.";
        ui.publicKeyInput.value = "";
        ui.userNameInput.value = "";
      }
      updateSignedInUI();
      updateSignUpUI();
    } catch (error) {
      ui.signInStatus.textContent =
        "Unable to check registration status. See wallet info panel for details.";
      updateStatus("Failed to fetch registration status.", { error: error.message });
      state.isSignedIn = false;
      updateSignedInUI();
      updateSignUpUI();
    }
  }

  /**
   * Call the contract to sign up the user with public key and name.
   */
  async function handleSignUp() {
    try {
      await ensureContractInstance();
      const publicKey = ui.publicKeyInput.value.trim();
      const name = ui.userNameInput.value.trim();
      if (!publicKey) {
        updateStatus("Please provide a public key value.");
        return;
      }
      if (!name) {
        updateStatus("Please provide a name.");
        return;
      }

      const tx = await state.contract.signUp(publicKey, name);
      updateStatus("Signing up...", { txHash: tx.hash });
      await tx.wait(1);
      updateStatus("Sign up successful.", { txHash: tx.hash });
      await syncPublicKeyStatus();
      await refreshGroups();
    } catch (error) {
      updateStatus("Failed to sign up.", { error: error.message });
    }
  }

  /**
   * Ask MetaMask for the account's encryption public key and register it on-chain with a name.
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

      // Prompt for name if not already provided
      const name = ui.userNameInput.value.trim();
      if (!name) {
        const userName = prompt("Please enter your name:");
        if (!userName || !userName.trim()) {
          updateStatus("Name is required to sign up.");
          return;
        }
        ui.userNameInput.value = userName.trim();
      }

      const finalName = ui.userNameInput.value.trim();
      const tx = await state.contract.signUp(encryptionKey, finalName);
      updateStatus("Signing up with MetaMask encryption key...", { txHash: tx.hash });
      await tx.wait(1);
      updateStatus("Sign up successful via MetaMask.", { txHash: tx.hash });
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
        updateStatus("Failed to sign up with MetaMask encryption key.", { error: error.message });
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
   * Load group members and populate recipient checkboxes when a group is selected.
   */
  async function loadGroupMembersForMessage(groupId) {
    if (!groupId) {
      ui.recipientSelection.style.display = "none";
      ui.messageContent.style.display = "none";
      ui.sendMessage.style.display = "none";
      return;
    }

    try {
      const groupData = await loadGroup(groupId);
      const members = groupData.members || [];
      
      // Filter out the current user from recipients
      const otherMembers = members.filter(m => m.address.toLowerCase() !== state.account.toLowerCase());
      
      // Clear previous content
      ui.recipientCheckboxes.innerHTML = "";
      
      if (otherMembers.length === 0) {
        const noMembersMsg = document.createElement("p");
        noMembersMsg.className = "muted";
        noMembersMsg.textContent = "No other members in this group.";
        ui.recipientCheckboxes.appendChild(noMembersMsg);
        ui.recipientSelection.style.display = "";
        ui.messageContent.style.display = "none";
        ui.sendMessage.style.display = "none";
        return;
      }

      // Populate checkboxes
      otherMembers.forEach(member => {
        const label = document.createElement("label");
        label.style.display = "block";
        label.style.marginBottom = "8px";
        
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = member.address;
        checkbox.dataset.name = member.name || member.address;
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` ${member.name || member.address}`));
        ui.recipientCheckboxes.appendChild(label);
      });

      ui.recipientSelection.style.display = "";
      ui.messageContent.style.display = "";
      ui.sendMessage.style.display = "";
    } catch (error) {
      updateStatus("Failed to load group members.", { error: error.message });
    }
  }

  /**
   * Dispatch the `sendMessage` transaction for each selected recipient.
   */
  async function handleSendMessage() {
    try {
      await ensureContractInstance();
      const groupId = parseInt(ui.messageGroupSelect.value, 10);
      const content = ui.messageContent.value.trim();

      if (!groupId) {
        updateStatus("Please select a group.");
        return;
      }

      if (!content) {
        updateStatus("Please provide message content.");
        return;
      }

      // Get selected recipients
      const checkboxes = ui.recipientCheckboxes.querySelectorAll("input[type='checkbox']:checked");
      if (checkboxes.length === 0) {
        updateStatus("Please select at least one recipient.");
        return;
      }

      const recipients = Array.from(checkboxes).map(cb => cb.value);
      const messageHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(content));

      // Send message to each recipient individually
      updateStatus(`Sending messages to ${recipients.length} recipient(s)...`);
      
      // TODO: Implement proper encryption here
      // The requirement states users shouldn't need to write encrypted keys,
      // so encryption should happen automatically client-side.
      // For now, using content as placeholder - this needs proper encryption implementation.
      
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        // Get recipient's public key for encryption
        const groupData = await loadGroup(groupId);
        const recipientData = groupData.members.find(m => 
          m.address.toLowerCase() === recipient.toLowerCase()
        );
        
        // Encrypt the message for this recipient
        // TODO: Implement actual encryption using recipientData.publicKey
        // For now, using a placeholder - in production, encrypt content and key properly
        const encryptedContent = content; // Should be encrypted with symmetric key
        const encryptedKey = ""; // Should be encrypted with recipient's public key
        
        if (!encryptedKey && recipientData && recipientData.publicKey) {
          updateStatus(`Warning: Encryption not implemented. Message will be sent unencrypted.`);
        }
        
        const tx = await state.contract.sendMessage(
          groupId,
          recipient,
          encryptedContent,
          encryptedKey || "placeholder", // Contract requires non-empty string
          messageHash
        );
        updateStatus(`Sending message ${i + 1}/${recipients.length}...`, { txHash: tx.hash });
        await tx.wait(1);
      }

      updateStatus(`Successfully sent ${recipients.length} message(s).`);
      
      // Clear form
      ui.messageContent.value = "";
      checkboxes.forEach(cb => cb.checked = false);
      
      if (state.selectedGroupId === groupId) {
        await loadMessages(groupId);
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
      .map((entry) => `<li>${entry.name || entry.address} <span class="muted">(${entry.address})</span></li>`)
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

    const isSender = msg.sender.toLowerCase() === state.account.toLowerCase();
    const isRecipient = msg.recipient && msg.recipient.toLowerCase() === state.account.toLowerCase();
    
    const confirmationInfo = confirmations.length > 0 
      ? `<p class="muted">Recipient: ${msg.recipient} — ${
          confirmations[0].confirmed ? "✅ confirmed" : "⏳ pending"
        }</p>`
      : "";

    wrapper.innerHTML = `
      <strong>Message #${msg.id}</strong>
      <p class="muted">Sender: ${msg.sender}</p>
      ${msg.recipient ? `<p class="muted">Recipient: ${msg.recipient}</p>` : ""}
      <p class="muted">Encrypted content: ${msg.encryptedContent}</p>
      ${isRecipient ? `<p class="muted">Encrypted key (you): ${msg.encryptedKey || "N/A"}</p>` : ""}
      <p class="muted">Timestamp: ${msg.timestamp}</p>
      <p class="muted">Hash: ${msg.messageHash}</p>
      ${isSender && Object.keys(stats).length > 0
        ? `<p class="muted">Stats: ${stats.confirmedCount}/${stats.totalRecipients} confirmed</p>`
        : ""}
      ${confirmationInfo}
    `;

    ui.messagesList.appendChild(wrapper);
  }

  /**
   * Hook up event listeners once the DOM is ready.
   */
  function registerEventListeners() {
    ui.connectButton.addEventListener("click", connectWallet);
    ui.signUp.addEventListener("click", handleSignUp);
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
        await loadGroupMembersForMessage(selected);
        await loadMessages(selected);
      } else {
        ui.recipientSelection.style.display = "none";
        ui.messageContent.style.display = "none";
        ui.sendMessage.style.display = "none";
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
    updateSignUpUI();
  }

  bootstrap().catch((error) => {
    updateStatus("Failed to bootstrap application.", { error: error.message });
  });
})();

