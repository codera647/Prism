"""Configure only Prism's existing Pages project; never print credential values.

Default: read-only permission/readiness check. --apply: additive D1 migration and
production bindings, after all required permissions and credentials validate.
"""
import argparse
import base64
import json
import os
from pathlib import Path
import sys

import httpx

ROOT = Path(__file__).resolve().parents[1]
PROJECT = "prism-creative"
DATABASE = "prism-accounts"


def run():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    local = ROOT / ".prism/cloudflare-deploy.json"
    config = json.loads(local.read_text()) if local.exists() else {}
    token = os.environ.get("CLOUDFLARE_API_TOKEN") or config.get("token")
    account = os.environ.get("CLOUDFLARE_ACCOUNT_ID") or config.get("account_id")
    if not token or not account:
        raise ValueError("Set a Cloudflare token and account ID privately.")
    with httpx.Client(headers={"Authorization": "Bearer " + token}, timeout=45) as client:
        base = "https://api.cloudflare.com/client/v4/accounts/" + account

        def api(method, path, **kwargs):
            response = client.request(method, base + path, **kwargs)
            data = response.json()
            if not response.is_success or not data.get("success"):
                codes = [str(e.get("code")) for e in data.get("errors", [])]
                # Raw errors and request bodies can contain credentials; omit both.
                raise ValueError(f"Cloudflare {method} {path.split('?')[0]} denied: HTTP {response.status_code}, codes {','.join(codes)}. No permission bypass attempted.")
            return data["result"]

        project = api("GET", "/pages/projects/" + PROJECT)
        databases = api("GET", "/d1/database")
        found = next((d for d in databases if d["name"] == DATABASE), None)
        production = project.get("deployment_configs", {}).get("production", {})
        existing_env = production.get("env_vars") or {}
        supplied = {name: os.environ.get(name) for name in ("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "VAULT_KEY")}
        if not args.apply:
            print(json.dumps({"project": PROJECT, "pages_read": True, "d1_read": True,
                              "database_exists": bool(found), "apply": False,
                              "credential_names_available": [n for n, v in supplied.items() if v or n in existing_env]}))
            return
        missing = [name for name, value in supplied.items() if not value and name not in existing_env]
        if missing:
            raise ValueError("Before --apply, privately configure: " + ", ".join(missing))
        if supplied["VAULT_KEY"]:
            value = supplied["VAULT_KEY"]
            try:
                decoded = base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
            except Exception:
                raise ValueError("VAULT_KEY must be base64url encoded.") from None
            if len(decoded) != 32:
                raise ValueError("VAULT_KEY must encode exactly 32 random bytes.")
            if "VAULT_KEY" in existing_env:
                raise ValueError("Refusing to replace an existing vault key. Rotate with explicit decrypt/re-encrypt maintenance instead.")
        bindings = dict(production.get("d1_databases") or {})
        if bindings.get("DB") and (not found or bindings["DB"]["id"] != found["uuid"]):
            raise ValueError("DB already points at another database; refusing to change it.")
        if not found:
            found = api("POST", "/d1/database", json={"name": DATABASE})
        database_id = found["uuid"]
        schema = (ROOT / "browser/migrations/0001_accounts.sql").read_text()
        # Initial migration uses IF NOT EXISTS; never deletes existing user data.
        api("POST", f"/d1/database/{database_id}/query", json={"sql": schema})
        bindings["DB"] = {"id": database_id}
        # Only touched environment entries are sent. Pages PATCH preserves omitted
        # entries, including secret values that GET does not disclose.
        changes = {n: {"type": "secret_text" if n in ("VAULT_KEY", "GOOGLE_CLIENT_SECRET") else "plain_text", "value": v}
                   for n, v in supplied.items() if v}
        changes["MAX_USERS"] = {"type": "plain_text", "value": "30"}
        if os.environ.get("ALLOWED_EMAILS"):
            changes["ALLOWED_EMAILS"] = {"type": "plain_text", "value": os.environ["ALLOWED_EMAILS"]}
        api("PATCH", "/pages/projects/" + PROJECT,
            json={"deployment_configs": {"production": {"d1_databases": bindings, "env_vars": changes}}})
        print(json.dumps({"project": PROJECT, "database": DATABASE, "migration_applied": True,
                          "production_configured": True, "redeploy_required": True,
                          "redirect_uri": "https://prism-creative.pages.dev/api/cloud/auth/callback"}))


if __name__ == "__main__":
    try:
        run()
    except (ValueError, httpx.HTTPError, KeyError, json.JSONDecodeError) as error:
        # HTTPError string may include URL; no query credentials are ever used.
        print(str(error) if isinstance(error, ValueError) else "Cloudflare configuration failed; no raw response was logged.", file=sys.stderr)
        sys.exit(1)
