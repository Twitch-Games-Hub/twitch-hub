"""DNS verification utilities."""

from __future__ import annotations

import socket
import time


def resolve_domain(domain: str) -> str | None:
    """Resolve a domain to an IP address, or return None if it fails."""
    try:
        return socket.gethostbyname(domain)
    except socket.gaierror:
        return None


def check_dns_records(domains: list[str], expected_ip: str) -> dict[str, bool]:
    """Check if all domains resolve to the expected IP."""
    results: dict[str, bool] = {}
    for domain in domains:
        resolved = resolve_domain(domain)
        results[domain] = resolved == expected_ip
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
        if all(results.values()):
            return True

        pending = [d for d, ok in results.items() if not ok]
        print(f"  Waiting for DNS... ({', '.join(pending)} not yet resolving to {expected_ip})")
        time.sleep(interval)
        elapsed += interval

    return False
