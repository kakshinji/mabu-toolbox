import { useEffect, useState } from 'react';

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

export function useQueryState(): [string, (q: string) => void] {
  const [value, setValue] = useState('');
  return [value, setValue];
}
