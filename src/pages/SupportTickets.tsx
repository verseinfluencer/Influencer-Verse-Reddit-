import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  MessageSquare, CheckCircle, ShieldAlert, Clock, Send, Ticket, 
  ArrowUpRight, Trash2, XCircle, RotateCcw, UserCheck, Check, Sliders 
} from 'lucide-react';
import { AccountSidebar } from '../components/AccountSidebar';
import { SupportTicket } from '../types';

interface SupportTicketsProps {
  onNavigate: (page: string) => void;
}

export const SupportTickets: React.FC<SupportTicketsProps> = ({ onNavigate }) => {
  const { 
    currentUser, 
    tickets, 
    users,
    createTicket, 
    replyToTicket,
    closeTicket,
    reopenTicket,
    deleteTicket,
    changeTicketStatus,
    assignModerator
  } = useApp();

  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMsg, setTicketMsg] = useState('');
  const [ticketCategory, setTicketCategory] = useState<'Billing' | 'Tasks' | 'Account' | 'Technical' | 'Other'>('Tasks');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [success, setSuccess] = useState(false);

  // Custom confirmation modal states to prevent default window.confirm blockings
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);
  const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null);

  if (!currentUser) return null;

  const isStaff = currentUser.role === 'admin' || currentUser.role === 'moderator';
  const isAdmin = currentUser.role === 'admin';
  const isModerator = currentUser.role === 'moderator';

  // Filter visible tickets (Admin can see soft-deleted to permanently purge)
  const visibleTickets = tickets.filter(t => {
    if (t.deleted) {
      return isAdmin; // Only admin sees soft-deleted trash tickets
    }
    return isStaff || t.userId === currentUser.id;
  });

  const selectedTicket = tickets.find(t => t.id === activeTicketId);

  // Find all available moderators and admins for dynamic assignment lists
  const staffMembers = users.filter(u => u.role === 'admin' || u.role === 'moderator');

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMsg) return;

    createTicket(ticketSubject, ticketCategory, ticketMsg);
    setTicketSubject('');
    setTicketMsg('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3500);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicketId || !selectedTicket) return;

    // Check if Closed
    if (selectedTicket.status === 'Closed') return;

    replyToTicket(activeTicketId, replyText.trim(), isStaff ? 'admin' : 'user');
    setReplyText('');
  };

  // Close ticket trigger
  const handleCloseTicket = async (ticketId: string) => {
    setConfirmCloseId(null);
    let roleName = 'Creator';
    if (isAdmin) roleName = 'Admin';
    else if (isModerator) roleName = 'Moderator';

    await closeTicket(ticketId, roleName, currentUser.fullName || currentUser.email);
  };

  // Delete ticket trigger
  const handleDeleteTicket = async () => {
    if (!confirmDeleteId) return;
    await deleteTicket(confirmDeleteId, !isPermanentDelete);
    if (activeTicketId === confirmDeleteId) {
      setActiveTicketId(null);
    }
    setConfirmDeleteId(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 select-none" id="support-tickets-panel">
      
      {/* Title Header */}
      <div className="space-y-1.5 pb-4 border-b border-[#E5E7EB]">
        <span className="text-xs text-purple-600 font-bold uppercase tracking-widest block mb-1">Helpdesk Control Hub</span>
        <h1 className="text-2xl md:text-3xl font-bold text-[#111827] tracking-tight">Support Tickets & Resolution</h1>
        <p className="text-sm text-[#4B5563] font-medium">Create support requests, set priorities, assign moderators, and inspect service histories interactively.</p>
      </div>

      {/* Main Grid area with AccountSidebar */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Sidebar Left Column */}
        <AccountSidebar activeTab="tickets" onNavigate={onNavigate} />

        {/* Support Grid right column */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
          
          {/* Sub block: Open ticket and list tickets */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Create new ticket Form block - Only relevant for standard creators */}
            {!isStaff && (
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm">
                <span className="text-[10px] text-purple-600 font-bold uppercase block mb-1 tracking-wider">Need assistance?</span>
                <h3 className="text-sm font-bold text-[#111827] mb-4">Open Support Ticket</h3>

                {success && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 mb-4 font-semibold">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" /> Support ticket created!
                  </div>
                )}

                <form onSubmit={handleCreateTicket} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="text-[10px] text-[#4B5563] font-bold uppercase tracking-wider block mb-1.5">Ticket Category</label>
                    <select 
                      value={ticketCategory}
                      onChange={(e: any) => setTicketCategory(e.target.value)}
                      className="w-full text-xs text-[#111827] bg-white border border-[#E5E7EB] px-3.5 py-2.5 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 focus:outline-none cursor-pointer font-medium"
                    >
                      <option value="Tasks">Tasks & Campaigns</option>
                      <option value="Billing">Billing & Wallet</option>
                      <option value="Account">Account Verification</option>
                      <option value="Technical">Technical Error</option>
                      <option value="Other">Other Issues</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#4B5563] font-bold uppercase tracking-wider block mb-1.5">Subject Topic</label>
                    <input 
                      type="text" 
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="e.g. My task verification is pending" 
                      className="w-full text-xs text-[#111827] bg-white border border-[#E5E7EB] px-3.5 py-2.5 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 focus:outline-none font-medium text-gray-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-[#4B5563] font-bold uppercase tracking-wider block mb-1.5">Message Description</label>
                    <textarea 
                      value={ticketMsg}
                      onChange={(e) => setTicketMsg(e.target.value)}
                      placeholder="Describe your issue with helpful details" 
                      className="w-full text-xs text-[#111827] bg-white border border-[#E5E7EB] px-3.5 py-2.5 rounded-xl h-24 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 focus:outline-none font-medium resize-none text-gray-900"
                      required
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-xs font-bold text-white rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                  >
                    Create Support Ticket
                  </button>
                </form>
              </div>
            )}

            {/* Ticket lists card */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-[#111827]">
                  {isStaff ? 'Administrative Tickets' : 'Your Tickets'} ({visibleTickets.length})
                </h3>
                {isStaff && (
                  <span className="text-[9px] bg-purple-50 border border-purple-200 text-purple-700 uppercase font-black px-2 py-0.5 rounded-full select-none">
                    {isModerator ? 'Moderator View' : 'Admin View'}
                  </span>
                )}
              </div>

              <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                {visibleTickets.length === 0 ? (
                  <div className="text-center py-8 text-[#6B7280] text-xs font-medium font-sans">
                    No active support tickets found corresponding to this view.
                  </div>
                ) : (
                  visibleTickets.map((t) => {
                    const isSelected = activeTicketId === t.id;
                    return (
                      <button 
                        key={t.id}
                        onClick={() => setActiveTicketId(t.id)}
                        className={`w-full p-3.5 border rounded-xl text-left transition-all block group cursor-pointer ${
                          isSelected 
                            ? 'bg-purple-50/50 border-purple-200 shadow-sm' 
                            : 'bg-white border-[#E5E7EB] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1.5 gap-2">
                          <span className={`text-xs font-bold block truncate max-w-[140px] ${isSelected ? 'text-purple-700' : 'text-[#111827] group-hover:text-purple-600'}`}>{t.subject}</span>
                          <div className="flex shrink-0 items-center gap-1">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider block ${
                              t.status === 'Open' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 
                              t.status === 'In Progress' ? 'bg-blue-100 text-blue-805 border border-blue-200 animate-pulse' :
                              t.status === 'Awaiting Response' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                              t.status === 'Closed' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                              'bg-gray-100 text-[#4B5563]'
                            }`}>
                              {t.status}
                            </span>
                            {t.deleted && (
                              <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase bg-red-100 text-red-800 border border-red-200 block shrink-0">
                                Trash
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between text-[9px] text-[#6B7280] font-bold select-text">
                          <span>Ref ID: <strong className="font-mono text-[#4B5563]">{t.id.substring(t.id.length - 8)}</strong></span>
                          <span>Category: {t.category}</span>
                        </div>
                        {isStaff && (
                          <div className="text-[9px] text-purple-750 font-bold border-t border-dashed border-purple-100 mt-1.5 pt-1 flex justify-between select-text">
                            <span>Creator: {t.userFullName || 'N/A'}</span>
                            {t.assignedModeratorName && (
                              <span className="text-emerald-700">Assigned: {t.assignedModeratorName}</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Right active messaging thread / details */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[580px] space-y-6">
                
                {/* Thread Header with metadata */}
                <div className="border-b border-[#E5E7EB] pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="space-y-1.5 select-text flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-150 font-bold uppercase px-2 py-0.5 rounded-full tracking-wider block">
                        Category: {selectedTicket.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                        selectedTicket.status === 'Open' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 
                        selectedTicket.status === 'In Progress' ? 'bg-blue-105 text-blue-800 border border-blue-200 animate-pulse' :
                        selectedTicket.status === 'Awaiting Response' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                        'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {selectedTicket.status}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-[#111827]">{selectedTicket.subject}</h3>
                    <p className="text-[10px] text-[#6B7280] font-medium leading-relaxed">
                      Created by <strong className="text-gray-900 font-black">{selectedTicket.userFullName}</strong> on {new Date(selectedTicket.createdAt).toLocaleDateString()} {new Date(selectedTicket.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                    </p>
                  </div>
                  
                  {/* Action buttons panel tailored by role permissions */}
                  <div className="flex flex-wrap gap-2 shrink-0 select-none">
                    
                    {/* User close button or Staff toggle buttons */}
                    {selectedTicket.status !== 'Closed' ? (
                      <button 
                        onClick={() => setConfirmCloseId(selectedTicket.id)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Close Ticket
                      </button>
                    ) : (
                      isStaff && (
                        <button 
                          onClick={() => reopenTicket(selectedTicket.id)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 text-emerald-800 text-[10px] font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5 font-bold" /> Reopen Ticket
                        </button>
                      )
                    )}

                    {/* Creator delete option: allowed ONLY before staff replies */}
                    {!isStaff ? (
                      selectedTicket.messages.filter(m => m.sender === 'admin').length === 0 && (
                        <button 
                          onClick={() => {
                            setConfirmDeleteId(selectedTicket.id);
                            setIsPermanentDelete(false);
                          }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-[10px] font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 h-fit"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Ticket
                        </button>
                      )
                    ) : (
                      /* Moderator Action Delete button */
                      isModerator ? (
                        <button 
                          onClick={() => {
                            setConfirmDeleteId(selectedTicket.id);
                            setIsPermanentDelete(false);
                          }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-[10px] font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 h-fit"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Ticket (Trash)
                        </button>
                      ) : (
                        /* Admin Permanent Delete button */
                        isAdmin && (
                          <button 
                            onClick={() => {
                              setConfirmDeleteId(selectedTicket.id);
                              // Admins can permanently delete, but can also soft-delete
                              setIsPermanentDelete(true);
                            }}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 h-fit shadow"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-white" /> Purge Permanently
                          </button>
                        )
                      )
                    )}

                    <span className="text-[9px] font-mono bg-[#F8FAFC] px-2 py-1.5 border border-[#E5E7EB] text-[#6B7280] select-text rounded-lg block h-fit">
                      ID: {selectedTicket.id.substring(selectedTicket.id.length - 8)}
                    </span>
                  </div>
                </div>

                {/* Staff-only configuration options details segment */}
                {isStaff && (
                  <div className="bg-purple-50/40 border border-purple-100/70 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-gray-800">
                    
                    {/* Status Changer field */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-[#6B7280] font-black block tracking-wider">Change Status (Priority)</label>
                      <div className="flex gap-1.5 items-center">
                        <select 
                          value={selectedTicket.status}
                          onChange={async (e) => await changeTicketStatus(selectedTicket.id, e.target.value as any)}
                          className="text-xs bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 cursor-pointer w-full font-semibold"
                        >
                          <option value="Open">🟢 Open</option>
                          <option value="In Progress">🔵 In Progress</option>
                          <option value="Awaiting Response">🟣 Awaiting Response</option>
                          <option value="Closed">🔴 Closed</option>
                        </select>
                      </div>
                    </div>

                    {/* Moderator Assignment field */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-[#6B7280] font-black block tracking-wider">Assign Handler Staff</label>
                      <div>
                        {isAdmin ? (
                          <select 
                            value={selectedTicket.assignedModeratorId || ''}
                            onChange={async (e) => {
                              const chosenId = e.target.value;
                              const chosenMember = staffMembers.find(st => st.id === chosenId);
                              if (chosenMember) {
                                await assignModerator(selectedTicket.id, chosenMember.id, chosenMember.fullName || chosenMember.email);
                              } else {
                                await assignModerator(selectedTicket.id, '', '');
                              }
                            }}
                            className="text-xs bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 cursor-pointer w-full font-semibold"
                          >
                            <option value="">-- Unassigned --</option>
                            {staffMembers.map(st => (
                              <option key={st.id} value={st.id}>
                                {st.fullName || st.email} ({st.role.toUpperCase()})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-purple-900 px-2.5 py-1.5 block bg-white border border-[#E5E7EB] rounded-lg">
                            {selectedTicket.assignedModeratorName 
                              ? `Assigned: ${selectedTicket.assignedModeratorName}` 
                              : '🔴 Unassigned (Admin Action Only)'
                            }
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                )}

                {/* Ticket Timeline and Original Description details block */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4.5 space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-purple-600" /> Ticket Lifecycle History
                  </h4>
                  <div className="relative pl-5 border-l border-purple-250/50 space-y-3.5 text-[11px] font-sans font-semibold text-slate-600">
                    
                    {/* Event 1 - Creation */}
                    <div className="relative">
                      <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-50"></div>
                      <div className="text-slate-800 font-bold">Ticket Opened</div>
                      <div className="text-[10px] text-slate-505 select-text font-medium">By {selectedTicket.userFullName} at {new Date(selectedTicket.createdAt).toLocaleString()}</div>
                      <div className="bg-white border border-slate-200/50 rounded-lg p-2.5 mt-2 text-xs italic text-slate-700 leading-relaxed font-semibold shadow-xs select-text">
                        "{selectedTicket.description}"
                      </div>
                    </div>

                    {/* Event 2 - Staff Assignment */}
                    {selectedTicket.assignedModeratorName && (
                      <div className="relative">
                        <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-slate-50"></div>
                        <div className="text-slate-850 font-bold">Representative In Charge</div>
                        <div className="text-[10px] text-indigo-755 font-medium">Assigned to: <strong className="text-indigo-600 font-black">{selectedTicket.assignedModeratorName}</strong></div>
                      </div>
                    )}

                    {/* Event 3 - Active state */}
                    <div className="relative">
                      <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-slate-50"></div>
                      <div className="text-slate-850 font-bold">Current Status Badge</div>
                      <div className="text-[10px] text-slate-500">Ticket Priority Level categorized as: <span className="text-blue-700 font-black uppercase text-[10px]">{selectedTicket.status}</span></div>
                    </div>

                    {/* Event 4 - Closed state */}
                    {selectedTicket.closedAt && (
                      <div className="relative">
                        <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-slate-50 animate-pulse"></div>
                        <div className="text-slate-850 font-bold text-rose-800">Ticket Terminated</div>
                        <div className="text-[10px] text-rose-700 font-semibold leading-normal">
                          Closed at {new Date(selectedTicket.closedAt).toLocaleString()} by <strong className="text-rose-900 font-black">{selectedTicket.closedBy || 'Staff'}</strong>
                        </div>
                      </div>
                    )}

                    {/* Event 5 - Soft Deleted (Only visible to admin) */}
                    {selectedTicket.deleted && (
                      <div className="relative">
                        <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-red-600 border-2 border-slate-50"></div>
                        <div className="text-slate-850 font-bold text-red-600">Soft Deleted (In Admin Recycler)</div>
                        <div className="text-[10px] text-rose-700 font-medium">
                          Trash timestamped on {selectedTicket.deletedAt ? new Date(selectedTicket.deletedAt).toLocaleString() : 'N/A'}
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Conversation Trail thread block */}
                <div className="space-y-3.5 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase text-[#6B7280] tracking-widest leading-none mb-1">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-600 shrink-0" /> Conversation Dialogue Channels ({selectedTicket.messages.length} replies)
                  </div>
                  
                  <div className="space-y-4 max-h-[280px] overflow-y-auto p-3.5 bg-gray-50 border border-gray-250/60 rounded-2xl select-text">
                    {selectedTicket.messages.length === 0 ? (
                      <div className="text-center py-10 text-[#6B7280] font-semibold text-xs italic">
                        No messages in this dialogue sequence yet. Enter a message below to start conversation.
                      </div>
                    ) : (
                      selectedTicket.messages.map((msg, idx) => {
                        const sideStyle = msg.sender === 'admin' 
                          ? 'mr-auto bg-purple-50 border-purple-100 text-left' 
                          : 'ml-auto bg-white border-[#E5E7EB] text-left shadow-sm';
                        return (
                          <div 
                            key={idx} 
                            className={`max-w-md p-3.5 border rounded-2xl text-xs space-y-1 block ${sideStyle}`}
                          >
                            <div className="flex justify-between items-center gap-10 text-[9px] font-black uppercase tracking-wider mb-2 select-none">
                              <span className={msg.sender === 'admin' ? 'text-purple-700 font-black' : 'text-[#6B7280] font-bold'}>
                                {msg.sender === 'admin' ? '📢 STAFF REPRESENTATIVE' : 'CREATOR AUTHOR'}
                              </span>
                              <span className="text-[#6B7280] text-[8px] font-medium font-sans block">
                                {new Date(msg.timestamp).toLocaleDateString()} {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                              </span>
                            </div>
                            <p className="leading-relaxed font-semibold text-[#4B5563] whitespace-pre-wrap select-text">{msg.text}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Reply Form Block - Read-Only notice of closed support tickets */}
                {selectedTicket.status === 'Closed' ? (
                  <div className="p-4 bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl text-center flex flex-col items-center justify-center gap-2 font-black text-xs select-none shadow-xs">
                    <span className="text-rose-600 select-none block uppercase font-black tracking-widest text-[10px]">⚠️ READ-ONLY CHAT CHANNEL</span>
                    <span>This support ticket has been closed. Standard dialogue input functions are currently disabled.</span>
                    {isStaff && (
                      <button 
                        onClick={() => reopenTicket(selectedTicket.id)}
                        className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-white font-bold" /> Reopen to continue conversation
                      </button>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSendReply} className="pt-4 border-t border-[#E5E7EB] flex gap-2 select-none">
                    <input 
                      type="text" 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your response to the helpdesk dialogue thread..." 
                      className="flex-1 text-xs text-[#111827] bg-white border border-[#E5E7EB] px-3.5 py-2.5 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 focus:outline-none font-semibold text-gray-900 placeholder:text-gray-400 placeholder:font-medium"
                      required
                    />
                    <button 
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-xs font-black rounded-xl text-white transition-all cursor-pointer flex items-center justify-center shrink-0 shadow hover:-translate-y-0.5 active:translate-y-0"
                    >
                      Send <Send className="w-3.5 h-3.5 ml-1.5" />
                    </button>
                  </form>
                )}

              </div>
            ) : (
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex flex-col justify-center items-center text-center min-h-[580px] lg:min-h-[500px] select-none">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-4">
                  <Ticket className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-sm font-bold text-[#111827]">Select a Support Ticket</h3>
                <p className="text-[#4B5563] text-xs max-w-sm mt-1.5 leading-relaxed font-semibold">Click any support ticket reference in the left sidebar list to inspect resolution trails and write replies.</p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* CUSTOM OVERLAY DIALOGS/CONFIRMATIONS */}
      {/* 1. Close ticket inline dialog confirmation modal */}
      {confirmCloseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs select-none">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4 space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-amber-500" /> Confirm Close Request
            </h3>
            <p className="text-xs text-[#55606B] font-semibold leading-relaxed">
              Are you sure you want to close this ticket? It will become read-only and close down live dialogue options until manually reopened by a staff member.
            </p>
            <div className="flex justify-end gap-2 text-xs font-bold pt-2">
              <button 
                onClick={() => setConfirmCloseId(null)}
                className="px-4 py-2 border border-[#E5E7EB] text-[#4B5563] bg-white hover:bg-slate-50 transition-colors rounded-xl cursor-pointer"
              >
                No, Keep Open
              </button>
              <button 
                onClick={() => handleCloseTicket(confirmCloseId)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white transition-colors rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                Yes, Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Delete ticket inline dialog confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs select-none">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4 space-y-4">
            <h3 className="text-base font-black text-rose-800 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" /> Verify Delete Operation
            </h3>
            <p className="text-xs text-[#55606B] font-semibold leading-relaxed">
              {isPermanentDelete 
                ? 'Warning! This operates as an IRREVERSIBLE permanent delete. This deletes the ticket record from the database archives instantly.'
                : 'Are you sure you want to delete this ticket? Standard users will lose access, but administrators retain visibility inside their recycling panel.'
              }
            </p>
            <div className="flex justify-end gap-2 text-xs font-bold pt-2">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 border border-[#E5E7EB] text-[#4B5563] bg-white hover:bg-slate-50 transition-colors rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteTicket}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white transition-colors rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {isPermanentDelete ? 'Delete Permanently' : 'Delete Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
