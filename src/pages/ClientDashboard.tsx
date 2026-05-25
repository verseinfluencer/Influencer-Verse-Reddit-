import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Building, User, Coins, FileText, 
  History, PlusCircle, LayoutGrid, CheckCircle, 
  XCircle, Clock, AlertTriangle, ExternalLink, RefreshCw,
  Copy, UploadCloud
} from 'lucide-react';

export const ClientDashboard: React.FC = () => {
  const { 
    currentClient, 
    clientTasks, 
    clientPayments, 
    clientPaymentProofs,
    clientCreateTask,
    clientReviewTaskSubmission,
    clientSubmitPaymentProof,
    settings,
    clients
  } = useApp();

  // Find fresh client dynamic record to preserve budget, balance, block states
  const clientRecord = clients.find(c => c.id === currentClient?.id) || currentClient;

  // Tabs
  const [activeTab, setActiveTab] = useState<'campaigns' | 'upload' | 'payments'>('campaigns');

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

  // Client Payment Proof submission form states
  const [proofAmount, setProofAmount] = useState('');
  const [proofTxId, setProofTxId] = useState('');
  const [proofNotes, setProofNotes] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [proofFileName, setProofFileName] = useState('');
  const [proofUploading, setProofUploading] = useState(false);
  const [proofSuccessMsg, setProofSuccessMsg] = useState('');
  const [proofErrorMsg, setProofErrorMsg] = useState('');
  const [copiedBinanceId, setCopiedBinanceId] = useState(false);

  const handleCopyBinanceId = () => {
    navigator.clipboard.writeText('1215158504');
    setCopiedBinanceId(true);
    setTimeout(() => setCopiedBinanceId(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setProofErrorMsg('File size exceeds the 2MB limit.');
      return;
    }

    setProofFileName(file.name);
    setProofErrorMsg('');

    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImage(reader.result as string);
    };
    reader.onerror = () => {
      setProofErrorMsg('Failed to process image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProofErrorMsg('');
    setProofSuccessMsg('');

    const amountFloat = parseFloat(proofAmount);
    if (!proofAmount || isNaN(amountFloat) || amountFloat <= 0) {
      setProofErrorMsg('Please enter a valid positive amount paid.');
      return;
    }

    if (!proofImage) {
      setProofErrorMsg('Please upload a screenshot or PDF proof of payment.');
      return;
    }

    setProofUploading(true);
    try {
      await clientSubmitPaymentProof({
        clientId: clientRecord.id,
        clientName: clientRecord.name,
        clientCompany: clientRecord.company,
        amount: amountFloat,
        transactionId: proofTxId.trim() || null,
        proofImageUrl: proofImage,
        notes: proofNotes.trim() || null
      });

      setProofSuccessMsg('Payment proof submitted. Admin will verify within 24 hours.');
      setProofAmount('');
      setProofTxId('');
      setProofNotes('');
      setProofImage('');
      setProofFileName('');
    } catch (err: any) {
      setProofErrorMsg(err?.message || 'Failed to submit payment proof.');
    } finally {
      setProofUploading(false);
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved/live': return 'text-green-400 bg-green-950/30 border border-green-900/60';
      case 'pending_review': return 'text-amber-400 bg-amber-950/30 border border-amber-900/60';
      case 'claimed': return 'text-indigo-400 bg-indigo-950/30 border border-indigo-900/60';
      case 'submitted': return 'text-sky-400 bg-sky-950/30 border border-sky-900/60';
      case 'completed': return 'text-emerald-400 bg-emerald-950/30 border border-emerald-900/60';
      case 'revision': return 'text-violet-400 bg-violet-950/30 border border-violet-900/60';
      case 'removed': return 'text-red-400 bg-red-950/30 border border-red-900/60';
      default: return 'text-neutral-400 bg-neutral-950/50 border border-neutral-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_review': return 'Pending Review';
      case 'approved/live': return 'Live - Accepting members';
      case 'claimed': return 'Claimed';
      case 'submitted': return 'Submitted';
      case 'completed': return 'Completed';
      case 'revision': return 'Revision Requested';
      case 'removed': return 'Removed';
      default: return status;
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
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold font-sans tracking-tight mb-1">Campaign Action Center</h2>
              <p className="text-neutral-400 text-xs">A comprehensive dynamic ledger tracking all your uploaded campaigns, active member submissions, and approval states.</p>
            </div>

            {myTasks.length === 0 ? (
              <div className="text-center py-20 bg-neutral-950 rounded-2xl border border-neutral-800 text-neutral-500 text-sm">
                You haven't uploaded any campaign tasks yet. Ready to get started?
              </div>
            ) : (
              <div className="overflow-x-auto bg-neutral-950 border border-neutral-805 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 font-semibold uppercase tracking-wider bg-neutral-900/40">
                      <th className="py-4 px-4 font-bold">Task Title</th>
                      <th className="py-4 px-4 font-bold">Type</th>
                      <th className="py-4 px-4 font-bold text-right">Agency Pay</th>
                      <th className="py-4 px-4 font-bold text-center">Status</th>
                      <th className="py-4 px-4 font-bold">Date Created</th>
                      <th className="py-4 px-4 font-bold">Date Approved</th>
                      <th className="py-4 px-4 font-bold">Claimed By</th>
                      <th className="py-4 px-4 font-bold">Proof Link</th>
                      <th className="py-4 px-4 font-bold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850">
                    {myTasks.map(t => {
                      return (
                        <tr key={t.id} className="hover:bg-neutral-900/20 transition">
                          <td className="py-4 px-4 max-w-xs select-text">
                            <div className="font-extrabold text-white text-sm">{t.title}</div>
                            {t.description && (
                              <p className="text-neutral-400 text-[10px] truncate mt-0.5" title={t.description}>{t.description}</p>
                            )}
                            {(t.targetSubreddit || t.postUrlToCommentOn) && (
                              <div className="text-[9px] text-zinc-500 font-mono mt-1">
                                {t.targetSubreddit ? `Subreddit: r/${t.targetSubreddit.replace(/^r\//, '')}` : `Comment on: ${t.postUrlToCommentOn}`}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-2 py-0.5 bg-neutral-900 font-bold border border-neutral-800 rounded uppercase tracking-wide text-[9px] text-neutral-300">
                              {t.type}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-white">
                            ${(t.agencyPay || 0).toFixed(2)}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`${getStatusColor(t.status)} px-2.5 py-0.5 rounded text-[10px] font-bold uppercase`}>
                              {getStatusLabel(t.status)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-neutral-400 font-mono">
                            {t.createdAt ? new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </td>
                          <td className="py-4 px-4 text-neutral-400 font-mono">
                            {t.approvedAt ? new Date(t.approvedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </td>
                          <td className="py-4 px-4 font-mono select-text">
                            {t.claimedBy ? (
                              <span className="text-indigo-400 font-bold">u/{t.claimedBy}</span>
                            ) : (
                              <span className="text-zinc-500 italic">Unclaimed</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {t.proofLink ? (
                              <a
                                href={t.proofLink}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 bg-neutral-900 border border-neutral-800 text-[10px] font-bold text-blue-400 rounded hover:underline hover:text-blue-300 flex items-center gap-1 w-fit"
                              >
                                <span>Proof Link</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              <span className="text-neutral-600 font-normal">N/A</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {t.status === 'submitted' ? (
                              <div className="flex flex-col gap-1.5 justify-center items-center min-w-[200px]">
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleReviewSubmission(t.id, 'Approve')}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 font-black text-[9px] text-white rounded cursor-pointer transition uppercase tracking-wider"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleReviewSubmission(t.id, 'RequestRevision')}
                                    className="px-2 py-1 bg-violet-600 hover:bg-violet-500 font-black text-[9px] text-white rounded cursor-pointer transition uppercase tracking-wider"
                                  >
                                    Revision
                                  </button>
                                  <button
                                    onClick={() => handleReviewSubmission(t.id, 'Reject')}
                                    className="px-2 py-1 bg-red-650 hover:bg-red-600 font-black text-[9px] text-white rounded cursor-pointer transition uppercase tracking-wider"
                                  >
                                    Reject
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  placeholder="Note for Revision / Reject..."
                                  value={reviewFeedback[t.id] || ''}
                                  onChange={(e) => setReviewFeedback(prev => ({ ...prev, [t.id]: e.target.value }))}
                                  className="w-full max-w-[190px] p-1.5 bg-neutral-950 text-white border border-neutral-800 rounded text-[10px] font-sans focus:outline-none focus:border-indigo-500 placeholder-neutral-600"
                                />
                                {reviewActionSuccess[t.id] && (
                                  <span className="text-[10px] text-green-400 font-medium">{reviewActionSuccess[t.id]}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-zinc-500 italic">No Action Needed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
        )}        {/* 4. BILLING & RECEIPTS PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div className="space-y-8">
            <div className="border-b border-white/5 pb-4">
              <h2 className="text-xl font-bold font-sans tracking-tight mb-1 flex items-center gap-2">
                <Coins className="text-indigo-400 w-5 h-5" />
                <span>Client Billing & Deposit Portal</span>
              </h2>
              <p className="text-neutral-400 text-xs">Manage payment dues, trigger deposit instructions, upload verification proofs, and verify finalized invoices.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Side: Statement Box & Submission Form */}
              <div className="lg:col-span-5 space-y-6">
                {/* PAYMENT STATEMENT BANNER */}
                <div className="bg-gradient-to-r from-purple-700 via-purple-900 to-indigo-900 p-6 rounded-3xl border border-purple-500/20 shadow-lg relative overflow-hidden">
                  <div className="absolute right-[-20px] top-[-20px] opacity-10 blur-xl w-32 h-32 bg-blue-400 rounded-full"></div>
                  <span className="text-[10px] text-purple-200 font-extrabold uppercase tracking-widest block mb-1">Billing Statement</span>
                  <h3 className="text-2xl font-black font-mono text-white flex items-baseline gap-2">
                    Total Amount Due: ${(clientRecord.payAgencyBalance || 0).toFixed(2)} <span className="text-xs font-bold text-purple-300 font-sans">USDT</span>
                  </h3>
                  <p className="text-[10px] text-purple-100/70 mt-2 leading-normal">
                    This compiling agency balance accumulates as influencer tasks are completed. Settle dues to maintain active campaign upload privileges.
                  </p>
                </div>

                {/* PAY NOW INSTRUCTIONS SECTION */}
                <div className="bg-neutral-950 p-5 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-zinc-300 uppercase tracking-wider">Deposit instructions</span>
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-black uppercase">BEP20 (BSC) Network</span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-normal">
                    Please transfer the total amount due to the official platform Binance ID shown below:
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Binance ID</label>
                    <div className="flex gap-2 items-center bg-zinc-900 border border-white/5 px-3 py-2.5 rounded-xl">
                      <span className="text-sm font-black font-mono text-indigo-300 flex-1 select-all tracking-wider">1215158504</span>
                      <button 
                        type="button"
                        onClick={handleCopyBinanceId}
                        className="p-1 px-3 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-black text-white rounded-lg transition flex items-center gap-1.5 cursor-pointer active:scale-95 border border-white/5"
                      >
                        {copiedBinanceId ? 'Copied!' : 'Copy'}
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-200/80 leading-normal">
                      <strong>⚠️ Strict Warning:</strong> Only deposit <strong>USDT-BEP20</strong>. Depositing on different networks (TRC20, ERC20, Polygon) will result in irreversible financial loss.
                    </p>
                  </div>
                </div>

                {/* UPLOAD PROOF FORM */}
                <form onSubmit={handleProofSubmit} className="bg-neutral-950 p-5 rounded-2xl border border-white/5 space-y-4">
                  <div className="border-b border-white/5 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Submit Verification Proof</h4>
                    <p className="text-[10px] text-zinc-500">Provide deposit details to prompt coordinator validation.</p>
                  </div>
                  
                  {proofSuccessMsg && (
                     <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-xl flex items-start gap-2 select-text">
                       <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                       <span>{proofSuccessMsg}</span>
                     </div>
                  )}

                  {proofErrorMsg && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-start gap-2">
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{proofErrorMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Amount Paid (USDT) *</label>
                      <input 
                        type="number"
                        step="0.01"
                        required
                        value={proofAmount}
                        onChange={(e) => setProofAmount(e.target.value)}
                        placeholder="e.g. 150.00"
                        className="w-full text-xs text-white bg-zinc-900 border border-white/5 px-3 py-2 rounded-xl focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Tx ID / Hash (Optional)</label>
                      <input 
                        type="text"
                        value={proofTxId}
                        onChange={(e) => setProofTxId(e.target.value)}
                        placeholder="e.g. 0xef..."
                        className="w-full text-xs text-white bg-zinc-900 border border-white/5 px-3 py-2 rounded-xl focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Reference Notes (Optional)</label>
                    <input 
                      type="text"
                      value={proofNotes}
                      onChange={(e) => setProofNotes(e.target.value)}
                      placeholder="e.g. Deposited settlement for campaigns"
                      className="w-full text-xs text-white bg-zinc-900 border border-white/5 px-3 py-2 rounded-xl focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Attach Receipt (Screenshot / PDF) *</label>
                    <div className="relative border border-dashed border-white/10 hover:border-indigo-500/40 rounded-xl p-4 text-center cursor-pointer transition-colors bg-zinc-900 flex flex-col items-center justify-center">
                      <input 
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <UploadCloud className="w-5 h-5 text-indigo-400 mb-1" />
                      <p className="text-[10px] text-zinc-300 font-semibold truncate max-w-full">
                        {proofFileName ? `Attached: ${proofFileName}` : 'Click or drag receipt files'}
                      </p>
                      <p className="text-[9px] text-zinc-600 mt-0.5">JPEG, PNG, or PDF format inside 2MB.</p>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={proofUploading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-black uppercase rounded-xl transition cursor-pointer disabled:opacity-50 active:scale-[0.98] tracking-widest block"
                  >
                    {proofUploading ? 'Transmitting payload...' : 'Submit Payment Proof'}
                  </button>
                </form>
              </div>

              {/* Right Side: Ledger Lists & Audit Queues */}
              <div className="lg:col-span-7 space-y-8">
                {/* SUBMITTED PAYMENT PROOFS STATUS QUEUE */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase text-zinc-300 tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>My Deposited Proofs (Pending Verification)</span>
                  </h3>

                  {(!clientPaymentProofs || clientPaymentProofs.filter(p => p.clientId === clientRecord.id).length === 0) ? (
                    <div className="text-center py-8 bg-neutral-950 rounded-2xl border border-neutral-800 text-neutral-500 text-xs">
                      No payment deposits uploaded yet. Use the left dashboard to dispatch.
                    </div>
                  ) : (
                    <div className="overflow-x-auto bg-neutral-950 border border-white/5 rounded-2xl">
                      <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                        <thead>
                          <tr className="border-b border-neutral-800 text-neutral-400 font-semibold uppercase tracking-wider bg-neutral-900/40 text-[10px]">
                            <th className="py-3 px-4 font-bold">Date</th>
                            <th className="py-3 px-4 font-bold text-right">Amount</th>
                            <th className="py-3 px-4 font-bold text-center">Status</th>
                            <th className="py-3 px-4 font-bold">Details</th>
                            <th className="py-3 px-4 font-bold text-center">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-850">
                          {clientPaymentProofs.filter(p => p.clientId === clientRecord.id).map(proof => (
                            <tr key={proof.id} className="hover:bg-neutral-900/10 transition">
                              <td className="py-3 px-4 text-neutral-400 font-mono">
                                {new Date(proof.submittedAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-white">
                                ${proof.amount.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  proof.status === 'verified' 
                                    ? 'bg-emerald-950 border border-emerald-900 text-emerald-400'
                                    : proof.status === 'rejected'
                                    ? 'bg-red-950 border border-red-900 text-red-400'
                                    : 'bg-amber-950 border border-amber-900 text-amber-400'
                                }`}>
                                  {proof.status === 'pending' ? 'Pending Review' : proof.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 max-w-[180px] break-words">
                                <p className="text-[10px] text-zinc-300 font-medium font-mono truncate" title={proof.transactionId || 'None'}>
                                  Tx: {proof.transactionId || 'N/A'}
                                </p>
                                {proof.notes && (
                                  <p className="text-[9px] text-zinc-500 italic mt-0.5">{proof.notes}</p>
                                )}
                                {proof.rejectionReason && (
                                  <p className="text-[10px] text-red-400 font-semibold mt-1">Rejection Reason: {proof.rejectionReason}</p>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <a 
                                  href={proof.proofImageUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="inline-block text-xs text-indigo-400 hover:underline font-bold"
                                >
                                  Preview Proof
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* OFFICIAL VERIFIED RECEIPTS INVOICES HISTORY */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase text-zinc-300 tracking-wider flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-400" />
                    <span>Verified Outflow Receipt History</span>
                  </h3>

                  {myPayments.length === 0 ? (
                    <div className="text-center py-8 bg-neutral-950 rounded-2xl border border-neutral-800 text-neutral-500 text-xs">
                      No verified receipt histories settled by server administrators as of yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myPayments.map(pay => (
                        <div key={pay.id} className="p-4 bg-neutral-950 rounded-xl border border-neutral-850 flex gap-4">
                          <div className="w-10 h-10 bg-emerald-900/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                            <Coins className="w-5 h-5" />
                          </div>
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-neutral-500 font-mono">ID: #{pay.id}</span>
                              <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-900 text-[8px] rounded font-bold uppercase tracking-wider">
                                PAID
                              </span>
                            </div>
                            <div className="text-lg font-black font-mono text-emerald-400">${pay.amount.toFixed(2)} USDT</div>
                            
                            <p className="text-[10px] text-neutral-400 tracking-tight leading-relaxed select-text truncate" title={pay.referenceNote}>
                              <strong>Ref:</strong> {pay.referenceNote || 'N/A'}
                            </p>
                            <span className="text-neutral-500 text-[8px] block">
                              Settle Date: {new Date(pay.paidAt).toLocaleDateString()}
                            </span>

                            {pay.receiptUrl && (
                              <a 
                                href={pay.receiptUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5 font-bold pt-1.5"
                              >
                                <span>Digital Invoice Receipt</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
