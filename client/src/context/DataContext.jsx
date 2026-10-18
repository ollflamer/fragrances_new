import { createContext, useContext } from 'react';
import { useApi } from '../lib/useApi';
const DataContext = createContext(null);
export function DataProvider({ children }) {
  const products = useApi('/products');
  const categories = useApi('/categories');
  const settings = useApi('/config');
  return <DataContext.Provider value={{ products, categories, settings }}>{children}</DataContext.Provider>;
}
export const useData = () => useContext(DataContext);
