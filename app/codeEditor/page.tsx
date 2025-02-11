"use client";

import React, { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

// We'll need @webcontainer/api for the in-browser WebContainer:
import { WebContainer } from "@webcontainer/api";

// We might optionally keep or remove any styling references:
export default function CodeEditor() {
  const [webcontainerInstance, setWebcontainerInstance] = useState<any>(null);

  // We'll store a reference to the monaco model's file name:
  const [fileName, setFileName] = useState("/index.js");
  const [fileContent, setFileContent] = useState<string>(`console.log("Hello WebContainer");`);
  
  // Terminal references:
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  
  // Keep track of the shell process so we can write to it:
  const shellWriterRef = useRef<WritableStreamDefaultWriter<string> | null>(null);

  // Start the webcontainer only once:
  useEffect(() => {
    async function bootContainer() {
      // Boot the container
      const instance = await WebContainer.boot();
      setWebcontainerInstance(instance);

      // Next, mount initial files (in a real app we might want multiple)
      await instance.mount({
        "index.js": {
          file: {
            contents: fileContent,
          },
        },
        "package.json": {
          file: {
            contents: JSON.stringify({
              name: "in-browser-app",
              type: "module",
              dependencies: {
                // e.g. "chalk": "latest"
              },
              scripts: {
                start: "node index.js"
              },
            }, null, 2),
          },
        },
      });

      // Create the terminal
      termRef.current = new Terminal({ convertEol: true });
      fitAddonRef.current = new FitAddon();
      termRef.current.loadAddon(fitAddonRef.current);

      if (terminalRef.current) {
        termRef.current.open(terminalRef.current);
        fitAddonRef.current.fit();
      }

      // Start a shell, so user can run commands interactively:
      const shellProcess = await instance.spawn("jsh", {
        terminal: {
          cols: termRef.current?.cols || 80,
          rows: termRef.current?.rows || 24,
        },
      });

      // Pipe shell output => Xterm
      shellProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            termRef.current?.write(data);
          }
        })
      );

      // Store the writer
      shellWriterRef.current = shellProcess.input.getWriter();

      // When user types in the terminal => send data to webcontainer shell
      termRef.current.onData((data) => {
        shellWriterRef.current?.write(data);
      });
    }

    bootContainer();
  }, []);

  // Resize terminal if window changes
  useEffect(() => {
    function handleResize() {
      if (termRef.current && fitAddonRef.current) {
        fitAddonRef.current.fit();
        if (webcontainerInstance) {
          // Optionally, if we had a shell process, we could call shellProcess.resize
          // But for brevity, we'll skip that unless we store the process
        }
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [webcontainerInstance]);

  // When the code in the editor changes => update both local state and webcontainer:
  function handleEditorChange(value?: string) {
    if (!value || !webcontainerInstance) return;
    setFileContent(value);
    // Update the file in webcontainer:
    webcontainerInstance.fs.writeFile("/index.js", value);
  }

  return (
    <div className="max-w-screen text-white bg-slate-900 min-h-screen flex flex-col">
      <div className="flex-1 flex">
        {/* Left side: Editor */}
        <div style={{ width: "50%", backgroundColor: "#1e1e1e" }}>
          <Editor
            height="100%"
            width="100%"
            theme="vs-dark"
            path={fileName}
            defaultLanguage="javascript"
            defaultValue={fileContent}
            onChange={handleEditorChange}
          />
        </div>

        {/* Right side: Terminal */}
        <div style={{ width: "50%", backgroundColor: "#000" }}>
          <div ref={terminalRef} style={{ width: "100%", height: "100%" }}></div>
        </div>
      </div>
    </div>
  );
}