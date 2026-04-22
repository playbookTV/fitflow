import { Router, Request, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { searchExercises, fetchExercise } from "../services/ymove";

const router: Router = Router();

// GET /exercises - List all exercises (paginated with search)
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
    const { search, category } = req.query;

    try {
        const exercises = await prisma.exercise.findMany({
            where: {
                AND: [
                    search ? { name: { contains: String(search), mode: "insensitive" } } : {},
                    category ? { category: String(category) } : {},
                ],
            },
            take: 50,
            orderBy: { name: "asc" },
        });
        res.json(exercises);
    } catch (error) {
        console.error("[GET /exercises]", error);
        res.status(500).json({ error: "Failed to fetch exercises" });
    }
});

// GET /exercises/ymove-search - Search YMove exercise library
router.get("/ymove-search", authenticate, async (req: AuthRequest, res: Response) => {
    const { search, muscleGroup, equipment } = req.query;

    if (!search && !muscleGroup) {
        return res.status(400).json({ error: "search or muscleGroup is required" });
    }

    try {
        const results = await searchExercises({
            search: search ? String(search) : undefined,
            muscleGroup: muscleGroup ? String(muscleGroup) : undefined,
            equipment: equipment ? String(equipment) : undefined,
            limit: 20,
        });

        // Strip video URLs — only return metadata + thumbnails
        const safe = results.map(({ videoUrl, videoHlsUrl, ...rest }) => rest);
        res.json(safe);
    } catch (error) {
        console.error("[GET /exercises/ymove-search]", error);
        res.status(500).json({ error: "Failed to search YMove exercises" });
    }
});

// POST /exercises/ymove-import - Import a YMove exercise into the local library
router.post("/ymove-import", authenticate, async (req: AuthRequest, res: Response) => {
    const { ymoveId } = req.body;

    if (!ymoveId) {
        return res.status(400).json({ error: "ymoveId is required" });
    }

    // Prevent path traversal — ymoveId is interpolated into a URL path
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(ymoveId)) {
        return res.status(400).json({ error: "Invalid ymoveId format" });
    }

    try {
        // Check if already imported
        const existing = await prisma.exercise.findUnique({ where: { ymoveId } });
        if (existing) {
            return res.json(existing);
        }

        // Fetch from YMove
        const ymEx = await fetchExercise(ymoveId);

        const exercise = await prisma.exercise.create({
            data: {
                name: ymEx.title,
                category: ymEx.muscleGroup || "Uncategorized",
                muscles: ymEx.muscleGroup ? [ymEx.muscleGroup] : [],
                demoVideoUrl: ymEx.thumbnailUrl || null,
                ymoveId: ymEx.id,
            },
        });

        res.status(201).json(exercise);
    } catch (error: any) {
        // Handle unique constraint on name
        if (error?.code === "P2002" && error?.meta?.target?.includes("name")) {
            const existing = await prisma.exercise.findFirst({
                where: { name: { mode: "insensitive", equals: req.body.name } },
            });
            if (existing) {
                // Link existing exercise to YMove
                const updated = await prisma.exercise.update({
                    where: { id: existing.id },
                    data: { ymoveId },
                });
                return res.json(updated);
            }
        }
        console.error("[POST /exercises/ymove-import]", error);
        res.status(500).json({ error: "Failed to import exercise" });
    }
});

// GET /exercises/unified-search - Search both local and YMove in one request
router.get("/unified-search", authenticate, async (req: AuthRequest, res: Response) => {
    const search = req.query.q ? String(req.query.q) : undefined;

    if (!search || search.length < 3) {
        return res.json({ results: [] });
    }

    const localPromise = prisma.exercise.findMany({
        where: { name: { contains: search, mode: "insensitive" } },
        take: 50,
        orderBy: { name: "asc" },
    });

    const ymovePromise = Promise.race([
        searchExercises({ search, limit: 20 }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);

    const [localResult, ymoveResult] = await Promise.allSettled([localPromise, ymovePromise]);

    const localExercises = localResult.status === "fulfilled" ? localResult.value : [];
    const ymoveExercises = ymoveResult.status === "fulfilled" ? ymoveResult.value ?? [] : [];
    const ymoveUnavailable = ymoveResult.status === "rejected";

    // Build dedup sets from local exercises
    const ymoveIdsSeen = new Set(
        localExercises.filter((e) => e.ymoveId).map((e) => e.ymoveId)
    );
    const localNamesSeen = new Set(
        localExercises.map((e) => e.name.toLowerCase())
    );

    // Normalize local results
    const localResults = localExercises.map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        muscles: e.muscles,
        thumbnailUrl: e.demoVideoUrl ?? undefined,
        source: "local" as const,
        ymoveId: e.ymoveId ?? undefined,
    }));

    // Normalize + deduplicate YMove results
    const ymoveResults = ymoveExercises
        .filter((ym) => !ymoveIdsSeen.has(ym.id) && !localNamesSeen.has(ym.title.toLowerCase()))
        .map((ym) => ({
            id: ym.id,
            name: ym.title,
            category: ym.muscleGroup || "Uncategorized",
            muscles: ym.muscleGroup ? [ym.muscleGroup] : [],
            thumbnailUrl: ym.thumbnailUrl,
            source: "ymove" as const,
            ymoveId: ym.id,
        }));

    const results = [...localResults, ...ymoveResults].slice(0, 50);

    res.json({ results, ...(ymoveUnavailable && { ymoveUnavailable: true }) });
});

export default router;
