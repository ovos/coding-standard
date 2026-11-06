import React, { useEffect, useState } from 'react';

// react option in this package: exhaustive-deps applies
export function App({ id }: { id: string }) {
  const [value, setValue] = useState('');
  useEffect(() => {
    setValue(id);
  }, []);
  return <div>{value}</div>;
}
