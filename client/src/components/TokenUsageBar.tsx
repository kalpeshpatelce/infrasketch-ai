import { ArrowDownToLine, ArrowUpFromLine, Hash, RotateCcw } from "lucide-react";
import { TokenUsage, resetSessionUsage } from "../services/ai-client";

interface TokenUsageBarProps {
  usage: TokenUsage;
  lastRequestUsage: TokenUsage | null;
}

export default function TokenUsageBar({ usage, lastRequestUsage }: TokenUsageBarProps) {
  if (usage.totalTokens === 0) return null;

  const handleReset = () => {
    resetSessionUsage();
    window.location.reload();
  };

  return (
    <div className="bg-gray-800 border-t border-gray-700 px-6 py-2">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
        {/* Session Total */}
        <div className="flex items-center gap-6 text-xs">
          <span className="text-gray-500 font-medium">Session Tokens:</span>

          <div className="flex items-center gap-1.5 text-emerald-400">
            <ArrowDownToLine className="w-3 h-3" />
            <span>In: {usage.inputTokens.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-1.5 text-purple-400">
            <ArrowUpFromLine className="w-3 h-3" />
            <span>Out: {usage.outputTokens.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-1.5 text-blue-400 font-medium">
            <Hash className="w-3 h-3" />
            <span>Total: {usage.totalTokens.toLocaleString()}</span>
          </div>
        </div>

        {/* Last Request */}
        <div className="flex items-center gap-4">
          {lastRequestUsage && (
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>Last request:</span>
              <span className="text-emerald-400/70">{lastRequestUsage.inputTokens.toLocaleString()} in</span>
              <span className="text-purple-400/70">{lastRequestUsage.outputTokens.toLocaleString()} out</span>
              <span className="text-gray-400">{lastRequestUsage.totalTokens.toLocaleString()} total</span>
            </div>
          )}

          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
            title="Reset token counter"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
