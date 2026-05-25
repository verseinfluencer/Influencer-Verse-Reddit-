import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Wallet, DollarSign, Send, ArrowDownRight, ArrowUpRight, HelpCircle, ShieldAlert, CheckCircle2, Copy } from 'lucide-react';

export const WalletPage: React.FC = () => {
  const { currentUser, transactions, requestWithdrawal, submissions } = useApp();

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
    if (type === 'withdrawal') return { bg: 'bg-red-500/10 text-red-400 border-red-500/25', icon: ArrowUpRight };
    if (type === 'referral_bonus') return { bg: 'bg-pink-500/10 text-pink-400 border-pink-500/25', icon: ArrowDownRight };
    return { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25', icon: ArrowDownRight };
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-white select-none" id="wallet-panel">
      
      {/* Title */}
      <div className="space-y-1.5 pb-2">
        <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest block mb-1">Earning Ledger</span>
        <h1 className="text-2xl md:text-3xl font-black">Creator Wallet</h1>
        <p className="text-xs text-zinc-400 font-semibold">Initiate blockchain cashout claims and browse historically audited transactions</p>
      </div>

      {/* Stats indicators banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 select-text">
        
        {/* Available cards */}
        <div className="p-5 bg-gradient-to-tr from-purple-950/15 to-zinc-900 border border-purple-500/20 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-purple-500/10 rounded-full blur-xl"></div>
          <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest block mb-2">Available Balance</span>
          <span className="text-2xl font-black text-white block font-mono leading-none">${availableBal.toFixed(2)}</span>
          <span className="text-[10px] text-zinc-500 block font-semibold mt-2">Ready to cash out instantly</span>
        </div>

        {/* Pending review credits */}
        <div className="p-5 bg-zinc-900/30 border border-white/5 rounded-2xl">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Earning Pending Review</span>
          <span className="text-2xl font-black text-yellow-500 block font-mono leading-none">${pendingBal.toFixed(2)}</span>
          <span className="text-[10px] text-zinc-500 block font-semibold mt-2">Locked during task proof review</span>
        </div>

        {/* Total Earned */}
        <div className="p-5 bg-zinc-900/30 border border-white/5 rounded-2xl">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Total Earned Credits</span>
          <span className="text-2xl font-black text-white block font-mono leading-none">${currentUser.totalEarned.toFixed(2)}</span>
          <span className="text-[10px] text-zinc-500 block font-semibold mt-2">Accumulated campaign bonuses</span>
        </div>

        {/* Total cashed out */}
        <div className="p-5 bg-zinc-900/30 border border-white/5 rounded-2xl">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Completed Withdrawals</span>
          <span className="text-2xl font-black text-emerald-400 block font-mono leading-none">${withdrawnAmt.toFixed(2)}</span>
          <span className="text-[10px] text-zinc-500 block font-semibold mt-2">Confirmed blockchain transactions</span>
        </div>

      </div>

      {/* Main Grid splitting Form & History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 1 Column: Withdrawal Form block */}
        <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400 block mb-1">USDT Cashout Gate</span>
            <h3 className="text-base font-extrabold text-white mb-4">Request Withdrawal</h3>

            {success && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Cashout transaction created and pending review.
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl flex items-center gap-1.5 mb-4 font-semibold">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleWithdrawalRequest} className="space-y-4">
              
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">Earning Withdrawal Method</label>
                <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-xl">
                  <button 
                    type="button" 
                    onClick={() => { setWithdrawMethod('USDT_BEP20'); setPaymentAddress(''); }}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      withdrawMethod === 'USDT_BEP20' ? 'bg-purple-600/90 text-white shadow-sm' : 'text-zinc-500'
                    }`}
                  >
                    USDT (BEP-20 only)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setWithdrawMethod('BINANCE_ID'); setPaymentAddress(''); }}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      withdrawMethod === 'BINANCE_ID' ? 'bg-purple-600/90 text-white shadow-sm' : 'text-zinc-500'
                    }`}
                  >
                    Binance Pay ID
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Withdraw Amount (USDT)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="1.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl font-mono focus:border-purple-500 focus:outline-none"
                />
                <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold uppercase mt-1">
                  <span>Minimum Cashout: $1.00</span>
                  <span>Limit: Max Available Balance</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  {withdrawMethod === 'USDT_BEP20' ? 'Binance Smart Chain (BSC BEP20) Address' : 'Binance Pay ID Identifier'}
                </label>
                <input 
                  type="text" 
                  value={paymentAddress}
                  onChange={(e) => setPaymentAddress(e.target.value)}
                  placeholder={withdrawMethod === 'USDT_BEP20' ? '0x71C7656EC7ab88b098defB751B...' : 'e.g. 48102948'} 
                  className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Binance ID copy-to-verify widget */}
              <div className="bg-zinc-950 p-3 rounded-xl border border-white/5 flex items-center justify-between gap-3 text-[11px] select-none">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider block">Official Agency Binance Pay ID</span>
                  <span className="font-mono text-zinc-300 font-bold block select-all">1215158504</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyAdminId}
                  className={`px-2.5 py-1.5 text-[10px] uppercase font-bold rounded-lg border transition-all inline-flex items-center gap-1 cursor-pointer ${
                    copiedAdminId
                      ? 'bg-emerald-950/80 border-emerald-900 text-emerald-400'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-white/5 hover:border-white/10 text-zinc-350 hover:text-white'
                  }`}
                >
                  {copiedAdminId ? 'Copied' : 'Copy ID'} <Copy className="w-3 h-3" />
                </button>
              </div>

              {/* Strict Security Warn constraints */}
              <div className="p-3 bg-red-600/10 border border-red-500/20 rounded-xl text-[11px] hover:border-red-500/40 select-none">
                <p className="text-red-400 font-bold mb-1 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> High Risk Network Notice:
                </p>
                <p className="text-zinc-400 leading-normal font-semibold text-wrap">
                  Ensure your address is BEP20 (BSC network). Wrong network address structure results in permanent lost funds. Never insert ERC20/TRC20 addresses here.
                </p>
              </div>

              <button 
                type="submit"
                disabled={loading || availableBal < 1.00}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-blue-500 hover:opacity-95 text-xs font-black text-white rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                {loading ? 'Transmitting claims...' : 'Initiate Secure Claim'} <Send className="w-3.5 h-3.5" />
              </button>

            </form>
          </div>
          
          <div className="border-t border-white/5 pt-4 mt-6 text-[10px] text-zinc-500 leading-relaxed font-semibold">
            Cashout reviews are processed within 24 business hours by our auditing reviewers. Track status changes in table right.
          </div>
        </div>

        {/* Right 2 Columns: Transaction logs ledger table */}
        <div className="lg:col-span-2 bg-zinc-900/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 block mb-1">Secure ledger</span>
          <h3 className="text-base font-extrabold text-white mb-4">Transaction History</h3>

          <div className="overflow-x-auto select-text">
            {userTransactions.length === 0 ? (
              <div className="text-center py-20 text-zinc-500 text-xs text-balance">
                Your transaction ledger is currently empty. Reserve and complete Reddit campaigns to claim task reward deposits!
              </div>
            ) : (
              <table className="w-full border-collapse text-left font-semibold">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                    <th className="py-3 px-2">TX ID / DATE</th>
                    <th className="py-3 px-2">Campaign Description</th>
                    <th className="py-3 px-2">Type Category</th>
                    <th className="py-3 px-2 text-right">Earning Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-zinc-300">
                  {userTransactions.map((tx) => {
                    const style = getTxTypeStyle(tx.type);
                    const Icon = style.icon;
                    return (
                      <tr key={tx.id} className="hover:bg-white/[0.01]">
                        <td className="py-4 px-2 space-y-0.5">
                          <p className="font-extrabold text-white text-xs">{tx.id}</p>
                          <p className="text-zinc-500 text-[10px]">{new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                        </td>
                        <td className="py-4 px-2 max-w-xs truncate">
                          <span className="text-zinc-300">{tx.description}</span>
                        </td>
                        <td className="py-4 px-2">
                          <span className={`px-2 py-0.5 border rounded-full text-[10px] font-bold ${style.bg}`}>
                            {tx.type === 'referral_bonus' ? 'Referral Bonus' : tx.type}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-right select-none">
                          <span className={`font-mono font-black text-sm block ${
                            tx.type === 'withdrawal' ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            {tx.type === 'withdrawal' ? '-' : '+'}${tx.amount.toFixed(2)} USDT
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-widest ${
                            tx.status === 'Completed' ? 'text-emerald-500' : 
                            tx.status === 'Pending' ? 'text-yellow-500 animate-pulse' : 'text-red-500'
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
