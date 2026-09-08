"use client";

import { useActionState } from "react";

import { login, type AuthState } from "@/app/actions/auth";

const initial: AuthState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <form action={action} className="flex w-full max-w-md flex-col gap-4">
      <label className="form-control w-full">
        <span className="label-text mb-1 font-medium">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input input-bordered w-full"
          placeholder="owner@pharmacy.com"
        />
      </label>
      <label className="form-control w-full">
        <span className="label-text mb-1 font-medium">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input input-bordered w-full"
        />
      </label>
      {state.error ? (
        <p className="text-error text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-sm opacity-70">
        Accounts are created by the site owner. Contact them if you need access.
      </p>
    </form>
  );
}
