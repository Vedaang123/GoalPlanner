import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { errMsg } from './api';

const inr = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const Btn = ({ title, onPress, color = '#2563eb' }) => (
  <TouchableOpacity style={[s.btn, { backgroundColor: color }]} onPress={onPress}>
    <Text style={s.btnText}>{title}</Text>
  </TouchableOpacity>
);
const Field = (props) => <TextInput style={s.input} placeholderTextColor="#888" autoCapitalize="none" {...props} />;
const Bar = ({ pct, color = '#16a34a' }) => (
  <View style={s.barBg}><View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} /></View>
);

// ---------- Login / Register ----------
export function Login({ onAuth }) {
  const [reg, setReg] = useState(false);
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const submit = async () => {
    try {
      const { data } = await api.post(reg ? '/auth/register' : '/auth/login', f);
      onAuth(data.token);
    } catch (e) { Alert.alert('Error', errMsg(e)); }
  };
  return (
    <View style={[s.page, { justifyContent: 'center' }]}>
      <Text style={s.h1}>Goal Planner</Text>
      {reg && <Field placeholder="Name" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} />}
      <Field placeholder="Email" keyboardType="email-address" value={f.email} onChangeText={(v) => setF({ ...f, email: v })} />
      <Field placeholder="Password" secureTextEntry value={f.password} onChangeText={(v) => setF({ ...f, password: v })} />
      <Btn title={reg ? 'Register' : 'Login'} onPress={submit} />
      <Text style={s.link} onPress={() => setReg(!reg)}>{reg ? 'Have an account? Login' : 'New here? Register'}</Text>
    </View>
  );
}

// ---------- Goals list (dashboard) ----------
export function Goals({ navigation, onLogout }) {
  const [goals, setGoals] = useState([]);
  useFocusEffect(useCallback(() => {
    api.get('/goals').then((r) => setGoals(r.data)).catch((e) => Alert.alert('Error', errMsg(e)));
  }, []));
  return (
    <View style={s.page}>
      <FlatList
        data={goals}
        keyExtractor={(g) => String(g.id)}
        ListEmptyComponent={<Text style={s.muted}>No goals yet. Add one!</Text>}
        renderItem={({ item: g }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('GoalDetail', { id: g.id })}>
            <Text style={s.h2}>{g.title}</Text>
            <Text>{inr(g.saved)} of {inr(g.target_amount)} ({g.progress_pct}%)</Text>
            <Bar pct={g.progress_pct} color={g.on_track ? '#16a34a' : '#dc2626'} />
            <Text style={{ color: g.on_track ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
              {g.on_track ? 'On track' : 'Behind'} · Save {inr(g.required_sip)}/month
            </Text>
          </TouchableOpacity>
        )}
      />
      <Btn title="+ New Goal" onPress={() => navigation.navigate('AddGoal')} />
      <Btn title="Loan / EMI Calculator" color="#7c3aed" onPress={() => navigation.navigate('Loan')} />
      <Btn title="Logout" color="#6b7280" onPress={onLogout} />
    </View>
  );
}

// ---------- Add goal ----------
export function AddGoal({ navigation }) {
  const [f, setF] = useState({ title: '', current_cost: '', deadline: '', inflation_rate: '6', expected_return: '12' });
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const submit = async () => {
    try {
      const { data } = await api.post('/goals', f);
      Alert.alert('Goal created', `Inflated target: ${inr(data.target_amount)}\nSave ${inr(data.required_sip)} per month for ${data.months} months`);
      navigation.goBack();
    } catch (e) { Alert.alert('Error', errMsg(e)); }
  };
  return (
    <ScrollView style={s.page}>
      <Field placeholder="Goal name (e.g. Laptop)" value={f.title} onChangeText={set('title')} />
      <Field placeholder="Cost today (₹)" keyboardType="numeric" value={f.current_cost} onChangeText={set('current_cost')} />
      <Field placeholder="Deadline (YYYY-MM-DD)" value={f.deadline} onChangeText={set('deadline')} />
      <Field placeholder="Inflation % per year" keyboardType="numeric" value={f.inflation_rate} onChangeText={set('inflation_rate')} />
      <Field placeholder="Expected return % per year" keyboardType="numeric" value={f.expected_return} onChangeText={set('expected_return')} />
      <Btn title="Calculate & Save" onPress={submit} />
    </ScrollView>
  );
}

// ---------- Goal detail ----------
export function GoalDetail({ route, navigation }) {
  const { id } = route.params;
  const [g, setG] = useState(null), [amt, setAmt] = useState('');
  const load = () => api.get(`/goals/${id}`).then((r) => setG(r.data)).catch((e) => Alert.alert('Error', errMsg(e)));
  useFocusEffect(useCallback(() => { load(); }, []));
  const add = async () => {
    try { await api.post(`/goals/${id}/contributions`, { amount: amt }); setAmt(''); load(); }
    catch (e) { Alert.alert('Error', errMsg(e)); }
  };
  const del = () => Alert.alert('Delete goal?', '', [
    { text: 'Cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await api.delete(`/goals/${id}`); navigation.goBack(); } },
  ]);
  if (!g) return null;
  return (
    <ScrollView style={s.page}>
      <Text style={s.h1}>{g.title}</Text>
      <Text>Cost today: {inr(g.current_cost)}</Text>
      <Text>Inflated target ({g.inflation_rate}%/yr): {inr(g.target_amount)}</Text>
      <Text>Required SIP @ {g.expected_return}%: {inr(g.required_sip)}/month</Text>
      <Text>Deadline: {g.deadline}</Text>
      <Text>Projected completion: {g.projected_completion || 'Add contributions to project'}</Text>
      <Text style={{ marginTop: 10 }}>{inr(g.saved)} saved · {g.progress_pct}%</Text>
      <Bar pct={g.progress_pct} color={g.on_track ? '#16a34a' : '#dc2626'} />
      <Text style={{ fontWeight: '700', color: g.on_track ? '#16a34a' : '#dc2626' }}>{g.on_track ? 'On track' : 'Behind schedule'}</Text>
      <Field placeholder="Contribution amount (₹)" keyboardType="numeric" value={amt} onChangeText={setAmt} />
      <Btn title="Add Contribution" onPress={add} />
      <Text style={s.h2}>History</Text>
      {g.contributions.map((c) => <Text key={c.id}>{c.contributed_on} — {inr(c.amount)}</Text>)}
      <Btn title="Delete Goal" color="#dc2626" onPress={del} />
    </ScrollView>
  );
}

// ---------- Loan / EMI ----------
export function Loan() {
  const [f, setF] = useState({ principal: '', annual_rate: '', tenure_months: '' });
  const [res, setRes] = useState(null);
  const calc = async () => {
    try { setRes((await api.post('/loans', f)).data); } catch (e) { Alert.alert('Error', errMsg(e)); }
  };
  const interestPct = res ? Math.round((res.total_interest / res.total_payable) * 100) : 0;
  return (
    <ScrollView style={s.page}>
      <Field placeholder="Loan amount (₹)" keyboardType="numeric" value={f.principal} onChangeText={(v) => setF({ ...f, principal: v })} />
      <Field placeholder="Annual interest %" keyboardType="numeric" value={f.annual_rate} onChangeText={(v) => setF({ ...f, annual_rate: v })} />
      <Field placeholder="Tenure (months)" keyboardType="numeric" value={f.tenure_months} onChangeText={(v) => setF({ ...f, tenure_months: v })} />
      <Btn title="Calculate EMI" onPress={calc} />
      {res && (
        <>
          <Text style={s.h2}>EMI: {inr(res.emi)}</Text>
          <Text>Total interest: {inr(res.total_interest)}</Text>
          <Text>Total payable: {inr(res.total_payable)}</Text>
          <Text style={{ marginTop: 8 }}>Interest share of payment: {interestPct}%</Text>
          <Bar pct={interestPct} color="#f59e0b" />
          <Text style={s.h2}>Amortization schedule</Text>
          <View style={s.row}>{['Mo', 'Interest', 'Principal', 'Balance'].map((h) => <Text key={h} style={[s.cell, { fontWeight: '700' }]}>{h}</Text>)}</View>
          {res.schedule.map((r) => (
            <View key={r.month} style={s.row}>
              <Text style={s.cell}>{r.month}</Text><Text style={s.cell}>{r.interest}</Text>
              <Text style={s.cell}>{r.principal}</Text><Text style={s.cell}>{r.balance}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  h1: { fontSize: 26, fontWeight: '700', marginBottom: 12 },
  h2: { fontSize: 18, fontWeight: '700', marginVertical: 8 },
  muted: { color: '#666', textAlign: 'center', marginTop: 30 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, marginVertical: 6, color: '#000' },
  btn: { padding: 14, borderRadius: 8, marginVertical: 5, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  link: { color: '#2563eb', textAlign: 'center', marginTop: 14 },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 10, elevation: 2 },
  barBg: { height: 10, backgroundColor: '#e5e7eb', borderRadius: 5, marginVertical: 6, overflow: 'hidden' },
  barFill: { height: 10 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#ccc', paddingVertical: 4 },
  cell: { flex: 1, fontSize: 12 },
});
