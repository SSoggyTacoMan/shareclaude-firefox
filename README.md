# [ShareClaude](https://shareclaude.pages.dev)

<div align="center">

Browser Extension to share your [Claude](https://claude.ai) chats with one click.

[![Visit ShareClaude](https://img.shields.io/badge/Visit-ShareClaude-blue.svg?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNEOTc3NTciIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1zaGFyZS0yIj48Y2lyY2xlIGN4PSIxOCIgY3k9IjUiIHI9IjMiLz48Y2lyY2xlIGN4PSI2IiBjeT0iMTIiIHI9IjMiLz48Y2lyY2xlIGN4PSIxOCIgY3k9IjE5IiByPSIzIi8+PGxpbmUgeDE9IjguNTkiIHgyPSIxNS40MiIgeTE9IjEzLjUxIiB5Mj0iMTcuNDkiLz48bGluZSB4MT0iMTUuNDEiIHgyPSI4LjU5IiB5MT0iNi41MSIgeTI9IjEwLjQ5Ii8+PC9zdmc+)](https://shareclaude.pages.dev)
![Platform Firefox](https://img.shields.io/badge/Platform-Firefox-orange?logo=firefox-browser&logoColor=orange)

## [Download from Firefox Add-on Store](https://addons.mozilla.org/firefox/addon/shareclaude/)

</div>


## Features

- One-click sharing of Claude AI conversations
- Instant URL generation
- Support syntax highlighting for code and Artifacts including Mermaid & JSON
- Works directly with Claude's web interface

## How It Works

When you share a conversation, the extension stores the converastions to ShareClaude's database (not Claude). Each conversation gets a unique URL, similar to an unlisted YouTube video. The URL can be shared with anyone, but it won't show up in search results on Google.
Further conversations are served from ShareClaude's database, not directly from Claude.

*Important: While the URL is private and not searchable, anyone with the URL can still view the conversation. Please avoid sharing sensitive or personal information.*

## How to Use

1. Open [Claude](https://claude.ai) in your browser
2. Start or continue a conversation with Claude
3. Click the ![share_button](https://github.com/user-attachments/assets/08baed07-07be-496d-aa40-c232e6022204) share icon in the input box adjacent to the attachments button.
4. The sharing URL will be automatically copied to your clipboard
5. Share the URL with anyone you want!

## Tech Stack

- **Frontend**: React, TailwindCSS
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1


## Installation

### Firefox (Recommended)

Install from [Firefox Add-ons Store](https://addons.mozilla.org/firefox/addon/shareclaude/)

**OR** for development/debugging:

1. Clone this repository:
   ```bash
   git clone https://github.com/rohit1kumar/shareclaude.git
   cd shareclaude-firefox
   ```
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..."
4. Select the `manifest.json` file inside the `extension` folder

### Chrome

If you want to use the Chrome version, visit the [main ShareClaude repository](https://github.com/rohit1kumar/shareclaude).

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## Links

- [Website](https://shareclaude.pages.dev)

---
Made with ☕ for the Claude community
