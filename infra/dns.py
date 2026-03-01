"""DNS verification utilities."""

from __future__ import annotations

import socket
import time

import ui


def resolve_domain(domain: str) -> str | None:
    """Resolve a domain to an IP address, or return None if it fails."""
    try:
        return socket.gethostbyname(domain)
    except socket.gaierror:
        return None


def check_dns_records(domains: list[str], expected_ip: str) -> dict[str, str | None]:
    """Check domains and return their resolved IPs (None = unresolvable)."""
    results: dict[str, str | None] = {}
    for domain in domains:
        results[domain] = resolve_domain(domain)
    return results


def wait_for_dns(
    domains: list[str],
    expected_ip: str,
    timeout: int = 300,
    interval: int = 10,
) -> bool:
    """Poll DNS until all domains resolve to expected_ip or timeout is reached."""
    elapsed = 0
    while elapsed < timeout:
        results = check_dns_records(domains, expected_ip)
        all_ok = True
        for domain, resolved in results.items():
            if resolved == expected_ip:
                ui.success(f"{domain} -> {resolved}")
            elif resolved:
                ui.warn(f"{domain} -> {resolved} (expected {expected_ip})")
                all_ok = False
            else:
                ui.warn(f"{domain} -> not resolving yet")
                all_ok = False

        if all_ok:
            return True

        remaining = timeout - elapsed
        ui.info(f"Retrying in {interval}s... ({remaining}s remaining)")
        time.sleep(interval)
        elapsed += interval

    return False
