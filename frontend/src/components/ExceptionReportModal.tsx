import { useState } from 'react';
import type { EventPayload, EventType } from '../types';
import { Modal } from './ui/Modal';

interface ExceptionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: EventPayload) => Promise<void>;
  defaultOrderId?: number;
  defaultSkuId?: number;
}

export function ExceptionReportModal({
  isOpen,
  onClose,
  onSubmit,
  defaultOrderId,
  defaultSkuId
}: ExceptionReportModalProps) {
  const [eventType, setEventType] = useState<EventType>('ITEM_DAMAGED');
  const [skuId, setSkuId] = useState<number>(defaultSkuId || 0);
  const [quantity, setQuantity] = useState<number>(1);
  const [locationId, setLocationId] = useState<number | undefined>();
  const [orderId, setOrderId] = useState<number | undefined>(defaultOrderId);
  const [notes, setNotes] = useState<string>('');
  const [failureReason, setFailureReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload: EventPayload = {
      event_type: eventType,
      sku_id: skuId,
      quantity,
      location_id: locationId,
      order_id: orderId,
      notes: notes || undefined,
      failure_reason: eventType === 'QC_FAILED' ? failureReason : undefined,
    };

    try {
      await onSubmit(payload);
      onClose();
      // Reset form
      setEventType('ITEM_DAMAGED');
      setSkuId(defaultSkuId || 0);
      setQuantity(1);
      setLocationId(undefined);
      setOrderId(defaultOrderId);
      setNotes('');
      setFailureReason('');
    } catch (error) {
      console.error('Failed to submit exception:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report Issue">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Event Type */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Event Type *
          </label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value as EventType)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="ITEM_DAMAGED">Item Damaged</option>
            <option value="ITEM_MISSING">Item Missing</option>
            <option value="QC_FAILED">QC Failed</option>
          </select>
        </div>

        {/* SKU ID */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            SKU ID *
          </label>
          <input
            type="number"
            value={skuId || ''}
            onChange={(e) => setSkuId(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            min="1"
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Quantity *
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            min="1"
          />
        </div>

        {/* Location ID */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Location ID (Bin)
          </label>
          <input
            type="number"
            value={locationId || ''}
            onChange={(e) => setLocationId(e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="1"
          />
        </div>

        {/* Order ID */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Related Order ID
          </label>
          <input
            type="number"
            value={orderId || ''}
            onChange={(e) => setOrderId(e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="1"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Additional details about the issue..."
          />
        </div>

        {/* Failure Reason (for QC_FAILED) */}
        {eventType === 'QC_FAILED' && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Failure Reason *
            </label>
            <select
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a reason...</option>
              <option value="Quantity Mismatch">Quantity Mismatch</option>
              <option value="Defective Packaging">Defective Packaging</option>
              <option value="Wrong Item">Wrong Item</option>
              <option value="Damaged Product">Damaged Product</option>
              <option value="Other">Other</option>
            </select>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-zinc-200 text-zinc-900 rounded-md font-medium hover:bg-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
