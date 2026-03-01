"""Rich terminal UI helpers for infrastructure CLI."""

from __future__ import annotations

from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.prompt import Confirm, Prompt
from rich.table import Table

console = Console()


def banner(title: str) -> None:
    console.print(Panel(f"[bold]{title}[/bold]", style="cyan", expand=False))


def step_header(n: int, total: int, title: str) -> None:
    console.print(f"\n[bold cyan]── Step {n}/{total}: {title} ──[/bold cyan]\n")


def success(msg: str) -> None:
    console.print(f"  [green]OK[/green]  {msg}")


def error(msg: str, *, hint: str = "") -> None:
    console.print(f"  [red]FAIL[/red]  {msg}")
    if hint:
        console.print(f"         [dim]{hint}[/dim]")


def warn(msg: str) -> None:
    console.print(f"  [yellow]WARN[/yellow]  {msg}")


def info(msg: str) -> None:
    console.print(f"  [blue]INFO[/blue]  {msg}")


def confirm(prompt: str, default: bool = False) -> bool:
    return Confirm.ask(f"  {prompt}", default=default)


def prompt_input(label: str, default: str = "", *, password: bool = False) -> str:
    kw: dict = {}
    if default:
        kw["default"] = default
    return Prompt.ask(f"  {label}", password=password, **kw)


def create_spinner(desc: str) -> Progress:
    return Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
        transient=True,
    )


def summary_table(rows: list[tuple[str, str]], title: str = "") -> None:
    table = Table(show_header=False, expand=False, title=title or None, title_style="bold")
    table.add_column("Key", style="bold")
    table.add_column("Value")
    for key, value in rows:
        table.add_row(key, value)
    console.print(table)
