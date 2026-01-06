import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../integrations/supabase/safeClient";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [isRecovery, setIsRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
    useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    if (!data.session) {
      navigate("/auth", { replace: true });
    }
  });
}, []);

  // Detect PASSWORD_RECOVERY session
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsRecovery(true);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleReset = async () => {
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);

    // IMPORTANT: force logout after password reset
    await supabase.auth.signOut();

    setTimeout(() => {
      navigate("/auth");
    }, 2500);
  };

  // Invalid access (no recovery token)
  if (!isRecovery && !success) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="max-w-md text-center space-y-4">
          <XCircle size={48} className="mx-auto text-red-500" />
          <h1 className="text-xl font-bold">Invalid or expired link</h1>
          <p className="text-sm text-slate-400">
            Please request a new password reset link.
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="mt-4 px-4 py-2 rounded bg-indigo-600 text-white"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-200">
      <div className="w-full max-w-md rounded-xl bg-slate-900 p-6 space-y-5 shadow-xl">
        {!success ? (
          <>
            <h1 className="text-2xl font-bold text-center">Reset Password</h1>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded">
                {error}
              </div>
            )}

            <input
              type="password"
              placeholder="New password"
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <input
              type="password"
              placeholder="Confirm password"
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 outline-none"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />

            <button
              onClick={handleReset}
              disabled={loading}
              className="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-700 transition flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={16} />}
              Update password
            </button>
          </>
        ) : (
          <div className="text-center space-y-4">
            <CheckCircle2 size={48} className="mx-auto text-green-500" />
            <h2 className="text-xl font-bold">Password updated</h2>
            <p className="text-sm text-slate-400">
              Redirecting you to login…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
