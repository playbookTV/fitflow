import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import ProfilePage from "./ProfilePage";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ProfileData {
    redirect?: string;
    coach: {
        name: string;
        slug: string;
        businessName: string | null;
        bio: string | null;
        avatarUrl: string | null;
        specialities: string[];
    };
    rates: {
        paymentModel: string;
        currency: string;
        pricePerSession: number | null;
        sessionsPerBlock: number | null;
        monthlyRate: number | null;
    } | null;
    channels: Record<string, string>;
    offers: Array<{
        id: string;
        name: string;
        slug: string;
        ctaType: string | null;
    }>;
}

async function fetchProfile(slug: string): Promise<ProfileData | null> {
    try {
        const res = await fetch(`${API_URL}/p/profile/${slug}`, {
            next: { revalidate: 60 },
        });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

export async function generateMetadata(
    { params }: { params: { slug: string } }
): Promise<Metadata> {
    const data = await fetchProfile(params.slug);
    if (!data || data.redirect) {
        return { title: "Profile Not Found | FitFlow" };
    }

    const title = `${data.coach.name || data.coach.slug} — Personal Trainer`;
    const description = data.coach.bio
        ? data.coach.bio.slice(0, 155)
        : `Train with ${data.coach.name || data.coach.slug}`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url: `https://ftfw.fit/${data.coach.slug}`,
            ...(data.coach.avatarUrl && { images: [data.coach.avatarUrl] }),
        },
        twitter: {
            card: "summary",
            title,
            description,
        },
    };
}

export default async function TrainerProfilePage({
    params,
    searchParams,
}: {
    params: { slug: string };
    searchParams: { c?: string };
}) {
    const data = await fetchProfile(params.slug);

    if (!data) {
        notFound();
    }

    // Handle slug redirect (old slug → new slug)
    if (data.redirect) {
        const query = searchParams.c ? `?c=${searchParams.c}` : "";
        redirect(`/t/${data.redirect}${query}`);
    }

    // Handle ?c= channel redirects (instant 301)
    const channelParam = searchParams.c;
    if (channelParam && data.channels[channelParam]) {
        // Fire redirect event before redirecting
        fetch(`${API_URL}/p/profile/${params.slug}/event`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                event: "redirect",
                channel: channelParam,
                source: `${channelParam}_link`,
            }),
        }).catch(() => {});

        redirect(data.channels[channelParam]);
    }

    // Render profile page (unknown ?c= values fall through here — not an error)
    return <ProfilePage data={data} />;
}
