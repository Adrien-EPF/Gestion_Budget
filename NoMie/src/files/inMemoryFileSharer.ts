import type { FileSharer, FileToSave, PickedFile } from './fileSharer';

export interface InMemoryFileSharer extends FileSharer {
  /** Every file `share` was called with, in order. */
  shared: FileToSave[];
  /** Queues what the next `pickFile` call(s) resolve to, consumed in order. */
  queuePick(result: PickedFile | null): void;
}

/** Test substitute for the OS boundary (#12 « Décisions de test »): no real file, no real share sheet. */
export function createInMemoryFileSharer(): InMemoryFileSharer {
  const shared: FileToSave[] = [];
  const queue: (PickedFile | null)[] = [];

  return {
    shared,
    async share(file) {
      shared.push(file);
    },
    async pickFile() {
      return queue.shift() ?? null;
    },
    queuePick(result) {
      queue.push(result);
    },
  };
}
