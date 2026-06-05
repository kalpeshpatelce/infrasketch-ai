import { useEffect, useState } from "react";
import mermaid from "mermaid";
import { Network, Table, ArrowRightLeft } from "lucide-react";

interface ArchitectureViewProps {
  architecture: string;
}

type ViewMode = "diagram" | "components" | "flow";

// Initialize mermaid with dark theme
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    primaryColor: "#3b82f6",
    primaryTextColor: "#f3f4f6",
    primaryBorderColor: "#60a5fa",
    lineColor: "#6b7280",
    secondaryColor: "#1f2937",
    tertiaryColor: "#111827",
    background: "#1f2937",
    mainBkg: "#1f2937",
    nodeBorder: "#60a5fa",
  },
  flowchart: {
    htmlLabels: true,
    curve: "basis",
  },
});

export default function ArchitectureView({ architecture }: ArchitectureViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("diagram");
  const [diagramSvg, setDiagramSvg] = useState<string>("");
  const [renderError, setRenderError] = useState<string>("");

  // Parse sections from architecture content
  const mermaidCode = extractSection(architecture, "MERMAID");
  const components = extractSection(architecture, "COMPONENTS");
  const flow = extractSection(architecture, "FLOW");

  useEffect(() => {
    if (mermaidCode && viewMode === "diagram") {
      renderMermaid(sanitizeMermaidCode(mermaidCode));
    }
  }, [mermaidCode, viewMode]);

  async function renderMermaid(code: string) {
    try {
      setRenderError("");
      const id = `mermaid-${Date.now()}`;
      const { svg } = await mermaid.render(id, code);
      setDiagramSvg(svg);
    } catch (err: any) {
      setRenderError(err.message || "Failed to render diagram");
      // Fallback: show raw mermaid code
      setDiagramSvg("");
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tab navigation */}
      <div className="flex items-center gap-1 px-4 py-2 bg-gray-900/50 border-b border-gray-700">
        <button
          onClick={() => setViewMode("diagram")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            viewMode === "diagram"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          Diagram
        </button>
        <button
          onClick={() => setViewMode("components")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            viewMode === "components"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          Components
        </button>
        <button
          onClick={() => setViewMode("flow")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            viewMode === "flow"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Data Flow
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === "diagram" && (
          <DiagramView
            svg={diagramSvg}
            rawCode={mermaidCode}
            error={renderError}
          />
        )}
        {viewMode === "components" && (
          <ComponentsView content={components} />
        )}
        {viewMode === "flow" && (
          <FlowView content={flow} />
        )}
      </div>
    </div>
  );
}

function DiagramView({
  svg,
  rawCode,
  error,
}: {
  svg: string;
  rawCode: string;
  error: string;
}) {
  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
          <p className="text-yellow-400 text-sm mb-2">
            Diagram rendering had an issue. Showing raw Mermaid code:
          </p>
          <pre className="text-xs text-gray-300 bg-gray-900 p-3 rounded overflow-auto">
            {rawCode}
          </pre>
        </div>
        <p className="text-xs text-gray-500">
          Copy this code into{" "}
          <a
            href="https://mermaid.live"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline"
          >
            mermaid.live
          </a>{" "}
          to view the diagram.
        </p>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No architecture diagram available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="w-full overflow-auto bg-gray-900 rounded-lg p-6 border border-gray-700"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <details className="w-full">
        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
          View Mermaid source code
        </summary>
        <pre className="mt-2 text-xs text-gray-400 bg-gray-900 p-3 rounded overflow-auto border border-gray-700">
          {rawCode}
        </pre>
      </details>
    </div>
  );
}

function ComponentsView({ content }: { content: string }) {
  if (!content) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No component information available</p>
      </div>
    );
  }

  // Parse markdown table into rows
  const lines = content.trim().split("\n").filter((l) => l.trim().length > 0);
  const headerLine = lines.find((l) => l.includes("Resource Name") || l.includes("---|"));
  const headerIndex = lines.indexOf(headerLine || "");
  const dataLines = lines.slice(headerIndex + 2); // Skip header + separator

  // Parse header
  const headers = lines[headerIndex]
    ?.split("|")
    .map((h) => h.trim())
    .filter(Boolean) || ["Resource", "Service", "Naming", "Placement", "Purpose", "Security Group"];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <Table className="w-4 h-4 text-blue-400" />
        Infrastructure Components
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-900">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="text-left px-3 py-2 text-blue-400 font-medium border border-gray-700"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataLines.map((line, rowIndex) => {
              const cells = line
                .split("|")
                .map((c) => c.trim())
                .filter(Boolean);
              return (
                <tr
                  key={rowIndex}
                  className={rowIndex % 2 === 0 ? "bg-gray-800" : "bg-gray-800/50"}
                >
                  {cells.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-3 py-2 text-gray-300 border border-gray-700 font-mono"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FlowView({ content }: { content: string }) {
  if (!content) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No data flow information available</p>
      </div>
    );
  }

  const steps = content
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => l.trim());

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <ArrowRightLeft className="w-4 h-4 text-blue-400" />
        Data Flow
      </h3>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex items-start gap-3 bg-gray-900 rounded-lg p-3 border border-gray-700"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
              {i + 1}
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              {step.replace(/^\d+\.\s*/, "")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Sanitize mermaid code to fix common AI-generated syntax issues.
 */
function sanitizeMermaidCode(code: string): string {
  let sanitized = code;

  // Replace dots in node IDs with underscores (aws_lb.main → aws_lb_main)
  // Match node IDs that contain dots (not inside quotes)
  sanitized = sanitized.replace(
    /\b([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\b(?![^"]*"[^"]*$)/gm,
    "$1_$2"
  );

  // Remove ${...} template literals and replace with readable text
  sanitized = sanitized.replace(/\$\{([^}]+)\}/g, (_, content) => {
    // Extract the variable name for readability
    const varName = content.replace("var.", "").replace("local.", "");
    return varName;
  });

  // Fix style references that might still have dots
  sanitized = sanitized.replace(/style\s+([^\s]+)/g, (_match, nodeId) => {
    return `style ${nodeId.replace(/\./g, "_")}`;
  });

  // Remove any accidental markdown fences
  sanitized = sanitized.replace(/^```[\w]*\n?/gm, "");
  sanitized = sanitized.replace(/\n?```\s*$/gm, "");

  return sanitized.trim();
}

/**
 * Extract a section from the structured architecture output.
 */
function extractSection(content: string, section: string): string {
  const regex = new RegExp(
    `---${section}---([\\s\\S]*?)---END-${section}---`
  );
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}
