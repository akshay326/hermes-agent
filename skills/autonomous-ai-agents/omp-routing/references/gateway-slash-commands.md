# Hermes Agent Slash Command & Model Routing Architecture

## Source
Investigated 2026-07-07 from `NousResearch/hermes-agent` GitHub repo (`main` branch).
Fetched and analyzed: `hermes_cli/commands.py` (92KB), `cli.py` (739KB),
`run_agent.py` (269KB), `gateway/run.py` (1MB), `hermes_cli/cli_agent_setup_mixin.py` (33KB),
`hermes_cli/cli_commands_mixin.py` (119KB).

## Corrected File Locations

**Previous note referenced `gateway/slash_commands.py` — that file does not exist.
The actual architecture is:**

| File | Role |
|------|------|
| `hermes_cli/commands.py` | **Command registry** — single source of truth (`COMMAND_REGISTRY: list[CommandDef]`) |
| `cli.py` | Main CLI class `HermesCLI` with `process_command()` dispatch (~8347) |
| `run_agent.py` | `AIAgent` core conversation loop + `switch_model()` forwarder (line 792) |
| `gateway/run.py` | Gateway command dispatch (~9455) + gateway's `_resolve_turn_agent_config` (~3886) |
| `hermes_cli/cli_agent_setup_mixin.py` | CLI's `_resolve_turn_agent_config` (line 174) + `_init_agent` (line 218) |
| `hermes_cli/cli_commands_mixin.py` | Additional CLI command handlers (mixin pattern) |
| `hermes_cli/model_switch.py` | Model switching logic: `parse_model_flags()`, `resolve_persist_behavior()`, `switch_model()` |

## CommandDef Dataclass & Registry

```python
@dataclass(frozen=True)
class CommandDef:
    name: str                          # canonical name without slash: "compress"
    description: str                   # human-readable description
    category: str                      # "Session", "Configuration", etc.
    aliases: tuple[str, ...] = ()      # alternative names: ("compact",)
    args_hint: str = ""                # argument placeholder: "<prompt>", "[name]"
    subcommands: tuple[str, ...] = ()  # tab-completable subcommands
    cli_only: bool = False             # only available in CLI
    gateway_only: bool = False         # only available in gateway/messaging
    gateway_config_gate: str | None = None  # config dotpath; when truthy, overrides cli_only for gateway
```

`COMMAND_REGISTRY: list[CommandDef]` at line 64 is the single source of truth.
All consumers (CLI help, autocomplete, Telegram BotCommands, Slack mapping, `/help`)
derive from it automatically.

`resolve_command(name)` (line 275) normalizes leading `/` and case, returns the
canonical `CommandDef` via `_COMMAND_LOOKUP` dict.

Helper dicts auto-built at import: `COMMANDS`, `COMMANDS_BY_CATEGORY`,
`SUBCOMMANDS`, `GATEWAY_KNOWN_COMMANDS`, `_COMMAND_LOOKUP`.

## How Commands Intercept Messages (CLI Path)

1. **`_looks_like_slash_command(text)`** (cli.py ~3516): distinguishes `/cmd` from
   file paths like `/Users/foo/bar.md`. A command's first whitespace-delimited
   word, after stripping `/`, has no additional slashes.

2. In `_submit_editor_buffer` (~6043) and the main Enter handler (~13377), if
   `_looks_like_slash_command(text)` is true, calls `self.process_command(text)`
   instead of routing to the agent.

3. **`process_command(command)`** (cli.py ~8347):
   - Lowercases for dispatch, preserves original case for args.
   - Calls `resolve_command(_base_word)` to get canonical name.
   - Dispatches via a large `if/elif` chain:
     - `elif canonical == "compress": self._manual_compress(cmd_original)` (~8636)
     - `elif canonical == "model": self._handle_model_switch(cmd_original)` (~8551)
   - Returns `True` to continue REPL, `False` to exit.

4. **Inline dispatches** — some commands are handled on the UI thread before
   process_command to avoid blocking:
   - `_should_handle_model_command_inline` (~8227): `/model` dispatched immediately
   - `_should_handle_steer_command_inline` (~8239): `/steer` dispatched during agent run

## How Commands Intercept Messages (Gateway Path)

`gateway/run.py` (~9455):

1. `event.get_command()` extracts command from incoming message.
2. `resolve_command()` + `is_gateway_known_command()` determine if built-in.
3. Plugin/quick-command alias expansion (if `_cmd_def is None`).
4. Access control via `_check_slash_access()`.
5. **Hooks**: emits `command:<canonical>` hooks that can return
   `{"decision": "deny"|"handled"|"rewrite", ...}` to intercept before dispatch.
6. Separate `if canonical == "<name>":` dispatch chain (~9570+).

## How Model Routing Works

### Per-Turn Model Resolution

**CLI** (`cli_agent_setup_mixin.py`, line 174):
`_resolve_turn_agent_config(user_message)` builds a `route` dict:
```python
route = {
    "model": self.model,           # session's primary model
    "runtime": {                   # api_key, base_url, provider, etc.
        "api_key": self.api_key,
        "provider": self.provider,
        "api_mode": self.api_mode,
        "command": self.acp_command,
        "args": list(self.acp_args or []),
        "credential_pool": ...,
    },
    "signature": (model, provider, base_url, api_mode, command, args),
    "request_overrides": None,     # /fast mode overrides if applicable
}
```

**Gateway** (`gateway/run.py`, line 3886): similar but takes `model` and
`runtime_kwargs` as params (gateway manages sessions differently).

### Agent Re-Initialization When Model Changes

`cli.py` (~12023):
```python
turn_route = self._resolve_turn_agent_config(message)
if turn_route["signature"] != self._active_agent_route_signature:
    self.agent = None    # force re-init with new model
self._init_agent(
    model_override=turn_route["model"],
    runtime_override=turn_route["runtime"],
    request_overrides=turn_route.get("request_overrides"),
)
```

`_init_agent` (line 218): `effective_model = model_override or self.model` (line 342),
then creates `AIAgent(model=effective_model, provider=..., ...)`.

### `/model` Switch Command

`_handle_model_switch` (cli.py ~7945) uses `hermes_cli/model_switch.py`:
- `parse_model_flags()` — parses `--provider`, `--global`, `--session`, `--refresh`
- `resolve_persist_behavior()` — `--session` = one-off, `--global` = force persist,
  default = `model.persist_switch_by_default` (true)
- `switch_model()` — actually changes the model
- `AIAgent.switch_model()` (run_agent.py 792) forwards to `agent/agent_runtime_helpers.py`

### `/compress` Implementation

`_manual_compress` (cli.py ~9355) supports:
- `/compress [<focus>]` — compress whole history with optional focus topic
- `/compress here [N]` — boundary-aware: preserve last N exchanges verbatim
- `--preview`/`--dry-run` — show what would happen without executing
- Uses `hermes_cli/partial_compress.py` for the heavy lifting

## Implementation Path for `/plan`

### The `/moa` Pattern (Closest Existing Example)

`/moa` ("Run one prompt through the default Mixture of Agents preset, then restore
your model") at COMMAND_REGISTRY line 116 is the closest existing pattern for
"run one prompt through a different model, then restore."

### Two Possible Approaches

**Approach A: One-off model swap (like `/moa`)**
1. Register in COMMAND_REGISTRY: `CommandDef("plan", "Route to planner model", "Session", args_hint="<prompt>")`
2. In process_command: `elif canonical == "plan": self._handle_plan(cmd_original)`
3. `_handle_plan`: temporarily switch to glm-5.2, run the prompt, restore original model
4. Gateway: add `if canonical == "plan":` branch in gateway/run.py

**Approach B: Per-turn model override (like `/fast`)**
1. Same registration
2. Instead of swapping model, attach a `request_overrides` or `model_override` to the turn_route
3. The signature comparison in `_init_agent` triggers re-init with the plan model
4. Lighter touch — no explicit save/restore needed

### Key Infrastructure to Leverage

- `turn_route["signature"]` comparison triggers automatic agent re-init
- `_init_agent(model_override=...)` accepts per-turn model overrides
- `hermes_cli/model_switch.py::switch_model()` handles persistent switches
- `GATEWAY_KNOWN_COMMANDS` frozenset auto-includes new commands for gateway dispatch
- Hook system (`command:<canonical>`) can intercept/rewrite/deny before dispatch