#!/usr/bin/env bash
set -euo pipefail

# RALPH Loop — Autonomous Claude Code orchestrator
# Runs Claude in a loop to implement features from a PRD/spec.

VERSION="1.0.0"

# ── Defaults ──────────────────────────────────────────────────────────────────
MAX_ITERATIONS=10
VERIFY_CMD=""
BUDGET=""
MODEL="opus"
PROJECT_DIR="$(pwd)"
PRD_FILE=""

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log()   { echo -e "${BLUE}[ralph]${NC} $*"; }
ok()    { echo -e "${GREEN}[ralph]${NC} $*"; }
warn()  { echo -e "${YELLOW}[ralph]${NC} $*"; }
err()   { echo -e "${RED}[ralph]${NC} $*" >&2; }

# ── Usage ─────────────────────────────────────────────────────────────────────
usage() {
    cat <<EOF
RALPH Loop v${VERSION} — Autonomous Claude Code orchestrator

Usage: ./ralph.sh <prd-file> [options]

Options:
  --max-iterations N     Maximum loop iterations (default: 10)
  --verify "command"     Shell command to run after each iteration
  --budget N             Maximum total USD spend (e.g. 5 or 2.50)
  --model MODEL          Claude model to use (default: opus)
  --project-dir DIR      Working directory (default: cwd)
  -h, --help             Show this help

Examples:
  ./ralph.sh spec.md --max-iterations 5
  ./ralph.sh prd.md --budget 3 --verify "npm test"
  ./ralph.sh prd.md --project-dir /tmp/myproject --model sonnet
EOF
    exit 0
}

# ── Argument Parsing ──────────────────────────────────────────────────────────
[[ $# -eq 0 ]] && usage

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help) usage ;;
        --max-iterations) MAX_ITERATIONS="$2"; shift 2 ;;
        --verify)         VERIFY_CMD="$2"; shift 2 ;;
        --budget)         BUDGET="$2"; shift 2 ;;
        --model)          MODEL="$2"; shift 2 ;;
        --project-dir)    PROJECT_DIR="$2"; shift 2 ;;
        -*)               err "Unknown option: $1"; usage ;;
        *)
            if [[ -z "$PRD_FILE" ]]; then
                PRD_FILE="$1"; shift
            else
                err "Unexpected argument: $1"; usage
            fi
            ;;
    esac
done

if [[ -z "$PRD_FILE" ]]; then
    err "PRD file is required"
    usage
fi

# Resolve paths
PRD_FILE="$(cd "$(dirname "$PRD_FILE")" && pwd)/$(basename "$PRD_FILE")"
PROJECT_DIR="$(cd "$PROJECT_DIR" 2>/dev/null && pwd)" || { err "Project dir not found: $PROJECT_DIR"; exit 1; }

if [[ ! -f "$PRD_FILE" ]]; then
    err "PRD file not found: $PRD_FILE"
    exit 1
fi

# ── Resolve script dir (for prompt_template.md) ──────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_FILE="${SCRIPT_DIR}/prompt_template.md"
if [[ ! -f "$TEMPLATE_FILE" ]]; then
    err "prompt_template.md not found at: $TEMPLATE_FILE"
    exit 1
fi

# ── State directories ────────────────────────────────────────────────────────
RALPH_DIR="${PROJECT_DIR}/.ralph"
LOGS_DIR="${RALPH_DIR}/logs"
TASKS_FILE="${RALPH_DIR}/tasks.json"
PROGRESS_FILE="${RALPH_DIR}/progress.md"

mkdir -p "$RALPH_DIR" "$LOGS_DIR"

# ── Ensure git repo ──────────────────────────────────────────────────────────
if ! git -C "$PROJECT_DIR" rev-parse --is-inside-work-tree &>/dev/null; then
    log "Initializing git repo in $PROJECT_DIR"
    git -C "$PROJECT_DIR" init -q
    git -C "$PROJECT_DIR" add -A
    git -C "$PROJECT_DIR" commit -q -m "ralph: initial commit" --allow-empty
fi

# ── Budget helpers ────────────────────────────────────────────────────────────
TOTAL_COST=0

budget_exhausted() {
    if [[ -z "$BUDGET" ]]; then
        return 1  # no budget set, never exhausted
    fi
    awk "BEGIN { exit ($TOTAL_COST >= $BUDGET) ? 0 : 1 }"
}

calc_iter_budget() {
    if [[ -z "$BUDGET" ]]; then
        echo ""
        return
    fi
    local remaining_budget remaining_iters per_iter
    remaining_budget=$(awk "BEGIN { printf \"%.2f\", $BUDGET - $TOTAL_COST }")
    remaining_iters=$(( MAX_ITERATIONS - ITERATION + 1 ))
    per_iter=$(awk "BEGIN { v = $remaining_budget / $remaining_iters; printf \"%.2f\", (v < 0.50) ? 0.50 : v }")
    echo "$per_iter"
}

# ── Task helpers (jq-based) ──────────────────────────────────────────────────
count_tasks_by_status() {
    jq --arg s "$1" '[.tasks[] | select(.status == $s)] | length' "$TASKS_FILE"
}

pick_next_task() {
    jq -r '[.tasks[] | select(.status == "pending")] | sort_by(.priority) | .[0] // empty' "$TASKS_FILE"
}

set_task_status() {
    local task_id="$1" new_status="$2"
    local tmp="${TASKS_FILE}.tmp"
    jq --arg id "$task_id" --arg st "$new_status" \
        '(.tasks[] | select(.id == ($id | tonumber))).status = $st' \
        "$TASKS_FILE" > "$tmp" && mv "$tmp" "$TASKS_FILE"
}

reset_in_progress_tasks() {
    local count
    count=$(count_tasks_by_status "in_progress")
    if [[ "$count" -gt 0 ]]; then
        warn "Resetting $count in-progress task(s) to pending (resume mode)"
        local tmp="${TASKS_FILE}.tmp"
        jq '(.tasks[] | select(.status == "in_progress")).status = "pending"' \
            "$TASKS_FILE" > "$tmp" && mv "$tmp" "$TASKS_FILE"
    fi
}

# ── Generate tasks.json from PRD ─────────────────────────────────────────────
generate_tasks() {
    log "Generating tasks from PRD: $PRD_FILE"
    local prd_content
    prd_content=$(<"$PRD_FILE")

    local gen_prompt
    gen_prompt=$(cat <<'GENPROMPT'
You are a project planner. Given the PRD/spec below, produce a JSON object with a single key "tasks" containing an array of task objects.

Each task object must have exactly these fields:
- "id": integer starting at 1
- "title": short descriptive title
- "description": detailed implementation description
- "acceptance_criteria": array of strings describing how to verify the task is done
- "priority": integer (1 = highest priority, implement first)
- "status": "pending"
- "notes": ""

Order tasks by dependency — foundational work gets lower priority numbers.
Output ONLY valid JSON, no markdown fences, no commentary.

PRD:
GENPROMPT
)
    gen_prompt="${gen_prompt}
${prd_content}"

    local budget_args=()
    if [[ -n "$BUDGET" ]]; then
        # Use at most $1 or 10% of total budget for task generation
        local gen_budget
        gen_budget=$(awk "BEGIN { v = $BUDGET * 0.10; printf \"%.2f\", (v < 1.0) ? 1.0 : v }")
        budget_args=(--max-turns 1)
    fi

    # Unset CLAUDE_CODE env vars to avoid nesting issues
    local result
    result=$(unset CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_PARENT_SESSION_ID CLAUDE_CODE_SESSION_ID 2>/dev/null || true
        claude -p "$gen_prompt" \
            --output-format json \
            --model "$MODEL" \
            --max-turns 1 \
            ${budget_args[@]+"${budget_args[@]}"} 2>"${LOGS_DIR}/task_gen_stderr.log"
    ) || {
        err "Failed to generate tasks from PRD"
        cat "${LOGS_DIR}/task_gen_stderr.log" >&2
        exit 1
    }

    # Extract the text result and parse as JSON
    local text_result
    text_result=$(echo "$result" | jq -r '.result // empty' 2>/dev/null) || text_result="$result"

    # Try to extract JSON from the response (handle markdown fences)
    local json_content
    json_content=$(echo "$text_result" | sed -n '/^```json/,/^```$/p' | sed '1d;$d' 2>/dev/null) || true
    if [[ -z "$json_content" ]]; then
        json_content=$(echo "$text_result" | sed -n '/^```/,/^```$/p' | sed '1d;$d' 2>/dev/null) || true
    fi
    if [[ -z "$json_content" ]]; then
        json_content="$text_result"
    fi

    # Validate JSON
    if ! echo "$json_content" | jq '.tasks' &>/dev/null; then
        err "Generated tasks are not valid JSON"
        err "Raw output saved to ${LOGS_DIR}/task_gen_raw.txt"
        echo "$text_result" > "${LOGS_DIR}/task_gen_raw.txt"
        exit 1
    fi

    echo "$json_content" | jq '.' > "$TASKS_FILE"

    # Track cost from generation
    local gen_cost
    gen_cost=$(echo "$result" | jq -r '.cost_usd // 0' 2>/dev/null) || gen_cost=0
    TOTAL_COST=$(awk "BEGIN { printf \"%.4f\", $TOTAL_COST + $gen_cost }")

    local task_count
    task_count=$(jq '.tasks | length' "$TASKS_FILE")
    ok "Generated $task_count tasks → $TASKS_FILE"
}

# ── Initialize progress.md ───────────────────────────────────────────────────
init_progress() {
    if [[ ! -f "$PROGRESS_FILE" ]]; then
        cat > "$PROGRESS_FILE" <<'EOF'
# RALPH Progress Log

## Codebase Patterns
<!-- Accumulated patterns and conventions discovered across iterations -->

---

## Iteration Log
EOF
        ok "Initialized $PROGRESS_FILE"
    fi
}

# ── Build prompt for an iteration ────────────────────────────────────────────
build_prompt() {
    local task_json="$1"
    local task_id task_title task_desc task_criteria
    task_id=$(echo "$task_json" | jq -r '.id')
    task_title=$(echo "$task_json" | jq -r '.title')
    task_desc=$(echo "$task_json" | jq -r '.description')
    task_criteria=$(echo "$task_json" | jq -r '.acceptance_criteria | join("\n- ")')

    local tasks_content progress_content
    tasks_content=$(<"$TASKS_FILE")
    progress_content=$(<"$PROGRESS_FILE")

    local completed_count pending_count total_count
    completed_count=$(count_tasks_by_status "completed")
    pending_count=$(count_tasks_by_status "pending")
    total_count=$(jq '.tasks | length' "$TASKS_FILE")

    local prompt
    prompt=$(<"$TEMPLATE_FILE")

    # Substitute variables
    prompt="${prompt//\{\{ITERATION\}\}/$ITERATION}"
    prompt="${prompt//\{\{MAX_ITERATIONS\}\}/$MAX_ITERATIONS}"
    prompt="${prompt//\{\{TASK_ID\}\}/$task_id}"
    prompt="${prompt//\{\{TASK_TITLE\}\}/$task_title}"
    prompt="${prompt//\{\{TASK_DESCRIPTION\}\}/$task_desc}"
    prompt="${prompt//\{\{TASK_CRITERIA\}\}/- $task_criteria}"
    prompt="${prompt//\{\{TASKS_JSON\}\}/$tasks_content}"
    prompt="${prompt//\{\{PROGRESS\}\}/$progress_content}"
    prompt="${prompt//\{\{TASKS_FILE_PATH\}\}/$TASKS_FILE}"
    prompt="${prompt//\{\{PROGRESS_FILE_PATH\}\}/$PROGRESS_FILE}"
    prompt="${prompt//\{\{COMPLETED_TASKS\}\}/$completed_count}"
    prompt="${prompt//\{\{PENDING_TASKS\}\}/$pending_count}"
    prompt="${prompt//\{\{TOTAL_TASKS\}\}/$total_count}"

    echo "$prompt"
}

# ── Auto-commit ──────────────────────────────────────────────────────────────
auto_commit() {
    local task_id="$1" task_title="$2"
    cd "$PROJECT_DIR"
    if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
        git add -A
        git commit -q -m "ralph(iter-${ITERATION}): TASK-${task_id} - ${task_title}"
        ok "Committed: ralph(iter-${ITERATION}): TASK-${task_id} - ${task_title}"
    else
        log "No changes to commit"
    fi
}

# ── Run verify command ───────────────────────────────────────────────────────
run_verify() {
    if [[ -z "$VERIFY_CMD" ]]; then
        return 0
    fi
    log "Running verify: $VERIFY_CMD"
    local verify_log="${LOGS_DIR}/verify_iter_${ITERATION}.log"
    if (cd "$PROJECT_DIR" && eval "$VERIFY_CMD") &> "$verify_log"; then
        ok "Verify passed"
        return 0
    else
        warn "Verify failed — see $verify_log"
        return 1
    fi
}

# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

log "RALPH Loop v${VERSION}"
log "PRD:            $PRD_FILE"
log "Project dir:    $PROJECT_DIR"
log "Max iterations: $MAX_ITERATIONS"
log "Model:          $MODEL"
[[ -n "$BUDGET" ]]     && log "Budget:         \$${BUDGET}"
[[ -n "$VERIFY_CMD" ]] && log "Verify:         $VERIFY_CMD"
echo ""

# Generate or load tasks
if [[ -f "$TASKS_FILE" ]]; then
    ok "Resuming — tasks.json already exists"
    reset_in_progress_tasks
else
    generate_tasks
fi

init_progress

# ── Main Loop ─────────────────────────────────────────────────────────────────
ITERATION=1

while [[ $ITERATION -le $MAX_ITERATIONS ]]; do
    echo ""
    log "════════════════════════════════════════════════════════════════"
    log "Iteration $ITERATION / $MAX_ITERATIONS"
    log "════════════════════════════════════════════════════════════════"

    # Budget check
    if budget_exhausted; then
        warn "Budget exhausted (\$${TOTAL_COST} / \$${BUDGET}). Stopping."
        break
    fi

    # Pick next task
    local_task=$(pick_next_task)
    if [[ -z "$local_task" ]]; then
        ok "All tasks completed! Nothing left to do."
        break
    fi

    local_task_id=$(echo "$local_task" | jq -r '.id')
    local_task_title=$(echo "$local_task" | jq -r '.title')

    log "Task: TASK-${local_task_id} — ${local_task_title}"

    # Mark in-progress
    set_task_status "$local_task_id" "in_progress"

    # Build prompt
    prompt_text=$(build_prompt "$local_task")

    # Calculate per-iteration budget args
    iter_budget=$(calc_iter_budget)
    budget_args=()
    if [[ -n "$iter_budget" ]]; then
        budget_args=(--max-cost "$iter_budget")
        log "Iteration budget: \$${iter_budget}"
    fi
    [[ -n "$BUDGET" ]] && log "Total spent so far: \$${TOTAL_COST} / \$${BUDGET}"

    # Invoke Claude
    log "Invoking Claude ($MODEL)..."
    local_response=""
    local_exit_code=0

    local_response=$(unset CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_PARENT_SESSION_ID CLAUDE_CODE_SESSION_ID 2>/dev/null || true
        cd "$PROJECT_DIR"
        claude -p "$prompt_text" \
            --output-format json \
            --model "$MODEL" \
            --permission-mode bypassPermissions \
            ${budget_args[@]+"${budget_args[@]}"} \
            2>"${LOGS_DIR}/iter_${ITERATION}_stderr.log"
    ) || local_exit_code=$?

    # Save raw response
    echo "$local_response" > "${LOGS_DIR}/iter_${ITERATION}_response.json"

    if [[ $local_exit_code -ne 0 ]]; then
        err "Claude exited with code $local_exit_code"
        cat "${LOGS_DIR}/iter_${ITERATION}_stderr.log" >&2
        set_task_status "$local_task_id" "pending"
        warn "Reset TASK-${local_task_id} to pending"
        ITERATION=$((ITERATION + 1))
        sleep 3
        continue
    fi

    # Extract result text and cost
    local_result_text=$(echo "$local_response" | jq -r '.result // ""' 2>/dev/null) || local_result_text=""
    local_iter_cost=$(echo "$local_response" | jq -r '.cost_usd // 0' 2>/dev/null) || local_iter_cost=0

    echo "$local_result_text" > "${LOGS_DIR}/iter_${ITERATION}_output.txt"

    TOTAL_COST=$(awk "BEGIN { printf \"%.4f\", $TOTAL_COST + $local_iter_cost }")
    ok "Iteration cost: \$${local_iter_cost} | Total: \$${TOTAL_COST}"

    # Safety net: mark task completed (Claude should do this too, but just in case)
    set_task_status "$local_task_id" "completed"
    ok "TASK-${local_task_id} marked completed"

    # Auto-commit
    auto_commit "$local_task_id" "$local_task_title"

    # Verify
    verify_passed=true
    if ! run_verify; then
        verify_passed=false
    fi

    # Check for RALPH_DONE
    if echo "$local_result_text" | grep -q "RALPH_DONE"; then
        local_pending=$(count_tasks_by_status "pending")
        if [[ "$local_pending" -eq 0 ]] && [[ "$verify_passed" == true ]]; then
            echo ""
            ok "══════════════════════════════════════════════════════════════"
            ok "RALPH_DONE — All tasks completed successfully!"
            ok "Total cost: \$${TOTAL_COST}"
            ok "Iterations: ${ITERATION}"
            ok "══════════════════════════════════════════════════════════════"
            exit 0
        else
            [[ "$local_pending" -gt 0 ]] && warn "RALPH_DONE received but $local_pending task(s) still pending"
            [[ "$verify_passed" == false ]] && warn "RALPH_DONE received but verify failed"
        fi
    fi

    ITERATION=$((ITERATION + 1))
    [[ $ITERATION -le $MAX_ITERATIONS ]] && sleep 3
done

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
local_completed=$(count_tasks_by_status "completed")
local_remaining=$(count_tasks_by_status "pending")
local_in_progress=$(count_tasks_by_status "in_progress")

log "══════════════════════════════════════════════════════════════"
log "RALPH Loop finished"
log "  Completed:   ${local_completed} tasks"
log "  Pending:     ${local_remaining} tasks"
log "  In Progress: ${local_in_progress} tasks"
log "  Total cost:  \$${TOTAL_COST}"
log "  Iterations:  $((ITERATION - 1))"
log "══════════════════════════════════════════════════════════════"

if [[ "$local_remaining" -gt 0 || "$local_in_progress" -gt 0 ]]; then
    warn "Not all tasks completed. Re-run to resume."
    exit 1
fi

ok "All tasks completed!"
