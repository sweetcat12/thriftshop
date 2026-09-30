export async function api(path, options = {}) {
  const form = options.body instanceof FormData;
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "X-Requested-With": "SECONDHAND",
      ...(!form && options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    body: options.body
      ? form
        ? options.body
        : JSON.stringify(options.body)
      : undefined,
  });
  const data = await res
    .json()
    .catch(() => ({ error: "The store could not respond. Please try again." }));
  if (!res.ok)
    throw Object.assign(new Error(data.error || "Something went wrong."), {
      status: res.status,
    });
  return data;
}
export const money = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value) / 100);
