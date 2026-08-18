import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { SOCIAL_AUTH, USE_MOCK } from "@/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — ClassTrack Teacher Console" },
      {
        name: "description",
        content:
          "Sign in to ClassTrack to take attendance, log behavior points, track bathroom trips and print session reports.",
      },
      { property: "og:title", content: "Sign in — ClassTrack Teacher Console" },
      {
        property: "og:description",
        content: "Attendance, behavior points, bathroom logs and printable reports for teachers.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, signIn, signUp, signInWithSocial } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [first, setFirst] = useState("");
  const [middle, setMiddle] = useState("");
  const [last, setLast] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/schedule", replace: true });
  }, [user, navigate]);

  async function onSignIn(e: React.SubmitEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      navigate({ to: "/schedule", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function onSignUp(e: React.SubmitEvent) {
    e.preventDefault();
    if (!first.trim()) {
      toast.error("First name is required");
      return;
    }
    setLoading(true);
    try {
      await signUp({
        first_name: first.trim(),
        middle_name: middle.trim() || null,
        last_name: last.trim() || null,
        email,
        password,
      });
      navigate({ to: "/schedule", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  async function onSocial(provider: (typeof SOCIAL_AUTH.enabledProviders)[number]) {
    try {
      await signInWithSocial(provider);
      navigate({ to: "/schedule", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Social sign-in failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-sidebar-foreground">
          <img src="/whitelogo.ico" alt="Logo"></img>
          <span className="text-lg font-semibold tracking-tight">Student Tracker</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Teacher console</CardTitle>
            <CardDescription>
              Attendance, behavior points, bathroom logs and printable session reports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="mb-4 grid w-full grid-cols-1">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                {/* <TabsTrigger value="signup">Create account</TabsTrigger> */}
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={onSignIn} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    Sign in
                  </Button>
                </form>
              </TabsContent>
              {/* <TabsContent value="signup">
                <form onSubmit={onSignUp} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="first">First name</Label>
                      <Input
                        id="first"
                        required
                        value={first}
                        onChange={(e) => setFirst(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="middle">Middle</Label>
                      <Input
                        id="middle"
                        value={middle}
                        onChange={(e) => setMiddle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="last">Last</Label>
                      <Input id="last" value={last} onChange={(e) => setLast(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email2">Email</Label>
                    <Input
                      id="email2"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password2">Password</Label>
                    <Input
                      id="password2"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    Create teacher account
                  </Button>
                </form>
              </TabsContent> */}
            </Tabs>

            {/* {SOCIAL_AUTH.enabledProviders.length > 0 && (
              <>
                <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> or{" "}
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-2">
                  {SOCIAL_AUTH.enabledProviders.map((p) => (
                    <Button
                      key={p}
                      variant="outline"
                      className="w-full capitalize"
                      onClick={() => onSocial(p)}
                    >
                      Continue with {p}
                    </Button>
                  ))}
                </div>
              </>
            )} */}

            {USE_MOCK && (
              <p className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                Demo mode — no backend configured. Sign in with{" "}
                <strong>admin@school.test / admin123</strong> or{" "}
                <strong>teacher@school.test / teacher123</strong>. Point the app at your API in{" "}
                <code>src/api/config.ts</code>.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
