type Handler<TInput> = (input: TInput) => Promise<unknown>;

const ok = (data: unknown) => Response.json({ status: "success", data });
const fail = (message: string, code: number) =>
  Response.json({ status: "error", message }, { status: code });

export function withBody<TInput>(handler: Handler<TInput>) {
  return async (request: Request): Promise<Response> => {
    try {
      return ok(await handler((await request.json()) as TInput));
    } catch (error) {
      const err = error as Error & { status?: number };
      return fail(err.message ?? "Internal server error", err.status ?? 500);
    }
  };
}

export function withQuery<TInput>(handler: Handler<TInput>) {
  return async (request: Request): Promise<Response> => {
    try {
      const raw = Object.fromEntries(new URL(request.url).searchParams);
      const input = Object.fromEntries(
        Object.entries(raw).map(([key, value]) => [
          key,
          value !== "" && !Number.isNaN(Number(value)) ? Number(value) : value,
        ]),
      );

      return ok(await handler(input as TInput));
    } catch (error) {
      const err = error as Error & { status?: number };
      return fail(err.message ?? "Internal server error", err.status ?? 500);
    }
  };
}
