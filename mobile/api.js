import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Android emulator: 10.0.2.2 | Physical phone: your PC's LAN IP, e.g. http://192.168.1.5:4000
export const BASE_URL = 'http://10.0.2.2:4000';
const api = axios.create({ baseURL: BASE_URL });
api.interceptors.request.use(async (cfg) => {
  const t = await AsyncStorage.getItem('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
export const errMsg = (e) => e?.response?.data?.error || 'Network error';
export default api;
