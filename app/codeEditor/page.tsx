"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { FaPlay } from "react-icons/fa";
import "xterm/css/xterm.css";

// Dynamically import the Monaco Editor for client-side only
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

export default function CodeEditor() {
  // Tracks whether our modules (WebContainer, Xterm, etc.) have loaded
  const [modules, setModules] = useState<{
    WebContainer?: any;
    Terminal?: any;
    FitAddon?: any;
  }>({});

  // Keep track of whether we've booted the container to avoid multiple inits
  const [hasBootedContainer, setHasBootedContainer] = useState(false);

  // Our WebContainer instance
  const [webcontainerInstance, setWebcontainerInstance] = useState<any>(null);

  // File name + contents
  const [fileName, setFileName] = useState("/index.js");
  const [fileContent, setFileContent] = useState<string>(
    `console.log("Hello WebContainer");`
  );
  const [isPythonFile, setIsPythonFile] = useState(false);

  // Terminal references
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);

  // Keep track of the shell process so we can write to it
  const shellWriterRef = useRef<WritableStreamDefaultWriter<string> | null>(
    null
  );

  // Determine if file is Python
  useEffect(() => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    setIsPythonFile(extension === "py");
  }, [fileName]);

  /**
   * 1) Dynamically import all browser-only modules inside useEffect
   *    so Next.js won't try to load them at build/SSR time.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    async function loadModules() {
      const [{ WebContainer }, xterm, xtermAddonFit] = await Promise.all([
        import("@webcontainer/api"),
        import("xterm"),
        import("xterm-addon-fit"),
      ]);

      // Also load the xterm CSS in the client

      setModules({
        WebContainer,
        Terminal: xterm.Terminal,
        FitAddon: xtermAddonFit.FitAddon,
      });
    }

    loadModules();
  }, []);

  /**
   * 2) Once modules are loaded, boot the container and set up the terminal.
   *    We run this effect any time `isPythonFile`, `fileName`, or `fileContent` changes
   *    (so we can re-mount files). The `hasBootedContainer` flag ensures we
   *    only run the container init once. If you want to fully re-init on every change,
   *    you can remove the `hasBootedContainer` check.
   */
  useEffect(() => {
    // Only proceed if everything is loaded
    const { WebContainer, Terminal, FitAddon } = modules;
    if (!WebContainer || !Terminal || !FitAddon) return;
    if (hasBootedContainer) return; // Prevent multiple boots

    async function bootContainer() {
      // Boot the container
      const instance = await WebContainer.boot();
      setWebcontainerInstance(instance);

      // Mount either Python or JS structure
      if (isPythonFile) {
        await instance.mount({
          [fileName]: {
            file: {
              contents: fileContent,
            },
          },
        });
      } else {
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
      termRef.current.onData((data: string) => {
        shellWriterRef.current?.write(data);
      });

      setHasBootedContainer(true); // We’ve booted successfully
    }

    bootContainer();
  }, [modules, isPythonFile, fileName, fileContent, hasBootedContainer]);

  /**
   * 3) Whenever the window resizes, refit the xterm layout
   */
  useEffect(() => {
    const handleResize = () => {
      if (termRef.current && fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [webcontainerInstance]);

  /**
   * 4) When the code in the editor changes => update both local state and WebContainer
   */
  function handleEditorChange(value?: string) {
    if (!value) return;
    setFileContent(value);

    if (webcontainerInstance) {
      webcontainerInstance.fs.writeFile(fileName, value).catch((err: any) => {
        console.error("Failed to write file:", err);
      });
    }
  }

  /**
   * 5) Run the Python file if the user clicks "Run"
   */
  const runPythonFile = async () => {
    if (!termRef.current || !webcontainerInstance) return;

    // Clear the terminal
    termRef.current.clear();

    try {
      // Write the Python code to the file and execute it
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
      termRef.current.write(`\x1b[31mError: ${String(error)}\x1b[0m\r\n`);
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
