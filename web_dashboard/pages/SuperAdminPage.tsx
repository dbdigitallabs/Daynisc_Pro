// src/pages/SuperAdminPage.tsx
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import api from "../store/apiClient";
import { T, cardStyle, badge } from "../store/theme";
import { toast } from "react-hot-toast";

// ── Icons ───────────────────────────────────────────────────────────────────
const IconBuilding = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="3" y="9" width="18" height="13" rx="2" ry="2" />
    <path d="M8 22V8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14" />
  </svg>
);

const IconPlus = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconShield = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconSettings = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconBarChart = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const IconUserPlus = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

// ── Interface Types ──────────────────────────────────────────────────────────
interface Company {
  id: string;
  name: string;
  gstin: string;
  plan: string;
  parent_id: string | null;
  admins: { name: string; phone: string; role: string; email?: string }[];
}

interface OrgNode {
  id: string;
  type: "company" | "employee";
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  plan?: string;
  gstin?: string;
  children: OrgNode[];
}

// Internal Employee reporting tree helper
function buildCompanyEmployeeTree(admins: Company["admins"]): OrgNode | null {
  if (!admins || admins.length === 0) return null;

  const level1: OrgNode[] = [];
  const level2: OrgNode[] = [];
  const level3: OrgNode[] = [];

  admins.forEach((a) => {
    const node: OrgNode = {
      id: `emp-${a.phone}`,
      type: "employee",
      name: a.name,
      role: a.role,
      phone: a.phone,
      email: a.email || "",
      children: [],
    };

    const r = a.role.toLowerCase();
    if (r === "super_admin" || r === "company_admin" || r === "owner") {
      level1.push(node);
    } else if (
      r === "accountant" ||
      r === "inventory_manager" ||
      r === "production_supervisor"
    ) {
      level2.push(node);
    } else {
      level3.push(node);
    }
  });

  if (level1.length === 0) {
    if (level2.length > 0) level1.push(level2.shift()!);
    else if (level3.length > 0) level1.push(level3.shift()!);
    else return null;
  }

  const ceo = level1[0];

  // Other level 1 admins report to ceo
  for (let i = 1; i < level1.length; i++) {
    ceo.children.push(level1[i]);
  }

  // Level 2 reports to ceo
  level2.forEach((m) => {
    ceo.children.push(m);

    // Level 3 subordinates report to level 2 managers
    const r = m.role?.toLowerCase() || "";
    if (r === "inventory_manager") {
      level3
        .filter((emp) => emp.role?.toLowerCase() === "warehouse_operator")
        .forEach((emp) => m.children.push(emp));
    } else if (r === "accountant") {
      level3
        .filter((emp) => emp.role?.toLowerCase() === "sales_rep")
        .forEach((emp) => m.children.push(emp));
    }
  });

  // Remaining level 3 report directly to CEO
  level3.forEach((emp) => {
    const roleStr = emp.role?.toLowerCase() || "";
    if (roleStr !== "warehouse_operator" && roleStr !== "sales_rep") {
      ceo.children.push(emp);
    }
  });

  return ceo;
}

// Unified Tree Builder
function buildUnifiedTree(companies: Company[]): OrgNode[] {
  const map: Record<string, OrgNode> = {};
  const roots: OrgNode[] = [];

  companies.forEach((c) => {
    map[c.id] = {
      id: c.id,
      type: "company",
      name: c.name,
      plan: c.plan,
      gstin: c.gstin,
      children: [],
    };
  });

  companies.forEach((c) => {
    const node = map[c.id];

    // Build internal employee reporting tree
    const empRoot = buildCompanyEmployeeTree(c.admins);
    if (empRoot) {
      node.children.push(empRoot);
    }

    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function getPlanBadgeStyles(plan: string): React.CSSProperties {
  const p = (plan || "").toLowerCase();
  if (p === "enterprise") return badge(T.purple, T.purpleBg);
  if (p === "factory") return badge(T.amber, T.amberBg);
  if (p === "sme") return badge(T.cyan, T.cyanBg);
  return badge(T.primary, T.primary + "10");
}

export default function SuperAdminPage() {
  const queryClient = useQueryClient();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<"tree" | "rbac" | "plans" | "projects">("tree");
  const [selectedCompanyTreeId, setSelectedCompanyTreeId] = useState("");
  const [treeSearchVal, setTreeSearchVal] = useState("");
  const [activeTreeSearch, setActiveTreeSearch] = useState("");

  useEffect(() => {
    if (location.state?.initialTab) {
      setActiveTab(location.state.initialTab);
    }
    if (location.state?.selectedCompanyId) {
      setSelectedCompanyTreeId(location.state.selectedCompanyId);
      setActiveTab("tree");
    }
  }, [location.state]);

  const [showModal, setShowModal] = useState(false);
  const [showEmpModal, setShowEmpModal] = useState(false);

  // Form Fields State (Companies)
  const [formData, setFormData] = useState({
    name: "",
    gstin: "",
    plan: "starter",
    parent_id: "",
    sub_admin_name: "",
    sub_admin_phone: "",
  });

  // Form Fields State (Employees)
  const [empData, setEmpData] = useState({
    name: "",
    phone: "",
    role: "accountant",
    company_id: "",
  });

  // Bulk Import States
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCompanyId, setBulkCompanyId] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkParsedUsers, setBulkParsedUsers] = useState<{ name: string; phone: string; role: string; valid: boolean; error?: string }[]>([]);

  const VALID_ROLES = ["company_admin", "accountant", "inventory_manager", "production_supervisor", "sales_rep", "warehouse_operator"];

  const cleanRole = (roleStr: string): string => {
    const r = (roleStr || "").trim().toLowerCase().replace(/[\s_-]+/g, "_");
    if (r === "ceo" || r === "admin" || r === "company_admin") return "company_admin";
    if (r === "accountant" || r === "accounting") return "accountant";
    if (r === "inventory" || r === "inventory_manager") return "inventory_manager";
    if (r === "production" || r === "production_supervisor" || r === "supervisor") return "production_supervisor";
    if (r === "sales" || r === "sales_rep" || r === "representative") return "sales_rep";
    if (r === "warehouse" || r === "warehouse_operator" || r === "operator") return "warehouse_operator";
    return r;
  };

  const parseBulkText = (text: string) => {
    if (!text.trim()) {
      setBulkParsedUsers([]);
      return;
    }
    const lines = text.split("\n");
    const parsed = lines.map((line) => {
      const parts = line.split(/[,\t;]+/);
      if (parts.length < 2) {
        if (!line.trim()) return null;
        return { name: line.trim(), phone: "", role: "", valid: false, error: "Missing phone/role" };
      }
      const name = parts[0]?.trim() || "";
      const phone = parts[1]?.trim().replace(/\D/g, "") || "";
      const rawRole = parts[2]?.trim() || "accountant";
      const role = cleanRole(rawRole);

      let valid = true;
      let error = "";

      if (!name) {
        valid = false;
        error = "Name is required. ";
      }
      if (phone.length !== 10) {
        valid = false;
        error += "Phone must be 10 digits. ";
      }
      if (!VALID_ROLES.includes(role)) {
        valid = false;
        error += `Invalid role: "${rawRole}". `;
      }

      return { name, phone, role, valid, error: error.trim() };
    }).filter(Boolean) as { name: string; phone: string; role: string; valid: boolean; error?: string }[];
    
    setBulkParsedUsers(parsed);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBulkText(text);
      parseBulkText(text);
    };
    reader.readAsText(file);
  };

  // Query: Get Companies list
  const { data, isLoading } = useQuery<{ companies: Company[] }>({
    queryKey: ["super-admin-companies"],
    queryFn: () => api.get("/super-admin/companies").then((r) => r.data),
  });

  // Mutation: Create Company
  const createCompanyMutation = useMutation({
    mutationFn: (payload: typeof formData) =>
      api.post("/super-admin/companies", {
        ...payload,
        parent_id: payload.parent_id === "" ? null : payload.parent_id,
      }),
    onSuccess: () => {
      toast.success("Successfully created business branch & sub-admin!");
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
      setShowModal(false);
      setFormData({
        name: "",
        gstin: "",
        plan: "starter",
        parent_id: "",
        sub_admin_name: "",
        sub_admin_phone: "",
      });
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.detail || "Failed to create business branch.";
      toast.error(errMsg);
    },
  });

  // Mutation: Create Employee/User Node
  const createEmployeeMutation = useMutation({
    mutationFn: (payload: typeof empData) =>
      api.post("/super-admin/users", payload),
    onSuccess: () => {
      toast.success(`Successfully added employee '${empData.name}' to company tree!`);
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
      setShowEmpModal(false);
      setEmpData({
        name: "",
        phone: "",
        role: "accountant",
        company_id: "",
      });
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.detail || "Failed to add employee node.";
      toast.error(errMsg);
    },
  });

  // Mutation: Bulk Import Employees
  const createUsersBulkMutation = useMutation({
    mutationFn: (payload: { company_id: string; users: { name: string; phone: string; role: string }[] }) =>
      api.post("/super-admin/users/bulk", payload),
    onSuccess: (res) => {
      toast.success(res.data?.message || "Successfully imported all employees!");
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
      setShowBulkModal(false);
      setBulkText("");
      setBulkParsedUsers([]);
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.detail || "Failed to bulk import users.";
      toast.error(errMsg);
    }
  });

  // ── Role-Based Access Control State & Config ────────────────────────────────
  const roles = [
    { key: "company_admin", label: "Company Admin" },
    { key: "accountant", label: "Accountant" },
    { key: "inventory_manager", label: "Inventory Manager" },
    { key: "production_supervisor", label: "Production Supervisor" },
    { key: "sales_rep", label: "Sales Representative" },
    { key: "warehouse_operator", label: "Warehouse Operator" },
  ];

  const features = [
    { key: "dashboard", label: "Dashboard Analytics" },
    { key: "accounting", label: "Accounting & Vouchers" },
    { key: "sales", label: "Sales Invoices & Orders" },
    { key: "purchase", label: "Purchase Bills" },
    { key: "inventory", label: "Inventory Stock Control" },
    { key: "production", label: "Production Quality Control" },
    { key: "transport", label: "Transport & LR Extraction" },
    { key: "gst", label: "GST Returns Filing" },
    { key: "ai_extraction", label: "AI OCR Document Extraction" },
    { key: "tally_sync", label: "Tally prime Sync" },
  ];

  // Initial State for RBAC Matrix (Mock database state)
  const [rbacMatrix, setRbacMatrix] = useState<Record<string, Record<string, boolean>>>({
    company_admin: { dashboard: true, accounting: true, sales: true, purchase: true, inventory: true, production: true, transport: true, gst: true, ai_extraction: true, tally_sync: true },
    accountant: { dashboard: true, accounting: true, sales: true, purchase: true, gst: true, tally_sync: true },
    inventory_manager: { dashboard: true, inventory: true, purchase: true },
    production_supervisor: { dashboard: true, production: true, inventory: true },
    sales_rep: { sales: true, dashboard: true },
    warehouse_operator: { inventory: true },
  });

  const toggleRbac = (role: string, feature: string) => {
    setRbacMatrix((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [feature]: !prev[role]?.[feature],
      },
    }));
  };

  const handleSaveRbac = () => {
    const loadingToast = toast.loading("Saving Role Access configurations...");
    setTimeout(() => {
      toast.dismiss(loadingToast);
      toast.success("Role-Based Access Control (RBAC) policies updated successfully!");
    }, 1000);
  };

  // ── Subscription Plan configurations (SBAC) State & Config ──────────────────
  const plans = [
    { key: "starter", label: "Starter" },
    { key: "sme", label: "SME" },
    { key: "factory", label: "Factory" },
    { key: "enterprise", label: "Enterprise" },
  ];

  const [planLimits, setPlanLimits] = useState<Record<string, { maxUsers: number; maxInvoices: number; aiCredits: number; features: string[] }>>({
    starter: { maxUsers: 2, maxInvoices: 100, aiCredits: 20, features: ["dashboard", "sales", "purchase"] },
    sme: { maxUsers: 10, maxInvoices: 1000, aiCredits: 200, features: ["dashboard", "accounting", "sales", "purchase", "inventory", "gst", "tally_sync"] },
    factory: { maxUsers: 30, maxInvoices: 5000, aiCredits: 500, features: ["dashboard", "accounting", "sales", "purchase", "inventory", "production", "gst", "tally_sync"] },
    enterprise: { maxUsers: 999, maxInvoices: 99999, aiCredits: 9999, features: ["dashboard", "accounting", "sales", "purchase", "inventory", "production", "transport", "gst", "ai_extraction", "tally_sync"] },
  });

  const togglePlanFeature = (planKey: string, featureKey: string) => {
    setPlanLimits((prev) => {
      const currentFeatures = prev[planKey].features;
      const updatedFeatures = currentFeatures.includes(featureKey)
        ? currentFeatures.filter((f) => f !== featureKey)
        : [...currentFeatures, featureKey];

      return {
        ...prev,
        [planKey]: {
          ...prev[planKey],
          features: updatedFeatures,
        },
      };
    });
  };

  const handleLimitChange = (planKey: string, limitKey: "maxUsers" | "maxInvoices" | "aiCredits", value: number) => {
    setPlanLimits((prev) => ({
      ...prev,
      [planKey]: {
        ...prev[planKey],
        [limitKey]: value,
      },
    }));
  };

  const handleSaveSbac = () => {
    const loadingToast = toast.loading("Saving plan quota settings...");
    setTimeout(() => {
      toast.dismiss(loadingToast);
      toast.success("Subscription limits and Plan Module configurations saved!");
    }, 1000);
  };

  // ── Render Helpers ──────────────────────────────────────────────────────────
  const companiesList = data?.companies || [];
  const rootCompanies = buildUnifiedTree(companiesList);

  const findNodeInTree = (nodes: OrgNode[], targetId: string): OrgNode | null => {
    for (const n of nodes) {
      if (n.id === targetId) return n;
      const found = findNodeInTree(n.children, targetId);
      if (found) return found;
    }
    return null;
  };

  const filteredRootCompanies = selectedCompanyTreeId
    ? (() => {
        const found = findNodeInTree(rootCompanies, selectedCompanyTreeId);
        return found ? [found] : rootCompanies;
      })()
    : rootCompanies;

  const totalBusinesses = companiesList.length;
  const rootOrgs = companiesList.filter((c) => !c.parent_id).length;
  const totalSubAdmins = companiesList.reduce((acc, c) => acc + c.admins.length, 0);

  // Recursive Tree Node Renderer
  const OrgTreeNodeComponent = ({ node, depth = 0 }: { node: OrgNode; depth?: number }) => {
    const hasChildren = node.children && node.children.length > 0;

    let circleBorder = "#6366f1";
    let circleGlow = "rgba(99, 102, 241, 0.35)";
    let roleLabel = "";
    let avatarInitial = node.name[0].toUpperCase();

    if (node.type === "employee") {
      const r = node.role?.toLowerCase() || "";
      if (r === "super_admin" || r === "owner") {
        circleBorder = "#c084fc"; // purple
        circleGlow = "rgba(192, 132, 252, 0.4)";
        roleLabel = "CEO / Admin";
      } else if (r === "company_admin") {
        circleBorder = "#a855f7"; // light purple
        circleGlow = "rgba(168, 85, 247, 0.35)";
        roleLabel = "CEO";
      } else if (r === "accountant" || r === "inventory_manager" || r === "production_supervisor") {
        circleBorder = "#fbbf24"; // amber
        circleGlow = "rgba(251, 191, 36, 0.3)";
        roleLabel = node.role?.replace("_", " ") || "";
      } else {
        circleBorder = "#22d3ee"; // cyan
        circleGlow = "rgba(34, 211, 238, 0.25)";
        roleLabel = node.role?.replace("_", " ") || "";
      }
    }

    const isSuperAdmin = node.role === "super_admin";
    const userPermissions = rbacMatrix[node.role || ""] || {};

    return (
      <div className="org-branch">
        <div className="tree-node-wrapper">
          {/* Node Circle */}
          {node.type === "company" ? (
            <div className="node-circle-company">
              <IconBuilding size={32} />
            </div>
          ) : (
            <div
              className="node-circle-employee"
              style={{
                borderColor: circleBorder,
                boxShadow: `0 0 12px ${circleGlow}`,
              }}
            >
              <span>{avatarInitial}</span>
            </div>
          )}

          {/* Node Caption */}
          <div className="node-caption">
            <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              {node.name}
            </div>
            {node.type === "company" ? (
              <div className="node-role-caption" style={{ color: T.accent, fontWeight: 700, textTransform: "uppercase" }}>
                {node.plan}
              </div>
            ) : (
              <div className="node-role-caption" style={{ textTransform: "capitalize" }}>
                {roleLabel}
              </div>
            )}
          </div>

          {/* Detailed hover Tooltip Card */}
          <div className="node-tooltip">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, borderBottom: "1px solid #334155", paddingBottom: 8 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: node.type === "company" ? "#6366f1" : circleBorder,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#fff",
                }}
              >
                {node.type === "company" ? "🏢" : avatarInitial}
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {node.name}
                </div>
                <div style={{ fontSize: 10, color: node.type === "company" ? T.accent : circleBorder, fontWeight: 600, textTransform: "capitalize" }}>
                  {node.type === "company" ? `Plan: ${node.plan}` : roleLabel}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, color: "#cbd5e1" }}>
              {node.type === "company" ? (
                <>
                  {node.gstin && (
                    <div>
                      <strong>GSTIN:</strong>{" "}
                      <span style={{ fontFamily: "monospace" }}>{node.gstin}</span>
                    </div>
                  )}
                  <div>
                    <strong>Type:</strong> Root Corporate Organization
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <strong>Phone:</strong>{" "}
                    <span style={{ fontFamily: "monospace" }}>{node.phone}</span>
                  </div>
                  <div>
                    <strong>Email:</strong> {node.email}
                  </div>
                </>
              )}
            </div>

            {/* Access Permissions Grid (Dynamic) */}
            {node.type === "employee" && (
              <div style={{ marginTop: 12, borderTop: "1px solid #334155", paddingTop: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                  Module Permissions
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px" }}>
                  {features.map((f) => {
                    const hasAccess = isSuperAdmin || !!userPermissions[f.key];
                    return (
                      <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
                        <span style={{ color: hasAccess ? T.green : T.red, fontWeight: 900 }}>
                          {hasAccess ? "✓" : "×"}
                        </span>
                        <span style={{ color: hasAccess ? "#cbd5e1" : "#64748b", textTransform: "capitalize" }}>
                          {f.key.replace("_", " ")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Children Row connector */}
        {hasChildren && (
          <div className="org-children">
            {node.children.map((child) => (
              <OrgTreeNodeComponent key={child.id} node={child} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.sub_admin_name.trim() || !formData.sub_admin_phone.trim()) {
      toast.error("Please fill in all required fields (Name, Sub-Admin Name, Sub-Admin Phone)");
      return;
    }
    createCompanyMutation.mutate(formData);
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empData.name.trim() || !empData.phone.trim() || !empData.company_id) {
      toast.error("Please fill in all required fields (Company, Name, Phone)");
      return;
    }
    if (empData.phone.length !== 10) {
      toast.error("Phone number must be exactly 10 digits.");
      return;
    }
    createEmployeeMutation.mutate(empData);
  };

  const handleBulkImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkCompanyId) {
      toast.error("Please select a target company.");
      return;
    }
    const validUsers = bulkParsedUsers.filter(u => u.valid);
    if (validUsers.length === 0) {
      toast.error("No valid employee records found to import.");
      return;
    }
    const payload = {
      company_id: bulkCompanyId,
      users: validUsers.map(u => ({ name: u.name, phone: u.phone, role: u.role }))
    };
    createUsersBulkMutation.mutate(payload);
  };

  return (
    <div style={{ padding: "24px 28px", background: T.pageBg, minHeight: "100%", fontFamily: "'Inter', sans-serif" }}>
      {/* Dynamic Org Tree Stylesheet */}
      <style>{`
        .org-tree-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow-x: auto;
          padding: 40px 20px;
          background: #0f172a;
          border-radius: 12px;
          border: 1px solid #1e293b;
          min-height: 500px;
          position: relative;
        }

        .org-tree-root-row {
          display: flex;
          justify-content: center;
          gap: 40px;
        }

        .org-children {
          display: flex;
          justify-content: center;
          position: relative;
          padding-top: 24px;
          margin-top: 8px;
        }

        .org-children::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 2px;
          height: 24px;
          background: #6366f1;
        }

        .org-branch {
          position: relative;
          padding: 24px 10px 0 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .org-branch::before, .org-branch::after {
          content: '';
          position: absolute;
          top: 0;
          right: 50%;
          width: 50%;
          height: 24px;
          border-top: 2px solid #6366f1;
        }

        .org-branch::after {
          right: auto;
          left: 50%;
          border-left: 2px solid #6366f1;
        }

        .org-branch:only-child::before, .org-branch:only-child::after {
          display: none;
        }

        .org-branch:only-child {
          padding-top: 0;
        }

        .org-branch:first-child::before {
          border: 0 none;
        }

        .org-branch:last-child::after {
          border-top: 0 none;
        }

        .tree-node-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .node-circle-company {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #312e81 0%, #1e1b4b 100%);
          border: 3px solid #6366f1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          cursor: pointer;
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.45);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          z-index: 5;
        }

        .node-circle-company:hover {
          transform: scale(1.1);
          box-shadow: 0 0 25px rgba(99, 102, 241, 0.85);
          border-color: #818cf8;
        }

        .node-circle-employee {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 3px solid #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d1d5db;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          z-index: 5;
        }

        .node-circle-employee span {
          font-size: 22px;
          font-weight: 800;
          color: #fff;
        }

        .node-circle-employee:hover {
          transform: scale(1.1);
        }

        .node-caption {
          margin-top: 8px;
          text-align: center;
          width: 100px;
          font-size: 11px;
          font-weight: 700;
          color: #cbd5e1;
          line-height: 1.3;
        }

        .node-role-caption {
          font-size: 9px;
          color: #64748b;
          font-weight: 500;
          margin-top: 2px;
        }

        .node-tooltip {
          visibility: hidden;
          opacity: 0;
          position: absolute;
          bottom: 105%;
          left: 50%;
          transform: translateX(-50%) translateY(-10px);
          width: 260px;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 16px;
          color: #e2e8f0;
          text-align: left;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55);
          z-index: 1000;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }

        .tree-node-wrapper:hover .node-tooltip {
          visibility: visible;
          opacity: 1;
          transform: translateX(-50%) translateY(-15px);
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, letterSpacing: "-0.5px", margin: 0 }}>
            Super Admin Console
          </h1>
          <p style={{ color: T.text3, fontSize: 13, marginTop: 4, marginBottom: 0 }}>
            Configure corporate node branches, modify role permissions, and subscription limits.
          </p>
        </div>
        
        {activeTab === "tree" && (
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => setShowEmpModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(99, 102, 241, 0.1)",
                border: `1px solid ${T.primary}`,
                borderRadius: 8,
                color: T.primary,
                fontWeight: 700,
                padding: "10px 16px",
                fontSize: 13,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99, 102, 241, 0.18)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(99, 102, 241, 0.1)")}
            >
              <IconUserPlus size={16} />
              Add Employee Node
            </button>
            <button
              onClick={() => {
                setShowBulkModal(true);
                if (companiesList.length > 0 && !bulkCompanyId) {
                  setBulkCompanyId(companiesList[0].id);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(22, 163, 74, 0.1)",
                border: `1px solid ${T.green}`,
                borderRadius: 8,
                color: T.green,
                fontWeight: 700,
                padding: "10px 16px",
                fontSize: 13,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(22, 163, 74, 0.18)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(22, 163, 74, 0.1)")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              Bulk Import Employees
            </button>
            <button
              onClick={() => setShowModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: T.primary,
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontWeight: 700,
                padding: "10px 16px",
                fontSize: 13,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(67, 97, 238, 0.25)",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <IconPlus size={16} />
              Create Business Node
            </button>
          </div>
        )}
      </div>

      {/* Tabs Menu */}
      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 24, gap: 16 }}>
        {[
          { key: "tree", label: "Corporate Org Tree", icon: <IconBuilding size={14} /> },
          { key: "rbac", label: "Role-Based Access (RBAC)", icon: <IconShield size={14} /> },
          { key: "plans", label: "Plan Modules (SBAC)", icon: <IconSettings size={14} /> },
          { key: "projects", label: "Project Card View", icon: <IconBarChart size={14} /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.key ? `3px solid ${T.primary}` : "3px solid transparent",
              color: activeTab === tab.key ? T.primary : T.text3,
              fontWeight: 700,
              padding: "10px 6px 14px",
              fontSize: 14,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPI stats (Always show summary) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Businesses", value: totalBusinesses, desc: "Total company nodes registered", color: T.primary },
          { label: "Root Organizations", value: rootOrgs, desc: "Parent corporate parent accounts", color: T.purple },
          { label: "Sub-Admin Accounts", value: totalSubAdmins, desc: "Provisioned branch admin logins", color: T.green },
        ].map((k) => (
          <div key={k.label} style={cardStyle({ padding: "20px" })}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{isLoading ? "..." : k.value}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text1, marginTop: 6 }}>{k.label}</div>
            <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>{k.desc}</div>
          </div>
        ))}
      </div>

      {/* ── Content Panes ─────────────────────────────────────────────────── */}
      
      {/* TAB 1: tree visualization */}
      {activeTab === "tree" && (
        <div style={cardStyle({ padding: "24px 16px", minHeight: 350 })}>
          {!selectedCompanyTreeId ? (
            // GRID VIEW: List of business card squares
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: T.text1, marginBottom: 14, borderBottom: `1px solid ${T.border}`, paddingBottom: 10 }}>
                Registered Business Networks
              </h3>
              
              {/* Search Toolbar */}
              <div style={{
                background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 10,
                padding: "12px 16px", marginBottom: 20, display: "flex", gap: 12, alignItems: "center"
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, flex: 1,
                  background: "#ffffff", border: `1px solid ${T.border}`, borderRadius: 6,
                  padding: "6px 10px"
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search business network by name or GSTIN..."
                    value={treeSearchVal}
                    onChange={(e) => setTreeSearchVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setActiveTreeSearch(treeSearchVal);
                      }
                    }}
                    style={{
                      border: "none", background: "transparent", outline: "none",
                      fontSize: 12, color: T.text1, width: "100%"
                    }}
                  />
                  {treeSearchVal && (
                    <button
                      onClick={() => { setTreeSearchVal(""); setActiveTreeSearch(""); }}
                      style={{ background: "none", border: "none", color: T.text3, cursor: "pointer", fontSize: 10 }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setActiveTreeSearch(treeSearchVal)}
                  style={{
                    background: T.primary, border: "none", borderRadius: 6,
                    color: "#fff", fontWeight: 700, padding: "8px 14px",
                    fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                    boxShadow: "0 2px 6px rgba(67, 97, 238, 0.15)"
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                  Search
                </button>
              </div>

              {isLoading ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200, color: T.text3, fontSize: 13 }}>
                  Loading registered company nodes...
                </div>
              ) : companiesList.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: 200, color: T.text3 }}>
                  <IconBuilding size={32} color={T.text4} />
                  <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>No Business Nodes Found</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {companiesList.filter((c: any) => {
                    if (activeTreeSearch) {
                      const q = activeTreeSearch.toLowerCase();
                      const nameMatch = (c.name || "").toLowerCase().includes(q);
                      const gstinMatch = (c.gstin || "").toLowerCase().includes(q);
                      if (!nameMatch && !gstinMatch) return false;
                    }
                    return true;
                  }).map((c) => {
                    const numAdmins = c.admins?.length || 0;
                    const isSuspended = c.is_active === false;
                    const isExpired = c.subscription_expiry ? (new Date(c.subscription_expiry) < new Date()) : false;
                    const paymentDone = !isSuspended && !isExpired;

                    return (
                      <div
                        key={c.id}
                        style={{
                          background: "#ffffff", border: `1px solid ${T.border}`, borderRadius: 12,
                          padding: 20, boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                          display: "flex", flexDirection: "column",
                          transition: "transform 0.15s ease, border-color 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.borderColor = T.primary;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "none";
                          e.currentTarget.style.borderColor = T.border;
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                          <div style={{ flex: 1, overflow: "hidden", marginRight: 8 }}>
                            <h4 style={{ fontSize: 15, fontWeight: 800, color: T.text1, margin: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                              {c.name}
                            </h4>
                            <span style={{ fontSize: 9, color: T.text3, fontFamily: "monospace", display: "block", marginTop: 2 }}>
                              Schema: {c.db_schema || "co_daynisc"}
                            </span>
                          </div>
                          <span style={getPlanBadgeStyles(c.plan)}>{c.plan}</span>
                        </div>

                        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700,
                            color: paymentDone ? T.green : T.red,
                            background: paymentDone ? T.greenBg : T.redBg,
                            padding: "2px 6px", borderRadius: 12,
                          }}>
                            {paymentDone ? "✓ Payment Done" : "⚠️ Payment Due"}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 700,
                            color: isSuspended ? T.red : T.green,
                            background: isSuspended ? T.redBg : T.greenBg,
                            padding: "2px 6px", borderRadius: 12,
                          }}>
                            {isSuspended ? "Suspended" : "Active"}
                          </span>
                        </div>

                        <div style={{ fontSize: 11, color: T.text2, display: "flex", flexDirection: "column", gap: 4, marginBottom: 16, borderTop: `1px solid ${T.divider}`, paddingTop: 12 }}>
                          <div><strong>GSTIN:</strong> <span style={{ fontFamily: "monospace" }}>{c.gstin || "N/A"}</span></div>
                          <div><strong>Expiry:</strong> {c.subscription_expiry ? new Date(c.subscription_expiry).toLocaleDateString("en-IN", {day: "numeric", month: "short", year: "numeric"}) : "Lifetime"}</div>
                          <div><strong>Licenses:</strong> {numAdmins} Active Admin(s)</div>
                        </div>

                        <button
                          onClick={() => setSelectedCompanyTreeId(c.id)}
                          style={{
                            width: "100%", padding: "8px 0", background: T.primary,
                            border: "none", color: "#fff", borderRadius: 6,
                            fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: "auto",
                            transition: "opacity 0.15s"
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                        >
                          Manage & View Org Tree
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            // DETAIL VIEW: Detailed payment info & isolated connected flow tree chart
            <div>
              {(() => {
                const selectedCompanyObj = companiesList.find(c => c.id === selectedCompanyTreeId);
                return (
                  <div>
                    {/* Back Header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                      <button
                        onClick={() => setSelectedCompanyTreeId("")}
                        style={{
                          background: "none", border: `1px solid ${T.border}`, borderRadius: 6,
                          padding: "6px 12px", color: T.text2, fontSize: 12, fontWeight: 700,
                          cursor: "pointer", transition: "background 0.15s"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        ← Back to All Businesses
                      </button>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text1, margin: 0 }}>
                        Business Console: {selectedCompanyObj?.name}
                      </h3>
                    </div>

                    {/* Detailed Summary Row */}
                    {selectedCompanyObj && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                        {/* Column 1: Billing & Payment status */}
                        <div style={{ background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 10, padding: 18 }}>
                          <h4 style={{ fontSize: 13, fontWeight: 800, color: T.text1, margin: "0 0 12px 0" }}>Subscription & Payments</h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: T.text2 }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>Plan Tier:</span>
                              <span style={getPlanBadgeStyles(selectedCompanyObj.plan)}>{selectedCompanyObj.plan}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>Payment Status:</span>
                              <span style={{
                                fontWeight: 700,
                                color: (selectedCompanyObj.is_active !== false && (!selectedCompanyObj.subscription_expiry || new Date(selectedCompanyObj.subscription_expiry) >= new Date())) ? T.green : T.red
                              }}>
                                {(selectedCompanyObj.is_active !== false && (!selectedCompanyObj.subscription_expiry || new Date(selectedCompanyObj.subscription_expiry) >= new Date())) ? "Payment Completed (Paid)" : "Payment Pending (Due)"}
                              </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>Start Date:</span>
                              <span style={{ fontWeight: 600 }}>{selectedCompanyObj.subscription_start ? new Date(selectedCompanyObj.subscription_start).toLocaleDateString("en-IN", {day: "numeric", month: "short", year: "numeric"}) : "N/A"}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>Expiry Date:</span>
                              <span style={{ fontWeight: 600 }}>{selectedCompanyObj.subscription_expiry ? new Date(selectedCompanyObj.subscription_expiry).toLocaleDateString("en-IN", {day: "numeric", month: "short", year: "numeric"}) : "Lifetime License"}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>System Status:</span>
                              <span style={{ fontWeight: 700, color: selectedCompanyObj.is_active !== false ? T.green : T.red }}>
                                {selectedCompanyObj.is_active !== false ? "Active (System Enabled)" : "Suspended (System Disabled)"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Column 2: System Configuration */}
                        <div style={{ background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 10, padding: 18 }}>
                          <h4 style={{ fontSize: 13, fontWeight: 800, color: T.text1, margin: "0 0 12px 0" }}>System Configuration</h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: T.text2 }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>GSTIN:</span>
                              <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{selectedCompanyObj.gstin || "N/A"}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>Database Schema:</span>
                              <span style={{ fontFamily: "monospace", fontWeight: 600, color: T.primary }}>{selectedCompanyObj.db_schema || "co_daynisc"}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>Licenses Active:</span>
                              <span style={{ fontWeight: 600 }}>{selectedCompanyObj.admins?.length || 0} Seat(s)</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>Tally Sync:</span>
                              <span style={{ fontWeight: 600, color: T.green }}>✓ Connected (Active)</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>Network Node ID:</span>
                              <span style={{ fontFamily: "monospace", fontSize: 10 }}>{selectedCompanyObj.id}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Chart section */}
                    <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text1, marginBottom: 12, marginTop: 20 }}>
                      Organizational connected Flow Tree Chart
                    </h3>

                    {isLoading ? (
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200, color: T.text3, fontSize: 13 }}>
                        Loading corporate structure diagram...
                      </div>
                    ) : filteredRootCompanies.length === 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: 200, color: T.text3 }}>
                        <IconBuilding size={32} color={T.text4} />
                        <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>No Business Nodes Found</div>
                      </div>
                    ) : (
                      <div className="org-tree-container" style={{ padding: "30px 15px", minHeight: 400 }}>
                        <div className="org-tree-root-row">
                          {filteredRootCompanies.map((root) => (
                            <div key={root.id} className="org-tree">
                              <OrgTreeNodeComponent node={root} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Role Access (RBAC) Control */}
      {activeTab === "rbac" && (
        <div style={cardStyle({ padding: "24px" })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: `1px solid ${T.border}`, paddingBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text1, margin: 0 }}>
                Role Access Control Matrix (RBAC)
              </h3>
              <p style={{ fontSize: 12, color: T.text3, marginTop: 4, margin: 0 }}>
                Toggle which system modules are visible and editable for each business employee role.
              </p>
            </div>
            <button
              onClick={handleSaveRbac}
              style={{
                background: T.green,
                border: "none",
                borderRadius: 6,
                color: "#fff",
                fontWeight: 700,
                padding: "8px 14px",
                fontSize: 12,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(22, 163, 74, 0.2)",
              }}
            >
              Save RBAC Policies
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: T.text2, background: "#f8fafc", borderBottom: `2px solid ${T.border}` }}>
                    Modules / Permissions
                  </th>
                  {roles.map((r) => (
                    <th key={r.key} style={{ padding: "12px 16px", textAlign: "center", fontSize: 12, fontWeight: 700, color: T.text2, background: "#f8fafc", borderBottom: `2px solid ${T.border}` }}>
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map((f) => (
                  <tr key={f.key} style={{ borderBottom: `1px solid ${T.divider}` }}>
                    <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: T.text1 }}>
                      {f.label}
                    </td>
                    {roles.map((r) => (
                      <td key={r.key} style={{ padding: "14px 16px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={!!rbacMatrix[r.key]?.[f.key]}
                          onChange={() => toggleRbac(r.key, f.key)}
                          style={{
                            width: 17,
                            height: 17,
                            accentColor: T.primary,
                            cursor: "pointer",
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Subscription Plans Config (SBAC) */}
      {activeTab === "plans" && (
        <div style={cardStyle({ padding: "24px" })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: `1px solid ${T.border}`, paddingBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text1, margin: 0 }}>
                Subscription Plan Feature mapping (SBAC)
              </h3>
              <p style={{ fontSize: 12, color: T.text3, marginTop: 4, margin: 0 }}>
                Configure feature gates, quotas, and AI OCR credits for each pricing tier.
              </p>
            </div>
            <button
              onClick={handleSaveSbac}
              style={{
                background: T.green,
                border: "none",
                borderRadius: 6,
                color: "#fff",
                fontWeight: 700,
                padding: "8px 14px",
                fontSize: 12,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(22, 163, 74, 0.2)",
              }}
            >
              Save Plan Configurations
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {plans.map((p) => {
              const limits = planLimits[p.key];
              return (
                <div
                  key={p.key}
                  style={{
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: 16,
                    background: "#fdfdfd",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: T.text1 }}>
                      {p.label}
                    </span>
                    <span style={badge(T.primary, T.primary + "10")}>
                      Tier Config
                    </span>
                  </div>

                  {/* Quota Limits inputs */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: T.text3, display: "block", marginBottom: 4 }}>
                        MAX USERS
                      </label>
                      <input
                        type="number"
                        value={limits.maxUsers}
                        onChange={(e) => handleLimitChange(p.key, "maxUsers", parseInt(e.target.value) || 0)}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          borderRadius: 6,
                          border: `1px solid ${T.border}`,
                          fontSize: 12,
                          background: T.inputBg,
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: T.text3, display: "block", marginBottom: 4 }}>
                        MONTHLY INVOICES LIMIT
                      </label>
                      <input
                        type="number"
                        value={limits.maxInvoices}
                        onChange={(e) => handleLimitChange(p.key, "maxInvoices", parseInt(e.target.value) || 0)}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          borderRadius: 6,
                          border: `1px solid ${T.border}`,
                          fontSize: 12,
                          background: T.inputBg,
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: T.text3, display: "block", marginBottom: 4 }}>
                        MONTHLY AI OCR CREDITS
                      </label>
                      <input
                        type="number"
                        value={limits.aiCredits}
                        onChange={(e) => handleLimitChange(p.key, "aiCredits", parseInt(e.target.value) || 0)}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          borderRadius: 6,
                          border: `1px solid ${T.border}`,
                          fontSize: 12,
                          background: T.inputBg,
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ height: 1, background: T.border, marginBottom: 12 }} />

                  {/* Module Gate checkboxes */}
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.text2, marginBottom: 8, textTransform: "uppercase" }}>
                    Enabled Modules
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {features.map((f) => {
                      const isChecked = limits.features.includes(f.key);
                      return (
                        <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.text2, cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePlanFeature(p.key, f.key)}
                            style={{ accentColor: T.primary }}
                          />
                          {f.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: Project View (All businesses organized as health dashboards) */}
      {activeTab === "projects" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {companiesList.map((co) => {
            const registeredUsers = co.admins.length;
            const planKey = co.plan.toLowerCase() || "starter";
            const limits = planLimits[planKey] || { maxUsers: 5, maxInvoices: 500, aiCredits: 100 };

            // Mocked usage statistics (randomized slightly based on company ID)
            const hashVal = co.id.charCodeAt(0) + co.id.charCodeAt(1) || 10;
            const invoiceUsage = Math.min(limits.maxInvoices, Math.floor(limits.maxInvoices * (0.2 + (hashVal % 6) * 0.12)));
            const creditUsage = Math.min(limits.aiCredits, Math.floor(limits.aiCredits * (0.1 + (hashVal % 8) * 0.1)));

            const userPct = Math.min(100, (registeredUsers / limits.maxUsers) * 100);
            const invoicePct = Math.min(100, (invoiceUsage / limits.maxInvoices) * 100);
            const creditPct = Math.min(100, (creditUsage / limits.aiCredits) * 100);

            return (
              <div
                key={co.id}
                style={cardStyle({
                  padding: "20px 22px",
                  display: "flex",
                  flexDirection: "column",
                  background: "#ffffff",
                  border: `1px solid ${T.border}`,
                  transition: "transform 0.15s ease, border-color 0.15s ease",
                  cursor: "default",
                })}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.borderColor = T.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.borderColor = T.border;
                }}
              >
                {/* Project Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 800, color: T.text1, margin: 0 }}>
                      {co.name}
                    </h4>
                    <span style={{ fontSize: 10, color: T.text3, fontFamily: "monospace", display: "block", marginTop: 2 }}>
                      GSTIN: {co.gstin || "N/A"}
                    </span>
                  </div>
                  <span style={getPlanBadgeStyles(co.plan)}>{co.plan}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, display: "inline-block", boxShadow: "0 0 8px #16a34a" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.green }}>ACTIVE SYSTEM</span>
                </div>

                {/* Progress Indicators */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                  {/* Users */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: T.text2, marginBottom: 4 }}>
                      <span>User Licenses</span>
                      <span style={{ color: T.text3 }}>{registeredUsers} / {limits.maxUsers}</span>
                    </div>
                    <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${userPct}%`, background: T.primary, borderRadius: 3 }} />
                    </div>
                  </div>

                  {/* Invoices */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: T.text2, marginBottom: 4 }}>
                      <span>Invoices Quota</span>
                      <span style={{ color: T.text3 }}>{invoiceUsage} / {limits.maxInvoices}</span>
                    </div>
                    <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${invoicePct}%`, background: T.purple, borderRadius: 3 }} />
                    </div>
                  </div>

                  {/* AI Credits */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: T.text2, marginBottom: 4 }}>
                      <span>AI Extractions</span>
                      <span style={{ color: T.text3 }}>{creditUsage} / {limits.aiCredits}</span>
                    </div>
                    <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${creditPct}%`, background: T.green, borderRadius: 3 }} />
                    </div>
                  </div>
                </div>

                {/* Activity Feed / Tally Link Log */}
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12, marginBottom: 18, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: T.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                    Local PC Sync Logs
                  </div>
                  <div style={{ fontSize: 11, color: T.text2, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: T.green }}>✓</span> TallyPrime client status: Active
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: T.green }}>✓</span> Database Schema: {co.id.replace("-", "_")}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
                  <button
                    onClick={() => {
                      toast.error("Suspending is disabled in demo console mode.");
                    }}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      background: "none",
                      border: `1px solid ${T.red}`,
                      color: T.red,
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Suspend Org
                  </button>
                  <button
                    onClick={() => {
                      toast.success(`Plan upgrade requested for ${co.name}!`);
                    }}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      background: T.primary,
                      border: "none",
                      color: "#fff",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Manage Billing
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE BUSINESS NODE MODAL ────────────────────────────────────── */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 10, 15, 0.5)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: 28,
              width: "100%",
              maxWidth: 520,
              boxShadow: T.shadowMd,
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: "absolute",
                top: 18,
                right: 18,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                color: T.text3,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <h3 style={{ fontSize: 17, fontWeight: 800, color: T.text1, marginBottom: 4 }}>
              Create Business Node
            </h3>
            <p style={{ color: T.text3, fontSize: 12, marginBottom: 20 }}>
              Add a new child branch/company and assign its admin account.
            </p>

            <form onSubmit={handleCreateCompany} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Branch Name */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text2, marginBottom: 6 }}>
                  Business Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. UFO Pvt Ltd"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${T.border}`,
                    fontSize: 13,
                    color: T.text1,
                    background: T.inputBg,
                  }}
                />
              </div>

              {/* GSTIN & Plan Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text2, marginBottom: 6 }}>
                    GSTIN
                  </label>
                  <input
                    type="text"
                    placeholder="15-digit GSTIN"
                    maxLength={15}
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                      fontSize: 13,
                      color: T.text1,
                      background: T.inputBg,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text2, marginBottom: 6 }}>
                    Subscription Plan *
                  </label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                      fontSize: 13,
                      color: T.text1,
                      background: T.inputBg,
                      height: 40,
                    }}
                  >
                    <option value="starter">Starter</option>
                    <option value="sme">SME</option>
                    <option value="factory">Factory</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              {/* Parent Organization Selection */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text2, marginBottom: 6 }}>
                  Parent Business Node
                </label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${T.border}`,
                    fontSize: 13,
                    color: T.text1,
                    background: T.inputBg,
                    height: 40,
                  }}
                >
                  <option value="">-- None (Establish as Root Org) --</option>
                  {companiesList.map((co) => (
                    <option key={co.id} value={co.id}>
                      {co.name} {co.parent_id ? `(Child of ${companiesList.find(p => p.id === co.parent_id)?.name || "another branch"})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ height: 1, background: T.border, margin: "4px 0" }} />
              <div style={{ fontSize: 12, fontWeight: 800, color: T.primary, textTransform: "uppercase", letterSpacing: 0.5 }}>
                CEO / Sub-Admin Credentials
              </div>

              {/* Sub admin credentials row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text2, marginBottom: 6 }}>
                    CEO Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Shah"
                    required
                    value={formData.sub_admin_name}
                    onChange={(e) => setFormData({ ...formData, sub_admin_name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                      fontSize: 13,
                      color: T.text1,
                      background: T.inputBg,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text2, marginBottom: 6 }}>
                    CEO Phone Number *
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    required
                    maxLength={10}
                    value={formData.sub_admin_phone}
                    onChange={(e) => setFormData({ ...formData, sub_admin_phone: e.target.value.replace(/\D/g, "") })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                      fontSize: 13,
                      color: T.text1,
                      background: T.inputBg,
                    }}
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: "flex", gap: 12, marginTop: 12, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    background: "none",
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    color: T.text2,
                    fontWeight: 600,
                    padding: "10px 16px",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCompanyMutation.isPending}
                  style={{
                    background: T.primary,
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontWeight: 700,
                    padding: "10px 20px",
                    fontSize: 13,
                    cursor: "pointer",
                    opacity: createCompanyMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {createCompanyMutation.isPending ? "Creating..." : "Create Node"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── BULK IMPORT EMPLOYEES MODAL ───────────────────────────────────── */}
      {showBulkModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 10, 15, 0.5)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: 28,
              width: "100%",
              maxWidth: 720,
              boxShadow: T.shadowMd,
              position: "relative",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <button
              onClick={() => setShowBulkModal(false)}
              style={{
                position: "absolute",
                top: 18,
                right: 18,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                color: T.text3,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <h3 style={{ fontSize: 17, fontWeight: 800, color: T.text1, marginBottom: 4 }}>
              Bulk Import Employees
            </h3>
            <p style={{ color: T.text3, fontSize: 12, marginBottom: 20 }}>
              Quickly paste a list of users or upload a CSV file to add them all at once.
            </p>

            <form onSubmit={handleBulkImportSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", paddingRight: 4 }}>
              {/* Select Business branch */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text2, marginBottom: 6 }}>
                  Target Company *
                </label>
                <select
                  required
                  value={bulkCompanyId}
                  onChange={(e) => setBulkCompanyId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${T.border}`,
                    fontSize: 13,
                    color: T.text1,
                    background: T.inputBg,
                    height: 40,
                  }}
                >
                  <option value="">-- Choose Target Company Node --</option>
                  {companiesList.map((co) => (
                    <option key={co.id} value={co.id}>
                      {co.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload CSV or paste details */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.text2 }}>
                  Paste Employee Records or Upload CSV
                </span>
                <label style={{
                  background: "rgba(67, 97, 238, 0.08)",
                  border: `1px dashed ${T.primary}`,
                  borderRadius: 6,
                  color: T.primary,
                  padding: "5px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}>
                  Upload CSV
                  <input type="file" accept=".csv" onChange={handleCsvUpload} style={{ display: "none" }} />
                </label>
              </div>

              <div style={{ fontSize: 10, color: T.text3, marginTop: -8 }}>
                Expected format (one per line): <strong>Name, Phone, Role</strong>. Example: <code>Ramesh Shah, 9876543210, accountant</code>
              </div>

              <div>
                <textarea
                  rows={5}
                  value={bulkText}
                  onChange={(e) => {
                    setBulkText(e.target.value);
                    parseBulkText(e.target.value);
                  }}
                  placeholder="Ramesh Shah, 9876543210, accountant&#10;Suresh Kumar, 9876543211, inventory_manager&#10;Mahesh Patel, 9876543212, production_supervisor"
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 8,
                    border: `1px solid ${T.border}`,
                    fontSize: 12,
                    fontFamily: "monospace",
                    background: T.inputBg,
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Live Preview grid */}
              {bulkParsedUsers.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text2, marginBottom: 8 }}>
                    Live Preview & Validation ({bulkParsedUsers.filter(u => u.valid).length} of {bulkParsedUsers.length} valid)
                  </div>
                  <div style={{ maxHeight: 160, overflowY: "auto", border: `1px solid ${T.border}`, borderRadius: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                          <th style={{ padding: "8px 12px", textAlign: "left", color: T.text3 }}>Row</th>
                          <th style={{ padding: "8px 12px", textAlign: "left", color: T.text3 }}>Name</th>
                          <th style={{ padding: "8px 12px", textAlign: "left", color: T.text3 }}>Phone</th>
                          <th style={{ padding: "8px 12px", textAlign: "left", color: T.text3 }}>Role</th>
                          <th style={{ padding: "8px 12px", textAlign: "left", color: T.text3 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkParsedUsers.map((u, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${T.divider}`, background: u.valid ? "transparent" : "#fef2f2" }}>
                            <td style={{ padding: "8px 12px", color: T.text3 }}>{i + 1}</td>
                            <td style={{ padding: "8px 12px", fontWeight: 600, color: T.text1 }}>{u.name || "—"}</td>
                            <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{u.phone || "—"}</td>
                            <td style={{ padding: "8px 12px", textTransform: "capitalize" }}>{u.role?.replace("_", " ") || "—"}</td>
                            <td style={{ padding: "8px 12px", fontWeight: 700, color: u.valid ? T.green : T.red }}>
                              {u.valid ? "✓ Valid" : u.error}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div style={{ display: "flex", gap: 12, marginTop: 8, justifyContent: "flex-end", borderTop: `1px solid ${T.divider}`, paddingTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  style={{
                    background: "none",
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    color: T.text2,
                    fontWeight: 600,
                    padding: "10px 16px",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUsersBulkMutation.isPending || bulkParsedUsers.filter(u => u.valid).length === 0}
                  style={{
                    background: T.green,
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontWeight: 700,
                    padding: "10px 20px",
                    fontSize: 13,
                    cursor: "pointer",
                    opacity: (createUsersBulkMutation.isPending || bulkParsedUsers.filter(u => u.valid).length === 0) ? 0.6 : 1,
                    boxShadow: "0 4px 12px rgba(22, 163, 74, 0.2)",
                  }}
                >
                  {createUsersBulkMutation.isPending ? "Importing..." : `Import ${bulkParsedUsers.filter(u => u.valid).length} Employees`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CREATE EMPLOYEE NODE MODAL ────────────────────────────────────── */}
      {showEmpModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 10, 15, 0.5)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: 28,
              width: "100%",
              maxWidth: 480,
              boxShadow: T.shadowMd,
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowEmpModal(false)}
              style={{
                position: "absolute",
                top: 18,
                right: 18,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                color: T.text3,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <h3 style={{ fontSize: 17, fontWeight: 800, color: T.text1, marginBottom: 4 }}>
              Add Employee Node
            </h3>
            <p style={{ color: T.text3, fontSize: 12, marginBottom: 20 }}>
              Insert a new employee or manager node into a specific business branch tree.
            </p>

            <form onSubmit={handleCreateEmployee} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Select Business branch */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text2, marginBottom: 6 }}>
                  Select Company *
                </label>
                <select
                  required
                  value={empData.company_id}
                  onChange={(e) => setEmpData({ ...empData, company_id: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${T.border}`,
                    fontSize: 13,
                    color: T.text1,
                    background: T.inputBg,
                    height: 40,
                  }}
                >
                  <option value="">-- Choose Company Node --</option>
                  {companiesList.map((co) => (
                    <option key={co.id} value={co.id}>
                      {co.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee Name */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text2, marginBottom: 6 }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Anand Sharma"
                  required
                  value={empData.name}
                  onChange={(e) => setEmpData({ ...empData, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${T.border}`,
                    fontSize: 13,
                    color: T.text1,
                    background: T.inputBg,
                  }}
                />
              </div>

              {/* Phone & Role */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text2, marginBottom: 6 }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    required
                    maxLength={10}
                    value={empData.phone}
                    onChange={(e) => setEmpData({ ...empData, phone: e.target.value.replace(/\D/g, "") })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                      fontSize: 13,
                      color: T.text1,
                      background: T.inputBg,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text2, marginBottom: 6 }}>
                    Designated Role *
                  </label>
                  <select
                    value={empData.role}
                    onChange={(e) => setEmpData({ ...empData, role: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                      fontSize: 13,
                      color: T.text1,
                      background: T.inputBg,
                      height: 40,
                    }}
                  >
                    <option value="company_admin">CEO / Admin</option>
                    <option value="accountant">Accountant</option>
                    <option value="inventory_manager">Inventory Manager</option>
                    <option value="production_supervisor">Production Supervisor</option>
                    <option value="sales_rep">Sales Representative</option>
                    <option value="warehouse_operator">Warehouse Operator</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: "flex", gap: 12, marginTop: 12, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowEmpModal(false)}
                  style={{
                    background: "none",
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    color: T.text2,
                    fontWeight: 600,
                    padding: "10px 16px",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEmployeeMutation.isPending}
                  style={{
                    background: T.primary,
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontWeight: 700,
                    padding: "10px 20px",
                    fontSize: 13,
                    cursor: "pointer",
                    opacity: createEmployeeMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {createEmployeeMutation.isPending ? "Adding..." : "Add Node"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
