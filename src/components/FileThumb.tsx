import { useEffect, useState } from 'react';

export function FileThumb({ file, size = 64 }: { file: File; size?: number }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <img
      src={url}
      alt={file.name}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-lg border border-slate-200 object-cover"
    />
  );
}

export function ThumbList({
  files,
  onRemove,
  size = 64,
}: {
  files: { id: string; file: File }[];
  onRemove?: (id: string) => void;
  size?: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((f) => (
        <div key={f.id} className="group relative">
          <FileThumb file={f.file} size={size} />
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(f.id)}
              className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs leading-none text-white group-hover:flex"
              aria-label="移除"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
