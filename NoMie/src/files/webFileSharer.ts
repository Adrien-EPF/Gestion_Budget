import type { FileSharer, FileToSave, PickedFile } from './fileSharer';

function toBlob(file: FileToSave): Blob {
  if (!file.base64) return new Blob([file.content], { type: file.mimeType });
  const binary = atob(file.content);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: file.mimeType });
}

/** Web target (used for development, CONTEXT.md §9): a browser download and a standard file input. */
export function createWebFileSharer(): FileSharer {
  return {
    async share(file) {
      const url = URL.createObjectURL(toBlob(file));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    },
    pickFile() {
      return new Promise<PickedFile | null>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = () => {
          const selected = input.files?.[0];
          if (!selected) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve({ name: selected.name, content: String(reader.result ?? '') });
          reader.onerror = () => resolve(null);
          reader.readAsText(selected);
        };
        input.click();
      });
    },
  };
}
