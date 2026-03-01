"""Wizard state persistence for resumable deployments."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

STATE_FILE = Path(__file__).parent / ".wizard_state.json"

STEPS = (
    "prerequisites",
    "config",
    "secrets",
    "create_server",
    "dns",
    "provision_deploy",
)


@dataclass
class WizardState:
    completed: list[str] = field(default_factory=list)
    failed: dict[str, str] = field(default_factory=dict)
    data: dict[str, Any] = field(default_factory=dict)

    # ── persistence ──────────────────────────────────────────

    @classmethod
    def load(cls) -> WizardState:
        if STATE_FILE.exists():
            raw = json.loads(STATE_FILE.read_text())
            return cls(
                completed=raw.get("completed", []),
                failed=raw.get("failed", {}),
                data=raw.get("data", {}),
            )
        return cls()

    def save(self) -> None:
        STATE_FILE.write_text(
            json.dumps(
                {"completed": self.completed, "failed": self.failed, "data": self.data},
                indent=2,
            )
            + "\n"
        )

    def delete(self) -> None:
        if STATE_FILE.exists():
            STATE_FILE.unlink()

    # ── step tracking ────────────────────────────────────────

    def mark_complete(self, step: str) -> None:
        if step not in self.completed:
            self.completed.append(step)
        self.failed.pop(step, None)
        self.save()

    def mark_failed(self, step: str, error: str) -> None:
        self.failed[step] = error
        self.save()

    def is_complete(self, step: str) -> bool:
        return step in self.completed

    def reset(self) -> None:
        self.completed.clear()
        self.failed.clear()
        self.data.clear()
        self.delete()
