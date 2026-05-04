# LemonAI deployment operations

This repository ships a Docker Compose deployment intended for local or small production installs. It keeps local installs open by default; set `LEMON_AUTH_TOKEN` before exposing the service to a network.

## Key environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `LEMON_IMAGE_TAG` | `v0.0.36` | App image tag used by `docker-compose.yml`. Pin this for reproducible deploys and rollbacks. |
| `LEMON_PORT` | `5005` | Host port mapped to the LemonAI frontend service. |
| `LEMON_BACKEND_PORT` | `3000` | Internal backend port used by `bin/www` and the Vite `/api` proxy. |
| `LEMON_WORKSPACE_PATH` | `${PWD}/workspace` | Host path mounted at `/app/workspace`. |
| `LEMON_DATA_PATH` | `${PWD}/data` | Host path mounted at `/app/data`. |
| `LEMON_AUTH_TOKEN` | unset | Optional bearer token for API requests. If unset, local/offline mode uses user id `1` without auth. |
| `WORKSPACE_BASE` | unset | Backward-compatible base path fallback for workspace/data. Prefer the explicit variables above. |

Use a `.env` file next to `docker-compose.yml` for non-secret operational settings. Store real tokens in your deployment secret manager or protected host environment, not in git.

## Deploy or update

1. Back up data before changing images:
   ```bash
   export LEMON_DATA_PATH=${LEMON_DATA_PATH:-$PWD/data}
   export LEMON_WORKSPACE_PATH=${LEMON_WORKSPACE_PATH:-$PWD/workspace}
   mkdir -p backups
   tar -czf "backups/lemon-data-$(date +%Y%m%d%H%M%S).tgz" "$LEMON_DATA_PATH" "$LEMON_WORKSPACE_PATH"
   ```
2. Set or update the desired image tag:
   ```bash
   export LEMON_IMAGE_TAG=v0.0.36
   ```
3. Pull and restart:
   ```bash
   docker compose pull lemon
   docker compose up -d lemon
   ```
4. Confirm health:
   ```bash
   docker compose ps
   curl -fsS http://127.0.0.1:${LEMON_PORT:-5005}/api/version
   ```

## Health checks and logs

The Compose service exposes the Vite frontend on internal port `5005`; the backend listens on internal `LEMON_BACKEND_PORT`/`PORT` (`3000` by default), and Vite proxies `/api` to it through `VITE_SERVICE_URL`. The container healthcheck intentionally checks the exposed frontend path `http://127.0.0.1:5005/api/version` so it verifies both the frontend listener and backend proxy. Docker json-file logs rotate at `10m` with `5` files.

Useful commands:

```bash
docker compose ps
docker inspect --format='{{json .State.Health}}' lemon-app | jq
docker compose logs --tail=200 lemon
```

## Auth for public deployments

For private local use, leave `LEMON_AUTH_TOKEN` unset. For any public or shared endpoint, set a strong random token and pass it on API requests:

```bash
export LEMON_AUTH_TOKEN='replace-with-random-token'
curl -H "Authorization: Bearer $LEMON_AUTH_TOKEN" http://127.0.0.1:${LEMON_PORT:-5005}/api/platform
```

`/api/version` remains available for health checks.

## Rollback

1. Set the previous known-good image tag:
   ```bash
   export LEMON_IMAGE_TAG=v0.0.35
   ```
2. Restart from that tag:
   ```bash
   docker compose pull lemon
   docker compose up -d lemon
   ```
3. Re-check `/api/version`, container health, and logs.

If the failed update changed data unexpectedly, stop the service and restore the latest backup before starting again.

## Restore from backup

```bash
docker compose stop lemon
tar -xzf backups/lemon-data-YYYYmmddHHMMSS.tgz -C /
docker compose up -d lemon
docker compose ps
curl -fsS http://127.0.0.1:${LEMON_PORT:-5005}/api/version
```

When restoring to a different host, recreate the same `LEMON_DATA_PATH` and `LEMON_WORKSPACE_PATH` paths or update `.env` to match the restored locations.

## Proxmox notes

- Put the Docker host or VM on backed-up Proxmox storage.
- Snapshot before major image upgrades, but keep file-level tar backups for portable restore.
- Avoid exposing port `5005` directly to the internet without a reverse proxy, TLS, and `LEMON_AUTH_TOKEN`.
- Keep `/var/run/docker.sock` mounted only on trusted hosts; it grants broad control over the Docker host.
