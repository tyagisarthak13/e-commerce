import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  updateProductImage,
} from "../controllers/product.js";
import uploadFiles from "../middlewares/multer.js";

const router = express.Router();

router.post("/products/new", isAuth, uploadFiles, createProduct);
router.get("/products/all", getAllProducts);
router.get("/product/:id", getSingleProduct);
router.put("/product/:id", isAuth, updateProduct);
router.post("/product/:id", isAuth, uploadFiles, updateProductImage);

export default router;
