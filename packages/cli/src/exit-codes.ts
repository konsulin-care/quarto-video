// Exit codes shared by every command (packages/cli/README.md).
export const EXIT_OK = 0;
/** Validation failure, or a render that did not produce the output. */
export const EXIT_INVALID = 1;
/** Usage, path or environment problem (quarto or a renderer cannot start). */
export const EXIT_USAGE = 2;
