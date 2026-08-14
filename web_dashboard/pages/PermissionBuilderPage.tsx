import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, cardStyle } from "../store/theme";
import { IconSettings, IconUsers, IconSync } from "../components/Icons";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: 20, ...style }}>{children}</div>;
}

export default function PermissionBuilderPage() {
  const qc = useQueryClient();
  const [roleData, setRoleData] = useState<any[]>([]);
  const [successMsg, setSuccessMsg] = useState("");

  const { data: roles = [], isLoading } = useQuery<any[]>({
    queryKey: ["role-permissions"],
    queryFn: () => api.get("/permissions/roles").then(r => r.data),
  });

  useEffect(() => {
    if (roles.length > 0) {
      setRoleData(JSON.parse(JSON.stringify(roles)));
    }
  }, [roles]);

  const saveMutation = useMutation({
    mutationFn: (newRoles: any[]) => api.put("/permissions/roles", newRoles),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["role-permissions"] });
      setSuccessMsg("Permissions saved successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  });

  const togglePermission = (roleIdx: number, module: string, action: string) => {
    const updated = [...roleData];
    const role = updated[roleIdx];
    if (!role.permissions[module]) {
      role.permissions[module] = [];
    }
    const actions = role.permissions[module];
    if (actions.includes(action)) {
      role.permissions[module] = actions.filter((a: string) => a !== action);
    } else {
      role.permissions[module] = [...actions, action];
    }
    setRoleData(updated);
  };

  const handleSave = () => {
    saveMutation.mutate(roleData);
  };

  if (isLoading || roleData.length === 0) {
    return <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>Loading permissions matrix…</div>;
  }

  const MODULES = ["vouchers", "ledgers", "gst", "settings", "inventory"];
  const ACTIONS = ["read", "create", "delete", "approve"];

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter', sans-serif", background: T.pageBg, minHeight: "100%" }}>
      {/* Page Title */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.4px" }}>
            🔒 Role & Custom Permission Builder
          </h1>
          <p style={{ fontSize: 13, color: T.text3, marginTop: 3 }}>Define fine-grained access policies for your accounting, tax, warehouse, and manager user profiles.</p>
        </div>
        <button
          onClick={handleSave}
          style={{
            background: T.primary, color: "#fff", border: "none", borderRadius: T.radiusSm,
            padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer"
          }}
        >
          Save Access Matrix
        </button>
      </div>

      {successMsg && (
        <div style={{ padding: 12, background: T.greenBg, color: T.green, borderRadius: 8, fontSize: 12, marginBottom: 16, fontWeight: 700 }}>
          {successMsg}
        </div>
      )}

      {/* Permissions Grid Table */}
      <Card style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${T.border}` }}>
              <th style={{ padding: "14px 18px", textAlign: "left", fontSize: 11, color: T.text3, fontWeight: 700, width: 200 }}>Role Name</th>
              <th style={{ padding: "14px 18px", textAlign: "left", fontSize: 11, color: T.text3, fontWeight: 700, width: 160 }}>Module</th>
              {ACTIONS.map(act => (
                <th key={act} style={{ padding: "14px 18px", textAlign: "center", fontSize: 11, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>{act}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roleData.map((role: any, roleIdx: number) => (
              <tr key={role.role} style={{ borderBottom: `1px solid ${T.border}` }}>
                {/* Role title spans across all modules for this role */}
                <td style={{ padding: "14px 18px", verticalAlign: "middle", fontWeight: 700, color: T.text1, borderRight: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <IconUsers size={16} color={T.primary} />
                    {role.role}
                  </div>
                </td>
                
                {/* Modules list nested within table */}
                <td colSpan={5} style={{ padding: 0 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      {MODULES.map((module) => {
                        const activeActions = role.permissions[module] || [];
                        return (
                          <tr key={module} style={{ borderBottom: `1px solid ${T.border}33` }}>
                            <td style={{ padding: "10px 18px", fontSize: 12, fontWeight: 600, color: T.text2, width: 160, textTransform: "capitalize" }}>
                              {module}
                            </td>
                            {ACTIONS.map((action) => {
                              const isChecked = activeActions.includes(action);
                              return (
                                <td key={action} style={{ padding: "10px 18px", textAlign: "center" }}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => togglePermission(roleIdx, module, action)}
                                    style={{ cursor: "pointer", width: 15, height: 15 }}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
