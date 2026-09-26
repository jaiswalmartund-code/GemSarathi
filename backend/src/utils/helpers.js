// Utility Helpers for Express Controllers & Routes
import multer from "multer";
import os from "node:os";
import { config } from "../config/index.js";

export const upload = multer({ dest: os.tmpdir(), limits: { fileSize: config.maxUploadSize } });

export const clean = (item) => (item ? { ...item, id: item._id || item.id, _id: undefined } : item);

export const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
