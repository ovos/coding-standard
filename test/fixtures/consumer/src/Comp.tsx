import React, { useEffect, useState } from 'react';

export function Comp({ id }: { id: string }) {
  const [value, setValue] = useState('');
  useEffect(() => {
    setValue(id);
  }, []);
  return <div>{value}</div>;
}
