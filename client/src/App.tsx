import { useState } from "react";
import { Toaster } from "react-hot-toast";
import Header from "./components/Header";
import InputPanel from "./components/InputPanel";
import CodePreview from "./components/CodePreview";
import TokenUsageBar from "./components/TokenUsageBar";
import { GenerationResult, TokenUsage } from "./services/ai-client";

function App() {
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionUsage, setSessionUsage] = useState<TokenUsage>({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
  const [lastRequestUsage, setLastRequestUsage] = useState<TokenUsage | null>(null);

  const handleResult = (newResult: GenerationResult) => {
    setResult(newResult);
    setLastRequestUsage(newResult.tokenUsage);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Toaster position="top-right" />
      <Header />

      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-screen-2xl mx-auto w-full">
        {/* Left Panel - Input */}
        <div className="w-full lg:w-2/5">
          <InputPanel
            onResult={handleResult}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            onTokenUpdate={setSessionUsage}
          />
        </div>

        {/* Right Panel - Code Output */}
        <div className="w-full lg:w-3/5">
          <CodePreview result={result} isLoading={isLoading} />
        </div>
      </main>

      {/* Token Usage Bar */}
      <TokenUsageBar usage={sessionUsage} lastRequestUsage={lastRequestUsage} />

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 px-6 py-3 text-center">
        <p className="text-xs text-gray-500">
          InfraSketch AI — Supports GitHub Models, OpenAI, Groq, Together AI, OpenRouter, Anthropic •
          All processing in your browser • Keys stored in session only
        </p>
      </footer>
    </div>
  );
}

export default App;
