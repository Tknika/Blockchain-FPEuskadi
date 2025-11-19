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
   * Ask MetaMask for the account's encryption public key and fill the textarea.
   * Also prompts for name if not already provided.
   */
  async function handleAutoRegisterPublicKey() {
    if (!window.ethereum) {
      updateStatus("MetaMask is not available in this browser.");
      return;
    }

    try {
      await ensureContractInstance();

      // Request encryption public key from MetaMask
      const encryptionKey = await window.ethereum.request({
        method: "eth_getEncryptionPublicKey",
        params: [state.account],
      });

      if (!encryptionKey) {
        updateStatus("MetaMask did not return an encryption public key for this account.");
        return;
      }

      // Fill the public key textarea with the key from MetaMask
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

      updateStatus("Public key retrieved from MetaMask. Click 'Sign Up' to register.");
    } catch (error) {
      if (error && error.code === 4001) {
        updateStatus("MetaMask request rejected by the user.");
      } else if (error && error.message && error.message.includes("eth_getEncryptionPublicKey")) {
        updateStatus(
          "MetaMask could not expose the encryption public key for this account.",
          { error: error.message }
        );
      } else {
        updateStatus("Failed to get encryption public key from MetaMask.", { error: error.message });
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
   * Generate a random symmetric key for AES encryption.
   * @returns {Promise<CryptoKey>} The generated AES-GCM key
   */
  async function generateSymmetricKey() {
    return await crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true, // extractable
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Export a CryptoKey to a base64 string.
   * @param {CryptoKey} key The key to export
   * @returns {Promise<string>} Base64-encoded key
   */
  async function exportKey(key) {
    const exported = await crypto.subtle.exportKey("raw", key);
    const keyArray = Array.from(new Uint8Array(exported));
    return btoa(String.fromCharCode(...keyArray));
  }

  /**
   * Import a base64 string as a CryptoKey.
   * @param {string} keyBase64 Base64-encoded key
   * @returns {Promise<CryptoKey>} The imported key
   */
  async function importKey(keyBase64) {
    const keyData = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Encrypt message content with AES-GCM.
   * @param {string} plaintext The message to encrypt
   * @param {CryptoKey} key The AES key
   * @returns {Promise<string>} Base64-encoded encrypted data with IV
   */
  async function encryptContent(plaintext, key) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Generate a random IV (12 bytes for AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      data
    );
    
    // Combine IV and encrypted data, then encode as base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypt message content with AES-GCM.
   * @param {string} encryptedData Base64-encoded encrypted data with IV
   * @param {CryptoKey} key The AES key
   * @returns {Promise<string>} Decrypted plaintext
   */
  async function decryptContent(encryptedData, key) {
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract IV (first 12 bytes) and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Encrypt a symmetric key with ECIES using recipient's public key.
   * @param {string} symmetricKeyBase64 Base64-encoded symmetric key
   * @param {string} recipientPublicKey The recipient's public key (MetaMask format)
   * @returns {string} Encrypted key data (JSON string)
   */
  /**
   * Encrypt a symmetric key with ECIES using recipient's public key.
   * Uses @metamask/eth-sig-util library (loaded as EthSigUtil global).
   */
  async function encryptSymmetricKey(symmetricKeyBase64, recipientPublicKey) {
    // Check if eth-sig-util is available (should be loaded as EthSigUtil global)
    if (typeof EthSigUtil === 'undefined' && typeof window.EthSigUtil === 'undefined') {
      const errorMsg = `eth-sig-util library is not loaded. 
      
The library should be loaded from: app/static/js/eth-sig-util.umd.js

If the file doesn't exist, run:
  npx browserify -r @metamask/eth-sig-util -s EthSigUtil -o app/static/js/eth-sig-util.umd.js

Then refresh this page.`;
      
      console.error(errorMsg);
      throw new Error('eth-sig-util library is not loaded. Please ensure the bundle file exists and refresh the page.');
    }
    
    // Get the library (browserify exports it as EthSigUtil)
    const sigUtil = window.EthSigUtil || EthSigUtil;
    
    // Check if encrypt function exists
    if (!sigUtil.encrypt || typeof sigUtil.encrypt !== 'function') {
      // Log what's available for debugging
      console.error('EthSigUtil object:', sigUtil);
      console.error('Available properties:', Object.keys(sigUtil).slice(0, 30));
      throw new Error('encrypt function not found. Available: ' + Object.keys(sigUtil).slice(0, 20).join(', '));
    }
    
    // The encrypt function from @metamask/eth-sig-util expects:
    // - publicKey: base64-encoded public key (which we already have from MetaMask)
    // - data: string that will be UTF-8 decoded to bytes
    // - version: "x25519-xsalsa20-poly1305"
    // 
    // Since we have a symmetric key as base64, we need to convert it to a format
    // that can be UTF-8 decoded. The simplest approach is to pass the base64 string
    // directly, or convert the bytes to a UTF-8 string representation.
    // 
    // Actually, we can pass the base64 string directly as the data - it's already
    // a string representation of the key that can be decoded later.
    try {
      // Pass the base64 key as the data string
      // The library will UTF-8 encode it, and we can decode it the same way on the other end
      const encrypted = sigUtil.encrypt({
        publicKey: recipientPublicKey,
        data: symmetricKeyBase64, // Pass base64 string directly
        version: "x25519-xsalsa20-poly1305"
      });
      
      if (!encrypted) {
        throw new Error('Encryption function returned undefined');
      }
      
      // The encrypted object has: version, nonce, ephemPublicKey, ciphertext (all base64)
      return JSON.stringify(encrypted);
    } catch (error) {
      console.error('Encryption error details:', {
        error,
        errorMessage: error.message,
        errorStack: error.stack,
        sigUtilType: typeof sigUtil,
        hasEncrypt: sigUtil && typeof sigUtil.encrypt === 'function',
        sigUtilKeys: sigUtil ? Object.keys(sigUtil).slice(0, 30) : 'null',
        recipientPublicKey: recipientPublicKey ? 'present' : 'missing',
        keyBase64Length: symmetricKeyBase64 ? symmetricKeyBase64.length : 0
      });
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt a symmetric key using MetaMask's decryption.
   * @param {string|object} encryptedKeyData JSON string or object of encrypted key data
   * @returns {Promise<string>} Base64-encoded decrypted symmetric key
   */
  async function decryptSymmetricKey(encryptedKeyData) {
    if (!window.ethereum) {
      throw new Error("MetaMask is not available");
    }
    
    if (!state.account) {
      throw new Error("No account connected. Please connect your wallet first.");
    }
    
    // MetaMask's eth_decrypt expects a JSON string in the exact format returned by eth-sig-util
    // The encrypted data should have: version, nonce, ephemPublicKey, ciphertext
    let encryptedString;
    
    if (typeof encryptedKeyData === 'string') {
      // It's already a string - validate it's proper JSON and normalize it
      try {
        // Parse and re-stringify to ensure proper formatting
        const parsed = JSON.parse(encryptedKeyData);
        // Validate required fields
        if (!parsed.version || !parsed.nonce || !parsed.ephemPublicKey || !parsed.ciphertext) {
          throw new Error("Encrypted key missing required fields (version, nonce, ephemPublicKey, ciphertext)");
        }
        // Re-stringify to ensure consistent format
        encryptedString = JSON.stringify(parsed);
      } catch (parseError) {
        console.error("Invalid JSON format for encrypted key:", parseError);
        throw new Error(`Invalid encrypted key format: ${parseError.message}`);
      }
    } else if (typeof encryptedKeyData === 'object' && encryptedKeyData !== null) {
      // It's an object - validate and stringify
      if (!encryptedKeyData.version || !encryptedKeyData.nonce || !encryptedKeyData.ephemPublicKey || !encryptedKeyData.ciphertext) {
        throw new Error("Encrypted key object missing required fields (version, nonce, ephemPublicKey, ciphertext)");
      }
      encryptedString = JSON.stringify(encryptedKeyData);
    } else {
      throw new Error('encryptedKeyData must be a JSON string or an object');
    }
    
    // Log the request details for debugging (without sensitive data)
    console.info("Requesting MetaMask decryption:", {
      account: state.account,
      encryptedKeyLength: encryptedString.length,
      encryptedKeyPreview: encryptedString.substring(0, 50) + "...",
      encryptedKeyStructure: JSON.parse(encryptedString) // Log structure for debugging
    });
    
    // Use MetaMask's eth_decrypt method
    // Note: This method is deprecated but still supported
    // MetaMask expects the encrypted data as a JSON string in the format returned by eth-sig-util
    try {
      const decryptedString = await window.ethereum.request({
        method: "eth_decrypt",
        params: [encryptedString, state.account],
      });
      
      // The decrypted string is the original data that was encrypted
      // Since we encrypted the base64 key, we get the base64 string back
      return decryptedString;
    } catch (metaMaskError) {
      // Provide more detailed error information
      console.error("MetaMask decryption error:", metaMaskError);
      
      // Extract detailed error information
      const errorDetails = metaMaskError.data?.cause || {};
      const errorMessage = errorDetails.message || metaMaskError.message || "Unknown error";
      
      // Handle different error codes
      if (metaMaskError.code === 4001) {
        throw new Error("MetaMask DecryptMessage: User denied message decryption.");
      } else if (metaMaskError.code === -32603) {
        // RPC error - MetaMask internally rejected the decryption
        // This usually means the encrypted data doesn't match the account's encryption key
        console.error("RPC Error details:", {
          code: metaMaskError.code,
          message: metaMaskError.message,
          data: metaMaskError.data,
          cause: errorDetails,
          stack: errorDetails.stack
        });
        
        // Provide a more helpful error message
        let helpfulMessage = "MetaMask was unable to decrypt the message. ";
        helpfulMessage += "This usually means:\n";
        helpfulMessage += "1. The message was encrypted with a different public key than your current MetaMask encryption key\n";
        helpfulMessage += "2. Your MetaMask encryption key has changed since the message was sent\n";
        helpfulMessage += "3. The message was encrypted for a different account\n\n";
        helpfulMessage += `Error: ${errorMessage}`;
        
        throw new Error(helpfulMessage);
      }
      throw metaMaskError;
    }
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
      updateStatus(`Preparing to send messages to ${recipients.length} recipient(s)...`);
      
      let successCount = 0;
      let failCount = 0;
      const errorDetails = [];
      
      try {
        // Get group data once to access all recipient public keys
        const groupData = await loadGroup(groupId);
        
        // Generate a symmetric key for this message
        updateStatus("Generating encryption key...");
        const symmetricKey = await generateSymmetricKey();
        const symmetricKeyBase64 = await exportKey(symmetricKey);
        
        // Encrypt the message content once with the symmetric key
        updateStatus("Encrypting message content...");
        const encryptedContent = await encryptContent(content, symmetricKey);

        for (let i = 0; i < recipients.length; i++) {
          const recipient = recipients[i];
          const recipientData = groupData.members.find(m => 
            m.address.toLowerCase() === recipient.toLowerCase()
          );
          
          if (!recipientData || !recipientData.publicKey) {
            const errorMsg = `Recipient ${recipient} does not have a public key`;
            updateStatus(`Error: ${errorMsg}. Skipping...`);
            errorDetails.push(`Message ${i + 1}: ${errorMsg}`);
            failCount++;
            continue;
          }
          
          try {
            // Encrypt the symmetric key with the recipient's public key
            updateStatus(`Encrypting key for ${recipientData.name || recipient}...`);
            const encryptedKey = await encryptSymmetricKey(symmetricKeyBase64, recipientData.publicKey);
            console.info("[Ekozir]", "Grupo: ", groupId || "");
            console.info("[Ekozir]", "Receptor: ", recipient || "");
            console.info("[Ekozir]", "Clave simétrica encriptada: ", encryptedKey || "");
            console.info("[Ekozir]", "Contenido encriptado: ", encryptedContent || "");
            console.info("[Ekozir]", "Hash del mensaje: ", messageHash || "");
            updateStatus(`Sending message ${i + 1}/${recipients.length} to ${recipientData.name || recipient}...`);
            
            // Send the transaction - this will trigger MetaMask confirmation
            // The sendMessage function is a state-changing function, so it requires a transaction
            const tx = await state.contract.sendMessage(
              groupId,
              recipient,
              encryptedContent,
              encryptedKey,
              messageHash
            );
            
            updateStatus(`Transaction submitted for message ${i + 1}/${recipients.length}. Please confirm in MetaMask...`, { txHash: tx.hash });
            
            // Wait for the transaction to be mined
            const receipt = await tx.wait(1);
            
            updateStatus(`Message ${i + 1}/${recipients.length} sent successfully!`, { 
              txHash: tx.hash,
              blockNumber: receipt.blockNumber 
            });
            successCount++;
          } catch (error) {
            // Extract detailed error information
            let errorMsg = "Unknown error";
            if (error.code === 4001) {
              errorMsg = "Transaction cancelled by user in MetaMask";
              updateStatus(`Message ${i + 1}/${recipients.length} cancelled by user in MetaMask.`);
            } else if (error.reason) {
              errorMsg = error.reason;
            } else if (error.message) {
              errorMsg = error.message;
            } else if (typeof error === 'string') {
              errorMsg = error;
            } else {
              errorMsg = JSON.stringify(error);
            }
            
            const fullError = `Message ${i + 1} to ${recipientData.name || recipient}: ${errorMsg}`;
            updateStatus(`Failed to send message ${i + 1}/${recipients.length}: ${errorMsg}`);
            errorDetails.push(fullError);
            console.error("Send message error details:", {
              error,
              recipient,
              recipientData,
              errorCode: error.code,
              errorMessage: error.message,
              errorReason: error.reason,
              fullError: error
            });
            failCount++;
          }
        }
      } catch (error) {
        // Catch errors that happen before or during the loop setup
        let errorMsg = "Unknown error during message preparation";
        if (error.reason) {
          errorMsg = error.reason;
        } else if (error.message) {
          errorMsg = error.message;
        } else if (typeof error === 'string') {
          errorMsg = error;
        }
        
        updateStatus(`Failed to prepare messages: ${errorMsg}`);
        errorDetails.push(`Preparation error: ${errorMsg}`);
        console.error("Message preparation error:", error);
        failCount = recipients.length; // Mark all as failed
      }

      // Show final summary with detailed errors
      if (successCount > 0) {
        updateStatus(`Successfully sent ${successCount} out of ${recipients.length} message(s).${failCount > 0 ? ` ${failCount} failed.` : ''}`);
      } else {
        let errorSummary = `Failed to send any messages.`;
        if (errorDetails.length > 0) {
          errorSummary += `\n\nErrors:\n${errorDetails.join('\n')}`;
        }
        updateStatus(errorSummary);
      }
      
      // Clear form
      ui.messageContent.value = "";
      checkboxes.forEach(cb => cb.checked = false);
      
      if (state.selectedGroupId === groupId) {
        await loadMessages(groupId);
      }
    } catch (error) {
      // Catch any unexpected errors in the outer try-catch
      let errorMsg = "Unknown error";
      if (error.reason) {
        errorMsg = error.reason;
      } else if (error.message) {
        errorMsg = error.message;
      } else if (typeof error === 'string') {
        errorMsg = error;
      }
      
      updateStatus(`Failed to send message: ${errorMsg}`, { 
        error: errorMsg,
        fullError: error 
      });
      console.error("Outer send message error:", error);
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

      // Load messages, filtering out any that fail (user might not be authorized)
      const loadedMessages = [];
      for (const messageId of messageIds) {
        try {
          const details = await loadMessage(messageId);
          loadedMessages.push(details);
        } catch (error) {
          // Skip messages the user is not authorized to view
          console.warn(`Cannot load message ${messageId}: ${error.message}`);
        }
      }
      
      if (loadedMessages.length === 0 && messageIds.length > 0) {
        ui.messagesList.innerHTML =
          '<p class="muted">No messages available for you in this group.</p>';
        return;
      }
      
      // Render all successfully loaded messages
      for (const details of loadedMessages) {
        await renderMessage(details);
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
  async function renderMessage(messageData) {
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

    // Determine content display based on user role
    // Don't automatically decrypt - show a button instead
    let contentDisplay = "";
    if (isRecipient) {
      // Show encrypted content status and a decrypt button
      contentDisplay = `<p class="muted">Encrypted content</p>
        <div id="decrypted-content-${msg.id}" style="display: none;"></div>`;
    } else if (isSender) {
      contentDisplay = `<p class="muted">Encrypted content (you sent this message)</p>`;
    } else {
      contentDisplay = `<p class="muted">Encrypted content (not addressed to you)</p>`;
    }

    wrapper.innerHTML = `
      <strong>Message #${msg.id}</strong>
      <p class="muted">Sender: ${msg.sender}</p>
      ${msg.recipient ? `<p class="muted">Recipient: ${msg.recipient}</p>` : ""}
      ${contentDisplay}
      ${isRecipient && msg.encryptedKey ? `<p class="muted">Encrypted key available: Yes</p>` : ""}
      <p class="muted">Timestamp: ${new Date(msg.timestamp * 1000).toLocaleString()}</p>
      <p class="muted">Hash: ${msg.messageHash}</p>
      ${isSender && Object.keys(stats).length > 0
        ? `<p class="muted">Stats: ${stats.confirmedCount}/${stats.totalRecipients} confirmed</p>`
        : ""}
      ${confirmationInfo}
      ${isRecipient && msg.encryptedKey 
        ? `<button class="decrypt-message" data-message-id="${msg.id}">Decrypt Message</button>` 
        : ""}
      ${isRecipient && !confirmations[0]?.confirmed 
        ? `<button class="confirm-message" data-message="${msg.id}">Confirm Reception</button>` 
        : ""}
    `;

    // Add decrypt button handler if applicable
    const decryptButton = wrapper.querySelector(".decrypt-message");
    if (decryptButton) {
      decryptButton.addEventListener("click", async () => {
        // Get message ID from button data attribute
        const messageId = parseInt(decryptButton.dataset.messageId, 10);
        
        // Store messageData in outer scope for error handling
        let messageData = null;
        let message = null;
        
        try {
          // Disable button and show loading state
          decryptButton.disabled = true;
          decryptButton.textContent = "Decrypting...";
          
          // Re-fetch the message data to ensure we have the latest encrypted key and content
          // This avoids any encoding issues with data attributes
          updateStatus(`Loading message #${messageId} data...`);
          messageData = await loadMessage(messageId);
          message = messageData.message;
          
          if (!message.encryptedKey || !message.encryptedContent) {
            throw new Error("Message data is missing encrypted key or content");
          }
          
          // Decrypt the symmetric key using MetaMask
          // The encryptedKey from the API is already a JSON string
          updateStatus(`Decrypting message #${messageId}...`);
          
          // Verify that the current account matches the recipient
          if (message.recipient && message.recipient.toLowerCase() !== state.account.toLowerCase()) {
            throw new Error(`This message was encrypted for a different account (${message.recipient}). Please switch to the correct account in MetaMask.`);
          }
          
          // Check if the user's public key in the contract matches their current MetaMask encryption key
          // This is important because the message was encrypted with the public key stored in the contract
          try {
            await ensureContractInstance();
            const contractPublicKey = await state.contract.userPublicKeys(state.account);
            const currentMetaMaskKey = await window.ethereum.request({
              method: "eth_getEncryptionPublicKey",
              params: [state.account],
            });
            
            if (contractPublicKey && contractPublicKey !== currentMetaMaskKey) {
              console.warn("Public key mismatch detected:", {
                contractKey: contractPublicKey.substring(0, 20) + "...",
                metamaskKey: currentMetaMaskKey.substring(0, 20) + "..."
              });
              updateStatus(`Warning: Your current MetaMask encryption key differs from the one registered in the contract. The message may have been encrypted with a different key.`);
            }
          } catch (keyCheckError) {
            console.warn("Could not verify public key match:", keyCheckError);
            // Continue anyway - the decryption attempt will reveal if there's a mismatch
          }
          
          // Validate that encryptedKey is a valid JSON string
          let encryptedKeyForDecryption = message.encryptedKey;
          try {
            // Try to parse it to ensure it's valid JSON
            const parsed = JSON.parse(encryptedKeyForDecryption);
            // Log the structure for debugging
            console.info("Encrypted key structure:", {
              hasVersion: !!parsed.version,
              hasNonce: !!parsed.nonce,
              hasEphemPublicKey: !!parsed.ephemPublicKey,
              hasCiphertext: !!parsed.ciphertext,
              version: parsed.version
            });
            // If it parses successfully, stringify it back to ensure proper format
            encryptedKeyForDecryption = JSON.stringify(parsed);
          } catch (parseError) {
            // If parsing fails, the string might not be valid JSON
            console.warn("Encrypted key might not be valid JSON, attempting decryption anyway:", parseError);
            // Use as-is - decryptSymmetricKey will handle it
          }
          
          const symmetricKeyBase64 = await decryptSymmetricKey(encryptedKeyForDecryption);
          const symmetricKey = await importKey(symmetricKeyBase64);
          
          // Decrypt the message content
          const decryptedContent = await decryptContent(message.encryptedContent, symmetricKey);
          
          // Update UI to show decrypted content
          const decryptedContentDiv = wrapper.querySelector(`#decrypted-content-${messageId}`);
          if (decryptedContentDiv) {
            decryptedContentDiv.innerHTML = `<p><strong>Decrypted message:</strong> ${decryptedContent}</p>`;
            decryptedContentDiv.style.display = "block";
          }
          
          // Hide or disable the decrypt button
          decryptButton.style.display = "none";
          
          updateStatus(`Message #${messageId} decrypted successfully.`);
        } catch (error) {
          // Re-enable button on error
          decryptButton.disabled = false;
          decryptButton.textContent = "Decrypt Message";
          
          let errorMsg = "Unknown error";
          if (error.code === 4001) {
            errorMsg = "Decryption cancelled or denied in MetaMask. Please ensure you click 'Decrypt' in the MetaMask popup and that you're using the correct account.";
          } else if (error.code === -32603) {
            // RPC error - most likely account/key mismatch
            errorMsg = `Decryption failed: The message may have been encrypted for a different account's public key. Please verify:
1. You're using the account that was the intended recipient (${messageData?.message?.recipient || 'unknown'})
2. The account's encryption public key matches the one used to encrypt the message
3. Try refreshing the page and reconnecting your wallet`;
          } else if (error.message) {
            errorMsg = error.message;
          }
          
          // Log detailed error information for debugging
          console.error("Decryption error details:", {
            messageId,
            errorCode: error.code,
            errorMessage: error.message,
            error: error,
            account: state.account,
            messageRecipient: messageData?.message?.recipient,
            errorData: error.data
          });
          
          updateStatus(`Failed to decrypt message #${messageId}: ${errorMsg}`);
          
          // Show error in the decrypted content area
          const decryptedContentDiv = wrapper.querySelector(`#decrypted-content-${messageId}`);
          if (decryptedContentDiv) {
            decryptedContentDiv.innerHTML = `<p class="muted">Decryption failed: ${errorMsg}</p>`;
            decryptedContentDiv.style.display = "block";
          }
        }
      });
    }

    // Add confirm button handler if applicable
    const confirmButton = wrapper.querySelector(".confirm-message");
    if (confirmButton) {
      confirmButton.addEventListener("click", async () => {
        try {
          await ensureContractInstance();
          const tx = await state.contract.confirmMessageReception(msg.id);
          updateStatus("Confirming message reception...", { txHash: tx.hash });
          await tx.wait(1);
          updateStatus("Message confirmed.", { txHash: tx.hash });
          // Reload messages to update UI
          if (state.selectedGroupId) {
            await loadMessages(state.selectedGroupId);
          }
        } catch (error) {
          updateStatus("Failed to confirm message.", { error: error.message });
        }
      });
    }

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

