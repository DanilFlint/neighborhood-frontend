import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { useDispatch, useSelector } from 'react-redux';
import auth from './auth';
import { api } from '../api/api';

export const createAppStore = () => configureStore({
  reducer: { auth, [api.reducerPath]: api.reducer },
  middleware: (getDefault) => getDefault({ serializableCheck: { ignoredActions: [] } }).concat(api.middleware),
  devTools: false,
});
export const store = createAppStore();
setupListeners(store.dispatch);
export type RootState = ReturnType<typeof store.getState>;
export const useAppDispatch = useDispatch.withTypes<typeof store.dispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
