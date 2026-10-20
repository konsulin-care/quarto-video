// The IR versions this package reads, and the version gate (ADR-0007).
// Pure: no file access. A manifest is validated only against the version it
// declares; any other value is an error that names the supported versions.

/** Every version `validateIr` accepts, oldest first. Each has a schema file. */
export const SUPPORTED_VERSIONS = [
  "0.1",
  "0.2",
  "0.3",
  "1.0",
  "1.1",
  "1.2",
  "1.3",
  "1.4",
  "1.5",
  "1.6",
  "1.7",
  "1.8",
  "1.9",
  "1.10",
  "1.11",
  "1.12",
] as const;

export type SupportedVersion = (typeof SUPPORTED_VERSIONS)[number];

/**
 * The newest version. The filter writes 1.12 for a scene with an exit or animationDuration (ADR-0020),
 * 1.11 for a manifest with captions (ADR-0019), 1.10 for
 * framed image footage (ADR-0018), 1.9 for a music track (ADR-0017), 1.8 for a kept clip (ADR-0009),
 * 1.7 for region footage and 1.6 otherwise (ADR-0016). Pre-1.0 versions are read, never written.
 */
export const LATEST_VERSION: SupportedVersion = "1.12";

/** Code of the version-gate error (`/schemaVersion`). */
export const UNSUPPORTED_VERSION_CODE = "E_IR_UNSUPPORTED_VERSION";

export function isSupportedVersion(value: unknown): value is SupportedVersion {
  return (SUPPORTED_VERSIONS as readonly unknown[]).includes(value);
}

/** The gate's message; it names every supported version. */
export function unsupportedVersionMessage(value: unknown): string {
  const shown =
    typeof value === "string" ? `"${value}"` : JSON.stringify(value);
  return `${shown} is not a supported IR version; supported versions: ${SUPPORTED_VERSIONS.join(", ")}`;
}
