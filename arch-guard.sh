#!/usr/bin/env bash
# =============================================================================
# arch-guard.sh  —  Architecture integrity check for Content Swiss Knife
#
# RUN AFTER EVERY CLAUDE CODE SESSION:
#   bash arch-guard.sh
#
# Checks 4 architectural rules from CLAUDE.md:
#   Rule #1 — No direct SDK calls outside providers/
#   Rule #3 — No prompt strings hard-coded in services
#   Rule #4 — No API keys in frontend code
#   Rule FROZEN — No unauthorized edits to frozen prompt files
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

FAIL=0

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Content Swiss Knife — Architecture Guard v1.0     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# RULE #1: No direct SDK calls outside src/services/providers/
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${CYAN}[Rule #1]${NC} Checking for direct SDK calls outside providers/..."

ANTHROPIC_LEAK=$(grep -rl "from '@anthropic-ai/sdk'" src/ --include="*.ts" 2>/dev/null \
  | grep -v "src/services/providers/" || true)

OPENAI_LEAK=$(grep -rl "from 'openai'" src/ --include="*.ts" 2>/dev/null \
  | grep -v "src/services/providers/" || true)

if [ -n "$ANTHROPIC_LEAK" ] || [ -n "$OPENAI_LEAK" ]; then
  echo -e "  ${RED}✗ FAIL — Direct SDK import found outside providers/:${NC}"
  [ -n "$ANTHROPIC_LEAK" ] && echo "    @anthropic-ai/sdk in: $ANTHROPIC_LEAK"
  [ -n "$OPENAI_LEAK" ]    && echo "    openai in: $OPENAI_LEAK"
  FAIL=1
else
  echo -e "  ${GREEN}✓ OK${NC}"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# RULE #3: No prompt role strings hard-coded in Angular services
# Exception: content-orchestrator.service.ts has known inline prompts
#            (buildOptimizerPrompt etc.) — flagged as warnings, not errors.
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${CYAN}[Rule #3]${NC} Checking for hard-coded LLM prompts in services (not orchestrator)..."

PROMPT_LEAK=$(grep -rl '"You are\|`You are\|Role\]\|TASK A\|TASK B\|TASK C' \
  src/services/ --include="*.ts" 2>/dev/null \
  | grep -v "content-orchestrator.service.ts" || true)

if [ -n "$PROMPT_LEAK" ]; then
  echo -e "  ${RED}✗ FAIL — Prompt text found in non-orchestrator service:${NC}"
  echo "    $PROMPT_LEAK"
  echo -e "  ${YELLOW}  → Prompts must live in src/prompts/ or src/prompt-core/${NC}"
  FAIL=1
else
  echo -e "  ${GREEN}✓ OK${NC}"
fi

# Warn (not fail) about orchestrator inline prompts — known/accepted technical debt
ORCH_INLINE=$(grep -c '"You are\|`You are\|\[ROLE\]' \
  src/services/content-orchestrator.service.ts 2>/dev/null || echo "0")
if [ "$ORCH_INLINE" -gt 0 ]; then
  echo -e "  ${YELLOW}  ⚠ WARNING: content-orchestrator.service.ts still has ${ORCH_INLINE} inline prompt(s).${NC}"
  echo -e "  ${YELLOW}  Known debt. Track in REFACTOR_PLAN.md, not a blocker.${NC}"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# RULE #4: No API keys in frontend code
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${CYAN}[Rule #4]${NC} Checking for API keys in frontend source..."

KEY_LEAK=$(grep -rn "OPENAI_API_KEY\|ANTHROPIC_API_KEY\|SERPER_API_KEY\|GEMINI_API_KEY\|sk-ant-\|sk-[a-zA-Z0-9]\{20\}" \
  src/ --include="*.ts" 2>/dev/null \
  | grep -v "//.*API_KEY\|\.env\|declare\|interface\|type \|: string\|process\.env" || true)

if [ -n "$KEY_LEAK" ]; then
  echo -e "  ${RED}✗ FAIL — Possible API key reference in frontend:${NC}"
  echo "$KEY_LEAK" | head -5
  FAIL=1
else
  echo -e "  ${GREEN}✓ OK${NC}"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# FROZEN FILES: Check if prompt files were modified since last guard run
# Creates a .arch-guard-checksums file on first run; diffs on subsequent runs.
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${CYAN}[FROZEN]${NC} Checking frozen prompt files for unauthorized changes..."

FROZEN_FILES=(
  "src/prompts/task-a.ts"
  "src/prompts/task-b.ts"
  "src/prompts/task-c.ts"
  "src/prompt-core/master-system-prompt.ts"
  "src/utils/output-validator.ts"
)

CHECKSUM_FILE=".arch-guard-checksums"

# Compute current checksums
CURRENT_SUMS=""
for f in "${FROZEN_FILES[@]}"; do
  if [ -f "$f" ]; then
    SUM=$(sha256sum "$f" 2>/dev/null | awk '{print $1}' || shasum -a 256 "$f" 2>/dev/null | awk '{print $1}')
    CURRENT_SUMS+="$SUM  $f\n"
  else
    echo -e "  ${YELLOW}⚠ File not found (skipped): $f${NC}"
  fi
done

if [ ! -f "$CHECKSUM_FILE" ]; then
  # First run — save baseline
  printf "%b" "$CURRENT_SUMS" > "$CHECKSUM_FILE"
  echo -e "  ${YELLOW}ℹ First run — baseline checksums saved to $CHECKSUM_FILE${NC}"
  echo -e "  ${YELLOW}  Commit $CHECKSUM_FILE to Git to track future changes.${NC}"
else
  # Compare with saved baseline
  CHANGED=0
  while IFS= read -r line; do
    SAVED_SUM=$(echo "$line" | awk '{print $1}')
    SAVED_FILE=$(echo "$line" | awk '{print $2}')
    CURR_SUM=$(printf "%b" "$CURRENT_SUMS" | grep -F "$SAVED_FILE" | awk '{print $1}' || true)
    if [ -n "$CURR_SUM" ] && [ "$CURR_SUM" != "$SAVED_SUM" ]; then
      echo -e "  ${RED}✗ CHANGED (unauthorized?): $SAVED_FILE${NC}"
      CHANGED=1
      FAIL=1
    fi
  done < "$CHECKSUM_FILE"

  if [ "$CHANGED" -eq 0 ]; then
    echo -e "  ${GREEN}✓ All frozen files unchanged${NC}"
  else
    echo ""
    echo -e "  ${YELLOW}If you intentionally changed a frozen file:${NC}"
    echo -e "  ${YELLOW}  1. Review the diff: git diff <file>${NC}"
    echo -e "  ${YELLOW}  2. Re-baseline: bash arch-guard.sh --rebaseline${NC}"
  fi
fi

# Handle --rebaseline flag
if [ "${1:-}" = "--rebaseline" ]; then
  printf "%b" "$CURRENT_SUMS" > "$CHECKSUM_FILE"
  echo -e "\n  ${GREEN}✓ Checksums updated. New baseline saved.${NC}"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${CYAN}══════════════════════════════════════════════════════${NC}"
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}  ✅  ALL CHECKS PASSED${NC}"
else
  echo -e "${RED}  ❌  CHECKS FAILED — see above for details${NC}"
fi
echo -e "${CYAN}══════════════════════════════════════════════════════${NC}"
echo ""

exit $FAIL
