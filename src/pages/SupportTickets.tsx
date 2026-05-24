import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MessageSquare, CheckCircle, ShieldAlert, Clock, Send, Ticket, ArrowUpRight } from 'lucide-react';

export const SupportTickets: React.FC = () => {
  const { currentUser, tickets, createTicket, replyToTicket } = useApp();

  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMsg, setTicketMsg] = useState('');
  const [ticketCategory, setTicketCategory] = useState<'Billing' | 'Tasks' | 'Account' | 'Technical' | 'Other'>('Tasks');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [success, setSuccess] = useState(false);

  if (!currentUser) return null;

  // Filter creator's tickets vs admin
  const isAdmin = currentUser.role === 'admin';
  const visibleTickets = isAdmin 
    ? tickets 
    : tickets.filter(t => t.userId === currentUser.id);

  const selectedTicket = tickets.find(t => t.id === activeTicketId);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMsg) return;

    createTicket(ticketSubject, ticketCategory, ticketMsg);
    setTicketSubject('');
    setTicketMsg('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicketId) return;

    replyToTicket(activeTicketId, replyText.trim(), isAdmin ? 'admin' : 'user');
    setReplyText('');
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-white select-none" id="support-tickets-panel">
      
      {/* Title */}
      <div className="space-y-1.5 pb-2">
        <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest block mb-1">Creators Helpdesk</span>
        <h1 className="text-2xl md:text-3xl font-black">{isAdmin ? 'Admin Support Ticket Center' : 'Support Tickets'}</h1>
        <p className="text-xs text-zinc-400 font-semibold">Open secure dialogue tickets directly to our administrators desk</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Create new ticket / list tickets */}
        <div className="space-y-6">
          
          {/* Create new ticket Form block - Only relevant for standard creators */}
          {!isAdmin && (
            <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
              <span className="text-[10px] text-purple-400 font-extrabold uppercase block mb-1">Need help?</span>
              <h3 className="text-sm font-black mb-3 text-white">Open New Support Ticket</h3>

              {success && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 shrink-0" /> Support ticket created successfully!
                </div>
              )}

              <form onSubmit={handleCreateTicket} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Ticket Category</label>
                  <select 
                    value={ticketCategory}
                    onChange={(e: any) => setTicketCategory(e.target.value)}
                    className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl focus:border-purple-500 bg-zinc-900"
                  >
                    <option value="Tasks">Tasks & Campaigns</option>
                    <option value="Billing">Billing & Wallet</option>
                    <option value="Account">Account Verification</option>
                    <option value="Technical">Technical Error</option>
                    <option value="Other">Other Issues</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Ticket Subject Topic</label>
                  <input 
                    type="text" 
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="e.g. My task proof was wrongly rejected" 
                    className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Message Description</label>
                  <textarea 
                    value={ticketMsg}
                    onChange={(e) => setTicketMsg(e.target.value)}
                    placeholder="Describe your issue with task number if relevant." 
                    className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl h-24 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-xs font-black text-white rounded-xl shadow-lg cursor-pointer transition-colors"
                >
                  Broadcast Ticket Setup
                </button>
              </form>
            </div>
          )}

          {/* Ticket lists card */}
          <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
            <h3 className="text-sm font-black mb-3">Support Tickets ({visibleTickets.length})</h3>

            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {visibleTickets.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs select-text">
                  You have no historically registered helpdesk support tickets.
                </div>
              ) : (
                visibleTickets.map((t) => (
                  <button 
                    key={t.id}
                    onClick={() => setActiveTicketId(t.id)}
                    className={`w-full p-3 border rounded-xl text-left transition-all block group cursor-pointer ${
                      activeTicketId === t.id 
                        ? 'bg-purple-600/10 border-purple-500/35' 
                        : 'bg-zinc-950 border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-black text-white block group-hover:text-purple-400 truncate max-w-[150px]">{t.subject}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                        t.status === 'Open' ? 'bg-yellow-500/10 text-yellow-500' : 
                        t.status === 'In Progress' ? 'bg-blue-500/10 text-blue-450 animate-pulse' :
                        'bg-zinc-800 text-zinc-405'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-[9px] text-zinc-500 font-bold select-text">
                      <span>Ref ID: {t.id}</span>
                      <span>Category: {t.category}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right 2 columns: Active support messaging thread */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between min-h-[500px]">
              
              {/* Thread header */}
              <div className="border-b border-white/5 pb-4 mb-4 flex justify-between items-start">
                <div className="space-y-1 select-text">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block">Support Dialogue Channel ({selectedTicket.category})</span>
                  <h3 className="text-base font-black text-white">{selectedTicket.subject}</h3>
                  <p className="text-[10px] text-zinc-400">Created by {selectedTicket.userFullName} on {new Date(selectedTicket.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-mono bg-zinc-950 px-2 py-1 border border-zinc-850 rounded text-zinc-500 select-text">ID: {selectedTicket.id}</span>
                </div>
              </div>

              {/* Chat replies list */}
              <div className="flex-1 space-y-4 max-h-[350px] overflow-y-auto mb-4 p-2 bg-zinc-950/20 rounded-2xl select-text">
                {selectedTicket.messages.map((msg, idx) => {
                  const sideStyle = msg.sender === 'admin' 
                    ? 'mr-auto bg-purple-600/10 border-purple-500/20 text-left' 
                    : 'ml-auto bg-zinc-950/80 border-white/5 text-left';
                  return (
                    <div 
                      key={idx} 
                      className={`max-w-md p-3 border rounded-2xl text-xs space-y-1 block ${sideStyle}`}
                    >
                      <div className="flex justify-between items-center gap-6 text-[10px] font-black uppercase tracking-wider mb-1 select-none">
                        <span className={msg.sender === 'admin' ? 'text-purple-400' : 'text-zinc-500'}>
                          {msg.sender === 'admin' ? '📢 ADMINISTRATOR' : 'CREATOR AUTHOR'}
                        </span>
                        <span className="text-zinc-500 text-[8px] font-sans font-bold">
                          {new Date(msg.timestamp).toLocaleDateString()} {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                        </span>
                      </div>
                      <p className="leading-relaxed font-semibold text-zinc-350">{msg.text}</p>
                    </div>
                  );
                })}
              </div>

              {/* Reply trigger Form */}
              <form onSubmit={handleSendReply} className="pt-4 border-t border-white/5 flex gap-2 select-none">
                <input 
                  type="text" 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your response to the helpdesk dialogue thread..." 
                  className="flex-1 text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl focus:border-purple-500 focus:outline-none"
                />
                <button 
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-xs font-black rounded-xl text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
                >
                  Notify Send <Send className="w-3.5 h-3.5 ml-1" />
                </button>
              </form>

            </div>
          ) : (
            <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-center items-center text-center min-h-[500px] select-none">
              <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-center text-zinc-500 mb-4 animate-pulse">
                <Ticket className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-sm font-extrabold text-white">Select a Support Ticket</h3>
              <p className="text-zinc-500 text-xs max-w-sm mt-1 leading-normal font-semibold">Click any support ticket reference in the left navigation sidebar list to check replies and write responses.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
