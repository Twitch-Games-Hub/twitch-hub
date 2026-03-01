"""Namecheap DNS API integration for automated DNS record management.

Uses only stdlib (urllib + xml) — no extra dependencies required.

IMPORTANT: The setHosts call replaces ALL records for a domain. This module
always fetches existing records first and merges changes to avoid data loss.
"""

from __future__ import annotations

import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass

import ui

API_URL = "https://api.namecheap.com/xml.response"
NS = "http://api.namecheap.com/xml.response"


@dataclass
class DnsRecord:
    host: str
    record_type: str
    address: str
    ttl: str = "1800"
    mx_pref: str = "10"


def get_public_ip() -> str:
    """Detect the public IPv4 of the machine running this script."""
    for url in ("https://checkip.amazonaws.com", "https://api.ipify.org"):
        try:
            with urllib.request.urlopen(url, timeout=10) as resp:
                return resp.read().decode().strip()
        except Exception:
            continue
    raise RuntimeError("Could not detect public IP — check your internet connection")


def split_base_domain(base_domain: str) -> tuple[str, str]:
    """Split a base domain into (SLD, TLD) for the Namecheap API.

    Examples:
        "terabyte.gg"  -> ("terabyte", "gg")
        "example.co.uk" -> ("example", "co.uk")
    """
    parts = base_domain.split(".", 1)
    if len(parts) != 2:
        raise ValueError(f"Base domain must have at least two parts: {base_domain}")
    return parts[0], parts[1]


def extract_host(full_domain: str, base_domain: str) -> str:
    """Extract the host/subdomain portion of a domain relative to its base.

    Examples:
        ("twitch.hub.terabyte.gg", "terabyte.gg") -> "twitch.hub"
        ("terabyte.gg", "terabyte.gg")             -> "@"
    """
    if full_domain == base_domain:
        return "@"
    suffix = f".{base_domain}"
    if not full_domain.endswith(suffix):
        raise ValueError(f"'{full_domain}' is not a subdomain of '{base_domain}'")
    return full_domain[: -len(suffix)]


# ── Low-level API helpers ────────────────────────────────────────────


def _api_call(
    api_user: str,
    api_key: str,
    client_ip: str,
    command: str,
    **params: str,
) -> ET.Element:
    """Execute a Namecheap API call and return the parsed XML root."""
    query = {
        "ApiUser": api_user,
        "ApiKey": api_key,
        "UserName": api_user,
        "ClientIp": client_ip,
        "Command": command,
        **params,
    }
    url = f"{API_URL}?{urllib.parse.urlencode(query)}"

    with urllib.request.urlopen(url, timeout=30) as resp:
        body = resp.read().decode()

    root = ET.fromstring(body)

    status = root.get("Status", "")
    if status != "OK":
        # Try namespaced then bare element names
        errors = root.findall(f".//{{{NS}}}Error") or root.findall(".//Error")
        msgs = [e.text or "Unknown error" for e in errors]
        raise RuntimeError(f"Namecheap API error: {'; '.join(msgs)}")

    return root


def get_hosts(
    api_user: str,
    api_key: str,
    client_ip: str,
    sld: str,
    tld: str,
) -> list[DnsRecord]:
    """Fetch all DNS host records for a domain."""
    root = _api_call(
        api_user, api_key, client_ip,
        "namecheap.domains.dns.getHosts",
        SLD=sld, TLD=tld,
    )

    hosts = root.findall(f".//{{{NS}}}host") or root.findall(".//host")
    return [
        DnsRecord(
            host=h.get("Name", ""),
            record_type=h.get("Type", ""),
            address=h.get("Address", ""),
            ttl=h.get("TTL", "1800"),
            mx_pref=h.get("MXPref", "10"),
        )
        for h in hosts
    ]


def set_hosts(
    api_user: str,
    api_key: str,
    client_ip: str,
    sld: str,
    tld: str,
    records: list[DnsRecord],
) -> None:
    """Replace all DNS host records for a domain.

    WARNING: This is a full replacement — always merge with get_hosts() first.
    """
    params: dict[str, str] = {"SLD": sld, "TLD": tld}
    for i, rec in enumerate(records, start=1):
        params[f"HostName{i}"] = rec.host
        params[f"RecordType{i}"] = rec.record_type
        params[f"Address{i}"] = rec.address
        params[f"TTL{i}"] = rec.ttl
        if rec.record_type == "MX":
            params[f"MXPref{i}"] = rec.mx_pref

    _api_call(api_user, api_key, client_ip, "namecheap.domains.dns.setHosts", **params)


# ── High-level helpers ───────────────────────────────────────────────


def ensure_a_records(
    api_user: str,
    api_key: str,
    client_ip: str,
    base_domain: str,
    domains: list[str],
    target_ip: str,
) -> None:
    """Idempotently ensure A records exist, preserving all other records.

    1. Fetch existing records via getHosts
    2. Remove conflicting A/AAAA/CNAME records for the target hosts
    3. Add new A records
    4. Write everything back via setHosts
    """
    sld, tld = split_base_domain(base_domain)

    ui.info(f"Fetching existing DNS records for {base_domain}...")
    existing = get_hosts(api_user, api_key, client_ip, sld, tld)
    ui.info(f"Found {len(existing)} existing record(s)")

    # Show existing records for transparency
    for rec in existing:
        ui.info(f"  {rec.host}.{base_domain} {rec.record_type} -> {rec.address}")

    # Hosts we're going to set
    target_hosts = {extract_host(d, base_domain) for d in domains}

    # Keep records that don't conflict with our targets
    merged = [
        r for r in existing
        if not (r.host in target_hosts and r.record_type in ("A", "AAAA", "CNAME"))
    ]

    # Add new A records with low TTL for initial setup
    for domain in domains:
        host = extract_host(domain, base_domain)
        merged.append(DnsRecord(host=host, record_type="A", address=target_ip, ttl="300"))
        ui.info(f"Setting A record: {host}.{base_domain} -> {target_ip}")

    ui.info(f"Writing {len(merged)} total record(s) to {base_domain}...")
    set_hosts(api_user, api_key, client_ip, sld, tld, merged)
    ui.success("DNS records configured via Namecheap API")
