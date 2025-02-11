"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { WebContainer } from "@webcontainer/api";
import { FaPlay } from "react-icons/fa";

// Dynamically import client-side only components
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

// We'll need @webcontainer/api for the in-browser WebContainer:
export default function CodeEditor() {
  const [webcontainerInstance, setWebcontainerInstance] = useState<any>(null);

  // We'll store a reference to the monaco model's file name:
  const [fileName, setFileName] = useState("/index.js");
  const [fileContent, setFileContent] = useState<string>(
    `console.log("Hello WebContainer");`
  );
  const [isPythonFile, setIsPythonFile] = useState(false);

  // Terminal references:
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Keep track of the shell process so we can write to it:
  const shellWriterRef = useRef<WritableStreamDefaultWriter<string> | null>(
    null
  );

  useEffect(() => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    console.log("file Extension", extension);
    setIsPythonFile(extension === "py");
  }, [fileName]);

  // Start the webcontainer only once:
  useEffect(() => {
    async function bootContainer() {
      // Boot the container for both Python and JavaScript files
      const instance = await WebContainer.boot();
      setWebcontainerInstance(instance);

      if (isPythonFile) {
        // For Python files, just mount the file directly
        await instance.mount({
          [fileName]: {
            file: {
              contents: fileContent,
            },
          },
        });
      } else {
        // For JavaScript files, set up the React app structure
        await instance.mount({
          "index.js": {
            file: {
              contents: fileContent,
            },
          },
          "package.json": {
            file: {
              contents: JSON.stringify(
                {
                  name: "in-browser-app",
                  type: "module",
                  dependencies: {},
                  scripts: {
                    start: "node index.js",
                  },
                },
                null,
                2
              ),
            },
          },
        });
      }

      // Create the terminal
      termRef.current = new Terminal({ convertEol: true });
      fitAddonRef.current = new FitAddon();
      termRef.current.loadAddon(fitAddonRef.current);

      if (terminalRef.current) {
        termRef.current.open(terminalRef.current);
        fitAddonRef.current.fit();
      }

      // Start a shell
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
          },
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
  }, [isPythonFile]);

  // Resize terminal if window changes
  useEffect(() => {
    function handleResize() {
      if (termRef.current && fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [webcontainerInstance]);

  // When the code in the editor changes => update both local state and webcontainer:
  function handleEditorChange(value?: string) {
    if (!value) return;
    setFileContent(value);
    if (webcontainerInstance) {
      // Update the file in webcontainer
      webcontainerInstance.fs.writeFile(fileName, value);
    }
  }

  // Function to run Python file
  const runPythonFile = async () => {
    if (!termRef.current || !webcontainerInstance) return;

    // Clear terminal
    termRef.current.clear();

    try {
      // Write the Python code to a file and execute it
      await webcontainerInstance.fs.writeFile(fileName, fileContent);

      termRef.current.write(
        `\x1b[32m> Running Python file: ${fileName}...\x1b[0m\r\n`
      );

      const process = await webcontainerInstance.spawn("python3", {
        args: [fileName],
      });

      process.output.pipeTo(
        new WritableStream({
          write(data) {
            termRef.current?.write(data);
          },
        })
      );
    } catch (error) {
      termRef.current.write(`\x1b[31mError: ${error}\x1b[0m\r\n`);
    }
  };

  return (
    <Suspense
      fallback={
        <div className="w-full h-screen flex items-center justify-center bg-slate-900 text-white">
          Loading editor...
        </div>
      }
    >
      <div className="max-w-screen text-white bg-slate-900 min-h-screen flex flex-col">
        <div className="flex-1 flex">
          {/* Left side: Editor */}
          <div style={{ width: "50%", backgroundColor: "#1e1e1e" }}>
            <div className="flex justify-between items-center p-2 bg-[#252526]">
              <span>{fileName}</span>
              {isPythonFile && (
                <button
                  onClick={runPythonFile}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded flex items-center gap-2"
                >
                  <FaPlay size={12} />
                  Run
                </button>
              )}
            </div>
            <Editor
              height="calc(100% - 40px)"
              width="100%"
              theme="vs-dark"
              path={fileName}
              defaultLanguage={isPythonFile ? "python" : "javascript"}
              defaultValue={fileContent}
              onChange={handleEditorChange}
            />
          </div>

          {/* Right side: Terminal */}
          <div style={{ width: "50%", backgroundColor: "#000" }}>
            <div
              ref={terminalRef}
              style={{ width: "100%", height: "100%" }}
            ></div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
