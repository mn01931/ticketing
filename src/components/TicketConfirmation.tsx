import { useState, useEffect } from 'react';
import { getTicketByNumber, Ticket } from '../lib/localData';
import { CheckCircle, Loader2, ArrowLeft, Calendar, User, Mail, Tag, MapPin } from 'lucide-react';

interface TicketConfirmationProps {
  ticketNumber: string;
  onBackToForm: () => void;
}

export function TicketConfirmation({ ticketNumber, onBackToForm }: TicketConfirmationProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTicket();
  }, [ticketNumber]);

  const fetchTicket = async () => {
    try {
      const data = await getTicketByNumber(ticketNumber);
      setTicket(data);
    } catch (err) {
      console.error('Error fetching ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-lime-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-lime-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Concern record not found</p>
          <button
            onClick={onBackToForm}
            className="mt-4 text-emerald-700 hover:text-emerald-800 font-medium"
          >
            Back to Form
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-lime-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-8 py-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-emerald-50 rounded-full p-3">
                <CheckCircle className="w-12 h-12 text-emerald-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Ticket Submitted Successfully!</h1>
            <p className="text-emerald-100">Your ticket has been received and will be processed shortly.</p>
          </div>

          <div className="p-8">
            <div className="bg-gradient-to-r from-emerald-50 to-lime-50 rounded-xl p-6 mb-6 border-2 border-emerald-200">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Your Reference Number</p>
                <p className="text-4xl font-bold text-emerald-700">{ticket.ticket_number}</p>
                <p className="text-sm text-gray-500 mt-2">Please save this number for follow-up and tracking</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Concern Details</h2>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600 font-medium">Name</p>
                  <p className="text-gray-900">{ticket.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600 font-medium">Email</p>
                  <p className="text-gray-900">{ticket.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Tag className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600 font-medium">Problem Category</p>
                  <p className="text-gray-900">{ticket.problem_category}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <MapPin className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 font-medium mb-1">Concern Details & Location</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{ticket.description_location}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Calendar className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600 font-medium">Submitted On</p>
                  <p className="text-gray-900">
                    {new Date(ticket.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex-1">
                  <p className="text-sm text-emerald-800 font-medium mb-1">Status</p>
                  <div className="inline-block">
                    <span className="px-3 py-1 bg-emerald-600 text-white text-sm font-medium rounded-full">
                      {ticket.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={onBackToForm}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition"
              >
                <ArrowLeft className="w-5 h-5" />
                Submit Another Concern
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
