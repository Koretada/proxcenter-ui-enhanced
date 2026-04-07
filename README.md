<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="docs/logo.svg">
    <img src="docs/logo.svg" alt="ProxCenter Logo" width="120">
  </picture>
</p>

<h1 align="center">ProxCenter - Community Edition</h1>

<p align="center">
  <a href="https://www.proxcenter.io/">www.proxcenter.io</a> · <a href="https://demo.proxcenter.io/">Live Demo</a> · <a href="https://docs.proxcenter.io/">Documentation</a>
</p>

<p align="center">
  <strong>The open alternative for Proxmox Virtual Environment management</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Proxmox-8.x%20%7C%209.x-E57000" alt="Proxmox">
  <img src="https://img.shields.io/badge/License-Community-blue" alt="License">
  <a href="https://github.com/adminsyspro/proxcenter-ui/actions/workflows/codeql.yml"><img src="https://github.com/adminsyspro/proxcenter-ui/actions/workflows/codeql.yml/badge.svg" alt="CodeQL"></a>
  <a href="https://github.com/adminsyspro/proxcenter-ui/actions/workflows/security-scan.yml"><img src="https://github.com/adminsyspro/proxcenter-ui/actions/workflows/security-scan.yml/badge.svg" alt="Security Scan"></a>
  <a href="https://github.com/adminsyspro/proxcenter-ui/stargazers"><img src="https://img.shields.io/github/stars/adminsyspro/proxcenter-ui?style=flat&color=f5c542&logo=github" alt="Stars"></a>
</p>

<p align="center">
  <a href="https://sonarcloud.io/summary/overall?id=adminsyspro_proxcenter-ui"><img src="https://sonarcloud.io/api/project_badges/measure?project=adminsyspro_proxcenter-ui&metric=security_rating" alt="Security Rating"></a>
  <a href="https://sonarcloud.io/summary/overall?id=adminsyspro_proxcenter-ui"><img src="https://sonarcloud.io/api/project_badges/measure?project=adminsyspro_proxcenter-ui&metric=reliability_rating" alt="Reliability Rating"></a>
  <a href="https://sonarcloud.io/summary/overall?id=adminsyspro_proxcenter-ui"><img src="https://sonarcloud.io/api/project_badges/measure?project=adminsyspro_proxcenter-ui&metric=sqale_rating" alt="Maintainability Rating"></a>
</p>

---

## Overview

**ProxCenter** is a modern web interface for monitoring and managing Proxmox VE infrastructure. Multi-cluster management, cross-hypervisor migration, and centralized monitoring — from a single pane of glass.

<p align="center">
  <img src="docs/screenshots/dashboard.png" alt="Dashboard" width="100%">
</p>

---

## Quick Start (Docker)

```bash
# Clone the repository
git clone https://github.com/walid/proxcenter-ui-enhanced.git
cd proxcenter-ui-enhanced

# Copy environment variables
cp .env.example .env

# Start the stack
docker compose -f docker-compose.community.yml up -d
```

---

## Architecture

<p align="center">
  <img src="docs/screenshots/architecture.png" alt="Architecture" width="100%">
</p>

- **Single port** (3000) — HTTP + WebSocket from one process
- **Nginx optional** — SSL termination + reverse proxy
- **Lightweight** — Focused on essential management and monitoring

---

## Configuration

After install, ProxCenter runs at `http://your-server:3000`.

Files in current directory:
- `.env` — Environment variables
- `docker-compose.community.yml` — Service definition

**Reverse proxy**: Enable the *"Behind reverse proxy"* toggle in connection settings to prevent failover from switching to internal node IPs.

```bash
docker compose logs -f          # View logs
docker compose pull && docker compose up -d  # Update
docker compose restart          # Restart
```

---

## Requirements

- Docker & Docker Compose
- Proxmox VE 8.x or 9.x
- Network access to Proxmox API (port 8006)

## Security

Automated scanning via **CodeQL**, **Trivy**, and **Dependabot**. Report vulnerabilities to [security@proxcenter.io](mailto:security@proxcenter.io).

## License

- **Community**: Free for personal and commercial use (MIT-style for this enhanced fork)

## Support

- [GitHub Issues](https://github.com/adminsyspro/proxcenter-ui/issues)
