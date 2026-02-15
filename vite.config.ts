import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    // 🔥 Very important for Electron (file://)
    base: "./",

    plugins: [
      react(),
      {
        name: "exclude-runtime-from-browser",
        enforce: "pre", // Run before other plugins
        resolveId(id, importer) {
          if (!id) return null;

          // IMPORTANT: Only redirect our own runtime module, NOT @babel/runtime or other node_modules
          // Skip if it's from node_modules (like @babel/runtime)
          if (
            id.includes("node_modules") ||
            id.startsWith("@babel/") ||
            id.startsWith("@")
          ) {
            return null;
          }

          // Check if this is OUR runtime import (from our project's runtime folder)
          const isOurRuntimeImport =
            id.includes("runtime/toolRuntime") ||
            id.includes("runtime\\toolRuntime") ||
            id === "runtime" ||
            id === "./runtime" ||
            id === "../runtime" ||
            id.startsWith("./runtime/") ||
            id.startsWith("../runtime/") ||
            id.startsWith("runtime/") ||
            id.startsWith("runtime\\");

          if (isOurRuntimeImport) {
            // If importer is provided, verify it's not from node_modules
            if (importer && importer.includes("node_modules")) {
              return null; // Don't redirect if importer is from node_modules
            }

            // If importer is provided, try to resolve the actual path first
            if (importer) {
              try {
                const resolved = path.resolve(path.dirname(importer), id);
                // Check if the resolved path is in OUR runtime folder (not node_modules)
                const runtimePath = path.join(__dirname, "src", "runtime");
                if (
                  resolved.includes(runtimePath) &&
                  !resolved.includes("node_modules")
                ) {
                  return path.resolve(
                    __dirname,
                    "src",
                    "runtime",
                    "browser-stub.ts",
                  );
                }
              } catch (e) {
                // If resolution fails, check if it's a relative import to our runtime
                if (id.startsWith("./") || id.startsWith("../")) {
                  return path.resolve(
                    __dirname,
                    "src",
                    "runtime",
                    "browser-stub.ts",
                  );
                }
              }
            }

            // Only redirect if it's clearly our runtime module
            if (!id.includes("node_modules") && !id.startsWith("@")) {
              return path.resolve(
                __dirname,
                "src",
                "runtime",
                "browser-stub.ts",
              );
            }
          }

          return null;
        },
      },
      {
        name: "skip-node-llama-cpp-analysis",
        enforce: "pre",
        resolveId(id) {
          // Skip Vite's import analysis for node-llama-cpp
          // This is a Node.js native module that should only be loaded in Electron
          if (id === "node-llama-cpp") {
            // Return a virtual module that exports nothing
            // This prevents Vite from trying to analyze the actual module
            return {
              id: "node-llama-cpp",
              moduleSideEffects: false,
            };
          }
          return null;
        },
        load(id) {
          // Provide a stub for node-llama-cpp during build
          if (id === "node-llama-cpp") {
            return ` 
              // Stub for node-llama-cpp (Node.js native module, loaded dynamically in Electron)
              export const getLlama = () => Promise.reject(new Error('node-llama-cpp not available in browser'));
              export const LlamaModel = class {};
              export const LlamaContext = class {};
              export const LlamaChatSession = class {};
            `;
          }
          return null;
        },
      },
      {
        name: "handle-typescript-source-requests",
        configureServer(server) {
          // Handle direct requests for .ts files gracefully
          // This prevents errors when browser dev tools or source maps try to load .ts files
          server.middlewares.use((req, res, next) => {
            // Only intercept direct .ts file requests (not module imports)
            // Module imports will have proper headers and query params
            if (
              req.url &&
              req.url.endsWith(".ts") &&
              req.method === "GET" &&
              !req.url.includes("node_modules") &&
              !req.url.includes("?import") && // Not a Vite module import
              !req.url.includes("&import") && // Not a Vite module import
              !req.headers["sec-fetch-mode"]?.includes("cors")
            ) {
              // Not a CORS module request

              // Return 404 with empty response to prevent console errors
              // This is a direct file request, not a module import
              // Vite handles module imports through its transform pipeline
              res.statusCode = 404;
              res.setHeader("Content-Type", "text/plain");
              res.setHeader("Cache-Control", "no-cache");
              res.end("");
              return;
            }
            next();
          });
        },
      },
    ],

    css: {
      postcss: {
        plugins: [tailwindcss(), autoprefixer()],
      },
      devSourcemap: false, // Disable CSS source maps in dev mode
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
      // Custom resolver for runtime imports
      conditions: ["import", "module", "browser", "default"],
    },

    server: {
      port: 3000,
      host: "0.0.0.0",
      // Handle TypeScript files properly
      fs: {
        strict: false,
        allow: [".."],
      },
      // Middleware to handle errors
      middlewareMode: false,
      // Disable source maps in dev to avoid issues
      sourcemapIgnoreList: (sourcePath) => {
        return sourcePath.includes("node_modules");
      },
      // Add CSP headers to allow huggingface.co for local model downloads
      headers: {
        "Content-Security-Policy":
          "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* https://*.google.com https://*.googleapis.com https://*.gstatic.com https://www.google.com https://speech.googleapis.com https://www.googleapis.com https://cdn.jsdelivr.net https://*.huggingface.co https://huggingface.co https://*.hf.co https://*.xethub.hf.co https://cas-bridge.xethub.hf.co",
      },
    },

    // Disable source maps completely in dev mode to prevent .ts file requests
    esbuild: {
      sourcemap: false,
    },

    define: {
      // Only for build-time access
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY || ""),
    },

    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: false, // Disable source maps to avoid issues

      // Prevent oversized bundles
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("react")) return "react";
              if (id.includes("monaco") || id.includes("codemirror"))
                return "editor";
              if (id.includes("prettier")) return "prettier";
              return "vendor";
            }
          },
        },
        // Exclude Node.js native modules from bundle
        external: [
          "better-sqlite3",
          "sqlite3",
          "node-llama-cpp",
          "electron",
          "fs",
          "fs/promises",
          "path",
          "os",
          "crypto",
          "util",
          "stream",
          "buffer",
          "events",
          "url",
          "querystring",
          "http",
          "https",
          "net",
          "tls",
          "child_process",
          "worker_threads",
          "cluster",
          "dgram",
          "dns",
          "zlib",
          "readline",
          "repl",
          "vm",
          "assert",
          "module",
          "perf_hooks",
          "v8",
          "inspector",
        ],
      },

      chunkSizeWarningLimit: 1500,
    },

    // Optimize dependencies
    optimizeDeps: {
      exclude: [
        "better-sqlite3",
        "sqlite3",
        "node-llama-cpp",
        "electron",
        "prettier/plugins/estree",
        "prettier/plugins/markdown",
      ],
      include: [
        "react-syntax-highlighter",
        "react-markdown",
        "@monaco-editor/react",
        "style-to-js",
      ],
      esbuildOptions: {
        // Handle CommonJS modules that don't have default exports
        mainFields: ["module", "main"],
      },
      // Force CommonJS interop for problematic modules
      commonjsOptions: {
        transformMixedEsModules: true,
        defaultIsModuleExports: true,
      },
    },
  };
});
