import prisma from "../config/prisma.js";
import { getCache, setCache, clearCache } from "../config/cache.js";
const REVIEWS_TTL = 30;
async function createReview(req, res, next) {
  try {
    const employerId = req.params.id;
    const { rating, comment } = req.body;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ error: "rating must be an integer from 1 to 5" });
    }
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: "comment is required" });
    }
    if (comment.trim().length > 2e3) {
      return res
        .status(400)
        .json({ error: "comment must be 2000 characters or fewer" });
    }
    const employer = await prisma.user.findUnique({
      where: { id: employerId },
    });
    if (!employer || employer.role !== "EMPLOYER") {
      return res.status(404).json({ error: "Employer not found" });
    }
    const shortlisted = await prisma.application.findFirst({
      where: {
        applicantId: req.user.id,
        status: "ACCEPTED",
        job: { employerId },
      },
    });
    if (!shortlisted) {
      return res.status(403).json({
        error:
          "You can review an employer only after being shortlisted (accepted) for one of their jobs.",
      });
    }
    const existing = await prisma.review.findUnique({
      where: { employerId_authorId: { employerId, authorId: req.user.id } },
    });
    if (existing) {
      return res
        .status(409)
        .json({ error: "You've already reviewed this employer" });
    }
    const review = await prisma.review.create({
      data: {
        employerId,
        authorId: req.user.id,
        rating,
        comment: comment.trim(),
      },
    });
    clearCache(`reviews:employer:${employerId}`);
    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
}
async function listEmployerReviews(req, res, next) {
  try {
    const employerId = req.params.id;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      50,
    );
    const skip = (page - 1) * limit;
    const cacheKey = `reviews:employer:${employerId}:p${page}:l${limit}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });
    const [employer, reviews, total, agg] = await Promise.all([
      prisma.user.findUnique({
        where: { id: employerId },
        select: { id: true, fullName: true, avatarUrl: true, role: true },
      }),
      prisma.review.findMany({
        where: { employerId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      }),
      prisma.review.count({ where: { employerId } }),
      prisma.review.aggregate({
        where: { employerId },
        _avg: { rating: true },
      }),
    ]);
    if (!employer || employer.role !== "EMPLOYER") {
      return res.status(404).json({ error: "Employer not found" });
    }
    const payload = {
      employer: {
        id: employer.id,
        fullName: employer.fullName,
        avatarUrl: employer.avatarUrl,
      },
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        averageRating:
          agg._avg.rating != null ? Number(agg._avg.rating.toFixed(2)) : null,
      },
    };
    setCache(cacheKey, payload, REVIEWS_TTL);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}
async function deleteReview(req, res, next) {
  try {
    const review = await prisma.review.findUnique({
      where: { id: req.params.id },
    });
    if (!review) return res.status(404).json({ error: "Review not found" });
    if (review.authorId !== req.user.id && req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "You can only delete your own reviews" });
    }
    await prisma.review.delete({ where: { id: review.id } });
    clearCache(`reviews:employer:${review.employerId}`);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
export { createReview, deleteReview, listEmployerReviews };
