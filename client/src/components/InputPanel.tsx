import { useState } from "react";
import { Wand2, Cloud, Server, FileCode2, Layers, Key } from "lucide-react";
import toast from "react-hot-toast";
import { generateIaC, GenerationResult } from "../services/ai-client";

interface InputPanelProps {
  onResult: (result: GenerationResult) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

type OutputType = "terraform" | "ansible" | "both";
type Provider = "aws" | "azure" | "gcp";

export default function InputPanel({
  onResult,
  isLoading,
  setIsLoading,
}: InputPanelProps) {
  const [description, setDescription] = useState("");
  const [outputType, setOutputType] = useState<OutputType>("terraform");
  const [provider, setProvider] = useState<Provider>("aws");
  const [token, setToken] = useState(() => localStorage.getItem("github_token") || "");
  const [showToken, setShowToken] = useState(false);

  const handleGenerate = async () => {
    if (!token.trim()) {
      toast.error("Please enter your GitHub Personal Access Token");
      setShowToken(true);
      return;
    }

    if (description.trim().length < 10) {
      toast.error("Please provide a more detailed description (at least 10 characters)");
      return;
    }

    // Save token to localStorage for convenience
    localStorage.setItem("github_token", token);

    setIsLoading(true);
    try {
      const result = await generateIaC(description, outputType, provider, token);
      onResult(result);
      toast.success("Code generated successfully!");
    } catch (error: any) {
      const message = error.message || "Generation failed";
      if (message.includes("401") || message.includes("403")) {
        toast.error("Invalid token. Check your GitHub PAT has 'models:read' permission.");
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === "Enter") {
      handleGenerate();
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Wand2 className="w-5 h-5 text-blue-400" />
        Describe Your Infrastructure
      </h2>

      {/* GitHub Token Input */}
      <div className="mb-4">
        <button
          onClick={() => setShowToken(!showToken)}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white mb-2 transition-colors"
        >
          <Key className="w-3.5 h-3.5" />
          {token ? "✓ GitHub Token configured" : "Set GitHub Token (required)"}
        </button>
        {showToken && (
          <div className="space-y-2">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="github_pat_xxxxx..."
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500">
              Get a token from{" "}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline"
              >
                github.com/settings/tokens
              </a>
              {" "}with <code className="bg-gray-700 px-1 rounded">models:read</code> permission. Stored locally only.
            </p>
          </div>
        )}
      </div>

      {/* Description Input */}
      <div className="mb-4 flex-1">
        <label htmlFor="description" className="block text-sm text-gray-400 mb-2">
          Describe what you want to build in plain English
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., Deploy WordPress using ECS Fargate and RDS with proper VPC, security groups, and NAT gateway..."
          className="w-full h-40 bg-gray-900 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">Ctrl+Enter to generate</p>
      </div>

      {/* Output Type Selection */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">Output Type</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "terraform" as const, label: "Terraform", icon: FileCode2 },
            { value: "ansible" as const, label: "Ansible", icon: Server },
            { value: "both" as const, label: "Both", icon: Layers },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setOutputType(value)}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                outputType === value
                  ? "border-blue-500 bg-blue-500/10 text-blue-400"
                  : "border-gray-600 text-gray-400 hover:border-gray-500"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Provider Selection */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">Cloud Provider</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "aws" as const, label: "AWS" },
            { value: "azure" as const, label: "Azure" },
            { value: "gcp" as const, label: "GCP" },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setProvider(value)}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                provider === value
                  ? "border-blue-500 bg-blue-500/10 text-blue-400"
                  : "border-gray-600 text-gray-400 hover:border-gray-500"
              }`}
            >
              <Cloud className="w-4 h-4" />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isLoading || description.trim().length < 10}
        className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Wand2 className="w-5 h-5" />
            Generate Code
          </>
        )}
      </button>
    </div>
  );
}
