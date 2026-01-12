// validators/checklistValidator.js
import { body } from "express-validator";

export const createChecklistRules = [
  body("loanType").notEmpty().withMessage("loanType is required"),
  body("assignedToRM").notEmpty().withMessage("assignedToRM is required"),
];
