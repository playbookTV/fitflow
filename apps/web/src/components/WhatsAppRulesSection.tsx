"use client";

import { Clock, FileText, Gauge, MessageCircle } from "lucide-react";

export function WhatsAppRulesSection() {
    return (
        <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-text-secondary font-medium">
                <MessageCircle className="w-4 h-4" />
                WhatsApp Messaging Rules
            </div>

            <div className="space-y-2">
                <details className="group rounded-xl bg-bg-hover border border-border">
                    <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer text-sm text-white hover:bg-white/5 rounded-xl transition-colors">
                        <Clock className="w-4 h-4 text-brand-green shrink-0" />
                        <span className="flex-1">24-Hour Messaging Window</span>
                        <span className="text-text-faint text-xs group-open:hidden">Tap to learn more</span>
                    </summary>
                    <div className="px-4 pb-4 text-xs text-text-secondary space-y-2">
                        <p>
                            WhatsApp requires that businesses can only send free-text messages within <strong className="text-white">24 hours</strong> of the client&apos;s last message.
                        </p>
                        <p>
                            After 24 hours, the messaging window closes. You&apos;ll see a warning in the chat when this happens.
                        </p>
                        <p>
                            <strong className="text-white">How to reopen:</strong> The client needs to send you a message. Each client reply resets the 24-hour timer.
                        </p>
                    </div>
                </details>

                <details className="group rounded-xl bg-bg-hover border border-border">
                    <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer text-sm text-white hover:bg-white/5 rounded-xl transition-colors">
                        <FileText className="w-4 h-4 text-brand-blue shrink-0" />
                        <span className="flex-1">Message Templates</span>
                        <span className="text-text-faint text-xs group-open:hidden">Tap to learn more</span>
                    </summary>
                    <div className="px-4 pb-4 text-xs text-text-secondary space-y-2">
                        <p>
                            When the messaging window is closed, FitFlow uses <strong className="text-white">pre-approved templates</strong> to deliver messages automatically.
                        </p>
                        <p>
                            <strong className="text-white">Automated messages</strong> like workout deliveries, check-in reminders, and re-engagement nudges are sent as templates — so they&apos;ll still reach your clients even when the window is closed.
                        </p>
                        <p>
                            <strong className="text-white">Custom messages</strong> (anything you type yourself) require the window to be open.
                        </p>
                    </div>
                </details>

                <details className="group rounded-xl bg-bg-hover border border-border">
                    <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer text-sm text-white hover:bg-white/5 rounded-xl transition-colors">
                        <Gauge className="w-4 h-4 text-brand-violet shrink-0" />
                        <span className="flex-1">Rate Limits &amp; Media</span>
                        <span className="text-text-faint text-xs group-open:hidden">Tap to learn more</span>
                    </summary>
                    <div className="px-4 pb-4 text-xs text-text-secondary space-y-2">
                        <p>
                            WhatsApp limits the number of messages businesses can send per day. FitFlow manages this automatically, but if you send a high volume of messages, some may be temporarily delayed.
                        </p>
                        <p>
                            <strong className="text-white">Videos:</strong> Max 16 MB. <strong className="text-white">Images:</strong> Max 5 MB. Files exceeding these limits will be rejected by WhatsApp.
                        </p>
                    </div>
                </details>
            </div>
        </div>
    );
}
