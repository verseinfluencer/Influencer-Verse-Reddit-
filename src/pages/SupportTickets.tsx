import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MessageSquare, CheckCircle, ShieldAlert, Clock, Send, Ticket, ArrowUpRight } from 'lucide-react';
import { AccountSidebar } from '../components/AccountSidebar';

interface SupportTicketsProps {
  onNavigate: (page: string) => void;
}

export const SupportTickets: React.FC<SupportTicketsProps> = ({ onNavigate }) => {
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 select-none" id="support-tickets-panel">
      
      {/* Title Header */}
      <div className="space-y-1.5 pb-4 border-b border-gray-200">
        <span className="text-xs text-purple-600 font-bold uppercase tracking-widest block mb-1">Creators Helpdesk</span>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">{isAdmin ? 'Admin Support Ticket Center' : 'Support Tickets'}</h1>
        <p className="text-sm text-gray-500 font-medium">Open secure dialogue tickets directly to our administrators desk</p>
      </div>

      {/* Main Account Area with AccountSidebar nesting */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Sidebar Left Column */}
        <AccountSidebar activeTab="tickets" onNavigate={onNavigate} />

        {/* Support Grid right column */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
          
          {/* Sub block: Open ticket and list tickets */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Create new ticket Form block - Only relevant for standard creators */}
            {!isAdmin && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <span className="text-[10px] text-purple-600 font-bold uppercase block mb-1 tracking-wider">Need help?</span>
                <h3 className="text-sm font-bold text-gray-900 mb-4">Open Support Ticket</h3>

                {success && (
                  <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs rounded-xl flex items-center gap-2 mb-4 font-semibold">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" /> Support ticket created!
                  </div>
                )}

                <form onSubmit={handleCreateTicket} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5">Ticket Category</label>
                    <select 
                      value={ticketCategory}
                      onChange={(e: any) => setTicketCategory(e.target.value)}
                      className="w-full text-xs text-gray-900 bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 focus:outline-none cursor-pointer font-medium"
                    >
                      <option value="Tasks">Tasks & Campaigns</option>
                      <option value="Billing">Billing & Wallet</option>
                      <option value="Account">Account Verification</option>
                      <option value="Technical">Technical Error</option>
                      <option value="Other">Other Issues</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5">Subject Topic</label>
                    <input 
                      type="text" 
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="e.g. My task was wrongly rejected" 
                      className="w-full text-xs text-gray-900 bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 focus:outline-none font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5">Message Description</label>
                    <textarea 
                      value={ticketMsg}
                      onChange={(e) => setTicketMsg(e.target.value)}
                      placeholder="Describe your issue with task number if relevant" 
                      className="w-full text-xs text-gray-900 bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl h-24 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 focus:outline-none font-medium resize-none"
                      required
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-xs font-bold text-white rounded-xl shadow-md cursor-pointer transition-all active:scale-98"
                  >
                    Broadcast Ticket Setup
                  </button>
                </form>
              </div>
            )}

            {/* Ticket lists card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Support Tickets ({visibleTickets.length})</h3>

              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {visibleTickets.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs font-medium font-sans">
                    You have no active support tickets.
                  </div>
                ) : (
                  visibleTickets.map((t) => (
                    <button 
                      key={t.id}
                      onClick={() => setActiveTicketId(t.id)}
                      className={`w-full p-3 border rounded-xl text-left transition-all block group cursor-pointer ${
                        activeTicketId === t.id 
                          ? 'bg-purple-50/70 border-purple-200 shadow-sm' 
                          : 'bg-white border-gray-200 hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-gray-900 block group-hover:text-purple-600 truncate max-w-[150px]">{t.subject}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                          t.status === 'Open' ? 'bg-amber-100 text-amber-800' : 
                          t.status === 'In Progress' ? 'bg-blue-100 text-blue-805 animate-pulse' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-[9px] text-gray-400 font-bold select-text">
                        <span>Ref ID: <strong className="font-mono text-gray-500">{t.id}</strong></span>
                        <span>Category: {t.category}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right active messaging thread */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[500px]">
                
                {/* Thread header */}
                <div className="border-b border-gray-100 pb-4 mb-4 flex justify-between items-start">
                  <div className="space-y-1 select-text">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block tracking-wider">Support Dialogue Channel ({selectedTicket.category})</span>
                    <h3 className="text-base font-bold text-gray-900">{selectedTicket.subject}</h3>
                    <p className="text-[10px] text-gray-405 font-medium">Created by {selectedTicket.userFullName} on {new Date(selectedTicket.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[9px] font-mono bg-gray-50 px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-500 select-text">ID: {selectedTicket.id}</span>
                  </div>
                </div>

                {/* Chat replies list */}
                <div className="flex-1 space-y-4 max-h-[350px] overflow-y-auto mb-4 p-3 bg-gray-50/50 border border-gray-100 rounded-2xl select-text">
                  {selectedTicket.messages.map((msg, idx) => {
                    const sideStyle = msg.sender === 'admin' 
                      ? 'mr-auto bg-purple-50/80 border-purple-100 text-left' 
                      : 'ml-auto bg-white border-gray-200 text-left shadow-sm';
                    return (
                      <div 
                        key={idx} 
                        className={`max-w-md p-3.5 border rounded-2xl text-xs space-y-1 block ${sideStyle}`}
                      >
                        <div className="flex justify-between items-center gap-6 text-[9px] font-bold uppercase tracking-wider mb-1.5 select-none">
                          <span className={msg.sender === 'admin' ? 'text-purple-600' : 'text-gray-405'}>
                            {msg.sender === 'admin' ? '📢 ADMINISTRATOR' : 'CREATOR AUTHOR'}
                          </span>
                          <span className="text-gray-400 text-[8px] font-sans font-medium">
                            {new Date(msg.timestamp).toLocaleDateString()} {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                          </span>
                        </div>
                        <p className="leading-relaxed font-medium text-gray-700">{msg.text}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendReply} className="pt-4 border-t border-gray-100 flex gap-2 select-none">
                  <input 
                    type="text" 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your response to the helpdesk dialogue thread..." 
                    className="flex-1 text-xs text-gray-900 bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 focus:outline-none font-medium"
                    required
                  />
                  <button 
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-xs font-bold rounded-xl text-white transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
                  >
                    Send <Send className="w-3.5 h-3.5 ml-1.5" />
                  </button>
                </form>

              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-center items-center text-center min-h-[500px] select-none">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-4">
                  <Ticket className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Select a Support Ticket</h3>
                <p className="text-gray-500 text-xs max-w-sm mt-1.5 leading-relaxed font-semibold">Click any support ticket reference in the left sidebar list to check replies and write responses.</p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
