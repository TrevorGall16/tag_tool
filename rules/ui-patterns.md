Document 3: UI Specification (TagArchitect — FINAL & COMPLETE)

## 1. Document Purpose

This document defines the complete user interface for TagArchitect. It specifies:

- Visual design system (colors, typography, spacing)
- Component specifications (all states, dimensions, behavior)
- Layout structure (desktop and mobile)
- Interaction patterns (clicks, drags, keyboard navigation)
- Modular architecture (how components connect)
- Accessibility requirements

The design is professional, clean, and modern. No dark mode for V1.

---

## 2. Design System

### 2.1 Color Palette

**Primary Colors:**

- Primary Blue: `#2563eb` (blue-600) — CTA buttons, links, focus states
- Primary Blue Hover: `#1d4ed8` (blue-700)
- Primary Blue Light: `#dbeafe` (blue-50) — Backgrounds for info states

**Neutral Colors:**

- Slate 900: `#0f172a` — Headings, primary text
- Slate 700: `#334155` — Body text
- Slate 500: `#64748b` — Secondary text, placeholders
- Slate 300: `#cbd5e1` — Borders, dividers
- Slate 100: `#f1f5f9` — Subtle backgrounds
- Slate 50: `#f8fafc` — Page background

**Semantic Colors:**

- Success Green: `#10b981` (green-500)
- Success Light: `#d1fae5` (green-50)
- Error Red: `#ef4444` (red-500)
- Error Light: `#fee2e2` (red-50)
- Warning Orange: `#f59e0b` (orange-500)
- Warning Light: `#fef3c7` (orange-50)

**White:**

- Pure White: `#ffffff` — Cards, modals, header background

### 2.2 Typography

**Font Family:**

- Primary: `Inter, system-ui, sans-serif`
- Code/Mono: `'Courier New', monospace` (for credit counts, technical info)

**Font Sizes:**

- H1: `text-4xl` (36px) — Page titles
- H2: `text-2xl` (24px) — Section headers
- H3: `text-xl` (20px) — Component headers
- Body: `text-base` (16px) — Default text
- Small: `text-sm` (14px) — Labels, captions
- Tiny: `text-xs` (12px) — Badges, metadata

**Font Weights:**

- Headings: `font-semibold` (600)
- Body: `font-normal` (400)
- Emphasis: `font-medium` (500)

### 2.3 Spacing System

**Padding/Margin Scale:**

- xs: `p-2` (8px)
- sm: `p-4` (16px)
- md: `p-6` (24px)
- lg: `p-8` (32px)
- xl: `p-12` (48px)

**Double-Padding Protocol:**
When in doubt, use `p-8` or `p-12` for main sections to avoid cramped layouts.

### 2.4 Radius & Shadows

**Border Radius:**

- Small: `rounded-lg` (8px) — Buttons, inputs
- Medium: `rounded-xl` (12px) — Cards, modals
- Large: `rounded-2xl` (16px) — Major containers

**Shadows:**

- Subtle: `shadow-sm` — Slight elevation
- Medium: `shadow-md` — Cards
- Strong: `shadow-lg` — Modals, overlays
- Dramatic: `shadow-2xl` — Important floating elements

**Depth Highlight:**
All cards should have a subtle top border to simulate light:

```css
border-top: 2px solid rgba(255, 255, 255, 0.2);
```

### 2.5 Animation & Motion

**Transition Duration:**

- Fast: `duration-150` — Hover states
- Normal: `duration-200` — Most interactions
- Slow: `duration-300` — Modal open/close, layout changes

**Common Transitions:**

- Button Hover: `scale-105 duration-150`
- Button Active: `scale-95 duration-150`
- Card Hover: `scale-102 shadow-lg duration-200`

---

## 3. Global Layout Structure

### 3.1 Application Shell (Desktop)

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (Fixed Top)                                          │
│ [Logo] ─────────────────────────── [Credits: 150] [Avatar] │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                     MAIN CONTENT AREA                        │
│                   (max-width: 1280px)                        │
│                      centered, px-8                          │
│                                                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ FOOTER (Static Bottom)                                      │
│         Privacy • Terms • Support • © 2025 TagArchitect     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Header Specification

**Component:** `<Header />`

**Desktop Layout:**

- Position: `fixed top-0 w-full z-50`
- Height: `64px`
- Background: `bg-white/95 backdrop-blur-md`
- Border: `border-b border-slate-200`
- Shadow: `shadow-sm`
- Padding: `px-8`
- Layout: Flexbox, `justify-between items-center`

**Left Side:**

- Logo: Text "TagArchitect" (text-xl font-semibold text-slate-900)
- Click Action: Navigate to homepage (`/`)

**Right Side:**

- Credit Balance Component (see Section 4.2)
- User Avatar (if logged in) or "Sign In" button (if not logged in)
- Gap: `gap-6` between elements

**Mobile Layout (<768px):**

- Logo: Abbreviated to "TA"
- Credit Balance: Shows number only, no text
- Avatar: Same size

### 3.3 Main Content Area

**Component:** `<main />`

**Desktop:**

- Max Width: `max-w-7xl` (1280px)
- Margin: `mx-auto` (centered)
- Padding: `px-8 py-12`
- Min Height: `min-h-screen` (minus header/footer)

**Mobile:**

- Padding: `px-4 py-8`

### 3.4 Footer Specification

**Component:** `<Footer />`

**Layout:**

- Position: Static (not fixed)
- Background: `bg-slate-50`
- Border: `border-t border-slate-200`
- Padding: `py-8`
- Text Alignment: `text-center`

**Content:**

- Links: `Privacy • Terms • Support` (text-sm text-slate-600 hover:text-blue-600)
- Copyright: `© 2025 TagArchitect` (text-xs text-slate-500)
- Gap: `gap-4` between sections

---

## 4. Component Inventory (Complete Specifications)

### 4.1 Home Navigation Button

**Component:** `<BackToHomeButton />`

**Purpose:** Always present. Allows user to reset workflow and return to homepage.

**Location:**

- Desktop: Top-left of main content area (below header, absolute positioned)
- Mobile: Floating bottom-left corner (fixed)

**Visual Specs:**

- Desktop:
  - Position: `absolute top-4 left-8`
  - Size: `px-4 py-2`
  - Background: `bg-slate-100 hover:bg-slate-200`
  - Border: `border border-slate-300 rounded-lg`
  - Text: "← Home" (text-sm text-slate-700)
  - Icon: Left arrow (lucide-react ArrowLeft)
- Mobile:
  - Position: `fixed bottom-24 left-4 z-40`
  - Size: `w-12 h-12`
  - Background: `bg-white shadow-lg rounded-full`
  - Border: `border border-slate-300`
  - Icon Only: Home icon (lucide-react Home)

**States:**

- Default: As above
- Hover: `bg-slate-200 scale-105`
- Active: `scale-95`

**Click Action:**

- Clears all batch state in Zustand
- Navigates to `/`
- Shows confirmation modal if user has unsaved work: "You have X unverified images. Are you sure you want to go back?"

### 4.2 Credit Balance Display

**Component:** `<CreditBalance />`

**Location:** Header, top-right

**Visual Specs:**

- Layout: Flexbox, `items-center gap-2`
- Icon: Coin icon (lucide-react Coins), `w-5 h-5`
- Text: "Credits: 150" (font-medium)
- Background: `bg-blue-50 px-4 py-2 rounded-lg`
- Border: `border border-blue-200`

**Color Coding:**

- > 100 credits: `text-green-600 bg-green-50 border-green-200`
- 10-100 credits: `text-slate-700 bg-slate-50 border-slate-200`
- <10 credits: `text-red-600 bg-red-50 border-red-200 font-bold`

**Mobile (<768px):**

- Text: Just number "150"
- Icon: Same size

**Click Action:** Opens Credit Purchase Modal (see Section 4.15)

**States:**

- Default: As above
- Hover: `cursor-pointer bg-blue-100`
- Loading (during credit check): Animated pulse

### 4.3 SmartUploader

**Component:** `<SmartUploader />`

**Purpose:** Drag-and-drop zone for image uploads with file validation.

**Visual Specs:**

- Dimensions:
  - Desktop: `w-full h-64` (full width, 256px height)
  - Mobile: `h-48`
- Border: `border-2 border-dashed border-slate-300 rounded-xl`
- Background: `bg-slate-50 hover:bg-slate-100`
- Padding: `p-12`
- Layout: Centered content, vertical stack

**Content:**

- Icon: Upload cloud (lucide-react Upload), `w-12 h-12 text-slate-400`
- Primary Text: "Drag and drop images here" (text-lg font-medium text-slate-700)
- Secondary Text: "or click to browse" (text-sm text-slate-500)
- File Type: "JPG, PNG only • Max 100MB per file" (text-xs text-slate-400)

**States:**

**Default:**

```css
border: 2px dashed #cbd5e1;
background: #f8fafc;
```

**Hover:**

```css
border: 2px dashed #2563eb;
background: #dbeafe;
box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
```

**Dragging Over (file hovering):**

```css
border: 2px solid #2563eb;
background: #dbeafe;
scale: 1.02;
```

**Processing (after files dropped):**

- Show spinner (lucide-react Loader2 with `animate-spin`)
- Text: "Processing X files..."
- Background: `bg-blue-50`

**Success (files accepted):**

- Border: `border-2 solid border-green-500`
- Background: `bg-green-50`
- Icon: Checkmark (lucide-react Check)
- Text: "X files ready for clustering"
- Duration: 2 seconds, then hide uploader (show VerificationGrid)

**Error (invalid files detected):**

- Border: `border-2 solid border-red-500`
- Background: `bg-red-50`
- Icon: Alert (lucide-react AlertCircle)
- Text: "Invalid files detected. Remove PDFs or oversized files."
- Show list of invalid files below (see Section 4.4)

**Disabled (during clustering or AI tagging):**

- Opacity: `opacity-50`
- Cursor: `cursor-not-allowed`
- Pointer Events: `pointer-events-none`

**Click Action:** Opens file picker dialog (accept="image/png,image/jpeg")

### 4.4 Invalid File List

**Component:** `<InvalidFileList />`

**Purpose:** Shows files that failed validation with reasons.

**Location:** Directly below SmartUploader when errors occur.

**Visual Specs:**

- Background: `bg-red-50 border-l-4 border-red-500 p-4 rounded-lg`
- Max Height: `max-h-48 overflow-y-auto`

**Item Layout:**

- Each file: Flexbox, `justify-between items-center`
- File Name: `text-sm text-red-700 truncate max-w-xs`
- Reason Badge: `bg-red-200 text-red-800 px-2 py-1 rounded text-xs`
- Remove Button: `text-red-600 hover:text-red-800` (X icon)

**Example Reasons:**

- "File too large (150MB)"
- "Invalid type (PDF)"
- "Corrupted file"

### 4.5 ModelLoadingModal

**Component:** `<ModelLoadingModal />`

**Purpose:** Shows CLIP model download progress (first-time only).

**Trigger:** Appears automatically when IndexedDB cache doesn't contain model.

**Visual Specs:**

- Overlay: `fixed inset-0 bg-black/50 backdrop-blur-sm z-50`
- Modal Card:
  - Size: `max-w-md mx-auto mt-32`
  - Background: `bg-white rounded-2xl p-8`
  - Shadow: `shadow-2xl`

**Content Structure:**

```
┌────────────────────────────────────┐
│  Downloading AI Model...           │
│                                    │
│  This only happens once. Future    │
│  visits will be instant.           │
│                                    │
│  [████████████░░░░] 67%            │
│  67 MB of 150 MB                   │
└────────────────────────────────────┘
```

**Element Specs:**

- Title: "Downloading AI Model..." (text-xl font-semibold text-slate-900)
- Subtitle: "This only happens once. Future visits will be instant." (text-sm text-slate-600 mt-2)
- Progress Bar:
  - Container: `w-full bg-slate-200 rounded-full h-3 mt-6`
  - Fill: `bg-blue-600 h-3 rounded-full transition-all duration-300`
  - Width: Dynamic based on percentage
- Progress Text: "67% • 67 MB of 150 MB" (text-sm text-slate-500 mt-2 text-center)

**States:**

- Cannot be closed (no X button)
- No click-outside-to-dismiss

**Animation:**

- Fade in: `animate-in fade-in duration-300`
- Fade out (on completion): `animate-out fade-out duration-300`

### 4.6 VerificationGrid

**Component:** `<VerificationGrid />`

**Purpose:** Main workspace displaying all grouped images.

**Visual Specs:**

- Layout: Vertical stack of GroupRow components
- Background: `bg-white`
- Padding: `py-8`
- Max Height: `max-h-[80vh] overflow-y-auto`
- Custom Scrollbar: `scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100`

**Scroll Behavior:**

- Auto-scroll on drag (when dragging near top/bottom edges)
- Smooth scroll: `scroll-smooth`

**Empty State (no images yet):**

```
┌────────────────────────────────────┐
│                                    │
│         [Upload Icon]              │
│                                    │
│      No images yet                 │
│   Upload files to begin            │
│                                    │
└────────────────────────────────────┘
```

- Icon: Upload cloud (lucide-react Upload), `w-16 h-16 text-slate-300`
- Text: "No images yet" (text-xl font-medium text-slate-600)
- Subtext: "Upload files to begin" (text-sm text-slate-500)
- Center: `flex items-center justify-center min-h-[400px]`

**Loading State (during clustering):**

- Show skeleton loaders in place of GroupRows
- Animation: Pulsing shimmer effect

### 4.7 GroupRow

**Component:** `<GroupRow />`

**Purpose:** Container for clustered images with group-level controls.

**Visual Specs:**

- Background: `bg-slate-50 rounded-xl p-6 mb-8`
- Border: `border border-slate-200`
- Depth Highlight: `border-t-2 border-white/20`

**Structure:**

```
┌────────────────────────────────────────────────────┐
│ Group 1 • 12 images                    [Edit Tags] │ ← Header
│ ─────────────────────────────────────────────────  │
│ [img] [img] [img] [img] [img] [img]                │ ← Grid
│ [img] [img] [img] [img] [img] [img]                │
└────────────────────────────────────────────────────┘
```

**Header Specs:**

- Position: `sticky top-0 bg-slate-50 z-10 pb-4`
- Layout: Flexbox, `justify-between items-center`
- Left Side:
  - Text: "Group 1 • 12 images" (text-base font-medium text-slate-700)
  - Verified Badge (if verified): `bg-green-100 text-green-700 px-2 py-1 rounded text-xs ml-3`
- Right Side:
  - "Edit Tags" button: `bg-white border border-slate-300 px-4 py-2 rounded-lg text-sm hover:bg-slate-100`
  - Delete Group icon (trash): `text-slate-400 hover:text-red-600 ml-4 cursor-pointer`

**Grid Specs:**

- Layout: CSS Grid
- Columns:
  - Desktop: `grid-cols-6` (6 images per row)
  - Tablet (768-1024px): `grid-cols-4`
  - Mobile (<768px): `grid-cols-2`
- Gap: `gap-4` (16px between images)

**Collapsed State:**

- Click header to collapse
- Grid: `hidden`
- Header: Show expand icon (ChevronDown → ChevronRight)

**Drag Feedback:**

- When dragging image over this group: `ring-2 ring-blue-500 bg-blue-50/50`

**Empty Group:**

- If all images removed: Auto-delete group
- If last image: Show placeholder: "Drag images here"

### 4.8 ImageCard

**Component:** `<ImageCard />`

**Purpose:** Individual image thumbnail with metadata and state indicators.

**Visual Specs:**

- Dimensions: `aspect-square` (1:1 ratio)
- Width:
  - Desktop: `200px`
  - Mobile: `150px`
- Border: `rounded-xl border border-slate-200`
- Depth Highlight: `border-t-2 border-white/20`
- Overflow: `overflow-hidden` (clip thumbnail)

**Structure:**

```
┌──────────────────┐
│  [Thumbnail]     │ ← Background image
│                  │
│  ┌─────────────┐ │ ← Badge (if error/success)
│  │ Error       │ │
│  └─────────────┘ │
│                  │
│ ┌──────────────┐ │ ← Tags Preview (bottom overlay)
│ │sunset, ocean │ │
│ └──────────────┘ │
└──────────────────┘
```

**Thumbnail:**

- Image: `object-cover w-full h-full`
- Background: `bg-slate-100` (placeholder while loading)
- Loading State: Skeleton shimmer animation

**Badge (top-right corner):**

- Position: `absolute top-2 right-2`
- Error Badge: `bg-red-500 text-white px-2 py-1 rounded-md text-xs`
- Success Badge: `bg-green-500 text-white px-2 py-1 rounded-md text-xs`
- Processing Badge: `bg-blue-500 text-white px-2 py-1 rounded-md text-xs`

**Tags Preview (bottom overlay):**

- Position: `absolute bottom-0 left-0 right-0`
- Background: `bg-black/60 backdrop-blur-sm`
- Padding: `p-2`
- Text: `text-white text-xs truncate`
- Content: First 3 tags, "..." if more exist
- Tooltip: Show all tags on hover

**States:**

**Default:**

```css
border: 1px solid #cbd5e1;
transform: scale(1);
```

**Hover:**

```css
transform: scale(1.05);
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
transition: all 200ms;
cursor: pointer;
```

**Selected (clicked):**

```css
border: 2px solid #2563eb;
box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
```

**Dragging (being dragged):**

```css
opacity: 0.5;
cursor: grabbing;
transform: rotate(2deg);
```

**Error (AI tagging failed):**

- Badge: "Retry" (bg-red-500)
- Glow: `ring-2 ring-red-500`
- Click Action: Retry AI tagging for this image

**Processing (AI tagging in progress):**

- Badge: Spinner icon
- Opacity: `opacity-75`

**Verified (tags confirmed by user):**

- Badge: Checkmark (bg-green-500)
- Border: `border-green-500`

**Click Action:** Opens ImageDetailModal (see Section 4.9)

### 4.9 ImageDetailModal

**Component:** `<ImageDetailModal />`

**Purpose:** Full-screen modal for editing individual image metadata.

**Trigger:** Click on ImageCard

**Visual Specs:**

- Overlay: `fixed inset-0 bg-black/70 backdrop-blur-sm z-50`
- Modal:
  - Size: `max-w-4xl mx-auto mt-16 mb-16`
  - Background: `bg-white rounded-2xl shadow-2xl`
  - Max Height: `max-h-[90vh] overflow-y-auto`

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ [X Close]                                           │
│                                                     │
│ ┌─────────────┐  Title: [Sunset Beach Scene    ]  │
│ │             │                                     │
│ │   Image     │  Tags:                              │
│ │  Preview    │  [sunset] [ocean] [waves] [+Add]   │
│ │             │                                     │
│ └─────────────┘  Group: Group 1                    │
│                                                     │
│                  [Mark as Verified] [Delete Image] │
└─────────────────────────────────────────────────────┘
```

**Left Side (40%):**

- Image Preview: Full aspect ratio, max-height 600px
- Background: `bg-slate-100 rounded-xl p-4`

**Right Side (60%):**

- Title Input:
  - Label: "Title" (text-sm font-medium text-slate-700)
  - Input: `w-full border border-slate-300 rounded-lg px-4 py-2 text-base`
  - Max Length: 200 chars (Adobe Stock) or 140 (Etsy)
  - Counter: "45/200" (text-xs text-slate-500)

- Tags Section:
  - Label: "Tags" (text-sm font-medium text-slate-700)
  - Tag List: Flexbox wrap, gap-2
  - Tag Pill: `bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm`
  - Remove Button: X icon on each pill
  - Add Tag Input: `border border-dashed border-slate-300 px-3 py-1 rounded-full text-sm`

- Group Indicator:
  - Text: "Group: Group 1" (text-sm text-slate-600)
  - Change Group: Dropdown to move to different group

**Bottom Actions:**

- Layout: Flexbox, `justify-between`
- Left: "Delete Image" (text-red-600 hover:underline)
- Right: "Mark as Verified" (bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700)

**Close Actions:**

- Click X button (top-right)
- Click outside modal
- Press Escape key

### 4.10 GroupEditModal

**Component:** `<GroupEditModal />`

**Purpose:** Edit tags for all images in a group at once.

**Trigger:** Click "Edit Tags" button in GroupRow header

**Visual Specs:**

- Overlay: `fixed inset-0 bg-black/60 backdrop-blur-sm z-50`
- Modal:
  - Size: `max-w-2xl mx-auto mt-32`
  - Background: `bg-white rounded-2xl p-8 shadow-2xl`

**Content:**

- Title: "Edit Tags for Group 1" (text-2xl font-semibold text-slate-900)
- Subtitle: "Changes apply to all 12 images in this group" (text-sm text-slate-600)
- Current Tags:
  - Display: Tag pills (same as ImageDetailModal)
  - Actions: Remove tag, Add tag
- Input: Text input for adding new tags
  - Placeholder: "Type tag and press Enter"
  - On Enter: Add tag to list

**Buttons:**

- Layout: Flexbox, `justify-end gap-4 mt-8`
- Cancel: `bg-white border border-slate-300 px-6 py-2 rounded-lg text-slate-700 hover:bg-slate-50`
- Apply Changes: `bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700`

**Apply Logic:**

- Updates all ListingItems in this group with new tags
- Updates Zustand store
- Closes modal
- Shows toast: "Tags updated for 12 images"

### 4.11 UngroupedSection

**Component:** `<UngroupedSection />`

**Purpose:** Shows images that weren't assigned to any cluster.

**Location:** Bottom of VerificationGrid

**Visual Specs:**

- Same styling as GroupRow
- Header: "Ungrouped Images • X items" (text-base font-medium text-orange-600)
- Background: `bg-orange-50 border-orange-200`

**Visibility:**

- Auto-hides if 0 images
- Always present if ≥1 ungrouped image

**Grid Layout:** Same as GroupRow (responsive grid)

### 4.12 StickyActionBar

**Component:** `<StickyActionBar />`

**Purpose:** Bottom-fixed bar with marketplace selection and export action.

**Visibility Condition:**

- Only shows when at least 1 group is marked "Verified"
- Hidden during clustering or AI tagging

**Visual Specs:**

- Position: `fixed bottom-0 left-0 right-0 z-40`
- Height: `80px`
- Background: `bg-white/95 backdrop-blur-lg`
- Border: `border-t border-slate-200`
- Shadow: `shadow-lg` (upward shadow)
- Padding: `px-8`

**Layout (Desktop):**

```
┌────────────────────────────────────────────────────┐
│ [Select Marketplace ▼]          [Export ZIP →]    │
└────────────────────────────────────────────────────┘
```

- Left: Marketplace dropdown (40% width)
- Right: Export button (auto width)
- Gap: `gap-4`
- Alignment: `items-center`

**Layout (Mobile):**

- Stack vertically
- Full-width elements
- Gap: `gap-3`
- Padding: `px-4 py-4`

**Marketplace Dropdown:**

- Component: Select menu
- Options: "Adobe Stock", "Etsy"
- Placeholder: "Select marketplace..." (text-slate-500)
- Style: `bg-white border border-slate-300 rounded-lg px-4 py-3 w-full max-w-xs`
- Icon: ChevronDown (right side)
- Disabled State: `opacity-50 cursor-not-allowed`

**Export Button:**

- Text: "Export ZIP" (with arrow icon)
- Style: `bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700`
- Icon: ArrowRight (lucide-react)
- Disabled State (no marketplace selected): `opacity-50 cursor-not-allowed`
- Loading State (generating ZIP): Spinner + "Preparing..."

**Mobile Safe Area:**

- Add `pb-safe` for iOS notch support
- On Android: Standard padding

### 4.13 GenerateTagsButton

**Component:** `<GenerateTagsButton />`

**Purpose:** Trigger AI tag generation for all groups.

**Location:** Center of VerificationGrid, above groups (after clustering complete)

**Visual Specs:**

- Size: Large, prominent
- Background: `bg-blue-600 text-white px-12 py-4 rounded-xl font-semibold text-lg`
- Shadow: `shadow-lg`
- Hover: `bg-blue-700 scale-105`
- Icon: Sparkles icon (lucide-react Sparkles)

**Text:**

- Desktop: "Generate AI Tags for X Groups"
- Mobile: "Generate Tags (X groups)"

**Click Action:**

1. Check user credit balance
2. If insufficient: Show CreditCheckModal (Section 4.15)
3. If sufficient: Show confirmation modal with credit cost
4. On confirm: Start AI tagging process, show ProgressOverlay (Section 4.14)

### 4.14 ProgressOverlay

**Component:** `<ProgressOverlay />`

**Purpose:** Full-screen overlay during AI tag generation.

**Visual Specs:**

- Overlay: `fixed inset-0 bg-black/60 backdrop-blur-md z-50`
- Content Card:
  - Position: Centered
  - Size: `max-w-md`
  - Background: `bg-white rounded-2xl p-8 shadow-2xl`

**Content:**

```
┌────────────────────────────────┐
│  Generating AI Tags...         │
│                                │
│  Processing Group 2 of 5       │
│                                │
│  [████████░░░░░░░░] 40%        │
│                                │
│  This may take a minute...     │
└────────────────────────────────┘
```

- Title: "Generating AI Tags..." (text-xl font-semibold)
- Progress: "Processing Group 2 of 5" (text-base text-slate-700)
- Progress Bar: Same style as ModelLoadingModal
- Subtitle: "This may take a minute..." (text-sm text-slate-500)
- Spinner: Rotating icon (lucide-react Loader2)

**Cannot be dismissed:** No close button, no click-outside

**Updates:** Real-time as each group completes

### 4.15 CreditCheckModal

**Component:** `<CreditCheckModal />`

**Purpose:** Notify user of insufficient credits, prompt purchase.

**Trigger:** When user tries to generate tags without enough credits

**Visual Specs:**

- Overlay: `fixed inset-0 bg-black/60 backdrop-blur-sm z-50`
- Modal:
  - Size: `max-w-md mx-auto mt-32`
  - Background: `bg-white rounded-2xl p-8 shadow-2xl`

**Content:**

```
┌────────────────────────────────┐
│  Insufficient Credits          │
│                                │
│  You need 45 more credits to   │
│  tag all groups.               │
│                                │
│  Current Balance: 5 credits    │
│  Required: 50 credits          │
│                                │
│  [Cancel]      [Buy Credits]   │
└────────────────────────────────┘
```

- Title: "Insufficient Credits" (text-xl font-semibold text-red-600)
- Message: Explain shortfall (text-base text-slate-700)
- Credit Info: Current vs Required (text-sm text-slate-600)
- Buttons:
  - Cancel: `bg-white border border-slate-300 px-6 py-2 rounded-lg hover:bg-slate-50`
  - Buy Credits: `bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700`

**Buy Credits Action:**

- Navigate to Stripe Checkout
- Pass current user_id and credit amount needed in metadata

### 4.16 PaymentSuccessToast

**Component:** `<PaymentSuccessToast />`

**Purpose:** Confirm successful credit purchase.

**Trigger:** After user returns from Stripe Checkout (success)

**Visual Specs:**

- Position: `fixed top-20 right-8 z-50`
- Size: `max-w-sm`
- Background: `bg-green-500 text-white rounded-lg shadow-lg p-4`
- Icon: Checkmark (lucide-react CheckCircle)

**Content:**

```
┌──────────────────────────────┐
│ ✓ Payment Successful!        │
│   200 credits added.         │
└──────────────────────────────┘
```

**Animation:**

- Slide in from right: `animate-in slide-in-from-right duration-300`
- Auto-dismiss: After 5 seconds
- Slide out: `animate-out slide-out-to-right duration-300`

**Dismiss:** Click X button or wait 5 seconds

### 4.17 ErrorBanner

**Component:** `<ErrorBanner />`

**Purpose:** Display API errors or system failures.

**Location:** Top of screen, below header

**Visual Specs:**

- Width: Full width
- Background: `bg-red-50 border-l-4 border-red-500`
- Padding: `p-4`
- Layout: Flexbox, `justify-between items-center`

**Content:**

- Icon: Alert (lucide-react AlertCircle), `text-red-500`
- Message: "AI tagging failed. Please try again." (text-sm text-red-700)
- Retry Button: `bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 text-sm`
- Close Button: X icon (top-right)

**Auto-dismiss:** After 10 seconds (unless user interacts)

### 4.18 TextExpander (SEO Content)

**Component:** `<TextExpander />`

**Purpose:** Show SEO content for bots, hide clutter for users.

**Location:** Homepage, below hero section

**Visual Specs:**

- Background: `bg-slate-50 rounded-xl p-8`
- Typography: `prose prose-slate max-w-none`

**Initial State (Collapsed):**

- Shows first 3 lines (~60 words)
- Text: Truncated with ellipsis
- Button: "Read More" (text-blue-600 hover:underline text-sm)

**Expanded State:**

- Full text visible (400-500 words)
- Button: "Read Less"

**Animation:**

- Height transition: `transition-all duration-300 ease-in-out`
- No display:none (SEO requirement — content must be in DOM)

**Implementation:**

- Use `max-height` transition, not `display`
- Full text always in HTML (for crawlers)

---

## 5. Page Templates (Detailed)

### 5.1 Marketing Homepage (/)

**Purpose:** High-value landing page for SEO and conversions.

**Layout (Top to Bottom):**

1. **Hero Section** (h-screen or min-h-[600px])
   - Background: `bg-gradient-to-br from-blue-50 to-white`
   - Content: Centered
   - H1: "Automate Your Etsy & Adobe Stock Listings" (text-5xl font-bold text-slate-900)
   - Subtitle: "AI-powered tagging and batch export in minutes, not hours." (text-xl text-slate-600 mt-4)
   - CTA Button: "Get Started Free" (bg-blue-600 text-white px-8 py-4 rounded-xl text-lg mt-8)
   - Image: Screenshot of VerificationGrid (right side, 50% width)

2. **Features Section** (py-24)
   - Background: White
   - Layout: 3-column grid (1 column on mobile)
   - Each Feature:
     - Icon: 64×64px (lucide-react icons)
     - Title: H3 (text-xl font-semibold)
     - Description: Paragraph (text-slate-600)
   - Features:
     1. "AI Clustering" — Groups similar images automatically
     2. "SEO Tags" — Marketplace-optimized keywords
     3. "Batch Export" — One-click ZIP + CSV download

3. **SEO Content Block (TextExpander)** (py-16)
   - Background: `bg-slate-50`
   - Content: 400-500 words about "How to optimize Etsy listings" or "Adobe Stock SEO guide"
   - Collapsed by default (bot-readable, user-hideable)

4. **Pricing Section** (py-24)
   - Background: White
   - Layout: 3-column grid (cards)
   - Each Tier:
     - Card: `bg-white border border-slate-200 rounded-2xl p-8 shadow-md`
     - Title: "Starter", "Pro", etc.
     - Price: Large (text-4xl font-bold)
     - Features: Bullet list
     - CTA: "Choose Plan" button

5. **FAQ Section** (py-16)
   - Background: `bg-slate-50`
   - Layout: Accordion (shadcn/ui Accordion component)
   - 5-7 common questions

6. **Footer** (py-8)
   - Standard footer (see Section 3.4)

### 5.2 Dashboard (/dashboard)

**Purpose:** The actual tool interface for batch processing.

**Auth Gate:** User must be logged in (free or paid).

**Layout (Top to Bottom):**

1. **Header** (fixed top)
   - Standard header (see Section 3.2)
   - BackToHomeButton visible (top-left of content area)

2. **Main Workspace** (min-h-screen)
   - **If no batch active:**
     - Show SmartUploader (centered)
     - Subtext: "Upload 10-500 images to begin"
   - **If batch uploaded, clustering in progress:**
     - Show VerificationGrid with skeleton loaders
     - Progress text: "Analyzing images... 25/50"
   - **If clustering complete, no tags yet:**
     - Show VerificationGrid with grouped ImageCards (no tags)
     - Show GenerateTagsButton (centered, above groups)
   - **If AI tagging in progress:**
     - Show ProgressOverlay
   - **If tags generated:**
     - Show VerificationGrid with tags visible
     - Show StickyActionBar (bottom-fixed)

3. **Footer** (static bottom)
   - Standard footer

**State Flow:**

```
Upload → Clustering → Generate Tags → Verify → Export
```

---

## 6. Interaction Patterns & Behavior

### 6.1 Drag and Drop (Desktop Only)

**Image-to-Image Drag:**

- Grab: ImageCard gets `cursor-grabbing`, opacity 50%
- Hover over GroupRow: Target group glows (`ring-2 ring-blue-500`)
- Drop: Image moves to new group, state updates in Zustand
- Animation: Smooth layout shift (framer-motion LayoutGroup)

**Invalid Drop:**

- Cursor: `cursor-not-allowed`
- No visual feedback on target

**Mobile Alternative:**

- Disable drag-and-drop
- Show "Move to Group" dropdown in ImageDetailModal

### 6.2 Bulk Actions

**Group-Level Tag Edit:**

- Click "Edit Tags" in GroupRow header
- Opens GroupEditModal
- User edits tags
- Click "Apply Changes"
- All images in group instantly update (Zustand state mutation)
- No page reload

**Mark All as Verified:**

- Button in each GroupRow header
- One click: All images in group marked "Verified"
- Button changes to checkmark badge

### 6.3 Keyboard Navigation

**Tab Order:**

1. Header (Logo → Credit Balance → Avatar)
2. BackToHomeButton
3. SmartUploader (if visible)
4. VerificationGrid → GroupRows (left to right, top to bottom)
5. ImageCards within GroupRow (grid order)
6. StickyActionBar (Marketplace Dropdown → Export Button)

**Keyboard Shortcuts:**

- **Tab:** Next focusable element
- **Shift+Tab:** Previous focusable element
- **Enter:** Activate button or open modal
- **Escape:** Close modal or deselect
- **Arrow Keys:** Navigate between ImageCards in same GroupRow
- **Spacebar:** Select/deselect ImageCard
- **Delete:** Remove selected image from batch (with confirmation)

**Focus Indicators:**

- All interactive elements: `focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`
- Never: `outline-none` without custom focus state

### 6.4 Loading States

**File Upload:**

- SmartUploader shows spinner + "Processing X files..."
- Duration: 1-2 seconds (client-side validation + thumbnail generation)

**CLIP Clustering:**

- VerificationGrid shows skeleton loaders
- Progress text: "Analyzing image 25/50..."
- Duration: 5-40 seconds (depends on batch size)

**AI Tagging:**

- ProgressOverlay (full-screen)
- Sequential: "Processing Group 2 of 5..."
- Duration: 1-2 minutes for 50 images (rate-limited API calls)

**Export:**

- StickyActionBar "Export ZIP" button shows spinner
- Text: "Preparing..."
- Duration: 5-15 seconds (ZIP generation in browser)
- Success: Auto-download starts, toast appears

### 6.5 Error Recovery

**File Upload Error:**

- SmartUploader turns red
- InvalidFileList appears below
- User clicks X to remove bad files
- Click "Try Again" to re-enable uploader

**API Failure (AI Tagging):**

- ProgressOverlay closes
- ErrorBanner appears at top
- Failed ImageCards show orange glow + "Retry" badge
- User clicks "Retry" on specific card or "Retry All" in ErrorBanner

**Credit Depletion Mid-Batch:**

- ProgressOverlay pauses
- CreditCheckModal appears
- User can buy more credits or cancel
- If cancel: Partial results saved, user can export what's tagged

**ZIP Generation Failure:**

- ErrorBanner: "File too large. Splitting into parts..."
- Generates multiple ZIPs (Part 1, Part 2)
- User downloads each separately

---

## 7. Responsive Behavior (Detailed)

### 7.1 Breakpoints

- **Mobile:** 0-767px
- **Tablet:** 768-1023px
- **Desktop:** 1024px+

### 7.2 Mobile Adaptations (<768px)

**Header:**

- Logo: Abbreviated ("TA")
- Credit Balance: Number only, no "Credits:" label
- Avatar: Smaller (32px instead of 40px)

**SmartUploader:**

- Height: Reduced to `h-48`
- Text: Smaller (text-base instead of text-lg)

**VerificationGrid:**

- ImageCard grid: 2 columns instead of 6
- GroupRow: Simplified header (icon buttons instead of text)

**StickyActionBar:**

- Stacked vertically
- Full-width buttons
- Height: Auto (instead of fixed 80px)

**Modals:**

- Full-screen on mobile (rounded corners only at top)
- Slide up animation (instead of fade in)

**Drag-and-Drop:**

- Disabled (too hard on mobile)
- Use "Move to Group" dropdown instead

### 7.3 Tablet Adaptations (768-1023px)

**VerificationGrid:**

- ImageCard grid: 4 columns

**GroupRow:**

- Slightly reduced padding (p-4 instead of p-6)

**Modals:**

- Same as desktop (but slightly smaller max-width)

---

## 8. Accessibility (A11y) Requirements

### 8.1 WCAG AA Compliance

**Color Contrast:**

- All text: Minimum 4.5:1 contrast ratio
- Large text (18px+): Minimum 3:1 contrast ratio
- Interactive elements: Clearly distinguishable from non-interactive

**Verified Combinations:**

- Slate-900 on White: 18.76:1 ✓
- Slate-700 on White: 12.63:1 ✓
- Blue-600 on White: 8.59:1 ✓
- White on Blue-600: 8.59:1 ✓

### 8.2 Semantic HTML

**Required Elements:**

- `<main>` for main content area
- `<nav>` for header navigation
- `<article>` for GroupRows
- `<section>` for page sections
- `<button>` for all clickable actions (never `<div onclick>`)
- `<a>` for links only

### 8.3 ARIA Attributes

**When to Use:**

- Custom components (non-semantic)
- Dynamic content changes
- Screen reader announcements

**Examples:**

- `aria-live="polite"` on ProgressOverlay status text
- `aria-label="Remove file"` on X buttons (no visible text)
- `aria-expanded` on collapsible GroupRows
- `aria-disabled` on disabled buttons
- `role="status"` on toast notifications

**When NOT to Use:**

- Semantic HTML already conveys meaning
- Redundant ARIA hurts more than it helps

### 8.4 Focus Management

**Visible Focus Indicators:**

- All interactive elements: `ring-2 ring-blue-500 ring-offset-2`
- Never remove outline without custom replacement

**Focus Trap (Modals):**

- When modal opens: Focus first interactive element
- Tab cycles only within modal
- Shift+Tab cycles backward
- Escape closes modal, returns focus to trigger element

### 8.5 Screen Reader Support

**Image Alt Text:**

- ImageCards: `alt="Product image thumbnail"`
- Decorative icons: `alt=""` or `aria-hidden="true"`

**Button Labels:**

- Icon-only buttons must have `aria-label`
- Example: `<button aria-label="Delete group">[TrashIcon]</button>`

**Announcements:**

- File upload success: `aria-live` announcement
- Credit balance update: `aria-live` announcement
- Error messages: `role="alert"` for immediate announcement

---

## 9. Performance Optimization (UI-Specific)

### 9.1 CLS Prevention (Cumulative Layout Shift)

**Reserved Space:**

- All ImageCards: `aspect-square` (prevents reflow on image load)
- SmartUploader: Fixed height (`h-64`)
- Ad slots (if added later): `min-h-[250px]`

**Skeleton Loaders:**

- During clustering: Show empty ImageCard skeletons
- Same dimensions as real cards
- Prevents layout shift when content loads

**Sticky Elements:**

- Header: Fixed height (64px), content has `pt-16` to compensate
- StickyActionBar: Fixed height (80px), content has `pb-24` to compensate

### 9.2 Image Optimization

**Thumbnails:**

- Format: WebP (fallback to JPEG if browser doesn't support)
- Size: Max 512px dimension
- Quality: 0.8 (good balance)
- Loading: `loading="lazy"` for below-the-fold images

**Full Preview (in modals):**

- Load high-res only when modal opens
- Lazy load, not preload

### 9.3 Animation Performance

**Use `transform` and `opacity` only:**

- These properties don't trigger layout/paint
- Example: `scale()`, `translate()`, `fade`

**Avoid:**

- `width`, `height`, `top`, `left` (cause reflow)
- `box-shadow` animations (cause repaint)

**Framer Motion:**

- Use `layout` prop for smooth layout animations
- LayoutGroup for shared layout animations between components

---

## 10. Modular Architecture (Component Reusability)

### 10.1 Component Hierarchy

```
App
├── Header
│   ├── Logo
│   ├── CreditBalance
│   └── UserAvatar
├── Main
│   ├── BackToHomeButton
│   ├── SmartUploader
│   │   └── InvalidFileList
│   ├── VerificationGrid
│   │   ├── GroupRow (multiple)
│   │   │   ├── GroupHeader
│   │   │   └── ImageCard (multiple)
│   │   └── UngroupedSection
│   ├── GenerateTagsButton
│   └── StickyActionBar
│       ├── MarketplaceDropdown
│       └── ExportButton
├── Modals
│   ├── ModelLoadingModal
│   ├── ImageDetailModal
│   ├── GroupEditModal
│   ├── CreditCheckModal
│   └── ConfirmationModal
├── Overlays
│   ├── ProgressOverlay
│   └── ErrorBanner
├── Toasts
│   └── PaymentSuccessToast
└── Footer
```

### 10.2 Shared Components (UI Library)

**Create `/components/ui/` folder:**

- `Button.tsx` — All button variants (primary, secondary, danger, ghost)
- `Input.tsx` — Text inputs with validation states
- `Badge.tsx` — Status badges (error, success, warning, info)
- `Card.tsx` — Generic card container
- `Modal.tsx` — Base modal wrapper (handles overlay, close logic)
- `Tooltip.tsx` — Hover tooltips
- `Spinner.tsx` — Loading spinners (small, medium, large)

**Props Pattern:**

```typescript
// Example: Button component
interface ButtonProps {
  variant: "primary" | "secondary" | "danger" | "ghost";
  size: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}
```

### 10.3 State Management (Zustand)

**Store Structure:**

```typescript
interface BatchStore {
  // State
  items: ListingItem[];
  groups: Map<string, ListingItem[]>;
  selectedMarketplace: "adobe" | "etsy" | null;
  isProcessing: boolean;

  // Actions
  addItems: (files: File[]) => void;
  updateItem: (id: string, updates: Partial<ListingItem>) => void;
  moveToGroup: (itemId: string, groupId: string) => void;
  setGroupTags: (groupId: string, tags: string[]) => void;
  markAsVerified: (groupId: string) => void;
  reset: () => void;
}
```

**Usage:**

- Components consume state via hooks: `const items = useBatchStore(state => state.items)`
- Mutations are centralized in store actions
- No prop drilling — any component can access/update global state

### 10.4 Easy Feature Addition

**Example: Adding "Undo" Functionality**

1. Add to Zustand store:

   ```typescript
   history: ListingItem[][];
   undo: () => void;
   ```

2. Create UI component:

   ```typescript
   <Button onClick={undo} icon={<Undo />}>
     Undo Last Action
   </Button>
   ```

3. Place in StickyActionBar (no need to rewire entire app)

**Example: Adding "Export to CSV Only" (No ZIP)**

1. Add button to StickyActionBar:

   ```typescript
   <Button variant="secondary">Export CSV Only</Button>
   ```

2. Create new export function in `/lib/marketplace/`:

   ```typescript
   export function generateCSVOnly(items, marketplace) { ... }
   ```

3. Wire button to function (no changes to existing components)

---

## 11. Error States & Empty States (Complete)

### 11.1 All Possible Error States

**Upload Errors:**

- Invalid file type → InvalidFileList with "Invalid type (PDF)"
- File too large → InvalidFileList with "File too large (150MB)"
- No files selected → SmartUploader shows hint: "Please select files"

**Clustering Errors:**

- CLIP model failed to load → ErrorBanner: "AI model failed. Refresh page."
- Clustering timeout → ErrorBanner: "Clustering took too long. Try smaller batch."

**AI Tagging Errors:**

- API failure (500) → ImageCard shows "Retry" badge
- API timeout → ImageCard shows "Timeout" badge
- Rate limit hit → ProgressOverlay pauses, shows "Rate limit reached. Retrying in 60s..."
- Credit depletion → CreditCheckModal

**Export Errors:**

- ZIP too large → Auto-split, show toast: "Files split into 2 ZIPs"
- Browser out of memory → ErrorBanner: "Batch too large. Try exporting in groups."

### 11.2 All Empty States

**No Images Uploaded:**

- Show SmartUploader (centered)
- Hint text: "Upload 10-500 images to begin"

**No Groups After Clustering:**

- Show message: "No similar images found. All images are ungrouped."
- Show UngroupedSection with all images

**No Tags Generated Yet:**

- ImageCards show placeholder: "Click 'Generate Tags' to add"
- Tags preview overlay is empty

**No Verified Groups:**

- StickyActionBar is hidden
- Hint: "Mark groups as verified to enable export"

**No Credits Remaining:**

- GenerateTagsButton disabled
- Tooltip: "No credits. Purchase to continue."
- Click → CreditCheckModal

---

## 12. Design Anti-Patterns (Avoid These)

### 12.1 Visual Anti-Patterns

**Never:**

- ❌ Pure black text (`#000000`) — Use Slate-900 (`#0f172a`)
- ❌ Pure white backgrounds with no depth — Add subtle border or shadow
- ❌ Default CSS box-shadows — Use Tailwind's semantic shadows
- ❌ Sharp corners on important elements — Use `rounded-xl` or `rounded-2xl`
- ❌ Cramped spacing — Double padding protocol (`p-8`, not `p-4`)
- ❌ Gray-on-gray (low contrast) — Ensure 4.5:1 minimum

**Always:**

- ✅ Depth highlights (`border-t-2 border-white/20`) on cards
- ✅ Subtle hover states (`scale-105`, not drastic color changes)
- ✅ Generous whitespace between sections
- ✅ Consistent border radius within component hierarchy

### 12.2 Interaction Anti-Patterns

**Never:**

- ❌ Buttons without hover/active states
- ❌ Drag-and-drop without visual feedback
- ❌ Modals without escape hatch (close button or click-outside)
- ❌ Long operations without progress indicators
- ❌ Destructive actions without confirmation
- ❌ Form submissions without loading state

**Always:**

- ✅ Immediate visual feedback on interaction
- ✅ Clear affordances (buttons look clickable)
- ✅ Loading states for async operations
- ✅ Confirmation for destructive actions (delete, reset)

---
