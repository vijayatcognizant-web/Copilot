# snip-cli

Zero-dependency Node.js CLI for the [Snip](https://github.com) URL shortener backend.

## Requirements

- Node.js ≥ 18 (uses built-in `fetch` and `http` modules — no `npm install` needed)

## Usage

```
snip add <url>        Shorten a URL; prints the short link
snip ls               List all short links (aligned table)
snip open <code>      Open the URL behind a short code in your default browser
snip help             Show usage
```

## Quick start

```sh
# Run directly
node cli.js add https://example.com
node cli.js ls
node cli.js open abc123

# Install globally so the bare `snip` command works
npm install -g .
snip ls
```

## Environment

| Variable   | Default                  | Description          |
|------------|--------------------------|----------------------|
| `SNIP_API` | `http://localhost:3000`  | Backend base URL     |

```sh
SNIP_API=https://my-snip.railway.app snip ls
```

## Files

| File       | Purpose                                   |
|------------|-------------------------------------------|
| `cli.js`   | Main entry point (CommonJS, zero deps)    |
| `snip`     | Unix shell wrapper (`chmod +x` after clone) |
| `snip.cmd` | Windows Command Prompt wrapper            |
| `snip.ps1` | PowerShell wrapper                        |
