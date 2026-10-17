// ---------------------------------------------------------------------------
// CONFIG: paste your deployed contract address below after deploying in Remix
// ---------------------------------------------------------------------------
const CONTRACT_ADDRESS = "0xE75f40be301B35Ec446EeE83a6C74B703C19C2E3";

const ABI = [
  "function owner() view returns (address)",
  "function institutionName() view returns (string)",
  "function totalCertificates() view returns (uint256)",
  "function isIssuer(address) view returns (bool)",
  "function addIssuer(address issuer)",
  "function removeIssuer(address issuer)",
  "function issueCertificate(string studentName, string course, string grade) returns (uint256)",
  "function revokeCertificate(uint256 certId)",
  "function verifyCertificate(uint256 certId) view returns (bool exists, bool valid)",
  "function getCertificate(uint256 certId) view returns (string studentName, string course, string grade, uint256 issueDate, address issuedBy, bool revoked)",
  "event CertificateIssued(uint256 indexed certId, string studentName, string course, address indexed issuedBy)"
];

let provider, signer, contract, userAddress;

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function short(addr) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function errorText(err) {
  // Ethers v6 puts the Solidity revert message in err.reason when available
  return err.reason || err.shortMessage || err.info?.error?.message || err.message || "Unknown error";
}

function addLog(text, type = "pending") {
  const list = $("log");
  const empty = list.querySelector(".empty");
  if (empty) empty.remove();
  const li = document.createElement("li");
  li.className = type;
  li.textContent = text;
  list.prepend(li);
  return li;
}

function setLog(li, text, type) {
  li.textContent = text;
  li.className = type;
}

function showVerifyMessage(text, info = false) {
  const el = $("verifyMsg");
  el.textContent = text;
  el.className = "msg" + (info ? " info" : "");
  el.hidden = false;
}

function requireConnection() {
  if (!contract) {
    addLog("Connect MetaMask first.", "fail");
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Wallet connection
// ---------------------------------------------------------------------------
async function connectWallet() {
  if (!window.ethereum) {
    addLog("MetaMask not found. Install the extension and reload this page.", "fail");
    return;
  }
  if (CONTRACT_ADDRESS.startsWith("PASTE")) {
    addLog("Set CONTRACT_ADDRESS in app.js before connecting.", "fail");
    return;
  }
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === "0x") {
      addLog("No contract found at this address on the selected network. Check the network in MetaMask.", "fail");
      return;
    }
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    await refreshAll();
    addLog("Wallet connected: " + userAddress, "ok");
  } catch (err) {
    addLog("Connection failed: " + errorText(err), "fail");
  }
}

async function refreshAll() {
  const net = await provider.getNetwork();
  const [ownerAddr, name, total, issuer] = await Promise.all([
    contract.owner(),
    contract.institutionName(),
    contract.totalCertificates(),
    contract.isIssuer(userAddress)
  ]);

  $("institution").textContent = name;
  $("account").textContent = short(userAddress);
  $("network").textContent = net.name === "unknown" ? "Chain ID " + net.chainId : net.name;
  $("owner").textContent = ownerAddr;
  $("total").textContent = total.toString();

  let role = "Visitor";
  if (userAddress.toLowerCase() === ownerAddr.toLowerCase()) role = "Owner";
  else if (issuer) role = "Issuer";
  $("role").textContent = role;

  $("walletInfo").hidden = false;
  $("connectBtn").textContent = "Connected";
  $("connectBtn").disabled = true;
}

// ---------------------------------------------------------------------------
// Send a transaction and report pending / success / failure
// ---------------------------------------------------------------------------
async function sendTx(label, fn) {
  if (!requireConnection()) return null;
  const li = addLog(label + ": waiting for MetaMask confirmation...", "pending");
  try {
    const tx = await fn();
    setLog(li, label + ": submitted (" + tx.hash + "), waiting for block...", "pending");
    const receipt = await tx.wait();
    setLog(li, label + ": confirmed in block " + receipt.blockNumber + " | tx " + tx.hash, "ok");
    await refreshAll();
    return receipt;
  } catch (err) {
    setLog(li, label + " FAILED: " + errorText(err), "fail");
    return null;
  }
}

// ---------------------------------------------------------------------------
// Contract actions
// ---------------------------------------------------------------------------
async function issueCertificate() {
  const name = $("iName").value.trim();
  const course = $("iCourse").value.trim();
  const grade = $("iGrade").value.trim();

  // No client-side blocking: empty values are sent on purpose so that the
  // contract's own validation (and its revert message) can be demonstrated.
  const receipt = await sendTx("Issue certificate", () => contract.issueCertificate(name, course, grade));
  if (!receipt) return;

  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed && parsed.name === "CertificateIssued") {
        addLog("New certificate ID: " + parsed.args.certId.toString(), "ok");
        $("verifyId").value = parsed.args.certId.toString();
      }
    } catch (e) { /* log from another contract, ignore */ }
  }
  $("iName").value = $("iCourse").value = $("iGrade").value = "";
}

async function revokeCertificate() {
  const id = $("revokeId").value;
  if (!id) return addLog("Enter a certificate ID to revoke.", "fail");
  await sendTx("Revoke certificate " + id, () => contract.revokeCertificate(id));
}

async function addIssuer() {
  const addr = $("issuerAddr").value.trim();
  if (!ethers.isAddress(addr)) return addLog("That is not a valid wallet address.", "fail");
  await sendTx("Add issuer", () => contract.addIssuer(addr));
}

async function removeIssuer() {
  const addr = $("issuerAddr").value.trim();
  if (!ethers.isAddress(addr)) return addLog("That is not a valid wallet address.", "fail");
  await sendTx("Remove issuer", () => contract.removeIssuer(addr));
}

async function verifyCertificate() {
  if (!requireConnection()) return;
  $("result").hidden = true;
  $("verifyMsg").hidden = true;

  const id = $("verifyId").value;
  if (!id) return showVerifyMessage("Enter a certificate ID first.");

  try {
    const [exists, valid] = await contract.verifyCertificate(id);
    if (!exists) {
      return showVerifyMessage("No certificate with ID " + id + " exists in this registry.");
    }
    const c = await contract.getCertificate(id);
    $("rName").textContent = c.studentName;
    $("rCourse").textContent = c.course;
    $("rGrade").textContent = c.grade;
    $("rDate").textContent = new Date(Number(c.issueDate) * 1000).toLocaleDateString(undefined, { dateStyle: "long" });
    $("rId").textContent = id;
    $("rIssuer").textContent = c.issuedBy;

    const stamp = $("stamp");
    stamp.textContent = valid ? "VALID" : "REVOKED";
    stamp.className = "stamp " + (valid ? "valid" : "revoked");
    $("result").hidden = false;
  } catch (err) {
    showVerifyMessage("Lookup failed: " + errorText(err));
  }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
$("connectBtn").addEventListener("click", connectWallet);
$("verifyBtn").addEventListener("click", verifyCertificate);
$("issueBtn").addEventListener("click", issueCertificate);
$("revokeBtn").addEventListener("click", revokeCertificate);
$("addIssuerBtn").addEventListener("click", addIssuer);
$("removeIssuerBtn").addEventListener("click", removeIssuer);

if (window.ethereum) {
  // Reload on account or network change so the UI never shows stale data
  window.ethereum.on("accountsChanged", () => window.location.reload());
  window.ethereum.on("chainChanged", () => window.location.reload());
}
