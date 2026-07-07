//src/components/AdminDashboard.tsx

import { useState, useEffect } from 'react';
import {
  deleteTicket,
  getAllTickets,
  getSupportingDocumentUrl,
  getSupportingDocuments,
  isSupportingDocumentImage,
  isSupportingDocumentOfficeFile,
  isSupportingDocumentVideo,
  signOutAdmin,
  SupportingDocument,
  Ticket,
  updateTicket,
} from '../lib/localData';
import {
  Download,
  LogOut,
  Filter,
  Search,
  Calendar,
  User,
  Mail,
  Tag,
  MapPin,
  Loader2,
  X,
  Save,
  Ticket as TicketIcon,
  FileImage,
  FileText,
  FileVideo,
  CheckCircle2,
  ChevronDown,
  Trash2,
  AlertTriangle,
  Plus,
} from 'lucide-react';

interface AdminDashboardProps {
  onLogout: () => void;
}

const assigneeOptions = ['Unassigned', 'Mark Niño Bautista'];
const statusOptions = ['Pending', 'Resolved', 'Closed'] as const;
const statusFilterOptions = ['All', ...statusOptions];
const categoryOptions = ['All', 'Hardware Problem', 'Software Problem', 'Internet Problem', 'Others'];
const selectBaseClass =
  'h-10 w-full appearance-none rounded-lg border border-emerald-200 bg-white py-2 pl-3.5 pr-10 text-sm font-semibold text-emerald-950 shadow-sm outline-none transition hover:border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100';
type InlineDropdownField = 'status' | 'assignee';
type ExportPeriod = 'weekly' | 'monthly' | 'yearly' | 'custom';
type ImagePreviewItem = {
  url: string;
  label: string;
};
type VideoPreviewItem = {
  url: string;
  label: string;
  type: string;
};
type DocumentPreviewItem = {
  url: string;
  label: string;
  type: string;
};

function getImagePreviewItems(documents: SupportingDocument[]) {
  return documents.filter(isSupportingDocumentImage).map((document, index) => ({
    url: getSupportingDocumentUrl(document),
    label: document.name || `Image ${index + 1}`,
  }));
}

function getVideoPreviewItems(documents: SupportingDocument[]) {
  return documents.filter(isSupportingDocumentVideo).map((document, index) => ({
    url: getSupportingDocumentUrl(document),
    label: document.name || `Video ${index + 1}`,
    type: document.type,
  }));
}

function getDocumentPreviewItems(documents: SupportingDocument[]) {
  return documents.filter(isSupportingDocumentOfficeFile).map((document, index) => ({
    url: getSupportingDocumentUrl(document),
    label: document.name || `Document ${index + 1}`,
    type: document.type,
  }));
}

function isPdfPreview(document: DocumentPreviewItem) {
  return document.type.toLowerCase().includes('pdf') || /\.pdf$/i.test(document.url) || /\.pdf$/i.test(document.label);
}

function getAbsoluteUrl(url: string) {
  return new URL(url, window.location.origin).href;
}

function getDocumentPreviewUrl(document: DocumentPreviewItem) {
  const absoluteUrl = getAbsoluteUrl(document.url);

  if (isPdfPreview(document)) {
    return absoluteUrl;
  }

  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function getEndOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function escapeExcelValue(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [exportPeriod, setExportPeriod] = useState<ExportPeriod>('weekly');
  const [exportStartDate, setExportStartDate] = useState(formatDateInput(new Date()));
  const [exportEndDate, setExportEndDate] = useState(formatDateInput(new Date()));
  const [exportError, setExportError] = useState('');
  const [openFilterDropdown, setOpenFilterDropdown] = useState<'status' | 'category' | null>(null);
  const [openDownloadDropdown, setOpenDownloadDropdown] = useState(false);
  const [openInlineDropdown, setOpenInlineDropdown] = useState<{
    ticketId: string;
    field: InlineDropdownField;
  } | null>(null);
  const [openModalDropdown, setOpenModalDropdown] = useState<InlineDropdownField | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [imagePreview, setImagePreview] = useState<{ images: ImagePreviewItem[]; currentIndex: number } | null>(null);
  const [videoPreview, setVideoPreview] = useState<{ videos: VideoPreviewItem[]; currentIndex: number } | null>(null);
  const [documentPreview, setDocumentPreview] = useState<{
    documents: DocumentPreviewItem[];
    currentIndex: number;
  } | null>(null);

  // Success and Delete Modal States
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);

  // Bulk Selection States
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Custom Assignee States
  const [customAssignees, setCustomAssignees] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('customAdminAssignees');
      if (saved) {
        return JSON.parse(saved);
      }
    }
    return [];
  });

  // Save to localStorage whenever the customAssignees list changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('customAdminAssignees', JSON.stringify(customAssignees));
    }
  }, [customAssignees]);
  
  const [isAddingAssignee, setIsAddingAssignee] = useState(false);
  const [newAssigneeName, setNewAssigneeName] = useState('');
  const allAssignees = [...assigneeOptions, ...customAssignees];

  const handleAddAssignee = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const trimmed = newAssigneeName.trim();
    if (trimmed && !allAssignees.includes(trimmed)) {
      setCustomAssignees([...customAssignees, trimmed]);
    }
    setNewAssigneeName('');
    setIsAddingAssignee(false);
  };

  const handleRemoveAssignee = (e: React.MouseEvent, nameToRemove: string) => {
    e.stopPropagation();
    setCustomAssignees((prev) => prev.filter((name) => name !== nameToRemove));
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchTerm, statusFilter, categoryFilter]);

  const fetchTickets = async () => {
    try {
      const data = await getAllTickets();
      setTickets(data);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const filterTickets = () => {
    let filtered = [...tickets];

    if (searchTerm) {
      const normalizedSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (ticket) => {
          const receivedDate = formatReceivedDate(ticket.created_at).toLowerCase();
          const createdTimestamp = formatCreatedTimestamp(ticket.created_at).toLowerCase();
          const isoDate = ticket.created_at.slice(0, 10).toLowerCase();

          return (
            ticket.ticket_number.toLowerCase().includes(normalizedSearchTerm) ||
            ticket.name.toLowerCase().includes(normalizedSearchTerm) ||
            ticket.email.toLowerCase().includes(normalizedSearchTerm) ||
            receivedDate.includes(normalizedSearchTerm) ||
            createdTimestamp.includes(normalizedSearchTerm) ||
            isoDate.includes(normalizedSearchTerm)
          );
        }
      );
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter((ticket) => normalizeStatus(ticket.status) === statusFilter);
    }

    if (categoryFilter !== 'All') {
      filtered = filtered.filter((ticket) => ticket.problem_category === categoryFilter);
    }

    filtered.sort((left, right) => {
      const statusDifference = getStatusSortPriority(left.status) - getStatusSortPriority(right.status);

      if (statusDifference !== 0) {
        return statusDifference;
      }

      return getTicketSequence(left.ticket_number) - getTicketSequence(right.ticket_number);
    });

    setFilteredTickets(filtered);
  };

  const handleUpdateTicket = async () => {
    if (!editingTicket) return;

    try {
      await updateTicket(editingTicket);
      await fetchTickets();
      setEditingTicket(null);
      setSelectedTicket(null);
      triggerSuccess('Ticket updated successfully!');
    } catch (err) {
      console.error('Error updating ticket:', err);
    }
  };

  const handleLogout = async () => {
    await signOutAdmin();
    onLogout();
  };

  const handleInlineUpdate = async (ticket: Ticket, changes: Partial<Ticket>) => {
    try {
      await updateTicket({
        ...ticket,
        ...changes,
      });
      await fetchTickets();
      triggerSuccess('Changes saved.');
    } catch (err) {
      console.error('Error updating ticket:', err);
    }
  };

  const confirmDelete = async () => {
    if (!ticketToDelete) return;

    try {
      await deleteTicket(ticketToDelete.id);
      await fetchTickets();

      if (selectedTicket?.id === ticketToDelete.id) {
        setSelectedTicket(null);
        setEditingTicket(null);
      }
      setTicketToDelete(null);
      triggerSuccess('Ticket deleted successfully.');
    } catch (err) {
      console.error('Error deleting ticket:', err);
      window.alert('Failed to delete ticket. Please try again.');
    }
  };

  const confirmBulkDelete = async () => {
    try {
      for (const id of selectedTicketIds) {
        await deleteTicket(id);
      }
      await fetchTickets();
      setSelectedTicketIds([]);
      setShowBulkDeleteModal(false);
      triggerSuccess(`${selectedTicketIds.length} ticket(s) deleted successfully.`);
    } catch (err) {
      console.error('Error deleting tickets:', err);
      window.alert('Failed to delete tickets. Please try again.');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTicketIds(filteredTickets.map(t => String(t.id)));
    } else {
      setSelectedTicketIds([]);
    }
  };

  const handleSelectTicket = (id: string) => {
    setSelectedTicketIds(prev =>
      prev.includes(id) ? prev.filter(ticketId => ticketId !== id) : [...prev, id]
    );
  };

  const getStatusColor = (status: string) => {
    switch (normalizeStatus(status)) {
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Resolved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Closed':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusOptionColor = (status: string, isSelected: boolean) => {
    switch (normalizeStatus(status)) {
      case 'Pending':
        return isSelected
          ? 'bg-amber-100 text-amber-900'
          : 'text-slate-600 hover:bg-amber-50 hover:text-amber-900';
      case 'Resolved':
        return isSelected
          ? 'bg-emerald-100 text-emerald-900'
          : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900';
      case 'Closed':
        return isSelected
          ? 'bg-slate-100 text-slate-800'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800';
      default:
        return isSelected
          ? 'bg-slate-100 text-slate-800'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800';
    }
  };

  const normalizeStatus = (status: string) => {
    if (status === 'Open' || status === 'In Progress') {
      return 'Pending';
    }

    return status;
  };

  const formatReceivedDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const formatCreatedTimestamp = (value: string) =>
    new Date(value).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const getTicketSequence = (ticketNumber: string) => {
    const sequence = Number.parseInt(ticketNumber.replace(/\D/g, ''), 10);
    return Number.isNaN(sequence) ? Number.MAX_SAFE_INTEGER : sequence;
  };

  const getStatusSortPriority = (status: string) => {
    switch (normalizeStatus(status)) {
      case 'Resolved':
        return 1;
      case 'Closed':
        return 2;
      default:
        return 0;
    }
  };

  const getExportDateRange = (period = exportPeriod) => {
    const today = new Date();

    if (period === 'weekly') {
      const start = getStartOfDay(today);
      const dayOffset = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - dayOffset);
      const end = getEndOfDay(start);
      end.setDate(start.getDate() + 6);

      return { start, end };
    }

    if (period === 'monthly') {
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0),
        end: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    }

    if (period === 'yearly') {
      return {
        start: new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0),
        end: new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    }

    const start = getStartOfDay(new Date(exportStartDate));
    const end = getEndOfDay(new Date(exportEndDate));

    return { start, end };
  };

  const handleDownloadRecords = (period = exportPeriod) => {
    setExportPeriod(period);
    setExportError('');

    const { start, end } = getExportDateRange(period);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setExportError('Please choose a valid start and end date.');
      return;
    }

    if (start > end) {
      setExportError('Start date must be before the end date.');
      return;
    }

    const exportTickets = tickets
      .filter((ticket) => {
        const createdAt = new Date(ticket.created_at);
        return createdAt >= start && createdAt <= end;
      })
      .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());

    if (exportTickets.length === 0) {
      setExportError('No records found for the selected date.');
      return;
    }

    const columns = [
      'Received',
      'Case No.',
      'Name',
      'Email',
      'Category',
      'Description & Location',
      'Supporting Documents',
      'Status',
      'Assigned To',
      'Remarks',
      'Created',
      'Updated',
    ];

    const rows = exportTickets.map((ticket) => {
      const supportingDocuments = getSupportingDocuments(ticket.supporting_document)
        .map((document) => document.name || getSupportingDocumentUrl(document))
        .join(', ');

      return [
        formatReceivedDate(ticket.created_at),
        ticket.ticket_number,
        ticket.name,
        ticket.email,
        ticket.problem_category,
        ticket.description_location,
        supportingDocuments || 'None',
        normalizeStatus(ticket.status),
        ticket.assigned_to || 'Unassigned',
        ticket.remarks || '',
        formatCreatedTimestamp(ticket.created_at),
        formatCreatedTimestamp(ticket.updated_at),
      ];
    });

    const tableRows = [
      `<tr>${columns.map((column) => `<th>${escapeExcelValue(column)}</th>`).join('')}</tr>`,
      ...rows.map(
        (row) => `<tr>${row.map((cell) => `<td>${escapeExcelValue(String(cell))}</td>`).join('')}</tr>`
      ),
    ].join('');
    const workbook = `
      <html>
        <head>
          <meta charset="utf-8" />
        </head>
        <body>
          <table>${tableRows}</table>
        </body>
      </html>
    `;
    const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    const fileName = `ticket-records-${period}-${formatDateInput(start)}-to-${formatDateInput(end)}.xls`;

    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
    setOpenDownloadDropdown(false);
  };

  const pendingCount = tickets.filter((ticket) => normalizeStatus(ticket.status) === 'Pending').length;
  const resolvedCount = tickets.filter((ticket) => normalizeStatus(ticket.status) === 'Resolved').length;
  const closedCount = tickets.filter((ticket) => normalizeStatus(ticket.status) === 'Closed').length;
  const activeImagePreview = imagePreview?.images[imagePreview.currentIndex] ?? null;
  const canNavigateImagePreview = (imagePreview?.images.length ?? 0) > 1;
  const activeVideoPreview = videoPreview?.videos[videoPreview.currentIndex] ?? null;
  const canNavigateVideoPreview = (videoPreview?.videos.length ?? 0) > 1;
  const activeDocumentPreview = documentPreview?.documents[documentPreview.currentIndex] ?? null;
  const canNavigateDocumentPreview = (documentPreview?.documents.length ?? 0) > 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-lime-50 relative">
      
      {/* Centered Success Alert */}
      {successMessage && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none">
          <div className="bg-white border border-emerald-100 px-10 py-8 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(6,78,59,0.25)] flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300 pointer-events-auto">
            <div className="bg-emerald-50 p-4 rounded-full">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <p className="text-emerald-950 font-bold text-xl">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Centered Custom Delete Modal */}
      {ticketToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Delete Ticket?</h2>
              <p className="text-gray-600">
                Are you sure you want to delete <span className="font-mono font-bold text-emerald-700">{ticketToDelete.ticket_number}</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 p-6 bg-gray-50 border-t">
              <button
                onClick={() => setTicketToDelete(null)}
                className="flex-1 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Delete Selected Tickets?</h2>
              <p className="text-gray-600">
                Are you sure you want to delete {selectedTicketIds.length} ticket(s)? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 p-6 bg-gray-50 border-t">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="flex-1 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white/90 border-b border-emerald-100 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-emerald-950">Admin Dashboard</h1>
              <p className="text-sm text-emerald-800">Manage and track all support tickets</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-emerald-800 hover:bg-emerald-100 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="w-full max-w-[1230px] rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-emerald-700" />
              <h2 className="text-base font-semibold text-emerald-950">Filters</h2>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by ticket, name, email, or date"
                    className="h-10 w-full rounded-lg border border-gray-300 px-3.5 pl-9 text-sm text-black placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
                <div
                  className="relative"
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      setOpenFilterDropdown(null);
                    }
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFilterDropdown(openFilterDropdown === 'status' ? null : 'status')}
                    className={`${selectBaseClass} flex items-center justify-between text-left`}
                    aria-haspopup="listbox"
                    aria-expanded={openFilterDropdown === 'status'}
                  >
                    <span>{statusFilter === 'All' ? 'All Statuses' : statusFilter}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-emerald-600 transition ${
                        openFilterDropdown === 'status' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {openFilterDropdown === 'status' && (
                    <div
                      role="listbox"
                      className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-emerald-100 bg-white p-1.5 shadow-[0_18px_40px_rgba(6,78,59,0.18)]"
                    >
                      {statusFilterOptions.map((status) => {
                        const isSelected = statusFilter === status;

                        return (
                          <button
                            key={status}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setStatusFilter(status);
                              setOpenFilterDropdown(null);
                            }}
                            className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                              isSelected
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'
                            }`}
                          >
                            <span>{status === 'All' ? 'All Statuses' : status}</span>
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-700" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
                <div
                  className="relative"
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      setOpenFilterDropdown(null);
                    }
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFilterDropdown(openFilterDropdown === 'category' ? null : 'category')}
                    className={`${selectBaseClass} flex items-center justify-between text-left`}
                    aria-haspopup="listbox"
                    aria-expanded={openFilterDropdown === 'category'}
                  >
                    <span>{categoryFilter === 'All' ? 'All Categories' : categoryFilter}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-emerald-600 transition ${
                        openFilterDropdown === 'category' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {openFilterDropdown === 'category' && (
                    <div
                      role="listbox"
                      className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-emerald-100 bg-white p-1.5 shadow-[0_18px_40px_rgba(6,78,59,0.18)]"
                    >
                      {categoryOptions.map((category) => {
                        const isSelected = categoryFilter === category;

                        return (
                          <button
                            key={category}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setCategoryFilter(category);
                              setOpenFilterDropdown(null);
                            }}
                            className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                              isSelected
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'
                            }`}
                          >
                            <span>{category === 'All' ? 'All Categories' : category}</span>
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-700" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="block text-xs font-medium text-transparent">Download</label>
                <div
                  className="relative w-full xl:w-auto"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setOpenDownloadDropdown(false);
                    }
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setExportError('');
                      setOpenDownloadDropdown((currentValue) => !currentValue);
                    }}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 xl:w-auto"
                    aria-haspopup="menu"
                    aria-expanded={openDownloadDropdown}
                  >
                    <Download className="h-4 w-4" />
                    Download Excel
                    <ChevronDown
                      className={`h-4 w-4 transition ${openDownloadDropdown ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {openDownloadDropdown && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-full min-w-[320px] rounded-xl border border-emerald-100 bg-white p-3 shadow-[0_18px_40px_rgba(6,78,59,0.18)] sm:w-[360px]">
                      <p className="px-1 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">Records</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {(['weekly', 'monthly', 'yearly'] as ExportPeriod[]).map((period) => (
                          <button
                            key={period}
                            type="button"
                            onClick={() => handleDownloadRecords(period)}
                            className="rounded-lg border border-emerald-100 px-3 py-2.5 text-sm font-semibold capitalize text-emerald-800 transition hover:border-emerald-500 hover:bg-emerald-50"
                          >
                            {period}
                          </button>
                        ))}
                      </div>

                      <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                        <button
                          type="button"
                          onClick={() => setExportPeriod('custom')}
                          className={`w-full rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                            exportPeriod === 'custom'
                              ? 'border-emerald-500 bg-white text-emerald-800'
                              : 'border-emerald-100 bg-white/80 text-slate-600 hover:bg-white'
                          }`}
                        >
                          Custom
                        </button>

                        {exportPeriod === 'custom' && (
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                                Start
                              </label>
                              <input
                                type="date"
                                value={exportStartDate}
                                onChange={(event) => setExportStartDate(event.target.value)}
                                className="h-11 w-full rounded-lg border border-emerald-100 bg-white px-3 text-sm font-semibold text-emerald-950 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                                End
                              </label>
                              <input
                                type="date"
                                value={exportEndDate}
                                onChange={(event) => setExportEndDate(event.target.value)}
                                className="h-11 w-full rounded-lg border border-emerald-100 bg-white px-3 text-sm font-semibold text-emerald-950 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDownloadRecords('custom')}
                              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:col-span-2"
                            >
                              <Download className="h-4 w-4" />
                              Download Custom
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {exportError && <p className="mt-2 text-sm font-semibold text-red-600">{exportError}</p>}
          </div>

          <div className="flex items-stretch gap-4 self-start">
            <div className="min-w-[132px] rounded-2xl border border-emerald-100 bg-white px-6 py-5 text-center shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Pending</p>
              <p className="mt-3 text-4xl font-extrabold text-amber-500">{pendingCount}</p>
            </div>

            <div className="min-w-[132px] rounded-2xl border border-emerald-100 bg-white px-6 py-5 text-center shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Resolved</p>
              <p className="mt-3 text-4xl font-extrabold text-green-500">{resolvedCount}</p>
            </div>

            <div className="min-w-[132px] rounded-2xl border border-emerald-100 bg-white px-6 py-5 text-center shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Closed</p>
              <p className="mt-3 text-4xl font-extrabold text-slate-500">{closedCount}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="flex min-h-0 flex-col bg-white rounded-xl shadow-sm border border-emerald-100">
            <div className="flex-none px-6 py-4 border-b border-emerald-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-emerald-950">
                Tickets ({filteredTickets.length})
              </h2>
              {selectedTicketIds.length > 0 && (
                <button
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected ({selectedTicketIds.length})
                </button>
              )}
            </div>

            <div className="flex-1 overflow-x-auto">
              {/* Added min-height and padding bottom to wrapper so absolutely positioned dropdowns don't clip inside overflow-x-auto */}
              <div className="min-h-[300px] pb-40">
                <table className="w-full table-fixed min-w-[1320px]">
                  <thead className="bg-emerald-50 border-b border-emerald-100">
                    <tr>
                      <th className="w-[4%] px-3 py-3 text-left">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          checked={selectedTicketIds.length > 0 && selectedTicketIds.length === filteredTickets.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="w-[8%] px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Received</th>
                      <th className="w-[8%] px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Case No.</th>
                      <th className="w-[13%] px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                      <th className="w-[10%] px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>
                      <th className="w-[16%] px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Description & Location</th>
                      <th className="w-[12%] px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Supporting Document</th>
                      <th className="w-[9%] px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                      <th className="w-[9%] px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Assign To</th>
                      <th className="w-[8%] px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Created</th>
                      <th className="w-[7%] px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                          No tickets found
                        </td>
                      </tr>
                    ) : (
                      filteredTickets.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-gray-50 transition">
                          <td className="px-3 py-4 align-top">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              checked={selectedTicketIds.includes(String(ticket.id))}
                              onChange={() => handleSelectTicket(String(ticket.id))}
                            />
                          </td>
                          <td className="px-3 py-4 align-top">
                            <span className="block text-sm text-gray-700">{formatReceivedDate(ticket.created_at)}</span>
                            <span className="block text-xs text-gray-500">
                              {new Date(ticket.created_at).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <span className="font-mono text-sm font-medium text-emerald-700">
                              {ticket.ticket_number}
                            </span>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <div>
                              <p className="font-medium text-gray-900">{ticket.name}</p>
                              <p className="text-sm text-gray-500 break-all">{ticket.email}</p>
                            </div>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <span className="text-sm text-gray-700">{ticket.problem_category}</span>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <p className="text-sm text-gray-700">
                              {ticket.description_location.length > 90
                                ? `${ticket.description_location.slice(0, 90)}...`
                                : ticket.description_location}
                            </p>
                          </td>
                          <td className="px-3 py-4 align-top">
                            {(() => {
                              const supportingDocuments = getSupportingDocuments(ticket.supporting_document);
                              const imagePreviewItems = getImagePreviewItems(supportingDocuments);
                              const videoPreviewItems = getVideoPreviewItems(supportingDocuments);
                              const documentPreviewItems = getDocumentPreviewItems(supportingDocuments);
                              const fileDocuments = supportingDocuments.filter(
                                (document) =>
                                  !isSupportingDocumentImage(document) &&
                                  !isSupportingDocumentVideo(document) &&
                                  !isSupportingDocumentOfficeFile(document)
                              );

                              return supportingDocuments.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {imagePreviewItems.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setImagePreview({ images: imagePreviewItems, currentIndex: 0 })}
                                      title={`View ${imagePreviewItems.length} image${imagePreviewItems.length === 1 ? '' : 's'}`}
                                      className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                                    >
                                      <FileImage className="h-4 w-4 flex-shrink-0" />
                                      <span>View Image</span>
                                    </button>
                                  )}

                                  {videoPreviewItems.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setVideoPreview({ videos: videoPreviewItems, currentIndex: 0 })}
                                      title={`View ${videoPreviewItems.length} video${videoPreviewItems.length === 1 ? '' : 's'}`}
                                      className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                                    >
                                      <FileVideo className="h-4 w-4 flex-shrink-0" />
                                      <span>View Video</span>
                                    </button>
                                  )}

                                  {documentPreviewItems.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDocumentPreview({ documents: documentPreviewItems, currentIndex: 0 })
                                      }
                                      title={`View ${documentPreviewItems.length} document${
                                        documentPreviewItems.length === 1 ? '' : 's'
                                      }`}
                                      className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                                    >
                                      <FileText className="h-4 w-4 flex-shrink-0" />
                                      <span>View Document</span>
                                    </button>
                                  )}

                                  {fileDocuments.map((document, index) => {
                                    const documentUrl = getSupportingDocumentUrl(document);
                                    const label = document.name || `Attachment ${index + 1}`;

                                    return (
                                    <a
                                      key={`${document.data_url}-${index}`}
                                      href={documentUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      title={label}
                                      className="inline-flex max-w-[180px] items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                                    >
                                      <FileImage className="h-4 w-4 flex-shrink-0" />
                                      <span className="truncate">{label}</span>
                                    </a>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">None</span>
                              );
                            })()}
                          </td>
                          <td className="px-3 py-4 align-top">
                            {/* Adjusted Z-index dynamically so active dropdown renders above adjacent elements */}
                            <div
                              className={`relative ${
                                openInlineDropdown?.ticketId === String(ticket.id) && openInlineDropdown.field === 'status'
                                  ? 'z-50'
                                  : 'z-0'
                              }`}
                              onBlur={(e) => {
                                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                                  setOpenInlineDropdown(null);
                                }
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenInlineDropdown(
                                    openInlineDropdown?.ticketId === String(ticket.id) &&
                                      openInlineDropdown.field === 'status'
                                      ? null
                                      : { ticketId: String(ticket.id), field: 'status' }
                                  )
                                }
                                className={`flex h-10 w-full min-w-[110px] items-center justify-center rounded-full border px-3 py-2 text-sm font-semibold shadow-sm outline-none transition focus:ring-4 focus:ring-emerald-100 ${getStatusColor(
                                  ticket.status
                                )}`}
                                aria-haspopup="listbox"
                                aria-expanded={
                                  openInlineDropdown?.ticketId === String(ticket.id) &&
                                  openInlineDropdown.field === 'status'
                                }
                              >
                                <span>{normalizeStatus(ticket.status)}</span>
                              </button>

                              {openInlineDropdown?.ticketId === String(ticket.id) &&
                                openInlineDropdown.field === 'status' && (
                                  <div
                                    role="listbox"
                                    className="absolute left-0 top-full mt-2 min-w-[150px] overflow-hidden rounded-xl border border-emerald-100 bg-white p-1.5 shadow-[0_18px_40px_rgba(6,78,59,0.18)]"
                                  >
                                    {statusOptions.map((status) => {
                                      const isSelected = normalizeStatus(ticket.status) === status;

                                      return (
                                        <button
                                          key={status}
                                          type="button"
                                          role="option"
                                          aria-selected={isSelected}
                                          onClick={() => {
                                            handleInlineUpdate(ticket, { status });
                                            setOpenInlineDropdown(null);
                                          }}
                                          className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-sm font-semibold transition ${getStatusOptionColor(
                                            status,
                                            isSelected
                                          )}`}
                                        >
                                          <span>{status}</span>
                                          {isSelected && <CheckCircle2 className="h-4 w-4" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                            </div>
                          </td>
                          <td className="px-3 py-4 align-top">
                            {/* Adjusted Z-index dynamically so active dropdown renders above adjacent elements */}
                            <div
                              className={`relative ${
                                openInlineDropdown?.ticketId === String(ticket.id) && openInlineDropdown.field === 'assignee'
                                  ? 'z-50'
                                  : 'z-0'
                              }`}
                              onBlur={(e) => {
                                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                                  setOpenInlineDropdown(null);
                                }
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddingAssignee(false);
                                  setNewAssigneeName('');
                                  setOpenInlineDropdown(
                                    openInlineDropdown?.ticketId === String(ticket.id) &&
                                      openInlineDropdown.field === 'assignee'
                                      ? null
                                      : { ticketId: String(ticket.id), field: 'assignee' }
                                  );
                                }}
                                className="flex h-10 w-full items-center justify-center rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:border-emerald-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                aria-haspopup="listbox"
                                aria-expanded={
                                  openInlineDropdown?.ticketId === String(ticket.id) &&
                                  openInlineDropdown.field === 'assignee'
                                }
                              >
                                <span className="truncate">{ticket.assigned_to || 'Unassigned'}</span>
                              </button>

                              {openInlineDropdown?.ticketId === String(ticket.id) &&
                                openInlineDropdown.field === 'assignee' && (
                                  <div
                                    role="listbox"
                                    className="absolute left-0 top-full mt-2 min-w-[180px] overflow-hidden rounded-xl border border-emerald-100 bg-white p-1.5 shadow-[0_18px_40px_rgba(6,78,59,0.18)]"
                                  >
                                    {allAssignees.map((assignee) => {
                                      const currentAssignee = ticket.assigned_to || 'Unassigned';
                                      const isSelected = currentAssignee === assignee;

                                      return (
                                        <div
                                          key={assignee}
                                          className={`flex w-full items-center justify-between rounded-lg pl-1 pr-1.5 py-1 transition ${
                                            isSelected
                                              ? 'bg-emerald-100 text-emerald-900'
                                              : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'
                                          }`}
                                        >
                                          <button
                                            type="button"
                                            role="option"
                                            aria-selected={isSelected}
                                            onClick={() => {
                                              handleInlineUpdate(ticket, {
                                                assigned_to: assignee === 'Unassigned' ? '' : assignee,
                                              });
                                              setOpenInlineDropdown(null);
                                            }}
                                            className="flex-1 text-left text-sm font-semibold px-2.5 py-1.5"
                                          >
                                            {assignee}
                                          </button>
                                          <div className="flex items-center gap-1.5">
                                            {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-700" />}
                                            {customAssignees.includes(assignee) && (
                                              <button
                                                type="button"
                                                onClick={(e) => handleRemoveAssignee(e, assignee)}
                                                className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition"
                                                title="Remove name"
                                              >
                                                <X className="h-3.5 w-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    
                                    {/* New Add Assignee UI */}
                                    <div className="border-t border-emerald-100 mt-1 pt-1">
                                      {isAddingAssignee ? (
                                        <div className="flex items-center gap-1 p-1" onClick={e => e.stopPropagation()}>
                                          <input
                                            type="text"
                                            value={newAssigneeName}
                                            onChange={(e) => setNewAssigneeName(e.target.value)}
                                            placeholder="New name..."
                                            className="w-full text-xs text-black font-medium bg-white placeholder-gray-400 border border-emerald-200 rounded px-2 py-1.5 outline-none focus:border-emerald-500"
                                            autoFocus
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') handleAddAssignee(e);
                                            }}
                                          />
                                          <button
                                            type="button"
                                            onClick={handleAddAssignee}
                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                                          >
                                            <CheckCircle2 className="w-4 h-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setIsAddingAssignee(false);
                                              setNewAssigneeName('');
                                            }}
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setIsAddingAssignee(true);
                                          }}
                                          className="flex w-full items-center gap-2 rounded-lg px-3.5 py-2 text-left text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
                                        >
                                          <Plus className="h-4 w-4" />
                                          <span>Add New Name</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </td>
                          <td className="px-3 py-4 align-top text-sm text-gray-600">
                            <span className="block leading-5">{formatCreatedTimestamp(ticket.created_at)}</span>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <div className="flex flex-col items-start gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setEditingTicket({ ...ticket, status: normalizeStatus(ticket.status) });
                              }}
                              className="whitespace-nowrap text-sm font-medium text-emerald-700 hover:text-emerald-800"
                            >
                              View Details
                            </button>
                            <button
                              type="button"
                              onClick={() => setTicketToDelete(ticket)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {selectedTicket && editingTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TicketIcon className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white">Ticket Details</h2>
              </div>
              <button
                onClick={() => {
                  setSelectedTicket(null);
                  setEditingTicket(null);
                }}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                <p className="text-sm text-gray-600 mb-1">Reference Number</p>
                <p className="text-2xl font-bold text-emerald-700">{selectedTicket.ticket_number}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Name</p>
                    <p className="text-gray-900">{selectedTicket.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Email</p>
                    <p className="text-gray-900">{selectedTicket.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Tag className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Category</p>
                    <p className="text-gray-900">{selectedTicket.problem_category}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Created</p>
                    <p className="text-gray-900">
                      {new Date(selectedTicket.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <FileImage className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600 font-medium">Supporting Document</p>
                  {(() => {
                    const supportingDocuments = getSupportingDocuments(selectedTicket.supporting_document);
                    const imagePreviewItems = getImagePreviewItems(supportingDocuments);
                    const videoPreviewItems = getVideoPreviewItems(supportingDocuments);
                    const documentPreviewItems = getDocumentPreviewItems(supportingDocuments);
                    const fileDocuments = supportingDocuments.filter(
                      (document) =>
                        !isSupportingDocumentImage(document) &&
                        !isSupportingDocumentVideo(document) &&
                        !isSupportingDocumentOfficeFile(document)
                    );

                    return supportingDocuments.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {imagePreviewItems.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setImagePreview({ images: imagePreviewItems, currentIndex: 0 })}
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                          >
                            <FileImage className="h-4 w-4 flex-shrink-0" />
                            View Image
                          </button>
                        )}

                        {videoPreviewItems.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setVideoPreview({ videos: videoPreviewItems, currentIndex: 0 })}
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                          >
                            <FileVideo className="h-4 w-4 flex-shrink-0" />
                            View Video
                          </button>
                        )}

                        {documentPreviewItems.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setDocumentPreview({ documents: documentPreviewItems, currentIndex: 0 })
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                          >
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            View Document
                          </button>
                        )}

                        {fileDocuments.map((document, index) => {
                          const documentUrl = getSupportingDocumentUrl(document);
                          const label = document.name || `Attachment ${index + 1}`;

                          return (
                          <a
                            key={`${document.data_url}-${index}`}
                            href={documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                          >
                            {label}
                            <FileText className="h-4 w-4" />
                          </a>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-400">No media attached</p>
                    );
                  })()}
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 font-medium mb-1">Description & Location</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedTicket.description_location}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Ticket</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <div
                      className="relative"
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                          setOpenModalDropdown(null);
                        }
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenModalDropdown(openModalDropdown === 'status' ? null : 'status')}
                        className={`flex h-11 w-full items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm outline-none transition focus:ring-4 focus:ring-emerald-100 ${getStatusColor(
                          editingTicket.status
                        )}`}
                        aria-haspopup="listbox"
                        aria-expanded={openModalDropdown === 'status'}
                      >
                        <span>{editingTicket.status}</span>
                        <ChevronDown
                          className={`h-4 w-4 text-current opacity-70 transition ${
                            openModalDropdown === 'status' ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {openModalDropdown === 'status' && (
                        <div
                          role="listbox"
                          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-emerald-100 bg-white p-1.5 shadow-[0_18px_40px_rgba(6,78,59,0.18)]"
                        >
                          {statusOptions.map((status) => {
                            const isSelected = editingTicket.status === status;

                            return (
                              <button
                                key={status}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  setEditingTicket({ ...editingTicket, status });
                                  setOpenModalDropdown(null);
                                }}
                                className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-sm font-semibold transition ${getStatusOptionColor(
                                  status,
                                  isSelected
                                )}`}
                              >
                                <span>{status}</span>
                                {isSelected && <CheckCircle2 className="h-4 w-4" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
                    <div
                      className="relative"
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                          setOpenModalDropdown(null);
                        }
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingAssignee(false);
                          setNewAssigneeName('');
                          setOpenModalDropdown(openModalDropdown === 'assignee' ? null : 'assignee');
                        }}
                        className="flex h-11 w-full items-center justify-between rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm outline-none transition hover:border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                        aria-haspopup="listbox"
                        aria-expanded={openModalDropdown === 'assignee'}
                      >
                        <span>{editingTicket.assigned_to || 'Unassigned'}</span>
                        <ChevronDown
                          className={`h-4 w-4 text-emerald-600 transition ${
                            openModalDropdown === 'assignee' ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {openModalDropdown === 'assignee' && (
                        <div
                          role="listbox"
                          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-emerald-100 bg-white p-1.5 shadow-[0_18px_40px_rgba(6,78,59,0.18)]"
                        >
                          {allAssignees.map((assignee) => {
                            const currentAssignee = editingTicket.assigned_to || 'Unassigned';
                            const isSelected = currentAssignee === assignee;

                            return (
                              <div
                                key={assignee}
                                className={`flex w-full items-center justify-between rounded-lg pl-1 pr-1.5 py-1 transition ${
                                  isSelected
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'
                                }`}
                              >
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
                                  onClick={() => {
                                    setEditingTicket({
                                      ...editingTicket,
                                      assigned_to: assignee === 'Unassigned' ? '' : assignee,
                                    });
                                    setOpenModalDropdown(null);
                                  }}
                                  className="flex-1 text-left text-sm font-semibold px-2.5 py-1.5"
                                >
                                  {assignee}
                                </button>
                                <div className="flex items-center gap-1.5">
                                  {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-700" />}
                                  {customAssignees.includes(assignee) && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleRemoveAssignee(e, assignee)}
                                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition"
                                      title="Remove name"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* New Add Assignee UI */}
                          <div className="border-t border-emerald-100 mt-1 pt-1">
                            {isAddingAssignee ? (
                              <div className="flex items-center gap-1 p-1" onClick={e => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={newAssigneeName}
                                  onChange={(e) => setNewAssigneeName(e.target.value)}
                                  placeholder="New name..."
                                  className="w-full text-xs text-black font-medium bg-white placeholder-gray-400 border border-emerald-200 rounded px-2 py-1.5 outline-none focus:border-emerald-500"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddAssignee(e);
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={handleAddAssignee}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsAddingAssignee(false);
                                    setNewAssigneeName('');
                                  }}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsAddingAssignee(true);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3.5 py-2 text-left text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
                              >
                                <Plus className="h-4 w-4" />
                                <span>Add New Name</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                    <textarea
                      value={editingTicket.remarks}
                      onChange={(e) => setEditingTicket({ ...editingTicket, remarks: e.target.value })}
                      rows={4}
                      placeholder="Add internal notes or remarks"
                      className="w-full px-4 py-2 text-black font-medium bg-white placeholder-gray-400 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdateTicket}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold py-3 rounded-lg hover:from-emerald-700 hover:to-green-700 transition"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setSelectedTicket(null);
                    setEditingTicket(null);
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {imagePreview && activeImagePreview && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 px-20 py-4"
          onClick={() => setImagePreview(null)}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setImagePreview((currentPreview) => {
                if (!currentPreview) {
                  return currentPreview;
                }

                return {
                  ...currentPreview,
                  currentIndex:
                    (currentPreview.currentIndex - 1 + currentPreview.images.length) %
                    currentPreview.images.length,
                };
              });
            }}
            disabled={!canNavigateImagePreview}
            className="absolute left-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-3xl font-semibold leading-none text-emerald-700 shadow-lg transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous image"
          >
            {'<'}
          </button>
          <div
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{activeImagePreview.label}</p>
                <p className="text-xs font-medium text-gray-500">
                  {imagePreview.currentIndex + 1} of {imagePreview.images.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close image preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-100 p-4">
              <img
                src={activeImagePreview.url}
                alt={activeImagePreview.label}
                className="max-h-[78vh] min-w-0 object-contain"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setImagePreview((currentPreview) => {
                if (!currentPreview) {
                  return currentPreview;
                }

                return {
                  ...currentPreview,
                  currentIndex: (currentPreview.currentIndex + 1) % currentPreview.images.length,
                };
              });
            }}
            disabled={!canNavigateImagePreview}
            className="absolute right-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-3xl font-semibold leading-none text-emerald-700 shadow-lg transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next image"
          >
            {'>'}
          </button>
        </div>
      )}

      {videoPreview && activeVideoPreview && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 px-20 py-4"
          onClick={() => setVideoPreview(null)}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setVideoPreview((currentPreview) => {
                if (!currentPreview) {
                  return currentPreview;
                }

                return {
                  ...currentPreview,
                  currentIndex:
                    (currentPreview.currentIndex - 1 + currentPreview.videos.length) %
                    currentPreview.videos.length,
                };
              });
            }}
            disabled={!canNavigateVideoPreview}
            className="absolute left-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-3xl font-semibold leading-none text-emerald-700 shadow-lg transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous video"
          >
            {'<'}
          </button>
          <div
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{activeVideoPreview.label}</p>
                <p className="text-xs font-medium text-gray-500">
                  {videoPreview.currentIndex + 1} of {videoPreview.videos.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVideoPreview(null)}
                className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close video preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-100 p-4">
              <video
                key={activeVideoPreview.url}
                className="max-h-[78vh] min-w-0 max-w-full bg-black"
                controls
                playsInline
              >
                <source src={activeVideoPreview.url} type={activeVideoPreview.type || 'video/mp4'} />
                Your browser cannot play this video.
              </video>
            </div>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setVideoPreview((currentPreview) => {
                if (!currentPreview) {
                  return currentPreview;
                }

                return {
                  ...currentPreview,
                  currentIndex: (currentPreview.currentIndex + 1) % currentPreview.videos.length,
                };
              });
            }}
            disabled={!canNavigateVideoPreview}
            className="absolute right-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-3xl font-semibold leading-none text-emerald-700 shadow-lg transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next video"
          >
            {'>'}
          </button>
        </div>
      )}

      {documentPreview && activeDocumentPreview && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 px-20 py-4"
          onClick={() => setDocumentPreview(null)}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setDocumentPreview((currentPreview) => {
                if (!currentPreview) {
                  return currentPreview;
                }

                return {
                  ...currentPreview,
                  currentIndex:
                    (currentPreview.currentIndex - 1 + currentPreview.documents.length) %
                    currentPreview.documents.length,
                };
              });
            }}
            disabled={!canNavigateDocumentPreview}
            className="absolute left-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-3xl font-semibold leading-none text-emerald-700 shadow-lg transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous document"
          >
            {'<'}
          </button>
          <div
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{activeDocumentPreview.label}</p>
                <p className="text-xs font-medium text-gray-500">
                  {documentPreview.currentIndex + 1} of {documentPreview.documents.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeDocumentPreview.url}
                  download
                  className="rounded-lg border border-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => setDocumentPreview(null)}
                  className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                  aria-label="Close document preview"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-4">
              <div className="mx-auto h-[78vh] min-w-full">
                <iframe
                  key={activeDocumentPreview.url}
                  src={getDocumentPreviewUrl(activeDocumentPreview)}
                  title={activeDocumentPreview.label}
                  className="h-full w-full rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setDocumentPreview((currentPreview) => {
                if (!currentPreview) {
                  return currentPreview;
                }

                return {
                  ...currentPreview,
                  currentIndex: (currentPreview.currentIndex + 1) % currentPreview.documents.length,
                };
              });
            }}
            disabled={!canNavigateDocumentPreview}
            className="absolute right-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-3xl font-semibold leading-none text-emerald-700 shadow-lg transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next document"
          >
            {'>'}
          </button>
        </div>
      )}
    </div>
  );
}