import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Building, User, Coins, FileText, Send, CheckCheck, 
  MessageSquare, History, PlusCircle, LayoutGrid, CheckCircle, 
  XCircle, Clock, AlertTriangle, ExternalLink, RefreshCw 
} from 'lucide-react';

export const ClientDashboard: React.FC = () => {
  const { 
    currentClient, 
    clientTasks, 
    clientPayments, 
    clientChats,
    clientCreateTask,
    clientReviewTaskSubmission,
    clientSendMessage,
    settings,
    clients
  } = useApp();

  // Find fresh client dynamic record to preserve budget, balance, block states
  const clientRecord = clients.find(c => c.id === currentClient?.id) || currentClient;

  // Tabs
  const [activeTab, setActiveTab] = useState<'campaigns' | 'upload' | 'support' | 'payments'>('campaigns');

  // Launch form states
  const [taskType, setTaskType] = useState<'Reddit Post Task' | 'Reddit Comment Task'>('Reddit Post Task');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [targetSubreddit, setTargetSubreddit] = useState('');
  const [postUrlToCommentOn, setPostUrlToCommentOn] = useState('');
  const [guidelines, setGuidelines] = useState('');
  const [deadline, setDeadline] = useState('24 hours');
  const [notes, setNotes] = useState('');
  const [agencyPay, setAgencyPay] = useState('');

  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Proof Review states
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, string>>({});
  const [reviewActionSuccess, setReviewActionSuccess] = useState<Record<string, string>>({});

  // Chat message state
  const [typedMessage, setTypedMessage] = useState('');

  const handleLaunchTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');

    if (!taskTitle || !taskDescription || !guidelines || !agencyPay) {
      setUploadError('Please fill out all mandatory fields prior to campaign submission.');
      return;
    }

    const payNum = parseFloat(agencyPay);
    if (isNaN(payNum) || payNum <= 0) {
      setUploadError('Agency pay must be a valid positive amount.');
      return;
    }

    try {
      await clientCreateTask({
        type: taskType,
        title: taskTitle,
        description: taskDescription,
        targetSubreddit: taskType === 'Reddit Post Task' ? targetSubreddit : undefined,
        postUrlToCommentOn: taskType === 'Reddit Comment Task' ? postUrlToCommentOn : undefined,
        guidelines,
        deadline,
        notes,
        agencyPay: payNum
      });

      setUploadSuccess('Campaign uploaded successfully under pending verification review!');
      // reset
      setTaskTitle('');
      setTaskDescription('');
      setTargetSubreddit('');
      setPostUrlToCommentOn('');
      setGuidelines('');
      setNotes('');
      setAgencyPay('');
    } catch (err: any) {
      setUploadError(err?.message || 'Error occurred while creating task campaign.');
    }
  };

  const handleReviewSubmission = async (taskId: string, action: 'Approve' | 'RequestRevision' | 'Reject') => {
    const feedback = reviewFeedback[taskId] || '';
    if (action !== 'Approve' && !feedback.trim()) {
      alert('Please fill out a response note for revision or rejection feedback.');
      return;
    }

    try {
      await clientReviewTaskSubmission(taskId, action, feedback);
      setReviewActionSuccess(prev => ({ ...prev, [taskId]: `Claim submission status updated: ${action}!` }));
      setReviewFeedback(prev => ({ ...prev, [taskId]: '' }));
    } catch (err: any) {
      alert(`Review action failure: ${err?.message}`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    try {
      await clientSendMessage(typedMessage);
      setTypedMessage('');
    } catch (err: any) {
      alert(`Chat send failure: ${err?.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'text-green-400 bg-green-950/30 border border-green-900/60';
      case 'pending': return 'text-amber-400 bg-amber-950/30 border border-amber-900/60';
      case 'claimed': return 'text-indigo-400 bg-indigo-950/30 border border-indigo-900/60';
      case 'submitted': return 'text-sky-400 bg-sky-950/30 border border-sky-900/60';
      case 'completed': return 'text-emerald-400 bg-emerald-950/30 border border-emerald-900/60';
      case 'revision': return 'text-violet-400 bg-violet-950/30 border border-violet-900/60';
      case 'removed': return 'text-red-400 bg-red-950/30 border border-red-900/60';
      default: return 'text-neutral-400 bg-neutral-950/50 border border-neutral-800';
    }
  };

  if (!clientRecord) {
    return (
      <div className="max-w-md mx-auto my-16 text-center text-white">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Unauthenticated</h2>
        <p className="text-neutral-400 text-sm mt-1">Please login as a client to manage details.</p>
      </div>
    );
  }

  // Filter tasks specific to this client
  const myTasks = clientTasks.filter(t => t.clientId === clientRecord.id);
  const myPayments = clientPayments.filter(p => p.clientId === clientRecord.id);
  
  // Find chat thread
  const chatThread = clientChats.find(chat => chat.clientId === clientRecord.id);

  return (
    <div className="max-w-7xl mx-auto my-8 px-4 text-white">
      {/* Top Banner Context */}
      <div id="client_header_box" className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 mb-8 items-center shadow-lg">
        <div className="md:col-span-2 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center font-extrabold text-2xl tracking-tight text-white border border-indigo-400 shadow-md shadow-indigo-950 shrink-0">
            {clientRecord.company.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-sans tracking-tight">{clientRecord.company}</h1>
              <span className="px-2.5 py-0.5 bg-green-950 text-green-400 border border-green-900 text-[10px] rounded-full font-bold uppercase tracking-wider">
                Active Partnership
              </span>
            </div>
            <p className="text-sm text-neutral-400 font-sans mt-0.5 flex items-center gap-1">
              <User className="w-4 h-4 text-indigo-400" />
              <span>Contact Person: <strong>{clientRecord.name}</strong> • <strong>{clientRecord.gmail}</strong></span>
            </p>
          </div>
        </div>

        <div className="bg-neutral-950/80 p-5 rounded-2xl border border-neutral-800 flex flex-col justify-between h-full shadow-inner">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Unpaid Outstanding Dues</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-3xl font-extrabold font-mono tracking-tight text-white">
              ${(clientRecord.payAgencyBalance || 0).toFixed(2)}
              <span className="text-xs font-semibold text-neutral-500 font-sans ml-1">USDT</span>
            </div>
            <p className="text-[10px] text-neutral-500 mt-1 leading-normal font-sans">
              *Your agency balance compiles as tasks complete. Invoiced periodic payments reset this amount.
            </p>
          </div>
        </div>
      </div>

      {/* Main Unified Navigation tabs */}
      <div className="flex border-b border-neutral-800 mb-8 overflow-x-auto gap-4 scrollbar-none">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`pb-4 px-2 flex items-center gap-2 border-b-2 text-sm font-semibold tracking-wide whitespace-nowrap transition cursor-pointer ${
            activeTab === 'campaigns' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <LayoutGrid className="w-4.5 h-4.5" />
          <span>Completed & Live Campaigns ({myTasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`pb-4 px-2 flex items-center gap-2 border-b-2 text-sm font-semibold tracking-wide whitespace-nowrap transition cursor-pointer ${
            activeTab === 'upload' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <PlusCircle className="w-4.5 h-4.5" />
          <span>Upload Campaign Task</span>
        </button>

        <button
          onClick={() => setActiveTab('support')}
          className={`pb-4 px-2 flex items-center gap-2 border-b-2 text-sm font-semibold tracking-wide whitespace-nowrap transition cursor-pointer ${
            activeTab === 'support' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4.5 h-4.5" />
          <span>Support Chat Inbox</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-4 px-2 flex items-center gap-2 border-b-2 text-sm font-semibold tracking-wide whitespace-nowrap transition cursor-pointer ${
            activeTab === 'payments' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <History className="w-4.5 h-4.5" />
          <span>Receipt Payments History ({myPayments.length})</span>
        </button>
      </div>

      {/* Render Dynamic TAB content area */}
      <div id="client_dashboard_tab_panel" className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 min-h-[400px]">

        {/* 1. CAMPAIGNS TAB */}
        {activeTab === 'campaigns' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold font-sans tracking-tight mb-2">Campaign Action Center</h2>
              <p className="text-neutral-400 text-xs">Review submissions uploaded by verified members, approve satisfactory results or request timely revisions.</p>
            </div>

            {/* Submissions Requiring verification Review Box */}
            <div className="bg-neutral-950 rounded-2xl border border-neutral-850 p-4 sm:p-6 shadow-inner">
              <h3 className="text-sm font-bold uppercase text-neutral-400 tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-amber-500" />
                <span>Pending Member Submissions ({myTasks.filter(t => t.status === 'submitted' || t.status === 'claimed' || t.status === 'revision').length})</span>
              </h3>

              {myTasks.filter(t => t.status === 'submitted').length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-sm">
                  No member proofs currently pending your approval check. 🎉
                </div>
              ) : (
                <div className="space-y-6">
                  {myTasks.filter(t => t.status === 'submitted').map(task => (
                    <div key={task.id} className="p-5 bg-neutral-900 rounded-xl border border-neutral-850 flex flex-col md:flex-row justify-between gap-6">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`${getStatusColor(task.status)} px-2.5 py-0.5 rounded text-[10px] font-bold uppercase`}>
                            {task.status}
                          </span>
                          <span className="text-xs text-neutral-500 font-mono">ID: {task.id}</span>
                        </div>
                        <h4 className="text-base font-bold text-white leading-tight">{task.title}</h4>
                        
                        <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-xs text-neutral-300">
                          <strong>Member Submission Proof URL:</strong> <br />
                          <a 
                            href={task.proofLink || '#'} 
                            target="_blank" 
                            rel="referrer noreferrer" 
                            className="text-indigo-400 hover:underline flex items-center gap-1 font-mono mt-1 w-fit"
                          >
                            <span>{task.proofLink || 'N/A'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      <div className="md:w-80 shrink-0 space-y-3">
                        <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                          Revision / Rejection note: (Required if not approving)
                        </label>
                        <textarea
                          placeholder="Include comments guiding edits..."
                          value={reviewFeedback[task.id] || ''}
                          onChange={(e) => setReviewFeedback(prev => ({ ...prev, [task.id]: e.target.value }))}
                          rows={2}
                          className="w-full p-2.5 bg-neutral-950 text-white rounded-lg border border-neutral-800 text-xs font-sans resize-none placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                        />

                        {reviewActionSuccess[task.id] && (
                          <div className="text-xs text-green-400 font-medium">✨ {reviewActionSuccess[task.id]}</div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReviewSubmission(task.id, 'Approve')}
                            className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white rounded-lg transition"
                          >
                            Approve & Credit
                          </button>
                          <button
                            onClick={() => handleReviewSubmission(task.id, 'RequestRevision')}
                            className="py-1.5 px-3 bg-violet-600 hover:bg-violet-500 font-bold text-xs text-white rounded-lg transition"
                          >
                            Revise
                          </button>
                          <button
                            onClick={() => handleReviewSubmission(task.id, 'Reject')}
                            className="py-1.5 px-3 bg-red-600 hover:bg-red-500 font-bold text-xs text-white rounded-lg transition"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Campaign Statistics Overview list */}
            <div>
              <h3 className="text-sm font-bold uppercase text-neutral-400 tracking-wider mb-4">
                Total Campaign Submissions History
              </h3>
              {myTasks.length === 0 ? (
                <div className="text-center py-10 bg-neutral-950 rounded-2xl border border-neutral-800 text-neutral-500 text-sm">
                  You haven't uploaded any campaign tasks yet. Ready to get started?
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-neutral-850 text-neutral-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Task Details</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Agency Pay</th>
                        <th className="py-3 px-4 text-right">Calculated Member Reward</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850">
                      {myTasks.map(t => (
                        <tr key={t.id} className="hover:bg-neutral-950/40 transition">
                          <td className="py-4 px-4">
                            <div className="font-bold text-white text-sm">{t.title}</div>
                            <div className="text-xs text-neutral-500 font-mono mt-0.5">Subreddit: {t.targetSubreddit || t.postUrlToCommentOn || 'N/A'}</div>
                          </td>
                          <td className="py-4 px-4 text-xs font-semibold text-neutral-400">{t.type}</td>
                          <td className="py-4 px-4 text-center">
                            <span className={`${getStatusColor(t.status)} px-2.5 py-0.5 rounded text-[10px] font-bold uppercase`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-white">${t.agencyPay.toFixed(2)}</td>
                          <td className="py-4 px-4 text-right font-mono text-indigo-400 font-bold">
                            {t.memberPay ? `$${t.memberPay.toFixed(2)}` : 'Calculating...'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* 2. UPLOAD CAMPAIGN TAB */}
        {activeTab === 'upload' && (
          <div className="max-w-3xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold font-sans tracking-tight mb-2">Deploy New Campaign Task</h2>
              <p className="text-neutral-400 text-xs">Complete core fields to launch a new mission directly to standard influencers board.</p>
            </div>

            {uploadSuccess && (
              <div className="flex items-center gap-3 bg-green-950/40 border border-green-900/60 p-4 rounded-xl text-green-200 text-sm mb-6">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {uploadError && (
              <div className="flex items-center gap-3 bg-red-950/40 border border-red-900/60 p-4 rounded-xl text-red-200 text-sm mb-6">
                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Disable Upload restrictions safety check banner */}
            {(settings.disableAllClientUploads || !clientRecord.taskUploadEnabled) ? (
              <div className="bg-amber-950/20 border border-amber-900 text-amber-200 p-6 rounded-2xl flex items-start gap-4">
                <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0" />
                <div>
                  <h3 className="font-bold text-base">Campaign Launch Suspended</h3>
                  <p className="text-neutral-400 text-xs mt-1 leading-relaxed">
                    Task postings have been temporarily disabled for either your entity or globally. In case of pending system dues, submit crypto receipt payouts in the fourth tab to resume upload privileges.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLaunchTask} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                      Campaign Type Choice
                    </label>
                    <select
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value as any)}
                      className="w-full p-2.5 bg-neutral-950 text-white rounded-xl border border-neutral-800 text-sm font-sans focus:outline-none"
                    >
                      <option value="Reddit Post Task">Reddit Post Task</option>
                      <option value="Reddit Comment Task">Reddit Comment Task</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                      Agency Payout Fee (USDT per completion)
                    </label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="e.g. 5.50"
                      value={agencyPay}
                      onChange={(e) => setAgencyPay(e.target.value)}
                      required
                      className="w-full p-2.5 bg-neutral-950 text-white rounded-xl border border-neutral-800 text-sm font-sans focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                      Campaign Mission Title
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Write positive review on cybersecurity article"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      required
                      className="w-full p-2.5 bg-neutral-950 text-white rounded-xl border border-neutral-800 text-sm font-sans focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                      Brief Task Description
                    </label>
                    <textarea 
                      placeholder="Detail context for this mission..."
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      required
                      rows={3}
                      className="w-full p-2.5 bg-neutral-950 text-white rounded-xl border border-neutral-800 text-sm font-sans focus:outline-none resize-none"
                    />
                  </div>

                  {taskType === 'Reddit Post Task' ? (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                        Target Subreddit (e.g. r/technology)
                      </label>
                      <input 
                        type="text" 
                        placeholder="r/Bitcoin"
                        value={targetSubreddit}
                        onChange={(e) => setTargetSubreddit(e.target.value)}
                        className="w-full p-2.5 bg-neutral-950 text-white rounded-xl border border-neutral-800 text-sm font-sans"
                      />
                    </div>
                  ) : (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                        Target Reddit Post URL to Comment On
                      </label>
                      <input 
                        type="url" 
                        placeholder="https://reddit.com/r/.../"
                        value={postUrlToCommentOn}
                        onChange={(e) => setPostUrlToCommentOn(e.target.value)}
                        className="w-full p-2.5 bg-neutral-950 text-white rounded-xl border border-neutral-800 text-sm font-sans"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                      Strict Guidelines for Influencer Approval (one per line)
                    </label>
                    <textarea 
                      placeholder="1. Must have karma >= 100&#10;2. Must use keyword 'reliable'&#10;3. Must include screenshot links"
                      value={guidelines}
                      onChange={(e) => setGuidelines(e.target.value)}
                      required
                      rows={4}
                      className="w-full p-3 bg-neutral-950 text-white rounded-xl border border-neutral-800 text-sm font-sans resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                      Exclusionary Deadline Time Limit
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. 24 Hours limit"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full p-2.5 bg-neutral-950 text-white rounded-xl border border-neutral-800 text-sm font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                      Additional Notes to Moderator
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Target post comments with length > 2 sentences only"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-2.5 bg-neutral-950 text-white rounded-xl border border-neutral-800 text-sm font-sans"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-855 text-right">
                  <button
                    id="client_submit_task_btn"
                    type="submit"
                    className="py-3 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition cursor-pointer"
                  >
                    Publish to Editorial Board
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* 3. SUPPORT CHAT INBOX */}
        {activeTab === 'support' && (
          <div className="max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-850 h-fit">
              <h3 className="font-bold text-sm text-neutral-300 uppercase tracking-wider mb-3">Moderator Contacts</h3>
              <div className="flex items-center gap-3 p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
                <div className="w-10 h-10 bg-indigo-600/30 rounded-xl flex items-center justify-center font-bold text-indigo-400">
                  IV
                </div>
                <div>
                  <div className="font-bold text-xs text-white">System Admin Desk</div>
                  <div className="text-[10px] text-green-400 font-semibold">• ONLINE & LIVE</div>
                </div>
              </div>
            </div>

            {/* Conversation threads interface */}
            <div className="md:col-span-2 bg-neutral-950 rounded-2xl border border-neutral-850 flex flex-col h-[500px]">
              <div className="p-4 border-b border-neutral-850 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                  <div className="font-bold text-sm">System Manager Chat</div>
                </div>
                <span className="text-[10px] text-neutral-500">Live Support Sandbox</span>
              </div>

              {/* Message scroll container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans bg-neutral-950/40">
                {!chatThread || chatThread.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <MessageSquare className="w-10 h-10 text-neutral-600 mb-2" />
                    <div className="text-neutral-400 font-bold text-sm">No message records.</div>
                    <p className="text-neutral-500 text-xs mt-1 max-w-xs">Type a question below to launch messaging logs directly with administrators.</p>
                  </div>
                ) : (
                  chatThread.messages.map(msg => {
                    const isAdmin = msg.senderId === 'admin';
                    return (
                      <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}>
                        <div className={`p-3 rounded-2xl max-w-xs sm:max-w-md text-sm ${
                          isAdmin ? 'bg-neutral-800 text-neutral-200 rounded-tl-none' : 'bg-indigo-600 text-white rounded-tr-none'
                        }`}>
                          <p>{msg.text}</p>
                          <div className="text-[9px] text-neutral-400 mt-1 text-right flex items-center justify-end gap-1 font-mono">
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {!isAdmin && (
                              <CheckCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                            )}
                          </div>
                        </div>
                        <span className="text-[9px] text-neutral-500 uppercase font-semibold mt-0.5 px-1.5">{msg.senderName}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t border-neutral-850 flex gap-2 shrink-0">
                <input 
                  type="text" 
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  placeholder="Type a message to administration..."
                  className="flex-1 p-2.5 bg-neutral-900 border border-neutral-800 text-white rounded-xl text-sm focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center cursor-pointer font-bold"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 4. RECEIPTS PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold font-sans tracking-tight mb-2 flex items-center gap-2">
                <History className="text-indigo-400" />
                <span>Verified Outflow History</span>
              </h2>
              <p className="text-neutral-400 text-xs">Verify completed digital invoices matched and confirmed by server coordinators.</p>
            </div>

            {myPayments.length === 0 ? (
              <div className="text-center py-10 bg-neutral-950 rounded-2xl border border-neutral-800 text-neutral-500 text-sm">
                No past invoices or payment settlement receipts found yet. Outstanding amounts show in top outstanding box.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myPayments.map(pay => (
                  <div key={pay.id} className="p-5 bg-neutral-950 rounded-2xl border border-neutral-850 flex gap-4">
                    <div className="w-12 h-12 bg-emerald-900/30 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                      <Coins className="w-6 h-6" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500 font-mono">Invoice Reference: #{pay.id}</span>
                        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-900 text-[10px] rounded-full font-bold">
                          PAID
                        </span>
                      </div>
                      <div className="text-xl font-extrabold font-mono">${pay.amount.toFixed(2)} USDT</div>
                      
                      <div className="text-xs text-neutral-400 leading-relaxed bg-neutral-900 p-3 rounded-lg border border-neutral-800 font-sans">
                        <strong>Reference Note:</strong> {pay.referenceNote || 'N/A'}<br />
                        <span className="text-neutral-500 text-[10px]" style={{ display: 'block', marginTop: '4px' }}>
                          Settled on: {new Date(pay.paidAt).toLocaleDateString()} at {new Date(pay.paidAt).toLocaleTimeString()}
                        </span>
                      </div>

                      {pay.receiptUrl && (
                        <a 
                          href={pay.receiptUrl} 
                          target="_blank" 
                          rel="noreferrer referrer" 
                          className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-semibold w-fit pt-2"
                        >
                          <span>Open Digital Payout Receipt</span>
                          <ExternalLink className="w-3 flex shrink-0" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
