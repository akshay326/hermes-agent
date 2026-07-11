# Multimodal Diagram Tools — Research (2026-07-02)

## tldraw

- **URL**: tldraw.com (whiteboard), tldraw.dev (SDK)
- **Agent Starter Kit**: `npm create tldraw@latest -- --template agent`
- **How it works**: AI agent reads the canvas (shapes, positions, text) via editor APIs. User chats with agent in a side panel. Agent can create/update/delete shapes, draw freehand, rotate/resize/align, navigate viewport, call external APIs.
- **Dual-input approach**: Processes both visual screens and structured data. The agent receives screenshots of the canvas + JSON representation of shapes.
- **Limitation**: tldraw.com itself is just a whiteboard — no AI chat. The Agent Starter Kit is a developer framework that needs deployment.
- **Touch**: Fully touch-optimized, pinch-to-zoom, two-finger pan.

## ArchitectureDiagram.ai

- **URL**: architecturediagram.ai
- **Workflow**: Create account (2 free credits) → describe system in English → generate diagram → edit in split-pane with AI chat → export
- **Output formats**: Mermaid (embeds in GitHub/Notion), draw.io (editable XML), Excalidraw (hand-drawn), AI-generated images (presentation-ready)
- **Expert Chat**: Iterative refinement — describe, critique, regenerate. Follow-up chat preserves context.
- **Prompt tips**: Be specific about components ("Node.js API on AWS ECS" not "backend service"), describe data flow, mention scaling patterns.

## excalidraw-architect-mcp

- **GitHub**: github.com/bv-venky/excalidraw-architect-mcp
- **Stars**: 128, MIT license, Python
- **What it does**: MCP server for Cursor/Claude Code/Windsurf. Describe architecture → auto-laid-out Excalidraw diagram. Builds living, versioned knowledge graph.
- **Layout**: Sugiyama algorithm with adaptive spacing, no overlapping.
- **Offline**: Yes, no API keys needed.
- **Model-structure split**: LLM defines components/connections, MCP engine handles layout/styling/rendering.

## DiagramAgent

- **GitHub**: github.com/outbackops/DiagramAgent
- **Stack**: Next.js 16, D2 WASM, Azure AI / GPT-5.2
- **UI**: Three-panel — Chat (clarifying questions) + D2 Code Editor (Monaco) + Live Diagram Preview
- **Features**: Streaming D2 code, live preview, clarifying questions with clickable pills, SVG/PNG export, "Vision Refine" for existing diagrams.

## Multimodal LLMs for diagram critique

All major multimodal LLMs can read screenshots of hand-drawn diagrams:
- **Claude 3.5/4**: Best for architecture critique. Upload screenshot, ask for feedback.
- **GPT-4o**: Good vision, same workflow.
- **Gemini**: Native multimodal, accepts images.

Prompt pattern: *"I'm studying [topic]. Review this diagram — what do I understand correctly, and where is my thinking wrong or incomplete?"*

## Notion integration tools

- **Flowblock** (flowblock.app): Chrome extension. Converts Notion AI Mermaid blocks → editable Excalidraw/draw.io canvases. Also: best-diagram-tool-for-notion roundup.
- **draw.io in Notion**: docs.drawio.com/docs/integrations/notion — store diagrams as native Notion blocks.
- **NoteDex**: Handwritten notes from tablets → Notion pages.
- **Pencil for Notion**: iPad app for handwriting → PNG → Notion (Apple ecosystem only).

## Browser-based whiteboards (Fire tablet compatible)

- **Excalidraw**: excalidraw.com — no account, touch-friendly, hand-drawn style
- **OnlineWhiteboard.org**: No account, infinite canvas, touch-optimized
- **DrawOnWebsite**: Free, no account, collaborative
- **Kodexion InfiniteDraw**: Has AI-assisted generation + Mermaid.js integration

## Transparent PNG Pitfall (2026-07-02)

Excalidraw exports use transparent backgrounds by default. When shared in Discord (dark theme), the image appears **entirely black**. User sees content; we see nothing.

**Root cause**: RGBA PNG with transparent background composited over dark viewer = invisible.

**Fix**: Composite over white background before analysis. Use `pngjs` (not sharp — arm64 env issue). See SKILL.md Pitfalls section for full code.

**Key detail**: `sharp` npm fails on arm64 docker (ERR_DLOPEN_FAILED). `pngjs` works. `python3` not available in terminal. `bun` is the only runtime.
