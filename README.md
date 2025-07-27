██╗   ██╗██╗███╗   ██╗ ██████╗███████╗███╗   ██╗████████╗
██║   ██║██║████╗  ██║██╔════╝██╔════╝████╗  ██║╚══██╔══╝
██║   ██║██║██╔██╗ ██║██║     █████╗  ██╔██╗ ██║   ██║   
╚██╗ ██╔╝██║██║╚██╗██║██║     ██╔══╝  ██║╚██╗██║   ██║   
 ╚████╔╝ ██║██║ ╚████║╚██████╗███████╗██║ ╚████║   ██║   
  ╚═══╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝╚═╝  ╚═══╝   ╚═╝

# Vincent - AI Images for Anki

Transform your Anki flashcards with AI-generated educational images using Google's free Gemini API.

## Quick Start

```bash
# Install globally
npm install -g vincent-anki

# Process your deck
vincent my-deck.apkg
```

That's it! Vincent will:
1. Analyze your deck and show card count
2. Prompt for Gemini API key (free tier)
3. Generate educational images for each card
4. Create enhanced deck: `my-deck-illustrated.apkg`
5. Ready to import into Anki!

## Features

- **100% Free**: Uses Gemini's free tier (no cost)
- **Effortless**: Single command transforms entire decks
- **Educational**: AI generates study-optimized images
- **Multiple Styles**: Educational, Medical, or Colorful themes

## Installation

```bash
npm install -g vincent-anki
```

## Usage

```bash
# Basic usage
vincent deck.apkg

# Specify output file
vincent deck.apkg -o enhanced-deck.apkg

# Choose style
vincent deck.apkg --style medical

# Dry run (see what would be done)
vincent deck.apkg --dry-run
```

## API Key Setup

On first run, Vincent will guide you through getting a free Gemini API key:

1. Visit: https://makersuite.google.com/app/apikey
2. Create a free account
3. Generate an API key
4. Enter it when prompted

Your key is saved locally for future use.

## Output

Vincent creates:
- Enhanced `.apkg` file ready for Anki import
- `vincent-output/images/` folder with generated images
- Images are automatically embedded in your flashcards

## Requirements

- Node.js 18+ 
- Valid Anki `.apkg` file
- Internet connection
- Free Gemini API key

## Iteration 1 - Perfect Conditions MVP

This version assumes perfect conditions:
- Stable internet connection
- Valid API key with available quota
- Terminal remains open during processing
- No error recovery or session management

Future iterations will add robustness, session recovery, and background processing.

## License

Apache 2