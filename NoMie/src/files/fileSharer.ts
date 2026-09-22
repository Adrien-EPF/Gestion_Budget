export interface FileToSave {
  filename: string;
  /** UTF-8 text, or base64-encoded bytes when `base64` is true (a ZIP archive). */
  content: string;
  base64?: boolean;
  mimeType: string;
}

export interface PickedFile {
  name: string;
  /** UTF-8 text content of the picked file. */
  content: string;
}

/**
 * The narrow seam to the operating system's file sharing and picking —
 * the one place a substitute is legitimate in tests (#12 « Décisions de
 * test »). Writing the file and choosing the format (JSON, CSV, ZIP) stay
 * the caller's job; this only moves bytes across the OS boundary.
 */
export interface FileSharer {
  /** Writes `file` and opens the share sheet (native) or triggers a download (web). */
  share(file: FileToSave): Promise<void>;
  /** Opens a file picker; `null` when the user cancels without choosing anything. */
  pickFile(): Promise<PickedFile | null>;
}
