import { type Request, type Response, type NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';

type Target = 'body' | 'params' | 'query';

export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const issues = (result.error as ZodError).issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', issues } });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any)[target] = result.data;
    next();
  };
}
