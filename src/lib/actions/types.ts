import { z } from "zod";

export type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

export function actionSuccess<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function actionError(error: string): ActionResult<never> {
  return { success: false, error };
}

export function getValidationError(error: z.ZodError): string {
  return error.errors.map((e) => e.message).join(", ");
}

export function unwrapAction<T>(result: ActionResult<T>, fallback: T): T {
  return result.success && result.data !== undefined ? result.data : fallback;
}

export function unwrapActionOrNull<T>(result: ActionResult<T>): T | null {
  return result.success && result.data !== undefined ? result.data : null;
}
