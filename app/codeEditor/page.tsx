"use client";

import Editor from "@monaco-editor/react";
import { useState } from "react";

const files: {
  [key: string]: { name: string; language: string; value: string };
} = {
  "script.js": {
    name: "script.js",
    language: "javascript",
    value: "console.log('hello')",
  },
  "style.css": {
    name: "style.css",
    language: "css",
    value: "body { background-color: red; }",
  },
  "index.html": {
    name: "index.html",
    language: "html",
    value: "<h1>hello world</h1>",
  },
};

export default function CodeEditor() {
  const [fileName, setFileName] = useState("script.js");

  const file = files[fileName];
  return (
    <div className="max-w-screen text-white bg-slate-900 graphPaper min-h-screen flex items-center justify-center overflow-x-hidden">
      <div className="flex flex-col space-y-2 px-4">
        <button
          disabled={fileName === "script.js"}
          onClick={() => setFileName("script.js")}
        >
          script.js
        </button>
        <button
          disabled={fileName === "style.css"}
          onClick={() => setFileName("style.css")}
        >
          style.css
        </button>
        <button
          disabled={fileName === "index.html"}
          onClick={() => setFileName("index.html")}
        >
          index.html
        </button>
      </div>
      <Editor
        height="80vh"
        theme="vs-dark"
        path={file.name}
        defaultLanguage={file.language}
        defaultValue={file.value}
      />
    </div>
  );
}
