import React, { createContext, useState, useContext, useCallback } from 'react';
const LoadQueueContext = createContext();
export const LoadQueueProvider = ({ children }) => {
  const [loadingSlot, setLoadingSlot] = useState(0);
  const loadCompleted = useCallback(() => {
    setLoadingSlot(currentSlot => currentSlot + 1);
  }, []);
  return (
    <LoadQueueContext.Provider value={{ loadingSlot, loadCompleted }}>
      {children}
    </LoadQueueContext.Provider>
  );
};
export const useLoadQueue = (queueIndex) => {
  const { loadingSlot, loadCompleted } = useContext(LoadQueueContext);
  const isMyTurnToLoad = (loadingSlot === queueIndex);
  return { isMyTurnToLoad, loadCompleted };
};