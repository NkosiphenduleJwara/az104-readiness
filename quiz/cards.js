// AZ-104 flashcards. One card per practice-test miss.
// To add a card: append an object. `options` must include `answer` exactly once.
// `hard: true` cards show a Hint button in quiz mode.
window.DECK_UPDATED = "2026-11-25";
window.CARDS = [
  {
    id: "PT1-Q2", domain: "Identity & governance", source: "Practice Test 1", hard: true,
    question: "Users get repeated sign-in prompts at myapps.microsoft.com and must use an @onmicrosoft.com name. UPNs don't match on-prem AD. What do you do first to get SSO working?",
    answer: "Add and verify a custom domain name in Entra ID",
    options: ["Add and verify a custom domain name in Entra ID", "Deploy a clustered AD FS farm on-premises", "Request a new certificate with the AD domain name", "Change filtering options in Entra ID Connect"],
    explanation: "Until the custom domain is verified in Entra ID, synced users can't keep their on-prem UPN suffix, so they fall back to onmicrosoft.com.",
    hint: "The UPN suffix has to exist in the tenant before anything else can match."
  },
  {
    id: "PT1-Q3", domain: "Identity & governance", source: "Practice Test 1",
    question: "You need to add several hundred employees to an Entra administrative unit at once. Which tool?",
    answer: "Entra admin centre (portal) bulk add with CSV",
    options: ["Entra admin centre (portal) bulk add with CSV", "Microsoft 365 admin centre", "Azure CLI", "Microsoft Graph one call per user"],
    explanation: "The portal supports bulk member add from a CSV. Graph and PowerShell work per member here; Azure CLI has no admin-unit commands."
  },
  {
    id: "PT1-Q5", domain: "Identity & governance", source: "Practice Test 1", hard: true,
    question: "SSPR is on for all users: 2 methods to reset, 3 security questions to register, 3 to reset. Must the user answer a specific registered question to reset?",
    answer: "Yes",
    options: ["Yes", "No"],
    explanation: "With 3 questions registered and 3 required to reset, every registered question gets asked.",
    hint: "Compare 'questions to register' with 'questions to reset'."
  },
  {
    id: "PT1-Q9", domain: "Identity & governance", source: "Practice Test 1", hard: true,
    question: "A storage account has a CanNotDelete lock. The target resource group also has a CanNotDelete lock. Can you move the account to that group?",
    answer: "Yes",
    options: ["Yes", "No"],
    explanation: "CanNotDelete blocks deletion only. Moves are allowed. ReadOnly is the lock that blocks changes.",
    hint: "Read the lock name literally."
  },
  {
    id: "PT1-Q14", domain: "Storage", source: "Practice Test 1",
    question: "Users must download one blob, securely, for one day only. What do you give them?",
    answer: "A shared access signature (SAS) with a 1-day expiry",
    options: ["A shared access signature (SAS) with a 1-day expiry", "The storage account access keys", "Public access on the container", "Public access on the blob"],
    explanation: "A SAS is scoped and time-limited. Keys give full account access; public access has no expiry."
  },
  {
    id: "PT1-Q16", domain: "Storage", source: "Practice Test 1",
    question: "You have GPv1, GPv2 and Blob Storage accounts. Which supports the Archive tier (exam answer)?",
    answer: "General Purpose v2 only",
    options: ["General Purpose v2 only", "General Purpose v1 only", "All storage accounts", "GPv1 and GPv2"],
    explanation: "GPv2 supports Hot, Cool, Cold and Archive. GPv1 has no access tiers. Pick GPv2 on the exam."
  },
  {
    id: "PT1-Q17", domain: "Storage", source: "Practice Test 1",
    question: "You ship about 6 TB with Azure Import/Export. Which destination is valid?",
    answer: "Azure Blob Storage",
    options: ["Azure Blob Storage", "Azure SQL Database", "Azure File Sync storage", "Azure Data Lake Storage"],
    explanation: "Import/Export imports into Blob Storage (and Azure Files). Not SQL Database or File Sync."
  },
  {
    id: "PT1-Q18", domain: "Storage", source: "Practice Test 1",
    question: "What does a Content Delivery Network (CDN) give you?",
    answer: "Less traffic to your web server for static files",
    options: ["Less traffic to your web server for static files", "Cheap fast storage to retrieve data later", "Session state for each visitor", "Managed OS updates for your VM"],
    explanation: "A CDN caches static content (images, video, PDFs) at edge servers near users."
  },
  {
    id: "PT1-Q19", domain: "Storage", source: "Practice Test 1",
    question: "Users mount an Azure file share from home. Which port must be open?",
    answer: "445",
    options: ["445", "443", "80", "3389"],
    explanation: "Azure Files uses SMB over TCP 445. Many ISPs block it; use VPN, ExpressRoute or File Sync then."
  },
  {
    id: "PT1-Q21", domain: "Monitor & maintain", source: "Practice Test 1", hard: true,
    question: "100 VMs, 10 Azure SQL databases, 50 file shares. Daily backup with Azure Backup. Minimum number of backup policies?",
    answer: "2",
    options: ["2", "1", "3", "160"],
    explanation: "One policy for VMs, one for file shares. Azure SQL Database (PaaS) backs itself up automatically.",
    hint: "One of the three resource types needs no Azure Backup policy at all."
  },
  {
    id: "PT1-Q22", domain: "Monitor & maintain", source: "Practice Test 1", hard: true,
    question: "A Recovery Services vault sits in West Europe. Which VMs can it back up?",
    answer: "Only VMs in the same region as the vault",
    options: ["Only VMs in the same region as the vault", "Any VM in the subscription", "Only VMs in the same resource group", "Only VMs in a paired region"],
    explanation: "The vault and the VM must be in the same region. Resource group doesn't matter.",
    hint: "Think location, not resource group."
  },
  {
    id: "PT1-Q26", domain: "Compute", source: "Practice Test 1",
    question: "Two of three VMs must stay up if a whole datacentre fails. Does an availability set meet this?",
    answer: "No, use availability zones",
    options: ["No, use availability zones", "Yes, availability sets cover datacentre loss", "Yes, with 3 fault domains", "No, use a scale set in one zone"],
    explanation: "Availability sets protect against rack and update failures inside one datacentre. Zones are separate datacentres."
  },
  {
    id: "PT1-Q28", domain: "Compute", source: "Practice Test 1",
    question: "Maximum fault domains and update domains in an availability set?",
    answer: "3 fault domains, 20 update domains",
    options: ["3 fault domains, 20 update domains", "2 fault domains, 10 update domains", "20 fault domains, 3 update domains", "Unlimited"],
    explanation: "Up to 3 FDs (racks) and 20 UDs (reboot groups)."
  },
  {
    id: "PT1-Q31", domain: "Compute", source: "Practice Test 1", hard: true,
    question: "Which statement about Azure Disk Encryption (ADE) is true?",
    answer: "ADE uses BitLocker on Windows and DM-Crypt on Linux",
    options: ["ADE uses BitLocker on Windows and DM-Crypt on Linux", "ADE VMs can't be backed up to a Recovery Services vault", "ADE keys can live in any region's Key Vault", "ADE uses DM-Crypt on Windows"],
    explanation: "Keys sit in Azure Key Vault in the same region and subscription as the VM. ADE VMs can be backed up.",
    hint: "Each OS uses its own native encryption tool."
  },
  {
    id: "PT1-Q32", domain: "Compute", source: "Practice Test 1", hard: true,
    question: "Plan1 Linux East US, Plan2 Windows East US, Plan3 Windows UK South. A .NET Core app must run in East US. Which plans can host it?",
    answer: "Plan1 and Plan2",
    options: ["Plan1 and Plan2", "Plan2 only", "Plan2 and Plan3", "All three"],
    explanation: "The app and its plan must share a region. .NET Core runs on Windows or Linux.",
    hint: "Filter by region first, then by OS."
  },
  {
    id: "PT1-Q33", domain: "Compute", source: "Practice Test 1", hard: true,
    question: "Web app on Basic B1. You want automatic scale-out to 10 instances, cheapest way. Which two steps?",
    answer: "Scale up to S1, then scale out based on a metric",
    options: ["Scale up to S1, then scale out based on a metric", "Scale out on B1 based on a schedule", "Scale up to P1, then scale out on a schedule", "Scale up based on a metric"],
    explanation: "Basic has no autoscale. Standard is the cheapest tier with it. Scale out = more instances.",
    hint: "Which is the cheapest tier that supports autoscale?"
  },
  {
    id: "PT1-Q37", domain: "Networking", source: "Practice Test 1", hard: true,
    question: "A second computer needs point-to-site VPN with a self-signed cert. Is installing the VPN client package enough?",
    answer: "No, also install the exported client certificate",
    options: ["No, also install the exported client certificate", "Yes, the package holds everything", "No, create a new VPN gateway", "Yes, after a reboot"],
    explanation: "Export the client cert (with private key) from the first computer and install it on the second.",
    hint: "Certificate authentication needs a certificate on every client."
  },
  {
    id: "PT1-Q41", domain: "Networking", source: "Practice Test 1",
    question: "Encrypted private link from an East US VNet to a data source in Japan with no public endpoint. Best option?",
    answer: "Global VNet peering",
    options: ["Global VNet peering", "VPN gateways in both regions", "Public endpoint with a firewall", "ExpressRoute"],
    explanation: "Global peering keeps traffic on the Microsoft backbone, privately, with no gateways."
  },
  {
    id: "PT1-Q45", domain: "Networking", source: "Practice Test 1", hard: true,
    question: "NSG on a VM NIC: Deny ports 50-60, Allow RDP, Allow port 80. You delete the port-80 rule. What can internet users reach?",
    answer: "RDP only",
    options: ["RDP only", "RDP and web", "RDP, web and DNS", "Nothing"],
    explanation: "DNS (53) is in the denied range; web lost its Allow. Default inbound rule denies the rest.",
    hint: "Which port does DNS use?"
  },
  {
    id: "PT1-Q46", domain: "Networking", source: "Practice Test 1",
    question: "Only the default NSG rules exist. Can VMs reach the internet?",
    answer: "Yes",
    options: ["Yes", "No"],
    explanation: "Default outbound rule AllowInternetOutBound permits it."
  },
  {
    id: "PT1-Q49", domain: "Networking", source: "Practice Test 1",
    question: "Allow traffic to certain FQDNs through Azure Firewall. Which rule type?",
    answer: "Application rule collection",
    options: ["Application rule collection", "Network rule collection", "NAT rule collection", "FQDN rule collection"],
    explanation: "Application rules filter by FQDN. Network rules use IPs and ports. NAT rules translate inbound traffic."
  },
  {
    id: "PT1-Q50", domain: "Networking", source: "Practice Test 1", hard: true,
    question: "Users reach an app over P2S and S2S VPN. Spread connections across the VMs. Which two could you use?",
    answer: "Internal load balancer or Application Gateway",
    options: ["Internal load balancer or Application Gateway", "Public load balancer or Traffic Manager", "Front Door or public load balancer", "Traffic Manager or Front Door"],
    explanation: "VPN users connect to private IPs, so you need a private (internal) front end.",
    hint: "VPN users hit private IP addresses."
  },
  {
    id: "PT1-Q51", domain: "Networking", source: "Practice Test 1",
    question: "Protect web servers from SQL injection attacks.",
    answer: "Application Gateway with WAF",
    options: ["Application Gateway with WAF", "Application Gateway Standard tier", "Network security group", "Public load balancer"],
    explanation: "Only the Web Application Firewall inspects HTTP for SQL injection."
  },
  {
    id: "PT1-Q53", domain: "Monitor & maintain", source: "Practice Test 1",
    question: "Is an NSG rule stopping a packet reaching a VM? Which Network Watcher tool?",
    answer: "IP flow verify",
    options: ["IP flow verify", "Next hop", "Packet capture", "Traffic analytics"],
    explanation: "IP flow verify names the rule that allows or denies. Next hop is for routing."
  },
  {
    id: "PT1-Q55", domain: "Monitor & maintain", source: "Practice Test 1", hard: true,
    question: "First step to collect diagnostics from an Azure VM (as the practice test words it)?",
    answer: "Create a storage account to store it",
    options: ["Create a storage account to store it", "Install a diagnostics agent", "Grant RBAC to the requester", "Enable boot diagnostics only"],
    explanation: "The test's answer reflects the old diagnostics extension. Today: Azure Monitor Agent + data collection rule sending to a Log Analytics workspace. Know both.",
    hint: "The old diagnostics extension had to write its data somewhere first."
  }
];
