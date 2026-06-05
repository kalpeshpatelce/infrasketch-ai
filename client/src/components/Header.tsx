import { Layers, Github } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold text-white">InfraSketch AI</h1>
            <p className="text-sm text-gray-400">
              Natural Language → Infrastructure as Code
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-4">
          <a
            href="https://github.com/YOUR_USERNAME/InfraSketch-AI"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
