# CertChain: Blockchain-Based Academic Certificate Verification

A decentralized application (DApp) on Ethereum for issuing, verifying and revoking academic certificates.
Built for Blockchain Technology (CSE4444), Assignment 2.

## 1. Problem addressed

Paper and PDF certificates are easy to forge, and employers or universities usually have to email the
institution to confirm one. CertChain stores each certificate on the blockchain, so anyone can verify a
certificate ID in seconds, and the record cannot be altered or silently deleted.

**Roles**

| Role | Can do |
|---|---|
| Owner (deployer) | Add or remove issuers, issue, revoke any certificate |
| Issuer | Issue certificates, revoke certificates they issued |
| Anyone | Verify a certificate and view its details |

## 2. Project structure

```
CertChain-DApp/
  contracts/CertificateRegistry.sol   Solidity smart contract
  frontend/index.html                 User interface
  frontend/style.css                  Styling
  frontend/app.js                     Ethers.js + MetaMask logic
  deployment/deployment-details.md    Network, address, tx hash
  screenshots/                        Evidence images
  README.md
```

## 3. Smart contract summary

- **Constructor:** sets the owner and institution name; the owner is registered as the first issuer.
- **State variables:** `owner`, `institutionName`, `totalCertificates`, mappings for certificates and issuers.
- **Functions:** `addIssuer`, `removeIssuer`, `issueCertificate`, `revokeCertificate`, `verifyCertificate`, `getCertificate`.
- **Validation:** non-empty and length-limited inputs, duplicate prevention (same student and course), zero-address check, role checks via modifiers, existence and already-revoked checks.
- **Events:** `IssuerAdded`, `IssuerRemoved`, `CertificateIssued`, `CertificateRevoked`.

## 4. How to run

### Prerequisites
- Chrome, Brave or Firefox with the MetaMask extension
- Python 3 (only to serve the frontend locally) or VS Code with Live Server
- Test ETH: Sepolia faucet, or Ganache accounts

### Steps
1. Open [Remix IDE](https://remix.ethereum.org) and create `CertificateRegistry.sol`; paste the contract from `contracts/`.
2. In the **Solidity Compiler** tab, select 0.8.20 or newer and click **Compile**.
3. In **Deploy & Run**, choose the environment:
   - Sepolia: **Injected Provider - MetaMask**, with MetaMask on Sepolia, or
   - Ganache: **Dev - Ganache Provider** (or External Http Provider at `http://127.0.0.1:7545`).
4. Enter the constructor argument (institution name) and click **Deploy**. Confirm in MetaMask if prompted.
5. Copy the deployed contract address and paste it into `CONTRACT_ADDRESS` in `frontend/app.js`.
6. Serve the frontend:
   ```
   cd frontend
   python -m http.server 5500
   ```
7. Open `http://localhost:5500` in the browser where MetaMask is installed.

## 5. Connecting MetaMask

1. Select the same network used for deployment (Sepolia, or a custom network for Ganache: RPC `http://127.0.0.1:7545`, chain ID `1337`).
2. Use the deployer account first (it is the owner).
3. Click **Connect MetaMask** and approve the connection request.
4. The header shows your address, network and role (Owner, Issuer or Visitor).
5. To test unauthorised actions, switch to a second MetaMask account; the page reloads automatically.

## 6. Deployment

| Item | Value |
|---|---|
| Network | _fill in_ |
| Contract address | _fill in_ |
| Deployment tx hash | _fill in_ |

## 7. Test cases

Accounts: **A** = owner/deployer, **B** = issuer added by A, **C** = account with no role.

| # | Type | Action | Account | Expected result | Observed result |
|---|---|---|---|---|---|
| 1 | Valid | Deploy with institution name | A | Deployment succeeds, A is owner and issuer | _fill in_ |
| 2 | Valid | Add B as issuer | A | Tx succeeds, `IssuerAdded` event | _fill in_ |
| 3 | Valid | Issue certificate (Asha Rao, Data Structures, A) | A | Tx succeeds, ID 1 created | _fill in_ |
| 4 | Valid | Issue certificate (Ravi Kumar, Operating Systems, B+) | B | Tx succeeds, ID 2 created | _fill in_ |
| 5 | Valid | Verify certificate 1 | Any | Shows VALID with correct details | _fill in_ |
| 6 | Valid | Revoke certificate 2 | B | Tx succeeds, verify shows REVOKED | _fill in_ |
| 7 | Valid | Remove issuer B | A | Tx succeeds, B role becomes Visitor | _fill in_ |
| 8 | Invalid | Issue with empty student name | A | Reverts: "Student name must be 1 to 100 characters" | _fill in_ |
| 9 | Invalid | Issue with empty grade | A | Reverts: "Grade must be 1 to 10 characters" | _fill in_ |
| 10 | Invalid | Issue duplicate (Asha Rao, Data Structures) | A | Reverts: "Certificate already issued for this student and course" | _fill in_ |
| 11 | Invalid | Revoke already revoked certificate 2 | A | Reverts: "Certificate already revoked" | _fill in_ |
| 12 | Invalid | Revoke certificate 99 | A | Reverts: "Certificate does not exist" | _fill in_ |
| 13 | Invalid | Verify certificate 99 | Any | UI shows "No certificate with ID 99 exists" | _fill in_ |
| 14 | Invalid | Add issuer with zero address (Remix) | A | Reverts: "Invalid issuer address" | _fill in_ |
| 15 | Unauthorised | Issue certificate | C | Reverts: "Caller is not an authorised issuer" | _fill in_ |
| 16 | Unauthorised | Add issuer | C | Reverts: "Only the owner can do this" | _fill in_ |
| 17 | Unauthorised | Remove issuer | B | Reverts: "Only the owner can do this" | _fill in_ |
| 18 | Unauthorised | Revoke certificate 1 (issued by A) | C | Reverts: "Only the original issuer or owner can revoke" | _fill in_ |
| 19 | Unauthorised | Issue certificate after being removed | B | Reverts: "Caller is not an authorised issuer" | _fill in_ |

## 8. Screenshots

| Evidence | File |
|---|---|
| Smart contract compilation | `screenshots/01-compile.png` |
| Smart contract deployment | `screenshots/02-deploy.png` |
| MetaMask wallet connection | `screenshots/03-metamask-connect.png` |
| Successful transaction | `screenshots/04-success-tx.png` |
| Failed transaction | `screenshots/05-failed-tx.png` |
| Blockchain data in the UI | `screenshots/06-ui-data.png` |

![Compile](screenshots/01-compile.png)
![Deploy](screenshots/02-deploy.png)
![MetaMask connect](screenshots/03-metamask-connect.png)
![Successful transaction](screenshots/04-success-tx.png)
![Failed transaction](screenshots/05-failed-tx.png)
![UI data](screenshots/06-ui-data.png)

## 9. Security note

No private keys, seed phrases or credentials are stored in this repository.
