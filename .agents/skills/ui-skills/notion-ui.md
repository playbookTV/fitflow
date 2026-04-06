---
name: notion-ui
description: Create Notion-inspired block-based editorial UIs with clean typography, slash commands, inline editing, and sophisticated minimalism. Use this skill whenever the user asks for a Notion-like interface, block editor, content editor, wiki-style page, knowledge base UI, note-taking app, document editor, or any interface that should feel like Notion, Craft, or similar block-based productivity tools. Also trigger when the user mentions "notion-esque", "notion style", "block editor", "slash commands", "inline editing", "content blocks", or wants a clean document-editing interface with drag-and-drop blocks.
---

# Notion-esque UI Skill

Create block-based, editable document interfaces inspired by Notion, Craft, and modern productivity tools. The hallmark of this aesthetic is **sophisticated restraint** — every pixel serves a purpose, whitespace is generous, and interactions feel effortless.

## Design Philosophy

Notion-style UIs succeed through the tension between **extreme simplicity on the surface** and **deep power underneath**. The interface should feel like a blank canvas that progressively reveals capabilities as the user explores.

### Core Principles

1. **Content-first**: The UI chrome should nearly disappear. No heavy borders, no loud backgrounds. The content IS the interface.
2. **Progressive disclosure**: Features hide until needed. Hover to reveal drag handles, click to show toolbars, type `/` to open commands.
3. **Block-based architecture**: Everything is a block — paragraphs, headings, images, callouts, toggles, tables. Blocks can be rearranged, nested, and transformed.
4. **Inline everything**: Edit in place. No separate "edit mode" — the document is always live.
5. **Calm confidence**: The UI should feel quiet, competent, and trustworthy. No flashy animations, no aggressive colors.

## Visual Language

### Typography
- Use a **serif or transitional serif** for body text to evoke a literary, thoughtful quality. Good choices: `'Newsreader'`, `'Source Serif 4'`, `'Lora'`, `'Merriweather'`, or `'Charter'`.
- Use a **geometric or neo-grotesque sans-serif** for UI elements, labels, and metadata. Good choices: `'DM Sans'`, `'Plus Jakarta Sans'`, `'Satoshi'`, `'General Sans'`, or `'Geist Sans'`.
- Body text: `16px–18px`, line-height `1.6–1.7`
- Headings use the sans-serif at heavier weights. H1 should feel bold but not shouty — `28px–32px` is plenty.
- Monospace for code blocks: `'JetBrains Mono'`, `'Fira Code'`, or `'IBM Plex Mono'`.

### Color Palette

Use muted, high-contrast neutrals with one warm or cool accent:

```
--bg-primary:      #FFFFFF or #191919 (light/dark)
--bg-secondary:    #F7F7F5 or #202020
--bg-hover:        #F0F0EE or #2A2A2A
--text-primary:    #37352F or #E8E8E3
--text-secondary:  #787774 or #9B9A97
--text-tertiary:   #C3C2BF or #5A5A58
--accent:          #2EAADC or #E16259 or #D9730D (pick ONE)
--border:          #E9E9E7 or #333333
--selection:       rgba(45,170,219,0.15)
--code-bg:         #F7F6F3 or #2F2F2F
--callout-bg:      #FBF3DB or #2C2C28
```

The Notion aesthetic avoids pure black and pure white. Everything is slightly warm (brownish grays) or slightly cool (blue-grays). This warmth is critical — it makes the interface feel human, not sterile.

### Spacing & Layout
- Maximum content width: `700px–900px` (centered)
- Page padding: `96px` top, `48px–80px` sides
- Block spacing: `4px–8px` between blocks (tight, but breathable)
- Section spacing: `24px–32px` before headings
- Generous left gutter (`24px–32px`) for drag handles and block controls
- Side peek panels: `380px–420px` width with subtle shadow

### Iconography
- Use simple, 1.5px stroke-weight line icons
- Icon size: `14px–18px` for inline, `20px` for toolbar
- Subtle opacity (`0.5–0.7`) by default, full opacity on hover
- Emoji as block icons — this is a Notion signature. Allow emoji selection for page icons.

## Component Catalog

When building a Notion-esque UI, implement as many of these as appropriate:

### Page Structure
- **Sidebar**: Collapsible, `240px` wide, contains page tree with nested items, search, and settings
- **Page header**: Page emoji/icon + title (editable, large sans-serif, `40px`), optional cover image with parallax
- **Breadcrumbs**: Subtle, small text, slash-separated, with hover underline
- **Page body**: Centered content column with generous margins

### Block Types
- **Text**: Default paragraph block with placeholder "Type '/' for commands..."
- **Headings**: H1, H2, H3 with decreasing size and weight
- **To-do**: Checkbox + text, strikethrough on complete
- **Bulleted list**: Small filled circle, indentable
- **Numbered list**: Auto-incrementing, indentable
- **Toggle**: Disclosure triangle + content that expands/collapses
- **Quote**: Left border accent (`3px`, accent color), italic optional
- **Callout**: Emoji + colored background block, rounded corners
- **Code**: Syntax-highlighted block with language selector and copy button
- **Divider**: Thin horizontal rule (`1px`, border color)
- **Image**: Full-width or contained, with caption below
- **Table**: Simple grid with header row, inline-editable cells
- **Bookmark**: URL card with favicon, title, description preview
- **Database/Table view**: Filterable, sortable inline table with property columns

### Interactive Elements
- **Slash command menu**: Popup on `/` keystroke. Filterable list of block types with icons and descriptions. Keyboard navigable.
- **Hover toolbar**: Appears on text selection — bold, italic, underline, strikethrough, link, code, color, comment
- **Block handle**: Appears on block hover (left gutter). `⠿` drag handle + `+` button for inserting new blocks
- **Turn into menu**: Right-click or `⌘+/` to transform block type
- **Mention/link popup**: `@` for people, `[[` for pages, auto-complete dropdown

### Micro-interactions
- Block hover: subtle background highlight (`bg-hover`)
- Drag and drop: Block lifts with shadow, insertion line shows target position
- Focus transitions: Smooth, `150ms ease`
- Menu animations: Fade + slight Y-translate (`4px`), `120ms`
- Checkbox: Satisfying check animation with slight scale bounce
- Page transitions: Crossfade, `200ms`

## Implementation Patterns

### React (preferred)
```jsx
// Block architecture pattern
const Block = ({ type, content, id }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div 
      className="block-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <BlockHandle visible={isHovered} blockId={id} />
      <BlockContent type={type} content={content} />
    </div>
  );
};
```

### HTML/CSS
For vanilla implementations, use `contenteditable` divs with CSS custom properties for theming. Structure blocks as a flat list of `<div data-block-type="...">` elements within a content container.

### State Management
- Blocks stored as ordered array of `{ id, type, content, properties }` objects
- Use reducer pattern for block operations (add, delete, move, transform)
- Persist to state on every keystroke (debounced) for real-time feel
- Undo/redo via command stack

## Quality Checklist

Before delivering a Notion-esque UI, verify:

- [ ] Content area is centered with generous whitespace on sides
- [ ] Typography uses a serif/sans-serif pairing (not just one generic font)
- [ ] Colors are warm neutrals, never pure black/white
- [ ] Blocks have hover states with subtle background changes
- [ ] Interactive elements (handles, toolbars) appear on hover, not by default
- [ ] Placeholder text reads "Type '/' for commands..." or similar
- [ ] At least 3-5 block types are functional
- [ ] Transitions are subtle and fast (100-200ms)
- [ ] The UI feels calm, not busy
- [ ] Dark mode support with matching warm/cool neutral palette

## Common Mistakes to Avoid

- **Too much chrome**: Notion's power is in what it hides. Don't show all controls at once.
- **Wrong grays**: Using cool blue-grays instead of Notion's warm brownish grays kills the feel.
- **Tight spacing**: Notion is generous with whitespace. When in doubt, add more space.
- **Heavy borders**: Use `1px` borders sparingly. Prefer background color changes and shadows.
- **Generic fonts**: Inter or system fonts make it look like "any web app", not Notion.
- **Overbuilt sidebar**: The sidebar should feel like a quiet file tree, not a dashboard nav.
- **Missing progressive disclosure**: If everything is visible, it's not Notion-like.

## File Output

Generate a single self-contained `.html` or `.jsx` file. For React, include all styles inline or via a `<style>` tag. Import Google Fonts via CDN link. The output should be immediately runnable — no build step required for HTML, and directly renderable for React artifacts.