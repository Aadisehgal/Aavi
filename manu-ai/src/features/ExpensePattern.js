import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/ExpensePattern.js
// Generated: 2026-06-24

import { NativeModules} from 'react-native';

const { ManuSMSReader } = NativeModules;

const EXPENSE_KEY = '@manu_ai_expenses';
const BUDGET_KEY = '@manu_ai_budget';
const PATTERNS_KEY = '@manu_ai_expense_patterns';

class ExpensePattern {
  constructor() {
    this.expenses = [];
    this.budget = {
      monthlyLimit: 0,
      categoryLimits: {},
      alertThreshold: 80, // percentage
    };
    this.patterns = {};
    this.maxExpenses = 500;
    this.loadData();
  }

  async loadData() {
    try {
      const e = await AsyncStorage.getItem(EXPENSE_KEY);
      if (e) this.expenses = JSON.parse(e);
      const b = await AsyncStorage.getItem(BUDGET_KEY);
      if (b) this.budget = JSON.parse(b);
      const p = await AsyncStorage.getItem(PATTERNS_KEY);
      if (p) this.patterns = JSON.parse(p);
    } catch (err) {
      console.warn('ExpensePattern load error:', err);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(EXPENSE_KEY, JSON.stringify(this.expenses.slice(-this.maxExpenses)));
      await AsyncStorage.setItem(BUDGET_KEY, JSON.stringify(this.budget));
      await AsyncStorage.setItem(PATTERNS_KEY, JSON.stringify(this.patterns));
    } catch (err) {
      console.warn('ExpensePattern save error:', err);
    }
  }

  async scanSMSForExpenses() {
    try {
      if (ManuSMSReader) {
        const messages = await ManuSMSReader.getFinancialMessages(30); // last 30 days
        for (const msg of messages) {
          const parsed = this.parseTransactionSMS(msg.body, msg.timestamp);
          if (parsed) {
            await this.addExpense(parsed);
          }
        }
      }
    } catch (e) {
      console.warn('SMS scan failed:', e);
    }
  }

  parseTransactionSMS(body, timestamp) {
    if (!body) return null;
    const lower = body.toLowerCase();

    // Detect if it's a transaction message
    const isDebit = /debited|spent|paid|purchase|transaction of|withdrawn/i.test(body);
    const isCredit = /credited|received|refund|cashback/i.test(body);
    if (!isDebit && !isCredit) return null;

    // Extract amount
    const amountMatch = body.match(/(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i) ||
                        body.match(/([\d,]+\.?\d*)\s*(?:Rs\.?|INR|₹)/i) ||
                        body.match(/(?:amount|amt|sum)\s*(?:of)?\s*[:\s]*([\d,]+\.?\d*)/i);
    if (!amountMatch) return null;
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) return null;

    // Extract merchant/payee
    const merchantPatterns = [
      /(?:at|to|from|via)\s+([A-Za-z0-9\s&\.]+?)(?:\s+on|\s+using|\s+Ref|\s+Txn|\s+Avl|\s+Balance|\s+\d)/i,
      /(?:merchant|payee|to)\s*[:\s]*([A-Za-z0-9\s&\.]+)/i,
    ];
    let merchant = 'Unknown';
    for (const pattern of merchantPatterns) {
      const match = body.match(pattern);
      if (match) {
        merchant = match[1].trim().substring(0, 30);
        break;
      }
    }

    // Categorize
    const category = this.categorizeExpense(merchant, lower);

    return {
      id: `exp_${timestamp}_${Math.random().toString(36).substr(2, 5)}`,
      amount: isDebit ? -amount : amount,
      merchant,
      category,
      type: isDebit ? 'debit' : 'credit',
      timestamp,
      raw: body.substring(0, 200),
      source: 'sms',
    };
  }

  categorizeExpense(merchant, bodyLower) {
    const categories = {
      food: ['swiggy', 'zomato', 'restaurant', 'cafe', 'food', 'pizza', 'burger', 'dominos', 'mcd'],
      transport: ['uber', 'ola', 'rapido', 'metro', 'fuel', 'petrol', 'diesel', 'toll'],
      shopping: ['amazon', 'flipkart', 'myntra', 'ajio', 'mall', 'store', 'shop'],
      entertainment: ['netflix', 'prime', 'hotstar', 'movie', 'theatre', 'bookmyshow', 'spotify'],
      utilities: ['electricity', 'water', 'gas', 'broadband', 'mobile', 'recharge', 'bill'],
      health: ['pharmacy', 'medical', 'hospital', 'clinic', 'doctor', 'health'],
      travel: ['airline', 'flight', 'hotel', 'booking', 'irctc', 'makemytrip', 'goibibo'],
      transfer: ['upi', 'transfer', 'sent to', 'imps', 'neft', 'rtgs'],
    };

    for (const [cat, keywords] of Object.entries(categories)) {
      for (const kw of keywords) {
        if (bodyLower.includes(kw) || merchant.toLowerCase().includes(kw)) {
          return cat;
        }
      }
    }
    return 'other';
  }

  async addExpense(expense) {
    // Prevent duplicates
    const exists = this.expenses.find(e =>
      e.timestamp === expense.timestamp &&
      Math.abs(e.amount - expense.amount) < 0.01 &&
      e.merchant === expense.merchant
    );
    if (exists) return exists;

    this.expenses.push(expense);
    if (this.expenses.length > this.maxExpenses) {
      this.expenses.shift();
    }
    await this.saveData();
    await this.analyzePatterns();
    await this.checkBudgetAlert(expense);
    return expense;
  }

  async analyzePatterns() {
    const monthly = {};
    const categoryTotals = {};
    const dailyTotals = {};
    const merchantTotals = {};

    for (const exp of this.expenses) {
      const month = new Date(exp.timestamp).toISOString().slice(0, 7);
      const day = new Date(exp.timestamp).toISOString().split('T')[0];

      if (!monthly[month]) monthly[month] = 0;
      if (exp.amount < 0) monthly[month] += Math.abs(exp.amount);

      if (!categoryTotals[exp.category]) categoryTotals[exp.category] = 0;
      if (exp.amount < 0) categoryTotals[exp.category] += Math.abs(exp.amount);

      if (!dailyTotals[day]) dailyTotals[day] = 0;
      if (exp.amount < 0) dailyTotals[day] += Math.abs(exp.amount);

      if (!merchantTotals[exp.merchant]) merchantTotals[exp.merchant] = 0;
      if (exp.amount < 0) merchantTotals[exp.merchant] += Math.abs(exp.amount);
    }

    this.patterns = {
      monthlySpending: monthly,
      categoryBreakdown: categoryTotals,
      dailySpending: dailyTotals,
      topMerchants: Object.entries(merchantTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      lastUpdated: Date.now(),
    };
    await this.saveData();
  }

  async checkBudgetAlert(expense) {
    if (this.budget.monthlyLimit <= 0) return;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const spent = this.patterns.monthlySpending[currentMonth] || 0;
    const percentage = (spent / this.budget.monthlyLimit) * 100;

    if (percentage >= this.budget.alertThreshold && percentage < 100) {
      await this.sendBudgetAlert('warning', `You've spent ${percentage.toFixed(0)}% of your monthly budget.`);
    } else if (percentage >= 100) {
      await this.sendBudgetAlert('critical', `Budget exceeded! You've spent ${spent.toFixed(2)} / ${this.budget.monthlyLimit}`);
    }

    // Category alerts
    if (this.budget.categoryLimits[expense.category]) {
      const catSpent = this.patterns.categoryBreakdown[expense.category] || 0;
      const catLimit = this.budget.categoryLimits[expense.category];
      if (catSpent > catLimit) {
        await this.sendBudgetAlert('warning', `${expense.category} budget exceeded: ${catSpent.toFixed(2)} / ${catLimit}`);
      }
    }
  }

  async sendBudgetAlert(level, message) {
    try {
      if (NativeModules.ManuNotificationManager) {
        await NativeModules.ManuNotificationManager.showLocalNotification({
          title: level === 'critical' ? '🔴 Budget Alert' : '⚠️ Budget Warning',
          body: message,
          channelId: 'budget_alerts',
          priority: level === 'critical' ? 'high' : 'normal',
        });
      }
    } catch (e) {
      console.warn('Budget alert failed:', e);
    }
  }

  getMonthlySummary(month = new Date().toISOString().slice(0, 7)) {
    const monthExpenses = this.expenses.filter(e =>
      new Date(e.timestamp).toISOString().slice(0, 7) === month && e.amount < 0
    );
    const total = monthExpenses.reduce((sum, e) => sum + Math.abs(e.amount), 0);
    const byCategory = {};
    monthExpenses.forEach(e => {
      if (!byCategory[e.category]) byCategory[e.category] = 0;
      byCategory[e.category] += Math.abs(e.amount);
    });

    return {
      month,
      totalSpent: parseFloat(total.toFixed(2)),
      transactionCount: monthExpenses.length,
      averageTransaction: monthExpenses.length > 0 ? parseFloat((total / monthExpenses.length).toFixed(2)) : 0,
      byCategory,
      budgetUsed: this.budget.monthlyLimit > 0 ? parseFloat(((total / this.budget.monthlyLimit) * 100).toFixed(1)) : 0,
    };
  }

  getTrends(months = 3) {
    const result = [];
    const now = new Date();
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0, 7);
      result.push(this.getMonthlySummary(monthStr));
    }
    return result.reverse();
  }

  setBudget(monthlyLimit, categoryLimits = {}) {
    this.budget = { ...this.budget, monthlyLimit, categoryLimits };
    this.saveData();
  }

  getBudget() {
    return this.budget;
  }
}

export default new ExpensePattern();
