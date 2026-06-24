import { toast } from "sonner";

export const notify = {
  success: (msg: string) => toast.success(msg, { duration: 4000 }),
  error: (msg: string) => toast.error(msg, { duration: 6000 }),
  warning: (msg: string) => toast.warning(msg, { duration: 5000 }),
  info: (msg: string) => toast.info(msg, { duration: 4000 }),
  promise: <T>(fn: Promise<T>, msgs: { loading: string; success: string; error: string }) =>
    toast.promise(fn, msgs),
};
