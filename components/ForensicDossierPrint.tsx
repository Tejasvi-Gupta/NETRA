"use client";

import React from "react";

interface PersonProfile {
  identity?: { name?: string; aliases?: string[] };
  person_id?: string;
  name?: string;
  role?: string;
  phone?: string;
  contact?: { phones?: string[] };
  addresses?: { text?: string }[];
}

interface PersonRecord extends PersonProfile {
  person?: PersonProfile;
  roles?: string[];
}

interface UnknownIdentityRecord {
  label?: string;
  alias?: string;
  description?: string;
  status?: string;
}

interface IncidentRecord {
  title?: string;
  summary?: string;
  description?: string;
  key_points?: string[];
  time?: { start?: string };
}

interface RelationRecord {
  from?: { id?: string };
  to?: { id?: string };
  source?: string;
  target?: string;
  type?: string;
  evidence?: string;
}

interface GraphNode {
  id: string;
  label?: string;
  type?: string;
}

interface GraphEdge {
  from?: { id?: string } | string;
  to?: { id?: string } | string;
  source?: string;
  target?: string;
}

interface ForensicDossierPrintProps {
  caseData: {
    title: string;
    case_code: string;
    status: string;
    investigation_summary?: string;
  };
  persons: PersonRecord[];
  unknowns: UnknownIdentityRecord[];
  incidents: IncidentRecord[];
  relations: RelationRecord[];
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
}

export default function ForensicDossierPrint({
  caseData,
  persons = [],
  unknowns = [],
  incidents = [],
  relations = [],
  graphNodes = [],
  graphEdges = [],
}: ForensicDossierPrintProps) {
  if (!caseData) return null;

  const getEntityName = (id: string) => {
    const found = persons.find(
      (item) => (item.person?.person_id || item.person_id) === id
    );
    return found?.person?.identity?.name || found?.name || id;
  };

  // Coordinates for the SVG Network Map in Print
  const width = 700;
  const height = 350;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 130;

  const coords: Record<string, { x: number; y: number }> = {};
  graphNodes.forEach((node, idx) => {
    const angle = (2 * Math.PI * idx) / (graphNodes.length || 1);
    coords[node.id] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  return (
    <div className="hidden print:block font-mono text-black bg-white p-8 space-y-6">
      {/* Header Banner */}
      <div className="border-b-2 border-black pb-4">
        <div className="flex justify-between items-center text-xs text-neutral-600 font-bold uppercase tracking-widest">
          <span>CENTRAL FORENSIC & INTELLIGENCE DIVISION</span>
          <span>STRICTLY CONFIDENTIAL // LAW ENFORCEMENT ONLY</span>
        </div>
        <h1 className="text-2xl font-black uppercase mt-2 tracking-tight">
          CASE DOSSIER: {caseData.title}
        </h1>
        <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-neutral-300">
          <span>CASE CODE: <strong>{caseData.case_code}</strong></span>
          <span>STATUS: <strong>{caseData.status}</strong></span>
          <span>GENERATED ON: <strong>{new Date().toLocaleString("en-GB")}</strong></span>
        </div>
      </div>

      {/* 1. Investigation Summary */}
      <div>
        <h2 className="text-xs font-bold uppercase bg-neutral-100 p-1.5 border-l-4 border-black mb-2">
          1. CASE SUMMARY & EXECUTIVE BRIEF
        </h2>
        <p className="text-xs leading-relaxed text-neutral-800">
          {caseData.investigation_summary || "No specific preliminary narrative registered."}
        </p>
      </div>

      {/* 2. Identified Persons */}
      <div>
        <h2 className="text-xs font-bold uppercase bg-neutral-100 p-1.5 border-l-4 border-black mb-2">
          2. IDENTIFIED SUSPECTS & PERSONS ({persons.length})
        </h2>
        {persons.length === 0 ? (
          <p className="text-xs text-neutral-500 italic">No formal profiles identified.</p>
        ) : (
          <table className="w-full text-left text-xs border border-black border-collapse">
            <thead>
              <tr className="bg-neutral-200 border-b border-black">
                <th className="p-1.5 border-r border-black">Name / Identity</th>
                <th className="p-1.5 border-r border-black">Designated Role</th>
                <th className="p-1.5 border-r border-black">Contact Numbers</th>
                <th className="p-1.5">Known Locations / Addresses</th>
              </tr>
            </thead>
            <tbody>
              {persons.map((item, i) => {
                const p = item.person || item;
                const name = p.identity?.name || p.name || "Unnamed";
                const role = (item.roles && item.roles[0]) || p.role || "PERSON OF INTEREST";
                const phone = p.contact?.phones?.join(", ") || p.phone || "—";
                const address = p.addresses?.map((a) => a.text).join("; ") || "—";
                const aliases = p.identity?.aliases?.join(", ");

                return (
                  <tr key={i} className="border-b border-neutral-300">
                    <td className="p-1.5 border-r border-neutral-300 font-bold">
                      {name} {aliases && <span className="text-[10px] block font-normal text-neutral-600">aka {aliases}</span>}
                    </td>
                    <td className="p-1.5 border-r border-neutral-300 uppercase">{role}</td>
                    <td className="p-1.5 border-r border-neutral-300">{phone}</td>
                    <td className="p-1.5">{address}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 3. Unknown Identities */}
      {unknowns.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase bg-neutral-100 p-1.5 border-l-4 border-black mb-2">
            3. UNIDENTIFIED HANDLERS & SHADOW ENTITIES ({unknowns.length})
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {unknowns.map((u, idx) => (
              <div key={idx} className="border border-neutral-400 p-2 bg-neutral-50">
                <div className="font-bold flex justify-between">
                  <span>🎭 {u.label || u.alias || "Unknown Node"}</span>
                  <span className="text-[10px] border border-black px-1 uppercase">{u.status || "UNVERIFIED"}</span>
                </div>
                <p className="text-[11px] mt-1 text-neutral-700">{u.description || "Unidentified accomplice."}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Incident Progression Timeline */}
      <div>
        <h2 className="text-xs font-bold uppercase bg-neutral-100 p-1.5 border-l-4 border-black mb-2">
          4. CHRONOLOGICAL EVENT LOG ({incidents.length})
        </h2>
        {incidents.length === 0 ? (
          <p className="text-xs text-neutral-500 italic">No temporal incident points recorded.</p>
        ) : (
          <div className="space-y-3">
            {incidents.map((inc, idx) => (
              <div key={idx} className="border-l-2 border-black pl-3 text-xs">
                <div className="font-bold uppercase text-[11px]">
                  {inc.time?.start ? `[${inc.time.start}]` : `EVENT #${idx + 1}`} — {inc.title || "Incident Report"}
                </div>
                <p className="text-neutral-800 mt-0.5">{inc.description || inc.summary}</p>
                {inc.key_points && inc.key_points.length > 0 && (
                  <ul className="list-disc list-inside mt-1 text-[11px] text-neutral-600">
                    {inc.key_points.map((kp: string, k: number) => (
                      <li key={k}>{kp}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Targeted Relations & Evidence */}
      <div>
        <h2 className="text-xs font-bold uppercase bg-neutral-100 p-1.5 border-l-4 border-black mb-2">
          5. TARGETED COLLUSION & EVIDENCE LINKS ({relations.length})
        </h2>
        <div className="space-y-2">
          {relations.map((rel, idx) => {
            const fName = getEntityName(rel.from?.id || rel.source || "Node A");
            const tName = getEntityName(rel.to?.id || rel.target || "Node B");

            return (
              <div key={idx} className="border border-neutral-300 p-2 text-xs">
                <div className="font-bold flex justify-between items-center">
                  <span>{fName}</span>
                  <span className="font-black text-[10px] px-2 py-0.5 bg-neutral-200 border border-neutral-400">
                    ──[{rel.type || "LINKED_TO"}]──▶
                  </span>
                  <span>{tName}</span>
                </div>
                {rel.evidence && (
                  <p className="text-[11px] italic text-neutral-600 mt-1 border-t border-neutral-200 pt-1">
                    &quot;{rel.evidence}&quot;
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Visual Network Map */}
      {graphNodes.length > 0 && (
        <div className="break-before-page pt-4">
          <h2 className="text-xs font-bold uppercase bg-neutral-100 p-1.5 border-l-4 border-black mb-2">
            6. VISUAL LINK ANALYSIS MAP
          </h2>
          <div className="border border-black p-4 flex justify-center bg-white">
            <svg viewBox="0 0 700 350" className="w-full h-[320px]">
              {/* Edges */}
              {graphEdges.map((e, i) => {
                const fId = typeof e.from === "string" ? e.from : e.from?.id || e.source;
                const tId = typeof e.to === "string" ? e.to : e.to?.id || e.target;
                if (!fId || !tId) return null;
                const start = coords[fId];
                const end = coords[tId];
                if (!start || !end) return null;

                return (
                  <line
                    key={`p-edge-${i}`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke="#000000"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />
                );
              })}

              {/* Nodes */}
              {graphNodes.map((n, i) => {
                const pt = coords[n.id];
                if (!pt) return null;
                return (
                  <g key={`p-node-${i}`}>
                    <circle cx={pt.x} cy={pt.y} r="14" fill="#ffffff" stroke="#000000" strokeWidth="2" />
                    <text x={pt.x} y={pt.y + 3} textAnchor="middle" fontSize="8" fontWeight="bold">
                      {n.type === "PERSON" ? "P" : n.type === "UNKNOWN" ? "U" : "E"}
                    </text>
                    <text x={pt.x} y={pt.y + 24} textAnchor="middle" fontSize="9" fontWeight="bold">
                      {n.label?.slice(0, 15) || n.id.slice(0, 6)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}