"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError("Ungültige Anmeldedaten. Bitte erneut versuchen.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-flx-navy to-flx-navy-light p-4">
      <Card className="w-full max-w-md overflow-hidden">
        <div className="flex justify-center rounded-t-lg bg-gradient-to-br from-flx-navy to-flx-navy-light px-6 pb-2 pt-8">
          <img
            src="/flx-rent-logo.png?v=6"
            alt="FLX Software Logo"
            className="h-auto w-full max-w-[300px] mix-blend-screen"
          />
        </div>
        <CardHeader className="pt-4 text-center">
          <p className="text-sm text-gray-500">Miet- und Demopark · Darda GmbH</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@darda.de"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="rounded-md bg-status-damage/10 px-3 py-2 text-sm text-status-damage">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Anmelden…" : "Anmelden"}
            </Button>
          </form>
          <div className="mt-6 rounded-md border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
            <p className="font-medium text-flx-navy">Demo-Zugangsdaten</p>
            <p className="mt-1">admin@darda.de / admin123</p>
            <p>disposition@darda.de / disp123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
