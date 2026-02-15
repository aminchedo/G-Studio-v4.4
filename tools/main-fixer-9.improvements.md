# IMPROVEMENT PLAN: main-fixer-9.v2.py

1. Add argparse CLI flags: --dry-run, --verbose, --analyze-only, --json-output
   Rationale: Better automation, machine-readable output, safer testing
   Commits: 2 (argparse setup + flag integration)

2. Add --analyze-only mode that skips archive creation entirely
   Rationale: Pure analysis without any file operations
   Commits: 1 (modify main() to skip archive options)

3. Add --json-output flag for machine-readable metrics only
   Rationale: Enable programmatic consumption of results
   Commits: 1 (add output format selection)

4. Extract large functions into helper modules (optional, if time permits)
   Rationale: Improve maintainability
   Commits: 3 (create helpers module + refactor + test)

5. Add basic validation tests (dry-run on sample files)
   Rationale: Ensure changes don't break existing behavior
   Commits: 1 (add test harness)

TOTAL ESTIMATED COMMITS: 8
