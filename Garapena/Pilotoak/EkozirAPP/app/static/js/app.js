/* Front-end controller for the Ekozir Flask dApp with ECDH encryption. */

(() => {
  const state = {
    username: null,
    password: null, // Stored temporarily for decryption
    publicKey: null, // Public key as JSON string
    isLoggedIn: false,
    selectedGroupId: null,
    ecdhKeyPair: null, // ECDH key pair for encryption/decryption
  };

  const ui = {
    walletInfo: document.getElementById("walletInfo"),
    loginSection: document.getElementById("loginSection"),
    loginUsername: document.getElementById("loginUsername"),
    loginPassword: document.getElementById("loginPassword"),
    loginButton: document.getElementById("loginButton"),
    loginStatus: document.getElementById("loginStatus"),
    showSignUpButton: document.getElementById("showSignUpButton"),
    signUpSection: document.getElementById("signUpSection"),
    signUp: document.getElementById("signUp"),
    backToLoginButton: document.getElementById("backToLoginButton"),
    userNameInput: document.getElementById("userNameInput"),
    passwordInput: document.getElementById("passwordInput"),
    signInStatus: document.getElementById("signInStatus"),
    signedInSections: document.querySelectorAll("[data-requires-signin]"),
    userInfoSection: document.getElementById("userInfoSection"),
    displayUsername: document.getElementById("displayUsername"),
    displayPublicKey: document.getElementById("displayPublicKey"),
    logoutButtonTop: document.getElementById("logoutButtonTop"),
    createGroup: document.getElementById("createGroup"),
    groupName: document.getElementById("groupName"),
    groupMembers: document.getElementById("groupMembers"),
    addMember: document.getElementById("addMember"),
    removeMember: document.getElementById("removeMember"),
    memberGroupSelect: document.getElementById("memberGroupSelect"),
    memberUsername: document.getElementById("memberUsername"),
    sendMessage: document.getElementById("sendMessage"),
    messageGroupSelect: document.getElementById("messageGroupSelect"),
    recipientSelection: document.getElementById("recipientSelection"),
    recipientCheckboxes: document.getElementById("recipientCheckboxes"),
    messageContent: document.getElementById("messageContent"),
    refreshGroups: document.getElementById("refreshGroups"),
    logoutButton: document.getElementById("logoutButton"),
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

  // ==================== ECDH Encryption Functions ====================

  /**
   * Convert ArrayBuffer to base64 string
   */
  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const binary = String.fromCharCode.apply(null, bytes);
    return btoa(binary);
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Convert ArrayBuffer to base64url string (JWK format)
   */
  function arrayBufferToBase64Url(buffer) {
    const bytes = new Uint8Array(buffer);
    const base64 = btoa(String.fromCharCode.apply(null, bytes));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Convert base64url string to ArrayBuffer
   */
  function base64UrlToArrayBuffer(base64url) {
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Convert base64url string to hex string (for elliptic library)
   */
  function base64UrlToHex(base64url) {
    const buffer = base64UrlToArrayBuffer(base64url);
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Derive a deterministic seed from password using PBKDF2
   */
  async function deriveSeedFromPassword(password) {
    const salt = new TextEncoder().encode('KEY_DERIVATION_SALT_v1');
    const passwordBuffer = new TextEncoder().encode(password);
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const seed = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      256
    );
    return seed;
  }

  /**
   * Generate ECDH key pair from password using elliptic library
   */
  async function generateECDHKeyPairFromPassword(password) {
    if (typeof elliptic === 'undefined') {
      throw new Error('Elliptic library not loaded.');
    }
    
    const salt = new TextEncoder().encode('ECDH_KEY_SALT_DETERMINISTIC_v1');
    const seed = await deriveSeedFromPassword(password);
    
    const seedKey = await crypto.subtle.importKey(
      'raw',
      seed,
      'HKDF',
      false,
      ['deriveBits']
    );
    
    const privateKeyBits = await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: salt,
        info: new TextEncoder().encode('ECDH-P256-PrivateKey')
      },
      seedKey,
      256
    );
    
    const privateKeyBytes = new Uint8Array(privateKeyBits);
    const privateKeyHex = Array.from(privateKeyBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const ec = new elliptic.ec('p256');
    const keyPair = ec.keyFromPrivate(privateKeyHex, 'hex');
    const pubPoint = keyPair.getPublic();
    
    const pubKeyX = pubPoint.getX().toArray('be', 32);
    const pubKeyY = pubPoint.getY().toArray('be', 32);
    
    const pubKeyXBase64 = arrayBufferToBase64Url(new Uint8Array(pubKeyX).buffer);
    const pubKeyYBase64 = arrayBufferToBase64Url(new Uint8Array(pubKeyY).buffer);
    
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      {
        kty: 'EC',
        crv: 'P-256',
        x: pubKeyXBase64,
        y: pubKeyYBase64,
        ext: true
      },
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      []
    );
    
    return {
      publicKey: publicKey,
      ellipticKeyPair: keyPair,
      privateKeyHex: privateKeyHex
    };
  }

  /**
   * Encrypt message using recipient's public key (hybrid ECDH-AES-GCM)
   */
  async function encryptWithPublicKey(message, recipientPublicKeyJson) {
    const publicKeyData = JSON.parse(recipientPublicKeyJson);
    
    if (!publicKeyData.crv || publicKeyData.crv !== 'P-256') {
      throw new Error('Invalid public key format. Expected ECDH P-256.');
    }
    
    if (typeof elliptic === 'undefined') {
      throw new Error('Elliptic library not loaded.');
    }
    
    const ec = new elliptic.ec('p256');
    const ephemeralKeyPair = ec.genKeyPair();
    
    const ephemeralPubPoint = ephemeralKeyPair.getPublic();
    const ephemeralX = ephemeralPubPoint.getX().toArray('be', 32);
    const ephemeralY = ephemeralPubPoint.getY().toArray('be', 32);
    
    const ephemeralPublicKeyJwk = {
      kty: 'EC',
      crv: 'P-256',
      x: arrayBufferToBase64Url(new Uint8Array(ephemeralX).buffer),
      y: arrayBufferToBase64Url(new Uint8Array(ephemeralY).buffer),
      ext: true
    };
    
    const recipientPubKey = ec.keyFromPublic({
      x: base64UrlToHex(publicKeyData.x),
      y: base64UrlToHex(publicKeyData.y)
    }, 'hex');
    
    const sharedSecretPoint = ephemeralKeyPair.derive(recipientPubKey.getPublic());
    const sharedSecretBytes = sharedSecretPoint.toArray('be', 32);
    const sharedSecret = new Uint8Array(sharedSecretBytes).buffer;
    
    const sharedSecretKey = await crypto.subtle.importKey(
      'raw',
      sharedSecret,
      'HKDF',
      false,
      ['deriveKey']
    );
    
    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new TextEncoder().encode('ECDH-AES-KEY-SALT'),
        info: new TextEncoder().encode('ECDH-AES-256-GCM-Key')
      },
      sharedSecretKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
    
    const messageBuffer = new TextEncoder().encode(message);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedMessage = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      aesKey,
      messageBuffer
    );
    
    return {
      encryptedMessage: arrayBufferToBase64(encryptedMessage),
      iv: arrayBufferToBase64(iv),
      algorithm: 'HYBRID-ECDH-AES-GCM',
      keyType: 'ECDH',
      version: '1.0',
      ephemeralPublicKey: ephemeralPublicKeyJwk
    };
  }

  /**
   * Decrypt message using password-derived private key
   */
  async function decryptWithPrivateKey(encryptedPackage, password) {
    if (encryptedPackage.algorithm !== 'HYBRID-ECDH-AES-GCM') {
      throw new Error('Unsupported encryption algorithm.');
    }
    
    if (typeof elliptic === 'undefined') {
      throw new Error('Elliptic library not loaded.');
    }
    
    const keyPair = await generateECDHKeyPairFromPassword(password);
    
    const ec = new elliptic.ec('p256');
    const ephemeralPubKey = ec.keyFromPublic({
      x: base64UrlToHex(encryptedPackage.ephemeralPublicKey.x),
      y: base64UrlToHex(encryptedPackage.ephemeralPublicKey.y)
    }, 'hex');
    
    const sharedSecretPoint = keyPair.ellipticKeyPair.derive(ephemeralPubKey.getPublic());
    const sharedSecretBytes = sharedSecretPoint.toArray('be', 32);
    const sharedSecret = new Uint8Array(sharedSecretBytes).buffer;
    
    const sharedSecretKey = await crypto.subtle.importKey(
      'raw',
      sharedSecret,
      'HKDF',
      false,
      ['deriveKey']
    );
    
    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new TextEncoder().encode('ECDH-AES-KEY-SALT'),
        info: new TextEncoder().encode('ECDH-AES-256-GCM-Key')
      },
      sharedSecretKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['decrypt']
    );
    
    const encryptedMessageBuffer = base64ToArrayBuffer(encryptedPackage.encryptedMessage);
    const iv = base64ToArrayBuffer(encryptedPackage.iv);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      aesKey,
      encryptedMessageBuffer
    );
    
    return new TextDecoder().decode(decryptedBuffer);
  }

  /**
   * Derive public key JSON from password
   */
  async function derivePublicKeyFromPassword(password) {
    const keyPair = await generateECDHKeyPairFromPassword(password);
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    
    return {
      kty: publicKeyJwk.kty,
      crv: publicKeyJwk.crv,
      x: publicKeyJwk.x,
      y: publicKeyJwk.y,
      alg: 'ECDH-P256',
      ext: true
    };
  }

  // ==================== Authentication Functions ====================

  /**
   * Check authentication status
   */
  async function checkAuthStatus() {
    try {
      const response = await fetch("/api/auth/status");
      const { data } = await response.json();
      
      if (data.authenticated) {
        state.isLoggedIn = true;
        state.username = data.username;
        state.publicKey = data.publicKey;
        // Store password temporarily for decryption (in a real app, use secure storage)
        // For now, we'll prompt when needed
        updateSignedInUI();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Auth status check failed:", error);
      return false;
    }
  }

  /**
   * Login with username and password
   */
  async function handleLogin() {
    const username = ui.loginUsername.value.trim();
    const password = ui.loginPassword.value;
    
    if (!username || !password) {
      ui.loginStatus.textContent = "Please enter username and password.";
      return;
    }
    
    try {
      // Derive public key from password
      const publicKeyDict = await derivePublicKeyFromPassword(password);
      const publicKeyJson = JSON.stringify(publicKeyDict);
      
      // Try to login
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      
      const { data } = await response.json();
      
      if (response.ok && data.authenticated) {
        state.isLoggedIn = true;
        state.username = username;
        state.password = password; // Store temporarily for decryption
        state.publicKey = publicKeyJson;
        state.ecdhKeyPair = await generateECDHKeyPairFromPassword(password);
        
        ui.loginStatus.textContent = "Login successful!";
        updateSignedInUI();
        await refreshGroups();
      } else if (data.needsSignup) {
        // User not registered, show signup option
        ui.loginStatus.textContent = "User not registered. Please sign up.";
        ui.signUpSection.style.display = "";
        ui.userNameInput.value = username;
        ui.passwordInput.value = password;
      } else {
        ui.loginStatus.textContent = data.error || "Login failed.";
      }
    } catch (error) {
      ui.loginStatus.textContent = `Login error: ${error.message}`;
      updateStatus("Login failed", { error: error.message });
    }
  }

  /**
   * Sign up new user
   */
  async function handleSignUp() {
    const username = ui.userNameInput.value.trim();
    const password = ui.passwordInput.value;
    
    if (!username || !password) {
      ui.signInStatus.textContent = "Please enter username and password.";
      return;
    }
    
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      
      const { data } = await response.json();
      
      if (response.ok) {
        state.isLoggedIn = true;
        state.username = username;
        state.password = password;
        state.publicKey = data.publicKey;
        state.ecdhKeyPair = await generateECDHKeyPairFromPassword(password);
        
        ui.signInStatus.textContent = "Sign up successful!";
        updateSignedInUI();
        await refreshGroups();
      } else {
        ui.signInStatus.textContent = data.error || "Sign up failed.";
      }
    } catch (error) {
      ui.signInStatus.textContent = `Sign up error: ${error.message}`;
      updateStatus("Sign up failed", { error: error.message });
    }
  }

  /**
   * Logout
   */
  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      state.isLoggedIn = false;
      state.username = null;
      state.password = null;
      state.publicKey = null;
      state.ecdhKeyPair = null;
      state.selectedGroupId = null;
      
      updateSignedInUI();
      ui.loginUsername.value = "";
      ui.loginPassword.value = "";
      ui.loginStatus.textContent = "";
    } catch (error) {
      updateStatus("Logout error", { error: error.message });
    }
  }

  /**
   * Show sign-up section and hide login section
   */
  function showSignUpSection() {
    if (ui.loginSection) {
      ui.loginSection.style.display = "none";
    }
    if (ui.signUpSection) {
      ui.signUpSection.style.display = "";
    }
  }

  /**
   * Show login section and hide sign-up section
   */
  function showLoginSection() {
    if (ui.signUpSection) {
      ui.signUpSection.style.display = "none";
    }
    if (ui.loginSection) {
      ui.loginSection.style.display = "";
    }
  }

  /**
   * Update UI based on signed-in status
   */
  function updateSignedInUI() {
    const shouldDisplay = state.isLoggedIn;
    ui.signedInSections.forEach((section) => {
      if (section) {
        section.style.display = shouldDisplay ? "" : "none";
      }
    });
    
    if (ui.loginSection) {
      ui.loginSection.style.display = shouldDisplay ? "none" : "";
    }
    
    if (ui.signUpSection) {
      ui.signUpSection.style.display = "none";
    }
    
    // Update user info section
    if (ui.userInfoSection) {
      ui.userInfoSection.style.display = shouldDisplay ? "" : "none";
    }
    
    if (!shouldDisplay) {
      clearGroupSelectors();
      ui.groupsList.innerHTML = '<p class="muted">Login to view your groups.</p>';
      ui.messagesList.innerHTML = '<p class="muted">Login to view group messages.</p>';
      updateStatus("Not logged in");
    } else {
      // Display username and public key
      if (ui.displayUsername && state.username) {
        ui.displayUsername.textContent = state.username;
      }
      if (ui.displayPublicKey && state.publicKey) {
        // Format public key JSON for display
        try {
          const publicKeyObj = JSON.parse(state.publicKey);
          ui.displayPublicKey.textContent = JSON.stringify(publicKeyObj, null, 2);
        } catch (e) {
          ui.displayPublicKey.textContent = state.publicKey;
        }
      }
      updateStatus(`Logged in as ${state.username}`);
    }
  }

  /**
   * Clear group selectors
   */
  function clearGroupSelectors() {
    if (ui.memberGroupSelect) {
      ui.memberGroupSelect.innerHTML = '<option value="">Select one of your groups</option>';
    }
    if (ui.messageGroupSelect) {
      ui.messageGroupSelect.innerHTML = '<option value="">Select one of your groups</option>';
    }
  }

  // ==================== Group Functions ====================

  /**
   * Refresh groups list
   */
  async function refreshGroups() {
    if (!state.isLoggedIn) {
      return;
    }
    
    try {
      const response = await fetch("/api/users/groups");
      const { data } = await response.json();
      const groupIds = data.groups || [];
      ui.groupsList.innerHTML = "";

      if (groupIds.length === 0) {
        ui.groupsList.innerHTML = '<p class="muted">No groups found.</p>';
        clearGroupSelectors();
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
   * Load group data
   */
  async function loadGroup(groupId) {
    const response = await fetch(`/api/groups/${groupId}`);
    const { data } = await response.json();
    return data;
  }

  /**
   * Render group in UI
   */
  function renderGroup(groupData) {
    const wrapper = document.createElement("div");
    wrapper.className = "list-item";

    const group = groupData.group;
    const members = groupData.members || [];

    const memberList = members
      .map((entry) => `<li>${entry.name || entry.publicKey.substring(0, 20)}...</li>`)
      .join("");

    wrapper.innerHTML = `
      <strong>#${group.id} — ${group.name}</strong>
      <span class="muted">Members: ${group.members.length}, Messages: ${group.messageCount}</span>
      <p class="muted">Creator: ${group.creator.substring(0, 20)}...</p>
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
   * Populate group selectors
   */
  function populateGroupSelectors(groups) {
    clearGroupSelectors();

    if (!groups || groups.length === 0) {
      return;
    }

    const options = groups
      .map((group) => `<option value="${group.id}">#${group.id} — ${group.name}</option>`)
      .join("");

    const defaultOption = '<option value="">Select one of your groups</option>';

    if (ui.memberGroupSelect) {
      ui.memberGroupSelect.innerHTML = `${defaultOption}${options}`;
    }
    if (ui.messageGroupSelect) {
      ui.messageGroupSelect.innerHTML = `${defaultOption}${options}`;
    }
  }

  /**
   * Create group
   */
  async function handleCreateGroup() {
    const name = ui.groupName.value.trim();
    if (!name) {
      updateStatus("Group name cannot be empty.");
      return;
    }

    const rawMembers = ui.groupMembers.value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    // For now, we'll need to look up public keys by username
    // This is a simplified version - in production, you'd have a username->publicKey mapping
    const initialMemberPublicKeys = []; // TODO: Resolve usernames to public keys

    try {
      const response = await fetch("/api/transactions/createGroup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          initialMemberPublicKeys
        })
      });

      const { data } = await response.json();
      
      if (response.ok) {
        updateStatus("Group created.", { txHash: data.txHash });
        await refreshGroups();
      } else {
        updateStatus("Failed to create group.", { error: data.error });
      }
    } catch (error) {
      updateStatus("Failed to create group.", { error: error.message });
    }
  }

  /**
   * Add member to group
   */
  async function buildMembershipHandler(methodName) {
    return async () => {
      const groupId = parseInt(ui.memberGroupSelect.value, 10);
      const username = ui.memberUsername.value.trim();

      if (!groupId || !username) {
        updateStatus("Select a group and provide a username.");
        return;
      }

      // TODO: Resolve username to public key
      // For now, this is a placeholder
      updateStatus("Username to public key resolution not yet implemented.");
    };
  }

  // ==================== Message Functions ====================

  /**
   * Load group members for message sending
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
      
      // Filter out current user
      const otherMembers = members.filter(m => 
        m.publicKey !== state.publicKey
      );
      
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

      otherMembers.forEach(member => {
        const label = document.createElement("label");
        label.style.display = "block";
        label.style.marginBottom = "8px";
        
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = member.publicKey;
        checkbox.dataset.name = member.name || "Unknown";
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` ${member.name || "Unknown"}`));
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
   * Send message
   */
  async function handleSendMessage() {
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

    const checkboxes = ui.recipientCheckboxes.querySelectorAll("input[type='checkbox']:checked");
    if (checkboxes.length === 0) {
      updateStatus("Please select at least one recipient.");
      return;
    }

    const recipients = Array.from(checkboxes).map(cb => cb.value);
    
    // Generate message hash (keccak256 equivalent for Solidity bytes32)
    // Using SHA-256 as approximation (in production, use keccak256)
    const messageHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
    const messageHashHex = Array.from(new Uint8Array(messageHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    // Pad to 64 hex characters (32 bytes) for bytes32
    const messageHashBytes32 = messageHashHex.padEnd(64, '0').substring(0, 64);

    try {
      const groupData = await loadGroup(groupId);
      
      // Generate symmetric key and encrypt content once
      const symmetricKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedContent = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        symmetricKey,
        new TextEncoder().encode(content)
      );
      
      const symmetricKeyBase64 = arrayBufferToBase64(await crypto.subtle.exportKey("raw", symmetricKey));
      
      // Combine IV and encrypted data, then encode as base64 (same format as backend)
      const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedContent), iv.length);
      const encryptedContentBase64 = arrayBufferToBase64(combined.buffer);

      let successCount = 0;
      let failCount = 0;

      // Encrypt symmetric key for the sender (so sender can read their own messages)
      const encryptedKeyForSenderPackage = await encryptWithPublicKey(symmetricKeyBase64, state.publicKey);
      const encryptedKeyForSender = JSON.stringify(encryptedKeyForSenderPackage);

      for (let i = 0; i < recipients.length; i++) {
        const recipientPublicKey = recipients[i];
        const recipientData = groupData.members.find(m => m.publicKey === recipientPublicKey);
        
        if (!recipientData) {
          failCount++;
          continue;
        }
        
        try {
          // Encrypt symmetric key with recipient's public key
          const encryptedKeyPackage = await encryptWithPublicKey(symmetricKeyBase64, recipientPublicKey);
          const encryptedKey = JSON.stringify(encryptedKeyPackage);
          
          const response = await fetch("/api/transactions/sendMessage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              groupId,
              recipientPublicKey,
              encryptedContent: encryptedContentBase64,
              encryptedKey,
              encryptedKeyForSender,
              messageHash: "0x" + messageHashBytes32
            })
          });

          const { data } = await response.json();
          
          if (response.ok) {
            updateStatus(`Message ${i + 1}/${recipients.length} sent!`, { txHash: data.txHash });
            successCount++;
          } else {
            updateStatus(`Failed to send message ${i + 1}/${recipients.length}: ${data.error}`);
            failCount++;
          }
        } catch (error) {
          updateStatus(`Failed to send message ${i + 1}/${recipients.length}: ${error.message}`);
          failCount++;
        }
      }

      if (successCount > 0) {
        updateStatus(`Successfully sent ${successCount} out of ${recipients.length} message(s).`);
      }
      
      ui.messageContent.value = "";
      checkboxes.forEach(cb => cb.checked = false);
      
      if (state.selectedGroupId === groupId) {
        await loadMessages(groupId);
      }
    } catch (error) {
      updateStatus(`Failed to send message: ${error.message}`);
    }
  }

  /**
   * Load messages for a group
   */
  async function loadMessages(groupId) {
    try {
      const response = await fetch(`/api/groups/${groupId}/messages`);
      const { data } = await response.json();
      const messageIds = data.messageIds || [];

      ui.messagesList.innerHTML = "";
      if (messageIds.length === 0) {
        ui.messagesList.innerHTML = '<p class="muted">No messages stored for this group yet.</p>';
        return;
      }

      const loadedMessages = [];
      for (const messageId of messageIds) {
        try {
          const details = await loadMessage(messageId);
          loadedMessages.push(details);
        } catch (error) {
          console.warn(`Cannot load message ${messageId}: ${error.message}`);
        }
      }
      
      if (loadedMessages.length === 0) {
        ui.messagesList.innerHTML = '<p class="muted">No messages available for you in this group.</p>';
        return;
      }
      
      for (const details of loadedMessages) {
        await renderMessage(details);
      }
    } catch (error) {
      updateStatus("Failed to load messages.", { error: error.message });
    }
  }

  /**
   * Load message details
   */
  async function loadMessage(messageId) {
    const response = await fetch(`/api/messages/${messageId}`);
    const { data } = await response.json();
    return data;
  }

  /**
   * Render message in UI
   */
  async function renderMessage(messageData) {
    const wrapper = document.createElement("div");
    wrapper.className = "list-item";

    const msg = messageData.message;
    const isSender = msg.sender === state.publicKey;
    const isRecipient = msg.recipient === state.publicKey;

    let contentDisplay = "";
    if (isRecipient) {
      contentDisplay = `<p class="muted">Encrypted content</p>
        <div id="decrypted-content-${msg.id}" style="display: none;"></div>`;
    } else if (isSender) {
      contentDisplay = `<p class="muted">Encrypted content (you sent this message)</p>
        <div id="decrypted-content-${msg.id}" style="display: none;"></div>`;
    } else {
      contentDisplay = `<p class="muted">Encrypted content (not addressed to you)</p>`;
    }

    wrapper.innerHTML = `
      <strong>Message #${msg.id}</strong>
      <p class="muted">Sender: ${msg.sender.substring(0, 20)}...</p>
      ${msg.recipient ? `<p class="muted">Recipient: ${msg.recipient.substring(0, 20)}...</p>` : ""}
      ${contentDisplay}
      <p class="muted">Timestamp: ${new Date(msg.timestamp * 1000).toLocaleString()}</p>
      ${(isRecipient || isSender) && msg.encryptedKey 
        ? `<button class="decrypt-message" data-message-id="${msg.id}">Decrypt Message</button>` 
        : ""}
      ${isRecipient && !messageData.confirmations[0]?.confirmed 
        ? `<button class="confirm-message" data-message="${msg.id}">Confirm Reception</button>` 
        : ""}
    `;

    const decryptButton = wrapper.querySelector(".decrypt-message");
    if (decryptButton) {
      decryptButton.addEventListener("click", async () => {
        const messageId = parseInt(decryptButton.dataset.messageId, 10);
        
        try {
          decryptButton.disabled = true;
          decryptButton.textContent = "Decrypting...";
          
          const messageData = await loadMessage(messageId);
          const message = messageData.message;
          
          if (!message.encryptedKey || !message.encryptedContent) {
            throw new Error("Message data is missing encrypted key or content");
          }
          
          // Parse encrypted key package (encryptedKeyForSender for sender, encryptedKey for recipient)
          const encryptedKeyPackage = JSON.parse(message.encryptedKey);
          
          // Extract encrypted content (first 12 bytes are IV, rest is encrypted data)
          const encryptedContentBytes = base64ToArrayBuffer(message.encryptedContent);
          const iv = new Uint8Array(encryptedContentBytes.slice(0, 12));
          const encryptedData = encryptedContentBytes.slice(12);
          
          // Decrypt symmetric key using the appropriate encrypted key (for sender or recipient)
          const symmetricKeyBase64 = await decryptWithPrivateKey(encryptedKeyPackage, state.password);
          
          // Import symmetric key
          const symmetricKeyData = base64ToArrayBuffer(symmetricKeyBase64);
          const symmetricKey = await crypto.subtle.importKey(
            "raw",
            symmetricKeyData,
            { name: "AES-GCM", length: 256 },
            false,
            ["decrypt"]
          );
          
          // Decrypt message content
          const decryptedContent = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            symmetricKey,
            encryptedData
          );
          
          const decryptedText = new TextDecoder().decode(decryptedContent);
          
          const decryptedContentDiv = wrapper.querySelector(`#decrypted-content-${messageId}`);
          if (decryptedContentDiv) {
            decryptedContentDiv.innerHTML = `<p><strong>Decrypted message:</strong> ${decryptedText}</p>`;
            decryptedContentDiv.style.display = "block";
          }
          
          decryptButton.style.display = "none";
          updateStatus(`Message #${messageId} decrypted successfully.`);
        } catch (error) {
          decryptButton.disabled = false;
          decryptButton.textContent = "Decrypt Message";
          updateStatus(`Failed to decrypt message #${messageId}: ${error.message}`);
        }
      });
    }

    const confirmButton = wrapper.querySelector(".confirm-message");
    if (confirmButton) {
      confirmButton.addEventListener("click", async () => {
        try {
          const response = await fetch("/api/transactions/confirmMessage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: parseInt(confirmButton.dataset.message, 10) })
          });

          const { data } = await response.json();
          
          if (response.ok) {
            updateStatus("Message confirmed.", { txHash: data.txHash });
            if (state.selectedGroupId) {
              await loadMessages(state.selectedGroupId);
            }
          } else {
            updateStatus("Failed to confirm message.", { error: data.error });
          }
        } catch (error) {
          updateStatus("Failed to confirm message.", { error: error.message });
        }
      });
    }

    ui.messagesList.appendChild(wrapper);
  }

  // ==================== Event Listeners ====================

  function registerEventListeners() {
    if (ui.loginButton) {
      ui.loginButton.addEventListener("click", handleLogin);
    }
    if (ui.showSignUpButton) {
      ui.showSignUpButton.addEventListener("click", showSignUpSection);
    }
    if (ui.backToLoginButton) {
      ui.backToLoginButton.addEventListener("click", showLoginSection);
    }
    if (ui.signUp) {
      ui.signUp.addEventListener("click", handleSignUp);
    }
    if (ui.logoutButton) {
      ui.logoutButton.addEventListener("click", handleLogout);
    }
    if (ui.logoutButtonTop) {
      ui.logoutButtonTop.addEventListener("click", handleLogout);
    }
    if (ui.createGroup) {
      ui.createGroup.addEventListener("click", handleCreateGroup);
    }
    if (ui.addMember) {
      ui.addMember.addEventListener("click", buildMembershipHandler("addMember"));
    }
    if (ui.removeMember) {
      ui.removeMember.addEventListener("click", buildMembershipHandler("removeMember"));
    }
    if (ui.sendMessage) {
      ui.sendMessage.addEventListener("click", handleSendMessage);
    }
    if (ui.refreshGroups) {
      ui.refreshGroups.addEventListener("click", refreshGroups);
    }
    if (ui.messageGroupSelect) {
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
          ui.messagesList.innerHTML = '<p class="muted">Select a group to view its messages.</p>';
        }
      });
    }
  }

  // ==================== Bootstrap ====================

  async function bootstrap() {
    registerEventListeners();
    updateSignedInUI();
    
    // Check if already logged in
    const isAuthenticated = await checkAuthStatus();
    if (isAuthenticated) {
      // Need to get password from user for decryption
      // For now, we'll prompt when needed
      updateStatus(`Welcome back, ${state.username}!`);
      await refreshGroups();
    }
  }

  bootstrap().catch((error) => {
    updateStatus("Failed to bootstrap application.", { error: error.message });
  });
})();
