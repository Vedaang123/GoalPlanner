// All financial formulas. r = monthly rate. r = 0 is handled separately (formulas divide by r).
const monthlyRate = (annualPct) => annualPct / 1200;

// EMI = P*r*(1+r)^n / ((1+r)^n - 1)
function emi(P, annualPct, n) {
  const r = monthlyRate(annualPct);
  if (r === 0) return P / n;
  const f = Math.pow(1 + r, n);
  return (P * r * f) / (f - 1);
}

// Month-by-month: interest = balance*r; principal = EMI - interest
function schedule(P, annualPct, n) {
  const r = monthlyRate(annualPct), e = emi(P, annualPct, n);
  let bal = P; const rows = [];
  for (let m = 1; m <= n; m++) {
    const interest = bal * r, principal = e - interest;
    bal = Math.max(0, bal - principal);
    rows.push({ month: m, interest: round(interest), principal: round(principal), balance: round(bal) });
  }
  return rows;
}

// Future cost = C*(1+i)^t, t in years
const inflatedCost = (C, inflPct, years) => C * Math.pow(1 + inflPct / 100, years);

// SIP future value (annuity due): FV = M*((1+r)^n - 1)/r*(1+r)  =>  M = FV*r / (((1+r)^n - 1)(1+r))
function requiredSip(target, annualPct, n) {
  const r = monthlyRate(annualPct);
  if (r === 0) return target / n;
  return (target * r) / ((Math.pow(1 + r, n) - 1) * (1 + r));
}

const monthsBetween = (a, b) => Math.max(1, Math.round((b - a) / (30.44 * 86400000)));
const round = (x) => Math.round(x * 100) / 100;

module.exports = { emi, schedule, inflatedCost, requiredSip, monthsBetween, round };
