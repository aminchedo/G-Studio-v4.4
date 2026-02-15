#!/usr/bin/env node

/**
 * Project Analyzer - Base Version
 * هدف: آماده‌سازی پروژه برای تحلیل هوشمند در آینده
 */

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const TARGET_EXT = [".js", ".ts", ".tsx"];
const IGNORE_DIRS = ["node_modules", ".git", "dist", "build", "release"];

function readFileSafe(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function analyzeFile(filePath) {
  const code = readFileSafe(filePath);
  const lines = code.split("\n");

  const result = {
    file: filePath,
    lines: lines.length,
    functions: 0,
    classes: 0,
    complexity: 0,
    score: 100,
  };

  // --- AST ANALYSIS ---
  try {
    const source = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.Latest,
      true
    );

    function walk(node) {
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node)
      ) result.functions++;

      if (ts.isClassDeclaration(node)) result.classes++;

      if (
        ts.isIfStatement(node) ||
        ts.isForStatement(node) ||
        ts.isWhileStatement(node) ||
        ts.isSwitchStatement(node)
      ) result.complexity++;

      ts.forEachChild(node, walk);
    }

    walk(source);
  } catch {
    result.parseError = true;
  }

  // ---- Scoring (Simple & Stable) ----
  if (result.lines > 400) result.score -= 10;
  if (result.functions === 0) result.score -= 10;
  if (result.complexity > 20) result.score -= 10;

  result.score = Math.max(0, result.score);

  return result;
}

function scanProject(root) {
  const results = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.includes(entry.name)) walk(fullPath);
      } else if (TARGET_EXT.includes(path.extname(entry.name))) {
        results.push(analyzeFile(fullPath));
      }
    }
  }

  walk(root);
  return results;
}

// --------- RUN ----------
const target = process.argv[2];
if (!target) {
  console.log("Usage: node project-analyzer.js <project-path>");
  process.exit(1);
}

const results = scanProject(target);

console.log("\n📊 Project Summary:\n");
results
  .sort((a, b) => b.score - a.score)
  .forEach(r =>
    console.log(
      `${r.score.toString().padStart(3)} | funcs:${r.functions
        .toString().padStart(3)} | complexity:${r.complexity
        .toString().padStart(3)} | lines:${r.lines
        .toString().padStart(4)} | ${r.file}`
    )
  );

fs.writeFileSync("analysis.json", JSON.stringify(results, null, 2));
console.log("\n✅ analysis.json created");
