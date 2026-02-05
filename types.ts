
export interface Expense {
  id: string;
  category: string;
  description?: string;
  amount: number;
  icon: string;
  date: string;
  accountName: string;
}

export interface Analysis {
  quickAnalysis: string;
  alert: string;
  actionPlan: string[];
  goldenTip: string;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  color: string;
}
