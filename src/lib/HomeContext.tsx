import { createContext, useContext, useState, ReactNode } from 'react';

type HomeStateValue = {
  category: string | null;
  setCategory: (v: string | null) => void;
  isCustom: boolean;
  setIsCustom: (v: boolean) => void;
  address: string;
  setAddress: (v: string) => void;
  when: string;
  setWhen: (v: string) => void;
};

const Ctx = createContext<HomeStateValue | null>(null);

export function HomeStateProvider({ children }: { children: ReactNode }) {
  const [category, setCategory] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [address, setAddress] = useState('my place');
  const [when, setWhen] = useState('As soon as possible');

  return (
    <Ctx.Provider
      value={{
        category, setCategory,
        isCustom, setIsCustom,
        address, setAddress,
        when, setWhen,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useHomeState() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useHomeState must be used inside HomeStateProvider');
  return v;
}