import { useState } from "react";
import Editor from "@monaco-editor/react";
import {
  Download,
  FileCode2,
  CheckCircle,
  AlertTriangle,
  Copy,
  Network,
} from "lucide-react";
import toast from "react-hot-toast";
import { GenerationResult } from "../services/ai-client";
import ArchitectureView from "./ArchitectureView";

interface CodePreviewProps {
  result: GenerationResult | null;
  isLoading: boolean;
}

type TabType = "architecture" | "terraform" | "ansible" | "readme";

function formatArchitectureMd(architecture: string): string {
  const mermaidMatch = architecture.match(/---MERMAID---([\s\S]*?)---END-MERMAID---/);
  const componentsMatch = architecture.match(/---COMPONENTS---([\s\S]*?)---END-COMPONENTS---/);
  const flowMatch = architecture.match(/---FLOW---([\s\S]*?)---END-FLOW---/);

  return `# Architecture Documentation

## Diagram

\`\`\`mermaid
${mermaidMatch?.[1]?.trim() || ""}
\`\`\`

## Components

${componentsMatch?.[1]?.trim() || ""}

## Data Flow

${flowMatch?.[1]?.trim() || ""}
`;
}

export default function CodePreview({ result, isLoading }: CodePreviewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("architecture");

  const getAvailableTabs = (): { key: TabType; label: string; icon?: string }[] => {
    if (!result) return [];
    const tabs: { key: TabType; label: string; icon?: string }[] = [];
    if (result.files.architecture)
      tabs.push({ key: "architecture", label: "Architecture", icon: "arch" });
    if (result.files.terraform)
      tabs.push({ key: "terraform", label: "main.tf" });
    if (result.files.ansible)
      tabs.push({ key: "ansible", label: "playbook.yml" });
    if (result.files.readme) tabs.push({ key: "readme", label: "README.md" });
    return tabs;
  };

  const getActiveContent = (): string => {
    if (!result) return "";
    switch (activeTab) {
      case "terraform":
        return result.files.terraform || "";
      case "ansible":
        return result.files.ansible || "";
      case "readme":
        return result.files.readme || "";
      case "architecture":
        return result.files.architecture || "";
      default:
        return "";
    }
  };

  const getLanguage = (): string => {
    switch (activeTab) {
      case "terraform":
        return "hcl";
      case "ansible":
        return "yaml";
      case "readme":
        return "markdown";
      case "architecture":
        return "markdown";
      default:
        return "plaintext";
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveContent());
    toast.success("Copied to clipboard!");
  };

  const handleDownload = () => {
    if (!result) return;
    // Create a zip-like download with individual files
    const files: { name: string; content: string }[] = [];
    if (result.files.terraform) files.push({ name: "main.tf", content: result.files.terraform });
    if (result.files.ansible) files.push({ name: "playbook.yml", content: result.files.ansible });
    if (result.files.architecture) files.push({ name: "ARCHITECTURE.md", content: formatArchitectureMd(result.files.architecture) });
    if (result.files.readme) files.push({ name: "README.md", content: result.files.readme });

    // Download each file (or as a combined markdown for simplicity)
    files.forEach((file) => {
      const blob = new Blob([file.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    toast.success(`Downloaded ${files.length} file(s)`);
  };

  // Empty state
  if (!result && !isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <FileCode2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Code Generated Yet</h3>
          <p className="text-sm">
            Describe your infrastructure on the left and click Generate
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            Generating Infrastructure Code...
          </h3>
          <p className="text-sm text-gray-400">
            AI is crafting your Terraform/Ansible configuration and architecture
            diagram
          </p>
        </div>
      </div>
    );
  }

  const tabs = getAvailableTabs();
  const isArchitectureTab = activeTab === "architecture";

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 h-full flex flex-col">
      {/* Tab Bar */}
      <div className="flex items-center justify-between border-b border-gray-700 px-4">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              {tab.icon === "arch" && <Network className="w-3.5 h-3.5" />}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {!isArchitectureTab && (
            <button
              onClick={handleCopy}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
              title="Copy to clipboard"
              aria-label="Copy code to clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            aria-label="Download as ZIP"
          >
            <Download className="w-4 h-4" />
            ZIP
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-[400px]">
        {isArchitectureTab && result?.files.architecture ? (
          <ArchitectureView architecture={result.files.architecture} />
        ) : (
          <Editor
            height="100%"
            language={getLanguage()}
            value={getActiveContent()}
            theme="vs-dark"
            options={{
              readOnly: false,
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              padding: { top: 16 },
            }}
          />
        )}
      </div>

      {/* Validation Status */}
      {result?.validation && result.validation.length > 0 && !isArchitectureTab && (
        <div className="border-t border-gray-700 px-4 py-3">
          <div className="flex items-center gap-4">
            {result.validation.map((v, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {v.valid ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                )}
                <span
                  className={v.valid ? "text-green-400" : "text-yellow-400"}
                >
                  {v.type}: {v.valid ? "Valid" : `${v.errors.length} issue(s)`}
                </span>
                {v.warnings.length > 0 && (
                  <span className="text-gray-500">
                    ({v.warnings.length} warning
                    {v.warnings.length > 1 ? "s" : ""})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
