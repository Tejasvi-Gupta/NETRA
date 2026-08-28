"use client";

import { useEffect, useRef } from "react";
import cytoscape from "cytoscape";

export default function NetworkGraph() {
  const cyRef = useRef(null);

  useEffect(() => {
    const cy = cytoscape({
      container: cyRef.current,

      elements: [
        // NODES
        {
          data: {
            id: "ravi",
            label: "Ravi Kumar",
            type: "PERSON",
          },
        },
        {
          data: {
            id: "amit",
            label: "Amit Sharma",
            type: "PERSON",
          },
        },
        {
          data: {
            id: "phone",
            label: "+91 XXXXXXXX",
            type: "PHONE",
          },
        },
        {
          data: {
            id: "bank",
            label: "XXXX1234",
            type: "BANK ACCOUNT",
          },
        },
        {
          data: {
            id: "delhi",
            label: "Delhi",
            type: "LOCATION",
          },
        },

        // EDGES
        {
          data: {
            id: "e1",
            source: "ravi",
            target: "amit",
            label: "KNOWS",
          },
        },
        {
          data: {
            id: "e2",
            source: "ravi",
            target: "phone",
            label: "USES",
          },
        },
        {
          data: {
            id: "e3",
            source: "amit",
            target: "bank",
            label: "OWNS",
          },
        },
        {
          data: {
            id: "e4",
            source: "ravi",
            target: "delhi",
            label: "LOCATED AT",
          },
        },
      ],

      style: [
        {
          selector: "node",
          style: {
            "background-color": "#2563eb",
            label: "data(label)",
            color: "#ffffff",
            "text-valign": "center",
            "text-halign": "center",
            width: 60,
            height: 60,
            "font-size": 10,
          },
        },

        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#64748b",
            "target-arrow-color": "#64748b",
            "target-arrow-shape": "triangle",
            label: "data(label)",
            color: "#94a3b8",
            "font-size": 8,
            "curve-style": "bezier",
          },
        },
      ],

      layout: {
        name: "cose",
      },
    });

    return () => cy.destroy();
  }, []);

  return (
    <div
      ref={cyRef}
      style={{
        width: "100%",
        height: "600px",
        background: "#0f172a",
      }}
    />
  );
}



