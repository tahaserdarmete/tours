import Review from "../models/reviewModel.js";
import {createOne, deleteOne, getAll, updateOne} from "./handlerFactory.js";

// Bütün incelemeleri alan fonksiyon

export const getAllReviews = async (req, res) => getAll(Review, req, res);

export const createReview = async (req, res) => createOne(Review, req, res);

export const deleteReview = async (req, res) => deleteOne(Review, req, res);

export const updateReview = async (req, res) => updateOne(Review, req, res);
