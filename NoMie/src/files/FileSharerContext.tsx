import React, { createContext, useContext } from 'react';
import type { FileSharer } from './fileSharer';

const FileSharerContext = createContext<FileSharer | null>(null);

/** Makes the file sharer available to the tree, the same way the notification scheduler is provided. */
export function FileSharerProvider({
  children,
  fileSharer,
}: {
  children: React.ReactNode;
  fileSharer: FileSharer;
}) {
  return <FileSharerContext.Provider value={fileSharer}>{children}</FileSharerContext.Provider>;
}

export function useFileSharer(): FileSharer {
  const fileSharer = useContext(FileSharerContext);
  if (!fileSharer) {
    throw new Error('useFileSharer must be used within a FileSharerProvider');
  }
  return fileSharer;
}
