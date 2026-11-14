require('dotenv').config();
const express = require('express'), cors = require('cors');
const bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
const db = require('./db'), c = require('./calc');

const app = express();
app.use(cors(), express.json());

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e); res.status(500).json({ error: 'Server error' });
});
const auth = (req, res, next) => {
  try {
    req.uid = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET).id;
    next();
  } catch { res.status(401).json({ error: 'Unauthorized' }); }
};
const token = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const num = (v) => (v !== '' && v != null && isFinite(v) ? +v : NaN);

// ---------- Auth ----------
app.post('/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ error: 'Name, email and password (6+ chars) required' });
  const [dup] = await db.query('SELECT id FROM users WHERE email=?', [email]);
  if (dup.length) return res.status(409).json({ error: 'Email already registered' });
  const hash = await bcrypt.hash(password, 10);
  const [r] = await db.query('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)', [name, email, hash]);
  res.json({ token: token(r.insertId), name });
}));

app.post('/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await db.query('SELECT * FROM users WHERE email=?', [email]);
  if (!rows.length || !(await bcrypt.compare(password || '', rows[0].password_hash)))
    return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: token(rows[0].id), name: rows[0].name });
}));

// ---------- Goals ----------
function enrich(g) {
  const saved = +g.saved, target = +g.target_amount, sip = +g.required_sip;
  const elapsed = c.monthsBetween(new Date(g.created_at), new Date());
  const expected = sip * Math.max(0, elapsed - 1);        // 1-month grace
  const avg = saved / elapsed;                            // actual avg monthly saving
  const remaining = Math.max(0, target - saved);
  const projMonths = remaining === 0 ? 0 : avg > 0 ? Math.ceil(remaining / avg) : null;
  let projected = null;
  if (projMonths !== null) { const d = new Date(); d.setMonth(d.getMonth() + projMonths); projected = d.toISOString().slice(0, 10); }
  return {
    ...g, saved, target_amount: target, required_sip: sip,
    progress_pct: Math.min(100, Math.round((saved / target) * 100)),
    on_track: saved >= expected, projected_completion: projected,
  };
}
const goalQuery = `SELECT g.*, COALESCE(SUM(c.amount),0) AS saved FROM goals g
  LEFT JOIN contributions c ON c.goal_id=g.id WHERE g.user_id=? `;

app.post('/goals', auth, wrap(async (req, res) => {
  const { title, current_cost, deadline, inflation_rate, expected_return } = req.body;
  const cost = num(current_cost), infl = num(inflation_rate), ret = num(expected_return);
  const dl = new Date(deadline);
  if (!title || !(cost > 0) || isNaN(infl) || isNaN(ret) || isNaN(dl) || dl <= new Date())
    return res.status(400).json({ error: 'Invalid input (deadline must be in the future)' });
  const months = c.monthsBetween(new Date(), dl);
  const target = c.round(c.inflatedCost(cost, infl, months / 12));
  const sip = c.round(c.requiredSip(target, ret, months));
  const [r] = await db.query(
    'INSERT INTO goals (user_id,title,current_cost,deadline,inflation_rate,expected_return,target_amount,required_sip) VALUES (?,?,?,?,?,?,?,?)',
    [req.uid, title, cost, deadline, infl, ret, target, sip]);
  res.json({ id: r.insertId, target_amount: target, required_sip: sip, months });
}));

app.get('/goals', auth, wrap(async (req, res) => {
  const [rows] = await db.query(goalQuery + 'GROUP BY g.id ORDER BY g.deadline', [req.uid]);
  res.json(rows.map(enrich));
}));

app.get('/goals/:id', auth, wrap(async (req, res) => {
  const [rows] = await db.query(goalQuery + 'AND g.id=? GROUP BY g.id', [req.uid, req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const [contribs] = await db.query('SELECT * FROM contributions WHERE goal_id=? ORDER BY contributed_on DESC', [req.params.id]);
  res.json({ ...enrich(rows[0]), contributions: contribs });
}));

app.delete('/goals/:id', auth, wrap(async (req, res) => {
  await db.query('DELETE FROM goals WHERE id=? AND user_id=?', [req.params.id, req.uid]);
  res.json({ ok: true });
}));

app.post('/goals/:id/contributions', auth, wrap(async (req, res) => {
  const amt = num(req.body.amount);
  if (!(amt > 0)) return res.status(400).json({ error: 'Amount must be positive' });
  const [own] = await db.query('SELECT id FROM goals WHERE id=? AND user_id=?', [req.params.id, req.uid]);
  if (!own.length) return res.status(404).json({ error: 'Not found' });
  await db.query('INSERT INTO contributions (goal_id,amount,contributed_on) VALUES (?,?,CURDATE())', [req.params.id, amt]);
  res.json({ ok: true });
}));

// ---------- Loans ----------
app.post('/loans', auth, wrap(async (req, res) => {
  const P = num(req.body.principal), rate = num(req.body.annual_rate), n = parseInt(req.body.tenure_months);
  if (!(P > 0) || isNaN(rate) || rate < 0 || !(n > 0)) return res.status(400).json({ error: 'Invalid input' });
  const e = c.round(c.emi(P, rate, n));
  const [r] = await db.query('INSERT INTO loans (user_id,principal,annual_rate,tenure_months,emi) VALUES (?,?,?,?,?)',
    [req.uid, P, rate, n, e]);
  const rows = c.schedule(P, rate, n);
  const total_interest = c.round(rows.reduce((s, x) => s + x.interest, 0));
  res.json({ id: r.insertId, emi: e, total_interest, total_payable: c.round(P + total_interest), schedule: rows });
}));

app.get('/loans', auth, wrap(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM loans WHERE user_id=? ORDER BY created_at DESC', [req.uid]);
  res.json(rows);
}));

app.get('/loans/:id/schedule', auth, wrap(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM loans WHERE id=? AND user_id=?', [req.params.id, req.uid]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const l = rows[0];
  res.json(c.schedule(+l.principal, +l.annual_rate, l.tenure_months));
}));

app.listen(process.env.PORT || 4000, () => console.log('API running'));
