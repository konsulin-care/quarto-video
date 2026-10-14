/** A rejected render request: bad IR or unreadable input. Nothing was launched. */
export class IrRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IrRenderError";
  }
}
