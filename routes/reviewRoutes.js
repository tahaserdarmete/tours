import express from "express";
import {protect} from "../controller/authController.js";
import {
  createReview,
  deleteReview,
  getAllReviews,
  updateReview,
} from "../controller/reviewController.js";

const router = express.Router();

// Rotaları belirliyoruz

// /api/reviews

router.route("/").get(getAllReviews).post(protect, createReview);

// ID parametresine sahip rotalar
router.route("/:id").delete(protect, deleteReview).patch(protect, updateReview);

export default router;
