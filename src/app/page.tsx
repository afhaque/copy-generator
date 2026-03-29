"use client";

import { useState, useRef } from "react";

const COPY_TYPES = [
  "Email",
  "Social Media Post",
  "Ad Copy",
  "Blog Intro",
  "Landing Page",
  "Product Description",
] as const;

const TONES = [
  "Professional",
  "Casual",
  "Persuasive",
  "Friendly",
  "Formal",
  "Witty",
] as const;

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [copyType, setCopyType] = useState<string>(COPY_TYPES[0]);
  const [tone, setTone] = useState<string>(TONES[0]);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function handleGenerate() {
    if (!prompt.trim()) return;

    setLoading(true);
    setOutput("");
    setError("");
    setCopied(false);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, copyType, tone }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.text) {
                setOutput((prev) => prev + parsed.text);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">Copy Generator</h1>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1.5">Type</label>
            <select
              value={copyType}
              onChange={(e) => setCopyType(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {COPY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1.5">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            Describe the copy you need
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., A welcome email for new SaaS users that highlights our 3 key features..."
            rows={4}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) handleGenerate();
            }}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Generating…
            </span>
          ) : (
            "Generate Copy"
          )}
        </button>

        {error && (
          <div className="bg-red-950/50 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {output && (
          <div className="relative">
            <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-4 text-sm leading-relaxed whitespace-pre-wrap">
              {output}
            </div>
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-md px-3 py-1.5 text-xs transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
