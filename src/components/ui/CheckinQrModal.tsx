// File: src/components/ui/CheckinQrModal.tsx (NEW FILE)
'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { QrCode, Loader2, Info } from "lucide-react"
import { QRCodeSVG as QRCode } from "qrcode.react"
import { format } from "date-fns";

interface CheckinQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  eventName: string;
  hostAddress: string;
}

export function CheckinQrModal({ isOpen, onClose, eventId, eventName, hostAddress }: CheckinQrModalProps) {
    
    // Hardcoded demo check-in payload (This is what the scanner would validate)
    const checkinPayload = JSON.stringify({
        verifier: hostAddress,
        event_id: eventId,
        timestamp: new Date().toISOString(),
        purpose: "CHECK_IN_QR",
        // In a real system, a signed token from the host would be here. We use a mock data structure.
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                        <QrCode className="w-5 h-5" />
                        <span>Event Check-in QR Code</span>
                    </DialogTitle>
                    <DialogDescription>
                        Display this QR code to event staff to allow them to scan and verify attendees.
                    </DialogDescription>
                </DialogHeader>
                <div className="text-center py-4 space-y-4">
                    <p className="text-xl font-semibold text-white">{eventName}</p>
                    <div className="inline-block p-4 bg-white rounded-xl shadow-2xl">
                        {checkinPayload ? (
                            <QRCode value={checkinPayload} size={300} level="H" />
                        ) : (
                            <Loader2 className="h-16 w-16 animate-spin text-gray-400" />
                        )}
                    </div>
                    <div className="flex items-center justify-center p-3 text-sm rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        <Info className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>This QR is for *Staff Scanning* only, not for individual tickets.</span>
                    </div>
                </div>
                <Button onClick={onClose} className="w-full mt-4">Close</Button>
            </DialogContent>
        </Dialog>
    );
}