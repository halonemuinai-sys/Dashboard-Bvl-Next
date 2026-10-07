<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Available Workspace Skills
- **bvl-visual-manual-generator** (`.agents/skills/bvl-visual-manual-generator/SKILL.md`):
  Automated tool and SOP for generating visual step-by-step Store Manager user guides with live production screenshots in Microsoft Word (.docx) format.
  - Run capture: `npm run manual:capture` (or `python .agents/skills/bvl-visual-manual-generator/scripts/capture_screenshots.py`)
  - Run generator: `npm run manual:generate` (or `python .agents/skills/bvl-visual-manual-generator/scripts/generate_visual_docx.py`)
  - Output file: `docs/PANDUAN_BERGAMBAR_STORE_MANAGER_BVLGARI.docx`
