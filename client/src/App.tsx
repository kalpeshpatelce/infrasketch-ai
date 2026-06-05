import { useState } from "react";
import { Toaster } from "react-hot-toast";
import Header from "./components/Header";
import InputPanel from "./components/InputPanel";
import CodePreview from "./components/CodePreview";
import { GenerationResult } from "./services/ai-client";

function App() {
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Toaster position="top-right" />
      <Header />

      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-screen-2xl mx-auto w-full">
        {/* Left Panel - Input */}
        <div className="w-full lg:w-2/5">
          <InputPanel
            onResult={setResult}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        </div>

        {/* Right Panel - Code Output */}
        <div className="w-full lg:w-3/5">
          <CodePreview result={result} isLoading={isLoading} />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 px-6 py-3 text-center">
        <p className="text-xs text-gray-500">
          InfraSketch AI — Powered by GitHub Models (GPT-4.1) • All processing happens in your browser • No data stored on any server
        </p>
      </footer>
    </div>
  );
}

export default App;
