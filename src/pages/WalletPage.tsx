import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Wallet, DollarSign, Send, ArrowDownRight, ArrowUpRight, HelpCircle, ShieldAlert, CheckCircle2, Copy } from 'lucide-react';

export const WalletPage: React.FC = () => {
  const { currentUser, transactions, requestWithdrawal, submissions, withdrawals } = useApp();

  // Withdraw fields
  const [withdrawAmount, setWithdrawAmount] = useState<number>(5.00);
  const [withdrawMethod, setWithdrawMethod] = useState<'USDT_BEP20' | 'BINANCE_ID'>('USDT_BEP20');
  const [paymentAddress, setPaymentAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedAdminId, setCopiedAdminId] = useState(false);

  const handleCopyAdminId = () => {
    navigator.clipboard.writeText('1215158504');
    setCopiedAdminId(true);
    setTimeout(() => setCopiedAdminId(false), 2000);
  };

  if (!currentUser) return null;

  // Filter user transactions
  const userTransactions = transactions.filter(tx => tx.userId === currentUser.id);

  // Mapped totals
  const availableBal = currentUser.balance;
  const pendingBal = currentUser.pendingBalance; // Under review task submissions
  const withdrawnAmt = currentUser.withdrawn;

  // Calculate pending withdrawal requests (Pending Payout status)
  const pendingWithdrawalAmt = (withdrawals || [])
    .filter(w => w.userId === currentUser.id && w.status === 'Pending')
    .reduce((sum, w) => sum + w.amount, 0);

  const handleWithdrawalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccess(false);

    if (!paymentAddress) {
      setErrorMessage('Please fill in your crypto recipient address or Binance Pay ID.');
      return;
    }

    if (withdrawAmount < 1.00) {
      setErrorMessage('Minimum withdrawal amount is strictly $1.00 USDT.');
      return;
    }

    if (withdrawAmount > availableBal) {
      setErrorMessage('Withdrawal amount exceeds your current available balance.');
      return;
    }

    // Basic wallet address checklist checker (Must be hex of 42 characters starting with 0x if BEP20)
    if (withdrawMethod === 'USDT_BEP20') {
      const bscRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!bscRegex.test(paymentAddress.trim())) {
        setErrorMessage('Invalid BSC wallet address format. Must be an ETH/BSC style hex starting with 0x. (42 chars)');
        return;
      }
    } else {
      // Binance pay ID checker (Must be simple digit array)
      const payIdRegex = /^[0-9]+$/;
      if (!payIdRegex.test(paymentAddress.trim())) {
        setErrorMessage('Invalid Binance Pay ID format. Must contain integers only.');
        return;
      }
    }

    setLoading(true);
    try {
      await requestWithdrawal(withdrawAmount, withdrawMethod, paymentAddress.trim());
      setLoading(false);
      setSuccess(true);
      setPaymentAddress('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err.message || 'Withdrawal processing failed.');
    }
  };

  const getTxTypeStyle = (type: string) => {
    if (type === 'withdrawal') return { bg: 'bg-red-50 text-red-700 border-red-100', icon: ArrowUpRight };
    if (type === 'referral_bonus') return { bg: 'bg-pink-50 text-pink-700 border-pink-100', icon: ArrowDownRight };
    return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: ArrowDownRight };
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-gray-750 select-none" id="wallet-panel">
      
      {/* Title */}
      <div className="space-y-1.5 pb-4 border-b border-gray-200">
        <span className="text-xs text-purple-600 font-bold uppercase tracking-widest block mb-1">Earning Ledger</span>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Creator Wallet</h1>
        <p className="text-sm text-gray-500 font-medium">Initiate blockchain cashout claims and browse historically audited transactions</p>
      </div>

      {/* Stats indicators banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 select-text">
        
        {/* 1. Available Balance */}
        <div className="p-6 bg-white border border-gray-200 rounded-2xl relative overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute top-0 right-0 w-12 h-12 bg-purple-500/5 rounded-full blur-xl"></div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg border border-purple-100">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-gray-505 uppercase tracking-wider block">Available Balance</span>
          </div>
          <span className="text-2xl font-bold text-gray-900 block font-mono leading-none">${availableBal.toFixed(2)}</span>
          <span className="text-xs text-emerald-600 block font-medium mt-3">Ready to cash out instantly</span>
        </div>

        {/* 2. Pending Earnings */}
        <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-amber-50 text-amber-500 rounded-lg border border-amber-100">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Pending Earnings</span>
          </div>
          <span className="text-2xl font-bold text-amber-650 block font-mono leading-none">${pendingBal.toFixed(2)}</span>
          <span className="text-[10px] text-gray-500 block font-normal mt-2.5 leading-tight">In admin audit state</span>
        </div>

        {/* 3. Total Earned Credits */}
        <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Total Earned</span>
          </div>
          <span className="text-2xl font-bold text-gray-900 block font-mono leading-none">${currentUser.totalEarned.toFixed(2)}</span>
          <span className="text-[10px] text-gray-500 block font-normal mt-2.5 leading-tight">Accumulated campaign bonuses</span>
        </div>

        {/* 4. Withdrawal Requests */}
        <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <Send className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Pending Withdrawal</span>
          </div>
          <span className="text-2xl font-bold text-purple-600 block font-mono leading-none">${pendingWithdrawalAmt.toFixed(2)}</span>
          <span className="text-[10px] text-gray-500 block font-normal mt-2.5 leading-tight">Awaiting dispatch payouts</span>
        </div>

        {/* 5. Completed Withdrawals */}
        <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Completed Cashouts</span>
          </div>
          <span className="text-2xl font-bold text-emerald-600 block font-mono leading-none">${withdrawnAmt.toFixed(2)}</span>
          <span className="text-[10px] text-gray-500 block font-normal mt-2.5 leading-tight">Confirmed blockchain payout dispatch</span>
        </div>

      </div>

      {/* Main Grid splitting Form & History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 1 Column: Withdrawal Form block */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-purple-600 block mb-1">USDT Cashout Gate</span>
            <h3 className="text-base font-bold text-gray-900 mb-4 font-display">Request Withdrawal</h3>

            {success && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-150 text-emerald-700 text-xs rounded-xl flex items-center gap-2 mb-4 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Cashout transaction created and pending review.
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 bg-red-50 border border-red-150 text-red-650 text-xs rounded-xl flex items-center gap-1.5 mb-4 font-semibold">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleWithdrawalRequest} className="space-y-4">
              
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">Earning Withdrawal Method</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                  <button 
                    type="button" 
                    onClick={() => { setWithdrawMethod('USDT_BEP20'); setPaymentAddress(''); }}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      withdrawMethod === 'USDT_BEP20' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    USDT (BEP-20 only)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setWithdrawMethod('BINANCE_ID'); setPaymentAddress(''); }}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      withdrawMethod === 'BINANCE_ID' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Binance Pay ID
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Withdraw Amount (USDT)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="1.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  className="w-full text-xs text-gray-900 bg-white border border-gray-200 px-3 py-2.5 rounded-xl font-mono focus:border-purple-500 focus:outline-none"
                />
                <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase mt-1">
                  <span>Minimum Cashout: $1.00</span>
                  <span>Max Limit: Full Balance</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                  {withdrawMethod === 'USDT_BEP20' ? 'Binance Smart Chain (BSC BEP20) Address' : 'Binance Pay ID Identifier'}
                </label>
                <input 
                  type="text" 
                  value={paymentAddress}
                  onChange={(e) => setPaymentAddress(e.target.value)}
                  placeholder={withdrawMethod === 'USDT_BEP20' ? '0x71C7656EC7ab88b098defB751B...' : 'e.g. 48102948'} 
                  className="w-full text-xs text-gray-900 bg-white border border-gray-200 px-3 py-2.5 rounded-xl font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Binance ID copy-to-verify widget */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-150 flex items-center justify-between gap-3 text-[11px] select-none">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold uppercase text-gray-500 tracking-wider block">Official Agency Binance Pay ID</span>
                  <span className="font-mono text-gray-800 font-bold block select-all">1215158504</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyAdminId}
                  className={`px-2.5 py-1.5 text-[10px] uppercase font-bold rounded-lg border transition-all inline-flex items-center gap-1 cursor-pointer ${
                    copiedAdminId
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {copiedAdminId ? 'Copied' : 'Copy ID'} <Copy className="w-3 h-3" />
                </button>
              </div>

              {/* Strict Security Warn constraints */}
              <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-[11px] select-none">
                <p className="text-red-700 font-bold mb-1 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> High Risk Network Notice:
                </p>
                <p className="text-gray-600 leading-normal font-medium text-wrap">
                  Ensure your address is BEP20 (BSC network). Wrong network address structure results in permanent lost funds. Never insert ERC20/TRC20 addresses here.
                </p>
              </div>

              <button 
                type="submit"
                disabled={loading || availableBal < 1.00}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-xs font-bold text-white rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
              >
                {loading ? 'Transmitting claims...' : 'Initiate Secure Claim'} <Send className="w-3.5 h-3.5" />
              </button>

            </form>
          </div>
          
          <div className="border-t border-gray-200 pt-4 mt-6 text-xs text-gray-500 leading-relaxed font-semibold">
            Cashout reviews are processed within 24 business hours by our auditing reviewers. Track status changes in the history ledger on the right.
          </div>
        </div>

        {/* Right 2 Columns: Transaction logs ledger table */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1">Secure ledger</span>
          <h3 className="text-base font-bold text-gray-900 mb-4 font-display">Transaction History</h3>

          <div className="overflow-x-auto select-text">
            {userTransactions.length === 0 ? (
              <div className="text-center py-20 text-gray-400 text-xs">
                Your transaction ledger is currently empty. Reserve and complete Reddit campaigns to claim task reward deposits!
              </div>
            ) : (
              <table className="w-full border-collapse text-left font-semibold">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] text-gray-500 font-bold uppercase tracking-widest bg-gray-50">
                    <th className="py-3 px-3">TX ID / DATE</th>
                    <th className="py-3 px-3">Campaign Description</th>
                    <th className="py-3 px-3">Type Category</th>
                    <th className="py-3 px-3 text-right">Earning Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-600">
                  {userTransactions.map((tx) => {
                    const style = getTxTypeStyle(tx.type);
                    const Icon = style.icon;
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors duration-200">
                        <td className="py-4 px-3 space-y-0.5">
                           <p className="font-bold text-gray-950 text-xs">{tx.id}</p>
                           <p className="text-gray-500 text-[10px] font-mono">{new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                        </td>
                        <td className="py-4 px-3 max-w-xs truncate">
                          <span className="text-gray-600 font-medium">{tx.description}</span>
                        </td>
                        <td className="py-4 px-3">
                          <span className={`px-2 py-0.5 border rounded-full text-[10px] font-bold ${style.bg}`}>
                            {tx.type === 'referral_bonus' ? 'Referral Bonus' : tx.type}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-right select-none">
                          <span className={`font-mono font-bold text-sm block ${
                            tx.type === 'withdrawal' ? 'text-red-600' : 'text-emerald-600'
                          }`}>
                            {tx.type === 'withdrawal' ? '-' : '+'}${tx.amount.toFixed(2)} USDT
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${
                            tx.status === 'Completed' ? 'text-emerald-600' : 
                            tx.status === 'Pending' ? 'text-amber-500' : 'text-red-500'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
