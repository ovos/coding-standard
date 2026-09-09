import React, { useEffect, useState } from 'react';

// no react option at the root: react-hooks rules do not apply here
export function Root({ id }: { id: string }) {
  const [value, setValue] = useState('');
  useEffect(() => {
    setValue(id);
  }, []);
  return <div>{value}</div>;
}
