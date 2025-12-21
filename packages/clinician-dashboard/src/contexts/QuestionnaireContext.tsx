import React, { createContext, useContext, useState, ReactNode } from 'react';

export type QuestionnaireMode = 'drug-module' | 'regimen';

interface QuestionnaireContextType {
  mode: QuestionnaireMode;
  setMode: (mode: QuestionnaireMode) => void;
}

const QuestionnaireContext = createContext<QuestionnaireContextType | undefined>(undefined);

export function QuestionnaireProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<QuestionnaireMode>('drug-module'); // Default to drug-module

  return (
    <QuestionnaireContext.Provider value={{ mode, setMode }}>
      {children}
    </QuestionnaireContext.Provider>
  );
}

export function useQuestionnaire() {
  const context = useContext(QuestionnaireContext);
  if (!context) {
    throw new Error('useQuestionnaire must be used within QuestionnaireProvider');
  }
  return context;
}
