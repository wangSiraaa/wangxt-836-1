# Trae Preflight

This folder is prepared for `wangxt-836-1`.

Use `.env` for stable local ports and compose project identity:

- APP_PORT: 18136
- API_PORT: 19136
- WEB_PORT: 20136
- DB_PORT: 21136
- REDIS_PORT: 22136

Smoke entry:

```bash
bash scripts/smoke.sh
```

The preflight files are environment scaffolding only. The generated business
project can replace or extend them when needed.
