import { useEffect, useState } from 'react';

export function useThing(id: string) {
  const [v, setV] = useState('');
  useEffect(() => { setV(id); }, []);
  return v;
}
