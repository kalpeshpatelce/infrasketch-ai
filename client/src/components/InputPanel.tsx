import { useState } from "react";
import { Wand2, Cloud, Server, FileCode2, Layers, Key, ShieldAlert, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import {
  generateIaC,
  GenerationResult,
  LLM_PROVIDERS,
  LLMProvider,
  getSessionUsage,
  TokenUsage,
} from "../services/ai-client";

interface InputPanelProps {
  onResult: (result: GenerationResult) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onTokenUpdate: (usage: TokenUsage) => void;
}

type OutputType = "terraform" | "ansible" | "both";
type CloudProvider = "aws" | "azure" | "gcp";

export default function InputPanel({
  onResult,
  isLoading,
  setIsLoading,
  onTokenUpdate,
}: InputPanelProps) {
  const [description, setDescription] = useState("");
  const [outputType, setOutputType] = useState<OutputType>("terraform");
  const [cloudProvider, setCloudProvider] = useState<CloudProvider>("aws");

  // LLM Provider state
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(LLM_PROVIDERS[0]);
  const [selectedModel, setSelectedModel] = useState(LLM_PROVIDERS[0].defaultModel);
  const [token, setToken] = useState(() => sessionStorage.getItem(`token_${LLM_PROVIDERS[0].id}`) || "");
  const [showConfig, setShowConfig] = useState(false);

  const handleProviderChange = (providerId: string) => {
    const provider = LLM_PROVIDERS.find((p) => p.id === providerId)!;
    setSelectedProvider(provider);
    setSelectedModel(provider.defaultModel);
    setToken(sessionStorage.getItem(`token_${provider.id}`) || "");
  };

  const handleGenerate = async () => {
    if (!token.trim()) {
      toast.error("Please enter your API key");
      setShowConfig(true);
      return;
    }

    if (description.trim().length < 10) {
      toast.error("Please provide a more detailed description (at least 10 characters)");
      return;
    }

    // Save token to sessionStorage (cleared when tab closes)
    sessionStorage.setItem(`token_${selectedProvider.id}`, token);

    setIsLoading(true);
    try {
      const result = await generateIaC(
        description,
        outputType,
        cloudProvider,
        token,
        selectedProvider,
        selectedModel
      );
      onResult(result);
      onTokenUpdate(getSessionUsage().total);
      toast.success("Code generated successfully!");
    } catch (error: any) {
      const message = error.message || "Generation failed";
      if (message.includes("401") || message.includes("403") || message.includes("Unauthorized")) {
        toast.error("Invalid API key. Check your key and permissions.");
      } else if (message.includes("429")) {
        toast.error("Rate limited. Wait a moment and try again.");
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
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 h-full flex flex-col gap-4 overflow-y-auto">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <Wand2 className="w-5 h-5 text-blue-400" />
        Describe Your Infrastructure
      </h2>

      {/* LLM Provider Configuration */}
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 space-y-3">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center justify-between w-full text-sm"
        >
          <span className="flex items-center gap-2 text-gray-300">
            <Key className="w-4 h-4 text-blue-400" />
            {token ? `✓ ${selectedProvider.name} (${selectedModel})` : "Configure AI Provider (required)"}
          </span>
          <span className="text-gray-500 text-xs">{showConfig ? "▲" : "▼"}</span>
        </button>

        {showConfig && (
          <div className="space-y-3 pt-2 border-t border-gray-700">
            {/* Security Warning */}
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
              <p className="text-xs text-yellow-400 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Security:</strong> Use a temporary API key for this session.
                  Keys are stored in sessionStorage only (cleared when tab closes).
                  Never use your primary/production API key on a public website.
                  Create a separate key with limited scope and revoke it after use.
                </span>
              </p>
            </div>

            {/* Provider Selection */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">AI Provider</label>
              <select
                value={selectedProvider.id}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {LLM_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {selectedProvider.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* API Key Input */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">API Key</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={`Enter ${selectedProvider.name} API key...`}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">{selectedProvider.tokenNote}</p>
                <a
                  href={selectedProvider.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                >
                  Get key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Description Input */}
      <div className="flex-1">
        <label htmlFor="description" className="block text-sm text-gray-400 mb-2">
          Describe what you want to build in plain English
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., Deploy WordPress using ECS Fargate and RDS with proper VPC, security groups, and NAT gateway..."
          className="w-full h-36 bg-gray-900 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">Ctrl+Enter to generate</p>
      </div>

      {/* Output Type Selection */}
      <div>
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

      {/* Cloud Provider Selection */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Cloud Provider</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "aws" as const, label: "AWS" },
            { value: "azure" as const, label: "Azure" },
            { value: "gcp" as const, label: "GCP" },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCloudProvider(value)}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                cloudProvider === value
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
