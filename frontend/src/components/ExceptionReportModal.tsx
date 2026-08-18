import { useState, useId } from 'react';
import type { EventPayload, EventType } from '../types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

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

  const baseId = useId();
  const eventTypeId = `${baseId}-event-type`;
  const skuIdId = `${baseId}-sku-id`;
  const quantityId = `${baseId}-quantity`;
  const locationIdId = `${baseId}-location-id`;
  const orderIdId = `${baseId}-order-id`;
  const notesId = `${baseId}-notes`;
  const failureReasonId = `${baseId}-failure-reason`;

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

  const inputStyles = "w-full px-3.5 py-2.5 bg-[#16192b] border border-[#424769] text-white rounded-xl focus:outline-none focus:border-[#f9b17a] font-sans text-xs transition-colors";
  const labelStyles = "block text-xs font-bold text-white mb-1.5 uppercase tracking-wider font-heading";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report Warehouse Disruption / Issue">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Event Type */}
        <div>
          <label htmlFor={eventTypeId} className={labelStyles}>
            Disruption Type <span className="text-[#f9b17a]" aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <select
            id={eventTypeId}
            value={eventType}
            onChange={(e) => setEventType(e.target.value as EventType)}
            className={inputStyles}
            required
            aria-required="true"
          >
            <option value="ITEM_DAMAGED">Item Damaged in Bin</option>
            <option value="ITEM_MISSING">Item Missing / Discrepancy</option>
            <option value="QC_FAILED">QC Inspection Failed</option>
          </select>
        </div>

        {/* SKU ID */}
        <div>
          <label htmlFor={skuIdId} className={labelStyles}>
            SKU ID <span className="text-[#f9b17a]" aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input
            id={skuIdId}
            type="number"
            value={skuId || ''}
            onChange={(e) => setSkuId(parseInt(e.target.value) || 0)}
            className={inputStyles}
            required
            aria-required="true"
            min="1"
          />
        </div>

        {/* Quantity */}
        <div>
          <label htmlFor={quantityId} className={labelStyles}>
            Affected Quantity <span className="text-[#f9b17a]" aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input
            id={quantityId}
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            className={inputStyles}
            required
            aria-required="true"
            min="1"
          />
        </div>

        {/* Location ID */}
        <div>
          <label htmlFor={locationIdId} className={labelStyles}>
            Bin Location ID (Optional)
          </label>
          <input
            id={locationIdId}
            type="number"
            value={locationId || ''}
            onChange={(e) => setLocationId(e.target.value ? parseInt(e.target.value) : undefined)}
            className={inputStyles}
            min="1"
            placeholder="e.g. Bin 1"
          />
        </div>

        {/* Order ID */}
        <div>
          <label htmlFor={orderIdId} className={labelStyles}>
            Related Order ID (Optional)
          </label>
          <input
            id={orderIdId}
            type="number"
            value={orderId || ''}
            onChange={(e) => setOrderId(e.target.value ? parseInt(e.target.value) : undefined)}
            className={inputStyles}
            min="1"
            placeholder="e.g. Order 101"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor={notesId} className={labelStyles}>
            Contextual Notes
          </label>
          <textarea
            id={notesId}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputStyles}
            rows={3}
            placeholder="Additional details about the issue for the decision engine..."
          />
        </div>

        {/* Failure Reason (for QC_FAILED) */}
        {eventType === 'QC_FAILED' && (
          <div>
            <label htmlFor={failureReasonId} className={labelStyles}>
              QC Failure Reason <span className="text-[#f9b17a]" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <select
              id={failureReasonId}
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              className={inputStyles}
              required
              aria-required="true"
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
        <div className="flex gap-3 pt-4 border-t border-[#424769]/50">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            className="flex-1"
          >
            Submit Report
          </Button>
        </div>
      </form>
    </Modal>
  );
}

