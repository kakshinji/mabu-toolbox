import { useCallback, useRef, useState } from 'react';

export interface PickedFile {
  id: string;
  file: File;
}

let seq = 0;
function nextId() {
  seq += 1;
  return `f${seq}`;
}

export function useFiles(accept = '*') {
  const [files, setFiles] = useState<PickedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = useCallback((list: FileList | File[] | null) => {
    if (!list) return;
    const arr = Array.from(list).map((file) => ({ id: nextId(), file }));
    setFiles((prev) => [...prev, ...arr]);
  }, []);

  const remove = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clear = useCallback(() => setFiles([]), []);

  const move = useCallback((id: string, dir: -1 | 1) => {
    setFiles((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  }, []);

  const pick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const inputProps = {
    ref: inputRef,
    type: 'file' as const,
    accept,
    multiple: true,
    className: 'hidden',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      add(e.target.files);
      e.target.value = '';
    },
  };

  return { files, setFiles, add, remove, clear, move, pick, inputProps };
}
