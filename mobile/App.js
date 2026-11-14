import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Login, Goals, AddGoal, GoalDetail, Loan } from './screens';

const Stack = createNativeStackNavigator();
export default function App() {
  const [token, setToken] = useState(null), [ready, setReady] = useState(false);
  useEffect(() => { AsyncStorage.getItem('token').then((t) => { setToken(t); setReady(true); }); }, []);
  const logout = async () => { await AsyncStorage.removeItem('token'); setToken(null); };
  if (!ready) return null;
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!token ? (
          <Stack.Screen name="Login" options={{ headerShown: false }}>
            {() => <Login onAuth={async (t) => { await AsyncStorage.setItem('token', t); setToken(t); }} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Goals" options={{ title: 'My Goals' }}>
              {(p) => <Goals {...p} onLogout={logout} />}
            </Stack.Screen>
            <Stack.Screen name="AddGoal" component={AddGoal} options={{ title: 'New Goal' }} />
            <Stack.Screen name="GoalDetail" component={GoalDetail} options={{ title: 'Goal' }} />
            <Stack.Screen name="Loan" component={Loan} options={{ title: 'Loan / EMI' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
