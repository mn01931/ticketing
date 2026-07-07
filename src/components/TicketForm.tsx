import { useState } from 'react';
import { createTicket, SupportingDocument, Ticket } from '../lib/localData';
import { CheckCircle2, Loader2, Paperclip, RotateCcw, X } from 'lucide-react';

interface TicketFormProps {
  onGoHome: () => void;
}

const initialFormData = {
  email: '',
  name: '',
  problem_category: '',
  description_location: '',
};

const fieldClass =
  'w-full rounded-lg border border-[#d8e6cf] bg-white px-4 py-3 text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[#3a7a2b] focus:outline-none focus:ring-4 focus:ring-[#3a7a2b]/18';

const labelClass = 'mb-2 block text-sm font-bold text-[#245d1d]';
const maxSupportingDocuments = 10;

export function TicketForm({ onGoHome }: TicketFormProps) {
  const [supportingDocuments, setSupportingDocuments] = useState<SupportingDocument[]>([]);
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<Ticket | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);

    if (files.length === 0) {
      setSupportingDocuments([]);
      return;
    }

    setSubmittedTicket(null);

    try {
      const documents = await Promise.all(
        files.map(async (file) => {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          });

          return {
            name: file.name,
            type: file.type,
            data_url: dataUrl,
          };
        })
      );

      setSupportingDocuments((currentDocuments) => {
        const availableSlots = maxSupportingDocuments - currentDocuments.length;

        if (availableSlots <= 0) {
          setError('You can attach up to 10 files only.');
          return currentDocuments;
        }

        if (documents.length > availableSlots) {
          setError(`Only ${availableSlots} more file${availableSlots === 1 ? '' : 's'} can be added.`);
          return [...currentDocuments, ...documents.slice(0, availableSlots)];
        }

        setError('');
        return [...currentDocuments, ...documents];
      });
      e.target.value = '';
    } catch (err) {
      console.error('Error reading supporting document:', err);
      setError('Failed to attach supporting document. Please try another file.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const ticket = await createTicket({
        ...formData,
        supporting_document: supportingDocuments,
      });
      setSubmittedTicket(ticket);
      setFormData(initialFormData);
      setSupportingDocuments([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit ticket. Please try again.');
      console.error('Error submitting ticket:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearForm = () => {
    setFormData(initialFormData);
    setSupportingDocuments([]);
    setError('');
    setSubmittedTicket(null);
  };

  const previewTicketNumber =
    submittedTicket?.ticket_number ||
    (formData.name || formData.email || formData.problem_category || formData.description_location
      ? 'LSC-2026-0002'
      : 'LSC-2026-0000');
  const previewName = submittedTicket?.name || formData.name || 'You You';
  const previewEmail = submittedTicket?.email || formData.email || 'you@gmail.com';
  const previewCategory = submittedTicket?.problem_category || formData.problem_category || 'Choose a category';
  const previewDescription =
    submittedTicket?.description_location || formData.description_location || 'No description entered yet.';
  const previewStatus = submittedTicket?.status || 'Open';
  const previewReceivedDate = submittedTicket?.created_at ? new Date(submittedTicket.created_at) : new Date();
  const hasSubmittedTicket = Boolean(submittedTicket);

  const updateFormData = (updatedFormData: typeof initialFormData) => {
    setFormData(updatedFormData);
    setSubmittedTicket(null);
  };

  const updateSupportingDocuments = (
    documents:
      | SupportingDocument[]
      | ((currentDocuments: SupportingDocument[]) => SupportingDocument[])
  ) => {
    setSupportingDocuments(documents);
    setSubmittedTicket(null);
  };

  return (
    <div className="min-h-screen bg-[#3a7a2b] px-4 py-5 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1320px] space-y-5">
        <header className="flex flex-col gap-5 rounded-2xl border border-white/15 bg-[#2f6b23] px-5 py-5 shadow-[0_16px_44px_rgba(17,54,19,0.18)] sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-[0_10px_30px_rgba(17,24,39,0.12)]">
              <img src="/assets/logo.png" alt="Lake Shore Colleges logo" className="h-11 w-11 object-contain" />
            </div>
            <div>
              <p className="font-display text-xl font-extrabold uppercase tracking-[0.04em] text-white sm:text-3xl">
                Lake Shore
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70 sm:text-sm">
                Ticketing Portal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white px-5 py-3 text-sm font-semibold text-[#245d1d] shadow-sm transition hover:bg-[#f8fafc] sm:self-start lg:self-auto"
          >
            Back to Homepage
          </button>
        </header>

        <section className="rounded-2xl border border-white/15 bg-white p-5 shadow-[0_18px_48px_rgba(17,54,19,0.16)] sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#3a7a2b]">Public Form</p>
              <h1 className="mt-2 font-display text-4xl font-extrabold leading-tight tracking-tight text-[#245d1d] sm:text-5xl">
                Report a concern
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Share the details we need to route your concern, then review your ticket summary before submitting.
              </p>
            </div>
          </div>
        </section>

        <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_480px]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[#d8e6cf] bg-white p-5 text-slate-900 shadow-[0_18px_48px_rgba(17,54,19,0.14)] sm:p-7"
          >
            <div className="mb-6 flex flex-col gap-3 border-b border-[#e5efd9] pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#3a7a2b]">Ticket Details</p>
                <h2 className="mt-1 font-display text-2xl font-extrabold text-[#245d1d]">Tell us what happened</h2>
              </div>
              <div className="self-start rounded-full border border-[#f1cb43] bg-[#fff8d6] px-3 py-1.5 text-xs font-bold text-[#245d1d] sm:text-sm">
                * Required fields
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#d8e6cf] bg-[#f4f9ee] p-4">
                <p className="mb-4 text-sm font-extrabold uppercase tracking-[0.16em] text-[#3a7a2b]">Contact</p>
                <div>
                  <label htmlFor="name" className={labelClass}>
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => updateFormData({ ...formData, name: e.target.value })}
                    className={fieldClass}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="mt-4">
                  <label htmlFor="email" className={labelClass}>
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => updateFormData({ ...formData, email: e.target.value })}
                    className={fieldClass}
                    placeholder="you@lakeshore.edu.ph"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#d8e6cf] bg-[#f4f9ee] p-4">
                <p className="mb-4 text-sm font-extrabold uppercase tracking-[0.16em] text-[#3a7a2b]">Concern</p>
                <div>
                  <label htmlFor="category" className={labelClass}>
                    Problem Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    required
                    value={formData.problem_category}
                    onChange={(e) => updateFormData({ ...formData, problem_category: e.target.value })}
                    className={fieldClass}
                  >
                    <option value="">Choose</option>
                    <option value="Hardware Problem">Hardware Problem</option>
                    <option value="Software Problem">Software Problem</option>
                    <option value="Internet Problem">Internet Problem</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                <div className="mt-4">
                  <label htmlFor="description" className={labelClass}>
                    Description & Location <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    required
                    value={formData.description_location}
                    onChange={(e) => updateFormData({ ...formData, description_location: e.target.value })}
                    rows={5}
                    className={`${fieldClass} resize-none`}
                    placeholder="Describe the concern and its exact location."
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-[#9fc582] bg-[#f4f9ee] p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-[#245d1d]">Supporting documents</p>
                <p className="text-xs text-slate-500">Up to 10 files: images, video, PDF, DOC, DOCS, or DOCX. No MB limit.</p>
              </div>

              <label
                htmlFor="supporting-document"
                className="mt-3 flex cursor-pointer flex-col gap-2 rounded-xl border border-[#d8e6cf] bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-[#3a7a2b] hover:bg-[#f8fafc] sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Paperclip className="h-4 w-4 text-[#3a7a2b]" />
                  Choose Files
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {supportingDocuments.length > 0
                    ? `${supportingDocuments.length} file${supportingDocuments.length === 1 ? '' : 's'} selected`
                    : 'No file chosen'}
                </span>
              </label>

              <input
                id="supporting-document"
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docs,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="sr-only"
              />

              {supportingDocuments.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {supportingDocuments.map((document, index) => (
                    <div
                      key={`${document.name}-${index}`}
                      className="flex items-center justify-between rounded-xl border border-[#d8e6cf] bg-white px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{document.name}</p>
                        <p className="text-gray-500">{document.type || 'Attached file'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateSupportingDocuments((currentDocuments) =>
                            currentDocuments.filter((_, documentIndex) => documentIndex !== index)
                          )
                        }
                        className="rounded-lg p-2 text-gray-500 transition hover:bg-[#f4f9ee] hover:text-[#245d1d]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-xl bg-white px-4 py-3 text-sm text-slate-500">No files selected.</div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-[#e5efd9] pt-5 sm:flex-row">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-[#245d1d] px-5 py-3 font-display text-sm font-bold text-white shadow-[0_16px_30px_rgba(17,54,19,0.22)] transition hover:-translate-y-0.5 hover:bg-[#1f5019] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Submit Concern
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClearForm}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#d8e6cf] bg-white px-5 py-3 text-sm font-bold text-[#245d1d] transition hover:border-[#3a7a2b] hover:bg-[#f4f9ee]"
              >
                <RotateCcw className="h-5 w-5" />
                Clear Form
              </button>
            </div>
          </form>

          <aside className="rounded-2xl border border-white/15 bg-[#2f6b23] p-5 text-white shadow-[0_18px_48px_rgba(17,54,19,0.18)] xl:sticky xl:top-5 xl:self-start">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#f1cb43]">Ticket Preview</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white">
              Review your ticket
            </h2>

            <div className="mt-5 rounded-2xl border border-white/15 bg-white p-5 text-slate-900 shadow-[0_12px_32px_rgba(17,54,19,0.18)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Case Number</p>
                  <p className="mt-1.5 font-display text-[1.8rem] font-extrabold tracking-tight text-[#245d1d]">
                    {previewTicketNumber}
                  </p>
                </div>
                <span className="inline-flex rounded-full border border-[#f1cb43] bg-[#fff8d6] px-3 py-1.5 text-xs font-bold text-[#245d1d] sm:text-sm">
                  {previewStatus}
                </span>
              </div>

              {hasSubmittedTicket && (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
                  <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
                  <h3 className="mt-3 font-display text-2xl font-extrabold text-[#245d1d]">
                    Ticket Submitted Successfully!
                  </h3>
                  <div className="mt-4 rounded-lg border border-emerald-200 bg-white px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      Your Reference Number
                    </p>
                    <p className="mt-1 font-display text-3xl font-extrabold tracking-tight text-[#245d1d]">
                      {previewTicketNumber}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Please save this number for follow-up and tracking.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Submitted By</p>
                  <p className="mt-1.5 font-semibold text-slate-800">{previewName}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Email</p>
                  <p className="mt-1.5 break-all font-semibold text-slate-800">{previewEmail}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Category</p>
                  <p className="mt-1.5 font-semibold text-slate-800">{previewCategory}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Received</p>
                  <p className="mt-1.5 font-semibold text-slate-800">
                    {previewReceivedDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: hasSubmittedTicket ? '2-digit' : undefined,
                      minute: hasSubmittedTicket ? '2-digit' : undefined,
                    })}
                  </p>
                </div>

                <div className="rounded-xl bg-[#f4f9ee] px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Description & Location
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-slate-700">
                    {previewDescription}
                  </p>
                </div>

                <div className="rounded-xl bg-[#f4f9ee] px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Supporting Documents
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-slate-700">
                    {supportingDocuments.length > 0
                      ? `${supportingDocuments.length} attachment${supportingDocuments.length === 1 ? '' : 's'} selected.`
                      : 'No attachments uploaded.'}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
