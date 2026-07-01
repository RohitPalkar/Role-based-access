'use client';

import type { AppStore } from 'src/redux/store';

import { useRef } from 'react';
import { Provider } from 'react-redux';

import { makeStore } from 'src/redux/store';

type StoreProviderProps = Readonly<{
  children: React.ReactNode;
}>;

export default function StoreProvider({ children }: StoreProviderProps) {
  const storeRef = useRef<AppStore>();
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}
