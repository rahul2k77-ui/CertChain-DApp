// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title CertificateRegistry
/// @notice On-chain registry for issuing, verifying and revoking academic certificates.
/// @dev Roles: the owner (deployer) manages issuers; issuers issue certificates;
///      anyone can verify a certificate by its ID.
contract CertificateRegistry {
    // ---------------------------------------------------------------------
    // State variables
    // ---------------------------------------------------------------------
    address public owner;
    string public institutionName;
    uint256 public totalCertificates;

    struct Certificate {
        string studentName;
        string course;
        string grade;
        uint256 issueDate;
        address issuedBy;
        bool revoked;
    }

    mapping(uint256 => Certificate) private certificates;
    mapping(bytes32 => bool) private issuedHashes; // blocks duplicate (student, course) pairs
    mapping(address => bool) public isIssuer;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------
    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);
    event CertificateIssued(
        uint256 indexed certId,
        string studentName,
        string course,
        address indexed issuedBy
    );
    event CertificateRevoked(uint256 indexed certId, address indexed revokedBy);

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can do this");
        _;
    }

    modifier onlyIssuer() {
        require(isIssuer[msg.sender], "Caller is not an authorised issuer");
        _;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------
    constructor(string memory _institutionName) {
        require(bytes(_institutionName).length > 0, "Institution name required");
        owner = msg.sender;
        institutionName = _institutionName;
        isIssuer[msg.sender] = true;
        emit IssuerAdded(msg.sender);
    }

    // ---------------------------------------------------------------------
    // Owner functions
    // ---------------------------------------------------------------------
    function addIssuer(address issuer) external onlyOwner {
        require(issuer != address(0), "Invalid issuer address");
        require(!isIssuer[issuer], "Address is already an issuer");
        isIssuer[issuer] = true;
        emit IssuerAdded(issuer);
    }

    function removeIssuer(address issuer) external onlyOwner {
        require(issuer != owner, "Owner cannot be removed as issuer");
        require(isIssuer[issuer], "Address is not an issuer");
        isIssuer[issuer] = false;
        emit IssuerRemoved(issuer);
    }

    // ---------------------------------------------------------------------
    // Issuer functions
    // ---------------------------------------------------------------------
    function issueCertificate(
        string calldata studentName,
        string calldata course,
        string calldata grade
    ) external onlyIssuer returns (uint256) {
        require(
            bytes(studentName).length > 0 && bytes(studentName).length <= 100,
            "Student name must be 1 to 100 characters"
        );
        require(
            bytes(course).length > 0 && bytes(course).length <= 100,
            "Course must be 1 to 100 characters"
        );
        require(
            bytes(grade).length > 0 && bytes(grade).length <= 10,
            "Grade must be 1 to 10 characters"
        );

        bytes32 key = keccak256(abi.encode(studentName, course));
        require(!issuedHashes[key], "Certificate already issued for this student and course");
        issuedHashes[key] = true;

        totalCertificates += 1;
        uint256 certId = totalCertificates;

        certificates[certId] = Certificate({
            studentName: studentName,
            course: course,
            grade: grade,
            issueDate: block.timestamp,
            issuedBy: msg.sender,
            revoked: false
        });

        emit CertificateIssued(certId, studentName, course, msg.sender);
        return certId;
    }

    /// @notice The original issuer or the owner can revoke a certificate.
    function revokeCertificate(uint256 certId) external {
        require(_exists(certId), "Certificate does not exist");
        Certificate storage cert = certificates[certId];
        require(
            msg.sender == cert.issuedBy || msg.sender == owner,
            "Only the original issuer or owner can revoke"
        );
        require(!cert.revoked, "Certificate already revoked");

        cert.revoked = true;
        emit CertificateRevoked(certId, msg.sender);
    }

    // ---------------------------------------------------------------------
    // Public read functions
    // ---------------------------------------------------------------------
    /// @return exists Whether the ID was ever issued
    /// @return valid  True only if it exists and has not been revoked
    function verifyCertificate(uint256 certId) external view returns (bool exists, bool valid) {
        exists = _exists(certId);
        valid = exists && !certificates[certId].revoked;
    }

    function getCertificate(uint256 certId)
        external
        view
        returns (
            string memory studentName,
            string memory course,
            string memory grade,
            uint256 issueDate,
            address issuedBy,
            bool revoked
        )
    {
        require(_exists(certId), "Certificate does not exist");
        Certificate storage c = certificates[certId];
        return (c.studentName, c.course, c.grade, c.issueDate, c.issuedBy, c.revoked);
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------
    function _exists(uint256 certId) internal view returns (bool) {
        return certId > 0 && certId <= totalCertificates;
    }
}
