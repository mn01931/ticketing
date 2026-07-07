export interface Ticket {
  id: string;
  ticket_number: string;
  email: string;
  name: string;
  problem_category: string;
  description_location: string;
  supporting_document: SupportingDocument | SupportingDocument[] | string | null;
  status: string;
  assigned_to: string;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export interface SupportingDocument {
  name: string;
  type: string;
  data_url: string;
}

interface CreateTicketInput {
  email: string;
  name: string;
  problem_category: string;
  description_location: string;
  supporting_document: SupportingDocument[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const FILE_BASE_URL = import.meta.env.DEV ? 'https://ticketing.lakeshore.education' : '';

async function apiRequest<T>(path: string, options: RequestInit = {}) {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      `Could not reach the ticketing API at ${API_BASE_URL}. Check that the domain exists, DNS is active, and the site is online.`
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  const responseText = await response.text();
  let payload: { error?: string } | null = null;

  if (contentType.includes('application/json') || responseText.trim().startsWith('{')) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const responsePreview = responseText.replace(/\s+/g, ' ').trim().slice(0, 160);
    throw new Error(payload?.error ?? `Request failed with HTTP ${response.status}. ${responsePreview}`);
  }

  if (!payload) {
    const responsePreview = responseText.replace(/\s+/g, ' ').trim().slice(0, 160);
    throw new Error(
      `The API did not return JSON. It returned: ${responsePreview || 'an empty response'}. If you are testing locally, upload the dist folder to Hostinger or set VITE_API_BASE_URL to your hosted /api URL.`
    );
  }

  return payload as T;
}

export async function createTicket(input: CreateTicketInput) {
  const payload = await apiRequest<{ ticket: Ticket }>('/create-ticket.php', {
    method: 'POST',
    body: JSON.stringify({
      ...input,
      supporting_document: input.supporting_document,
      supporting_documents: input.supporting_document,
    }),
  });

  if (!payload.ticket?.ticket_number) {
    throw new Error('The API did not return the created ticket. Please check /api/create-ticket.php on the server.');
  }

  if (input.supporting_document.length > 0 && getSupportingDocuments(payload.ticket.supporting_document).length === 0) {
    console.warn(
      'The ticket was created, but the API response did not include the supporting document. Check that the updated API files are deployed.'
    );
  }

  return payload.ticket;
}

export async function getTicketByNumber(ticketNumber: string) {
  const query = new URLSearchParams({ ticket_number: ticketNumber });
  const payload = await apiRequest<{ ticket: Ticket | null }>(`/get-ticket.php?${query.toString()}`);

  return payload.ticket;
}

export async function getAllTickets() {
  const payload = await apiRequest<{ tickets: Ticket[] }>('/get-all-tickets.php');

  return payload.tickets;
}

export async function updateTicket(updatedTicket: Ticket) {
  const payload = await apiRequest<{ ticket: Ticket | null }>('/update-ticket.php', {
    method: 'POST',
    body: JSON.stringify({
      id: updatedTicket.id,
      status: updatedTicket.status,
      assigned_to: updatedTicket.assigned_to,
      remarks: updatedTicket.remarks,
    }),
  });

  return payload.ticket;
}

export async function deleteTicket(ticketId: string) {
  await apiRequest<{ ok: true }>('/delete-ticket.php', {
    method: 'POST',
    body: JSON.stringify({ id: ticketId }),
  });
}

export async function signInAdmin(email: string, password: string) {
  await apiRequest<{ ok: true }>('/admin-login.php', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  return true;
}

export async function signOutAdmin() {
  await apiRequest<{ ok: true }>('/admin-logout.php', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function hasAdminSession() {
  try {
    const payload = await apiRequest<{ is_admin: boolean }>('/admin-session.php');

    return payload.is_admin;
  } catch (error) {
    console.warn(error);
    return false;
  }
}

function isSupportingDocument(value: unknown): value is SupportingDocument {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data_url' in value &&
    typeof (value as SupportingDocument).data_url === 'string' &&
    (value as SupportingDocument).data_url.trim() !== ''
  );
}

function createSupportingDocumentFromUrl(value: string): SupportingDocument | null {
  const trimmedValue = value.trim();

  if (!trimmedValue || trimmedValue === 'null' || trimmedValue === '[]') {
    return null;
  }

  const name = trimmedValue.split('/').pop() || 'Supporting document';

  return {
    name,
    type: '',
    data_url: trimmedValue,
  };
}

export function getSupportingDocumentUrl(document: SupportingDocument) {
  if (document.data_url.startsWith('data:') || document.data_url.startsWith('http')) {
    return document.data_url;
  }

  return `${FILE_BASE_URL}${document.data_url}`;
}

export function isSupportingDocumentImage(document: SupportingDocument) {
  if (document.type.startsWith('image/')) {
    return true;
  }

  return /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(document.data_url) || /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(document.name);
}

export function isSupportingDocumentVideo(document: SupportingDocument) {
  if (document.type.startsWith('video/')) {
    return true;
  }

  return /\.(m4v|mov|mp4|ogg|ogv|webm)$/i.test(document.data_url) || /\.(m4v|mov|mp4|ogg|ogv|webm)$/i.test(document.name);
}

export function isSupportingDocumentOfficeFile(document: SupportingDocument) {
  const normalizedType = document.type.toLowerCase();

  return (
    normalizedType.includes('pdf') ||
    normalizedType.includes('msword') ||
    normalizedType.includes('wordprocessingml') ||
    /\.(doc|docs|docx|pdf)$/i.test(document.data_url) ||
    /\.(doc|docs|docx|pdf)$/i.test(document.name)
  );
}

export function getSupportingDocuments(
  documents: SupportingDocument | SupportingDocument[] | string | null
) {
  if (!documents) {
    return [];
  }

  if (typeof documents === 'string') {
    try {
      const parsedDocuments = JSON.parse(documents) as unknown;
      return getSupportingDocuments(
        parsedDocuments as SupportingDocument | SupportingDocument[] | string | null
      );
    } catch {
      const document = createSupportingDocumentFromUrl(documents);
      return document ? [document] : [];
    }
  }

  if (Array.isArray(documents)) {
    return documents.filter(isSupportingDocument);
  }

  return isSupportingDocument(documents) ? [documents] : [];
}