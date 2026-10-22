import { useEffect } from 'react';

// a conditional hook call in a plain ts file: react rules apply to jsx and tsx files only, as in v3
export function useMaybe(enabled: boolean) {
  if (enabled) {
    useEffect(() => {});
  }
}
