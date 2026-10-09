export type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type Role = "CUSTOMER" | "SELLER" | "MANUFACTURER" | "ADMIN";
export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";
