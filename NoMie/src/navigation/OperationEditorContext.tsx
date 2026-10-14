import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { OperationScreen, type OperationTarget } from '../screens/OperationScreen';

interface OperationEditor {
  /** Opens the Opération screen on an existing operation or on a new one. */
  open: (target: OperationTarget) => void;
}

const OperationEditorContext = createContext<OperationEditor | null>(null);

/**
 * Owns the one Opération screen of the app, so a list row, the FAB's
 * « Plus d'options » and any later entry point open the same modal.
 * Mounted only while open: each opening starts from a fresh form.
 */
export function OperationEditorProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<OperationTarget | null>(null);
  const open = useCallback((next: OperationTarget) => setTarget(next), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <OperationEditorContext.Provider value={value}>
      {children}
      {target ? <OperationScreen target={target} onClose={() => setTarget(null)} /> : null}
    </OperationEditorContext.Provider>
  );
}

export function useOperationEditor(): OperationEditor {
  const editor = useContext(OperationEditorContext);
  if (!editor) throw new Error('useOperationEditor must be used inside OperationEditorProvider.');
  return editor;
}
