"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Plus, Link2, Users, Trash2, Copy, MessageCircle, QrCode } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter, ModalClose } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/auth";

interface Offer {
    id: string;
    name: string;
    slug: string;
    channelParam: string | null;
    ctaType: string | null;
    paymentRoute: string | null;
    isActive: boolean;
    _count: { leads: number };
    createdAt: string;
}

export default function OffersPage() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newOffer, setNewOffer] = useState({ name: "", slug: "" });
    const [creating, setCreating] = useState(false);
    const [waLink, setWaLink] = useState<string | null>(null);
    const [showQrOffer, setShowQrOffer] = useState<string | null>(null);
    const [shortLinks, setShortLinks] = useState<Record<string, { id: string; shortUrl: string }>>({});
    const [coachSlug, setCoachSlug] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const fetchOffers = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/offers`, {
                headers: await getAuthHeaders(),
            });
            if (res.ok) setOffers(await res.json());
        } catch (error) {
            console.error("Failed to fetch offers:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchChannels = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/coaches/channels`, {
                headers: await getAuthHeaders(),
            });
            if (res.ok) {
                const data = await res.json();
                setWaLink(data.whatsapp?.waLink || null);
            }
        } catch (error) {
            console.error("Failed to fetch channels:", error);
        }
    };

    const fetchShortLinks = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/short-links`, {
                headers: await getAuthHeaders(),
            });
            if (res.ok) {
                const links = await res.json();
                const map: Record<string, { id: string; shortUrl: string }> = {};
                for (const link of links) {
                    map[link.label || link.code] = { id: link.id, shortUrl: link.shortUrl };
                }
                setShortLinks(map);
            }
        } catch { /* silent */ }
    };

    const fetchCoachSlug = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/coaches/me`, {
                headers: await getAuthHeaders(),
            });
            if (res.ok) {
                const data = await res.json();
                setCoachSlug(data.slug || null);
            }
        } catch (error) {
            console.error("Failed to fetch coach slug:", error);
        }
    };

    useEffect(() => { fetchOffers(); fetchChannels(); fetchShortLinks(); fetchCoachSlug(); }, []);

    const handleCreate = async () => {
        if (!newOffer.name || !newOffer.slug) return;
        setCreating(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/offers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(await getAuthHeaders()),
                },
                body: JSON.stringify(newOffer),
            });
            if (res.ok) {
                setNewOffer({ name: "", slug: "" });
                setShowCreate(false);
                fetchOffers();
            }
        } catch (error) {
            console.error("Failed to create offer:", error);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/offers/${id}`, {
            method: "DELETE",
            headers: await getAuthHeaders(),
        });
        fetchOffers();
    };

    const copyLink = (offerSlug: string) => {
        const base = coachSlug ? `/${coachSlug}/${offerSlug}` : `/${offerSlug}`;
        navigator.clipboard.writeText(`${window.location.origin}${base}`);
    };

    const copyWaLink = (offerName: string) => {
        if (!waLink) return;
        const url = `${waLink}?text=${encodeURIComponent(`Hi, I'm interested in ${offerName}`)}`;
        navigator.clipboard.writeText(url);
    };

    return (
        <DashboardLayout
            title="Offer Links"
            subtitle="Create shareable links for client acquisition"
            actions={
                <button onClick={() => setShowCreate(true)} className="btn-primary">
                    <Plus className="w-4 h-4" />
                    NEW OFFER
                </button>
            }
        >
            {showCreate && (
                <div className="card p-6 mb-8 animate-fade-in">
                    <h3 className="text-lg font-semibold text-white mb-4 text-balance">Create Offer Link</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="form-field">
                            <label htmlFor="offer-name" className="label">Offer Name</label>
                            <input
                                id="offer-name"
                                type="text"
                                name="offerName"
                                value={newOffer.name}
                                onChange={(e) => setNewOffer({ ...newOffer, name: e.target.value })}
                                className="input"
                                placeholder="e.g. 12-Week Shred"
                            />
                        </div>
                        <div className="form-field">
                            <label htmlFor="offer-slug" className="label">URL Slug</label>
                            <input
                                id="offer-slug"
                                type="text"
                                name="offerSlug"
                                value={newOffer.slug}
                                onChange={(e) =>
                                    setNewOffer({
                                        ...newOffer,
                                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                                    })
                                }
                                className="input"
                                placeholder="e.g. 12-week-shred"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setShowCreate(false)} className="btn-ghost">
                            Cancel
                        </button>
                        <button onClick={handleCreate} disabled={creating} className="btn-primary">
                            {creating ? "Creating..." : "Create Offer"}
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="skeleton h-20 rounded-2xl" />
                    ))}
                </div>
            ) : offers.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <Link2 className="w-6 h-6" />
                    </div>
                    <h3>No offer links yet</h3>
                    <p className="text-text-secondary text-sm text-pretty">
                        Create your first offer link to start capturing leads.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {offers.map((offer) => (
                        <div
                            key={offer.id}
                            className="card p-5 flex items-center justify-between group hover:border-border-hover transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center",
                                        offer.isActive
                                            ? "bg-brand-green/10 text-brand-green"
                                            : "bg-bg-hover text-text-faint"
                                    )}
                                >
                                    <Link2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-white">{offer.name}</p>
                                    <p className="text-sm text-text-faint font-mono">
                                        {coachSlug ? `/${coachSlug}/${offer.slug}` : `/${offer.slug}`}
                                        {offer.channelParam && (
                                            <span className="ml-2 text-brand-blue">
                                                ?ch={offer.channelParam === "WHATSAPP" ? "wa" : "tg"}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 text-text-secondary text-sm tabular-nums">
                                    <Users className="w-4 h-4" />
                                    {offer._count.leads}
                                </div>
                                <button
                                    onClick={() => copyLink(offer.slug)}
                                    className="btn-ghost p-2"
                                    aria-label="Copy intake link"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                                {waLink && (
                                    <button
                                        onClick={() => copyWaLink(offer.name)}
                                        className="btn-ghost p-2 text-brand-green hover:text-brand-green"
                                        aria-label="Copy WhatsApp link"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                    </button>
                                )}
                                {shortLinks[offer.name] && (
                                    <button
                                        onClick={() => setShowQrOffer(showQrOffer === offer.id ? null : offer.id)}
                                        className="btn-ghost p-2 text-brand-cyan hover:text-brand-cyan"
                                        aria-label="Show QR code"
                                    >
                                        <QrCode className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setConfirmDeleteId(offer.id)}
                                    className="btn-ghost p-2 text-brand-red hover:text-brand-red"
                                    aria-label="Delete offer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* QR Code popup */}
                            {showQrOffer === offer.id && shortLinks[offer.name] && (
                                <div className="mt-3 flex justify-center p-4 rounded-xl bg-white">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_API_URL}/short-links/${shortLinks[offer.name].id}/qr?size=200`}
                                        alt={`QR code for ${offer.name}`}
                                        width={200}
                                        height={200}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <Modal open={!!confirmDeleteId} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
                <ModalContent size="sm">
                    <ModalHeader>
                        <ModalTitle>Delete Offer</ModalTitle>
                        <ModalClose />
                    </ModalHeader>
                    <div className="p-6">
                        <p className="text-text-secondary text-sm text-pretty">Are you sure you want to delete this offer? This action cannot be undone.</p>
                    </div>
                    <ModalFooter>
                        <button className="btn-secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                        <button className="btn-primary !bg-brand-red hover:!shadow-glow-red" onClick={async () => {
                            if (!confirmDeleteId) return;
                            await handleDelete(confirmDeleteId);
                            setConfirmDeleteId(null);
                        }}>Delete</button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </DashboardLayout>
    );
}
