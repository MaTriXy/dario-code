/**
 * Command-line argument parser
 */

/**
 * Parse command line arguments
 */
export function parseArgs(argv) {
  const args = argv.slice(2); // Remove 'node' and script name
  const options = {
    help: false,
    version: false,
    debug: false,
    file: null,
    continue: false,
    resume: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '-v' || arg === '--version') {
      options.version = true;
    } else if (arg === '--debug') {
      options.debug = true;
    } else if (arg === '-f' || arg === '--file') {
      if (i + 1 < args.length) {
        options.file = args[++i];
      }
    } else if (arg === '--continue') {
      options.continue = true;
    } else if (arg === '--resume') {
      if (i + 1 < args.length) {
        options.resume = args[++i];
      }
    }
  }

  return options;
}

/**
 * Print help information
 */
export function printHelp() {
  console.log(`
Usage: dario [options]

Options:
  -h, --help           Show this help message
  -v, --version        Show version information
  --debug              Enable debug mode
  -f, --file           Read input from file
  --continue           Resume the last session
  --resume <id>        Resume a specific session by ID or partial match
  `);
}